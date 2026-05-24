import { Star } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface Props {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: number
}

export default function StarRating({ value, onChange, readonly = false, size = 16 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className={clsx('transition-colors', readonly ? 'cursor-default' : 'cursor-pointer')}
        >
          <Star
            size={size}
            className={clsx(
              'transition-colors',
              star <= display ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600',
            )}
          />
        </button>
      ))}
    </div>
  )
}
