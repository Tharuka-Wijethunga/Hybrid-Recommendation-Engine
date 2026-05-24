import { BookOpen, Star } from 'lucide-react'
import type { Book } from '@/types'
import clsx from 'clsx'

interface Props {
  book: Book
  onClick?: () => void
  compact?: boolean
}

export default function BookCard({ book, onClick, compact = false }: Props) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'card group flex gap-4 p-4 cursor-pointer animate-fade-in',
        compact ? 'flex-row' : 'flex-col',
      )}
    >
      {/* Cover */}
      <div
        className={clsx(
          'flex-shrink-0 rounded-xl overflow-hidden bg-surface-border',
          compact ? 'w-16 h-24' : 'w-full aspect-[2/3]',
        )}
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={compact ? 20 : 32} className="text-slate-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <h3 className="font-semibold text-slate-100 text-sm leading-tight line-clamp-2 group-hover:text-brand-300 transition-colors">
          {book.title}
        </h3>
        {book.authors && (
          <p className="text-xs text-slate-500 truncate">{book.authors}</p>
        )}
        {book.genres && (
          <span className="badge bg-brand-900/50 text-brand-300 mt-1 self-start">
            {book.genres.split(',')[0].trim()}
          </span>
        )}
        {book.average_rating && (
          <div className="flex items-center gap-1 mt-auto pt-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-slate-400">{book.average_rating.toFixed(1)}</span>
          </div>
        )}
        {book.score !== undefined && book.score > 0 && (
          <div className="text-xs text-brand-400 font-medium">
            Match: {(book.score * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  )
}
