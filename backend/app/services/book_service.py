"""
Book recommendation service.
Loads pre-trained SVD + TF-IDF artifacts at startup (produced by scripts/train_model.py).
Falls back to Google Books API popularity-based recommendations when models are absent.
"""
import logging
import os
import pickle
from pathlib import Path
from typing import List, Optional

import httpx
import numpy as np

from app.core.config import settings
from app.schemas.schemas import BookRecommendation

logger = logging.getLogger(__name__)


class BookRecommender:
    def __init__(self):
        self.user_embeddings: Optional[np.ndarray] = None
        self.book_embeddings: Optional[np.ndarray] = None
        self.tfidf_matrix = None
        self.df_books = None
        self.id_to_book_index: dict = {}
        self.id_to_user_index: dict = {}
        self.book_id_to_tfidf_idx: dict = {}
        self.is_loaded = False

    def load_models(self) -> None:
        model_dir = Path(settings.ML_MODELS_DIR)
        required = [
            "user_embeddings.npy",
            "book_embeddings.npy",
            "tfidf_matrix.npz",
            "books_metadata.pkl",
            "id_mappings.pkl",
        ]
        if not all((model_dir / f).exists() for f in required):
            logger.warning(
                "ML model artifacts not found in %s. "
                "Run scripts/train_model.py to generate them. "
                "Falling back to Google Books API.",
                model_dir,
            )
            return

        try:
            import scipy.sparse as sp

            self.user_embeddings = np.load(model_dir / "user_embeddings.npy")
            self.book_embeddings = np.load(model_dir / "book_embeddings.npy")
            self.tfidf_matrix = sp.load_npz(str(model_dir / "tfidf_matrix.npz"))

            with open(model_dir / "books_metadata.pkl", "rb") as f:
                self.df_books = pickle.load(f)

            with open(model_dir / "id_mappings.pkl", "rb") as f:
                mappings = pickle.load(f)
                self.id_to_book_index = mappings["id_to_book_index"]
                self.id_to_user_index = mappings["id_to_user_index"]
                self.book_id_to_tfidf_idx = mappings["book_id_to_tfidf_idx"]

            self.is_loaded = True
            logger.info("Book recommendation models loaded successfully.")
        except Exception:
            logger.exception("Failed to load book recommendation models.")
            self.is_loaded = False

    def recommend_for_user(
        self,
        goodreads_user_id: int,
        history_book_ids: List[int],
        top_n: int = 10,
        alpha: float = 0.5,
        use_time_decay: bool = True,
    ) -> List[BookRecommendation]:
        if not self.is_loaded:
            return []

        import scipy.sparse as sp
        from sklearn.metrics.pairwise import cosine_similarity

        user_is_warm = goodreads_user_id in self.id_to_user_index
        history_indices = [
            self.book_id_to_tfidf_idx[b]
            for b in history_book_ids
            if b in self.book_id_to_tfidf_idx
        ]

        if not history_indices:
            return []

        # Build user content profile
        if use_time_decay and len(history_indices) > 1:
            decay_rate = 1.5
            weights = np.exp(-decay_rate * np.arange(len(history_indices))[::-1])
            weights /= weights.sum()
            weighted = self.tfidf_matrix[history_indices].multiply(weights[:, np.newaxis])
            user_profile = np.asarray(weighted.sum(axis=0))
        else:
            user_profile = np.asarray(self.tfidf_matrix[history_indices].mean(axis=0))

        cb_scores = cosine_similarity(user_profile, self.tfidf_matrix).flatten()

        cf_scores = np.zeros(len(self.df_books))
        if user_is_warm:
            u_vec = self.user_embeddings[self.id_to_user_index[goodreads_user_id]]
            all_cf = np.dot(self.book_embeddings, u_vec)
            cf_scores = np.array([
                all_cf[self.id_to_book_index[b]] if b in self.id_to_book_index else 0.0
                for b in self.df_books["book_id"]
            ])
            if cf_scores.max() > 0:
                cf_scores /= cf_scores.max()

        hybrid = (alpha * cf_scores) + ((1 - alpha) * cb_scores)

        # Filter already-read books
        read_titles = set(self.df_books[self.df_books["book_id"].isin(history_book_ids)]["title"])
        mask = ~self.df_books["book_id"].isin(history_book_ids) & ~self.df_books["title"].isin(read_titles)

        scores_df = self.df_books[mask].copy()
        scores_df["score"] = hybrid[mask.values]
        top = scores_df.nlargest(top_n, "score")

        return [
            BookRecommendation(
                goodreads_id=int(row.book_id),
                title=row.title,
                score=float(row.score),
                source="ml",
            )
            for row in top.itertuples()
        ]

    def recommend_cold_start(
        self,
        seed_book_ids: List[int],
        top_n: int = 10,
    ) -> List[BookRecommendation]:
        return self.recommend_for_user(
            goodreads_user_id=-1,
            history_book_ids=seed_book_ids,
            top_n=top_n,
            alpha=0.0,
            use_time_decay=False,
        )


async def get_google_book_by_id(google_books_id: str) -> Optional[BookRecommendation]:
    if not settings.GOOGLE_BOOKS_API_KEY:
        return None
    url = f"https://www.googleapis.com/books/v1/volumes/{google_books_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params={"key": settings.GOOGLE_BOOKS_API_KEY})
            resp.raise_for_status()
            item = resp.json()
    except Exception:
        logger.exception("Google Books API request failed for ID %s", google_books_id)
        return None

    info = item.get("volumeInfo", {})
    images = info.get("imageLinks", {})
    return BookRecommendation(
        google_books_id=item.get("id"),
        title=info.get("title", "Unknown"),
        authors=", ".join(info.get("authors", [])),
        description=info.get("description"),
        cover_url=images.get("thumbnail") or images.get("smallThumbnail"),
        published_year=_parse_year(info.get("publishedDate")),
        genres=", ".join(info.get("categories", [])),
        average_rating=info.get("averageRating"),
        score=0.0,
        source="google_books",
    )


async def search_google_books(query: str, max_results: int = 20) -> List[BookRecommendation]:
    if not settings.GOOGLE_BOOKS_API_KEY:
        return []

    url = "https://www.googleapis.com/books/v1/volumes"
    params = {"q": query, "maxResults": max_results, "key": settings.GOOGLE_BOOKS_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Google Books API request failed")
        return []

    results = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        images = info.get("imageLinks", {})
        results.append(
            BookRecommendation(
                google_books_id=item.get("id"),
                title=info.get("title", "Unknown"),
                authors=", ".join(info.get("authors", [])),
                description=info.get("description"),
                cover_url=images.get("thumbnail") or images.get("smallThumbnail"),
                published_year=_parse_year(info.get("publishedDate")),
                genres=", ".join(info.get("categories", [])),
                average_rating=info.get("averageRating"),
                score=0.0,
                source="google_books",
            )
        )
    return results


def _parse_year(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    try:
        return int(date_str[:4])
    except (ValueError, TypeError):
        return None


book_recommender = BookRecommender()
