import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Send } from 'lucide-react'
import StarRating from '@/components/common/StarRating'
import { reviewsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface FormData {
  body: string
  contains_spoilers: boolean
}

interface Props {
  contentType: 'book' | 'song'
  contentId: number
  onSuccess?: () => void
}

export default function ReviewForm({ contentType, contentId, onSuccess }: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { body: '', contains_spoilers: false },
  })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      await reviewsApi.create({
        content_type: contentType,
        content_id: contentId,
        body: data.body,
        rating: rating || undefined,
        contains_spoilers: data.contains_spoilers,
      })
      toast.success('Review posted!')
      reset()
      setRating(null)
      onSuccess?.()
    } catch {
      toast.error('Failed to post review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
      <h3 className="font-semibold text-slate-200">Write a Review</h3>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Your rating:</span>
        <StarRating value={rating} onChange={setRating} size={20} />
      </div>

      <div>
        <textarea
          {...register('body', { required: 'Review cannot be empty', minLength: { value: 10, message: 'At least 10 characters' } })}
          rows={4}
          placeholder={`Share your thoughts on this ${contentType}…`}
          className="input resize-none"
        />
        {errors.body && (
          <p className="text-xs text-red-400 mt-1">{errors.body.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('contains_spoilers')}
            className="w-4 h-4 rounded accent-brand-500"
          />
          <span className="text-sm text-slate-400">Contains spoilers</span>
        </label>

        <button type="submit" disabled={submitting} className="btn-primary">
          <Send size={15} />
          {submitting ? 'Posting…' : 'Post review'}
        </button>
      </div>
    </form>
  )
}
