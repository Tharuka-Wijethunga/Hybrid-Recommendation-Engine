import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ExternalLink } from 'lucide-react'
import { booksApi, reviewsApi } from '@/lib/api'
import StarRating from '@/components/common/StarRating'
import ReviewCard from '@/components/reviews/ReviewCard'
import ReviewForm from '@/components/reviews/ReviewForm'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import type { Book } from '@/types'

export default function GoogleBookDetail() {
  const { googleBooksId } = useParams<{ googleBooksId: string }>()
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()

  const { data: book, isLoading } = useQuery({
    queryKey: ['google-book', googleBooksId],
    queryFn: () =>
      booksApi.getGoogleBook(googleBooksId!).then((r) => r.data as Book),
    enabled: !!googleBooksId,
  })

  // Reviews are keyed by google_books_id since there's no local DB id yet
  const reviewContentId = 0 // placeholder — reviews require a local DB book import

  if (isLoading) {
    return <div className="flex justify-center py-32"><LoadingSpinner /></div>
  }

  if (!book) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-500">
        Book not found.
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10 mb-12">
        {/* Cover */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 md:w-full aspect-[2/3] rounded-2xl overflow-hidden bg-surface-card border border-surface-border shadow-xl">
            {book.cover_url ? (
              <img
                src={book.cover_url.replace('http://', 'https://')}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={48} className="text-slate-700" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-display font-bold text-white leading-tight mb-2">
            {book.title}
          </h1>
          {book.authors && (
            <p className="text-slate-400 text-lg mb-4">{book.authors}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-6">
            {book.genres && book.genres.split(',').map((g: string) => (
              <span key={g} className="badge bg-brand-900/60 text-brand-300">
                {g.trim()}
              </span>
            ))}
            {book.published_year && (
              <span className="badge bg-surface-card text-slate-400">
                {book.published_year}
              </span>
            )}
            {book.average_rating && (
              <div className="flex items-center gap-1.5">
                <StarRating value={Math.round(book.average_rating)} readonly size={14} />
                <span className="text-sm text-slate-400">
                  {book.average_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {book.description && (
            <p className="text-slate-300 leading-relaxed text-sm">
              {book.description.slice(0, 1200)}
              {book.description.length > 1200 ? '…' : ''}
            </p>
          )}

          {googleBooksId && (
            <a
              href={`https://books.google.com/books?id=${googleBooksId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex mt-6"
            >
              <ExternalLink size={15} />
              View on Google Books
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
