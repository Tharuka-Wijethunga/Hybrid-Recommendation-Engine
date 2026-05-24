import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ExternalLink } from 'lucide-react'
import { booksApi, reviewsApi } from '@/lib/api'
import StarRating from '@/components/common/StarRating'
import ReviewCard from '@/components/reviews/ReviewCard'
import ReviewForm from '@/components/reviews/ReviewForm'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const bookId = parseInt(id || '0')
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()
  const [userRating, setUserRating] = useState<number | null>(null)
  const [status, setStatus] = useState('want_to_read')

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => booksApi.getBook(bookId).then((r) => r.data),
    enabled: bookId > 0,
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'book', bookId],
    queryFn: () => reviewsApi.list({ content_type: 'book', content_id: bookId }).then((r) => r.data),
    enabled: bookId > 0,
  })

  const handleRate = async (rating: number) => {
    setUserRating(rating)
    try {
      await booksApi.rateBook(bookId, rating, status)
      toast.success('Rating saved')
    } catch {
      toast.error('Failed to save rating')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <LoadingSpinner />
      </div>
    )
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
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={48} className="text-slate-700" />
              </div>
            )}
          </div>

          {isAuthenticated() && (
            <div className="card p-4 w-full space-y-3">
              <div>
                <label className="label text-xs">Your rating</label>
                <StarRating value={userRating} onChange={handleRate} size={20} />
              </div>
              <div>
                <label className="label text-xs">Reading status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input py-2"
                >
                  <option value="want_to_read">Want to read</option>
                  <option value="reading">Currently reading</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>
          )}
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
              <span className="badge bg-surface-card text-slate-400">{book.published_year}</span>
            )}
            {book.average_rating && (
              <div className="flex items-center gap-1.5">
                <StarRating value={Math.round(book.average_rating)} readonly size={14} />
                <span className="text-sm text-slate-400">{book.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-slate-300 leading-relaxed text-sm">
                {book.description.slice(0, 1000)}{book.description.length > 1000 ? '…' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section>
        <h2 className="section-title mb-6">Reviews</h2>
        {isAuthenticated() && (
          <div className="mb-6">
            <ReviewForm
              contentType="book"
              contentId={bookId}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['reviews', 'book', bookId] })}
            />
          </div>
        )}
        {(reviews || []).length === 0 ? (
          <p className="text-slate-500 text-sm">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {(reviews || []).map((review: any) => (
              <ReviewCard
                key={review.id}
                review={review}
                onDelete={() => qc.invalidateQueries({ queryKey: ['reviews', 'book', bookId] })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
