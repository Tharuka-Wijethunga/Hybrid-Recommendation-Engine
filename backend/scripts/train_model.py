"""
Run this script (from the backend/ directory) to train the book recommendation
model and save artifacts that the API loads on startup.

Usage:
    python -m scripts.train_model \
        --interactions /path/to/goodreads_interactions.csv \
        --books       /path/to/goodreads_books.json.gz \
        --output      ./ml_models

The script mirrors the notebook logic (K-Core filtering, SVD + TF-IDF) and
serialises:
    user_embeddings.npy
    book_embeddings.npy
    tfidf_matrix.npz
    books_metadata.pkl
    id_mappings.pkl
"""
import argparse
import gzip
import json
import logging
import os
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def load_interactions(path: str, min_ratings: int = 20) -> pd.DataFrame:
    logger.info("Loading interactions from %s …", path)
    chunks = []
    for chunk in pd.read_csv(
        path,
        chunksize=1_000_000,
        usecols=["user_id", "book_id", "rating"],
    ):
        chunks.append(chunk[chunk["rating"] > 0])
    df = pd.concat(chunks, ignore_index=True)
    logger.info("Raw interactions: %d", len(df))

    for _ in range(5):  # iterative k-core
        uc = df["user_id"].value_counts()
        bc = df["book_id"].value_counts()
        before = len(df)
        df = df[df["user_id"].isin(uc[uc >= min_ratings].index)]
        df = df[df["book_id"].isin(bc[bc >= min_ratings].index)]
        if len(df) == before:
            break
    logger.info("After k-core (%d): %d interactions", min_ratings, len(df))
    return df


def load_book_metadata(path: str, valid_book_ids: set, max_books: int = 500_000) -> pd.DataFrame:
    logger.info("Loading book metadata from %s …", path)
    records = []
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= max_books:
                break
            try:
                rec = json.loads(line)
                book_id = int(rec["book_id"])
                if book_id in valid_book_ids or i < 20_000:
                    records.append({
                        "book_id": book_id,
                        "title": rec.get("title", "Unknown"),
                        "description": rec.get("description", ""),
                    })
            except (ValueError, KeyError):
                continue
    df = pd.DataFrame(records).drop_duplicates("book_id")
    logger.info("Loaded %d book records", len(df))
    return df


def train(interactions_path: str, books_path: str, output_dir: str, n_components: int = 50):
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    df = load_interactions(interactions_path)
    valid_books = set(df["book_id"].unique())

    # --- Collaborative Filtering (SVD) ---
    user_cat = df["user_id"].astype("category")
    book_cat = df["book_id"].astype("category")

    user_index_to_id = dict(enumerate(user_cat.cat.categories))
    book_index_to_id = dict(enumerate(book_cat.cat.categories))
    id_to_user_index = {v: k for k, v in user_index_to_id.items()}
    id_to_book_index = {v: k for k, v in book_index_to_id.items()}

    n_users = df["user_id"].nunique()
    n_books = df["book_id"].nunique()

    sparse = sp.csr_matrix(
        (df["rating"].values, (user_cat.cat.codes, book_cat.cat.codes)),
        shape=(n_users, n_books),
    )

    logger.info("Running TruncatedSVD (n_components=%d) …", n_components)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    user_embeddings = svd.fit_transform(sparse)
    book_embeddings = svd.components_.T

    np.save(out / "user_embeddings.npy", user_embeddings)
    np.save(out / "book_embeddings.npy", book_embeddings)
    logger.info("SVD embeddings saved.")

    # --- Content-Based Filtering (TF-IDF) ---
    df_books = load_book_metadata(books_path, valid_books)
    df_books["content"] = df_books["title"] + " " + df_books["description"].fillna("")

    logger.info("Vectorising with TF-IDF …")
    tfidf = TfidfVectorizer(stop_words="english", max_features=5000)
    tfidf_matrix = tfidf.fit_transform(df_books["content"])

    sp.save_npz(str(out / "tfidf_matrix.npz"), tfidf_matrix)
    logger.info("TF-IDF matrix saved.")

    with open(out / "books_metadata.pkl", "wb") as f:
        pickle.dump(df_books[["book_id", "title"]], f, protocol=pickle.HIGHEST_PROTOCOL)

    book_id_to_tfidf_idx = pd.Series(df_books.index, index=df_books["book_id"]).to_dict()
    with open(out / "id_mappings.pkl", "wb") as f:
        pickle.dump(
            {
                "id_to_book_index": id_to_book_index,
                "id_to_user_index": id_to_user_index,
                "book_index_to_id": book_index_to_id,
                "user_index_to_id": user_index_to_id,
                "book_id_to_tfidf_idx": book_id_to_tfidf_idx,
            },
            f,
            protocol=pickle.HIGHEST_PROTOCOL,
        )

    logger.info("All artifacts saved to %s", out)
    logger.info(
        "Users: %d | Books: %d | TF-IDF books: %d",
        n_users,
        n_books,
        len(df_books),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--interactions", required=True)
    parser.add_argument("--books", required=True)
    parser.add_argument("--output", default="./ml_models")
    parser.add_argument("--n-components", type=int, default=50)
    args = parser.parse_args()
    train(args.interactions, args.books, args.output, args.n_components)
