import { Trash2, Edit2, AlertTriangle } from 'lucide-react'
import type { Review } from '@/types'
import StarRating from '@/components/common/StarRating'
import { useAuthStore } from '@/store/authStore'
import { reviewsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  review: Review
  onDelete?: () => void
  onEdit?: () => void
}

export default function ReviewCard({ review, onDelete, onEdit }: Props) {
  const { user } = useAuthStore()
  const isOwn = user?.id === review.user_id

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    try {
      await reviewsApi.delete(review.id)
      toast.success('Review deleted')
      onDelete?.()
    } catch {
      toast.error('Failed to delete review')
    }
  }

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-900 flex items-center justify-center flex-shrink-0">
            {review.user.avatar_url ? (
              <img
                src={review.user.avatar_url}
                alt={review.user.display_name || review.user.username}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-brand-300">
                {(review.user.display_name || review.user.username)[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-200">
              {review.user.display_name || review.user.username}
            </p>
            <p className="text-xs text-slate-600">
              {new Date(review.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {review.rating && <StarRating value={review.rating} readonly size={14} />}
          {isOwn && (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {review.contains_spoilers && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
          <span className="text-xs text-yellow-400">Contains spoilers</span>
        </div>
      )}

      <p className="mt-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {review.body}
      </p>
    </div>
  )
}
