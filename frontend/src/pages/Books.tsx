import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { booksApi } from '@/lib/api'
import BookCard from '@/components/books/BookCard'
import SearchBar from '@/components/common/SearchBar'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import type { Book } from '@/types'

function bookPath(book: Book): string {
  if (book.id) return `/books/${book.id}`
  if (book.google_books_id) return `/books/g/${book.google_books_id}`
  return '/books'
}

export default function Books() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [timeDecay, setTimeDecay] = useState(true)
  const [alpha, setAlpha] = useState(0.5)
  const [showFilters, setShowFilters] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['book-search', submittedQuery],
    queryFn: () => booksApi.search(submittedQuery, 24).then((r) => r.data),
    enabled: submittedQuery.length > 0,
  })

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['book-recs', alpha, timeDecay],
    queryFn: () => booksApi.recommendations({ top_n: 24, alpha, time_decay: timeDecay }).then((r) => r.data),
    enabled: submittedQuery.length === 0,
  })

  const books: Book[] = submittedQuery ? (searchResults || []) : (recommendations || [])
  const isLoading = submittedQuery ? searching : loadingRecs

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Books</h1>
          <p className="text-slate-500 text-sm mt-1">
            {submittedQuery
              ? `Results for "${submittedQuery}"`
              : isAuthenticated()
              ? 'Personalised recommendations'
              : 'Popular books to get you started'}
          </p>
        </div>

        {isAuthenticated() && !submittedQuery && (
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-secondary self-start"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 max-w-xl">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => setSubmittedQuery(query)}
          placeholder="Search books by title, author, or topic…"
        />
        {query !== submittedQuery && query.length > 0 && (
          <p className="text-xs text-slate-600 mt-1">Press Enter to search</p>
        )}
        {submittedQuery && (
          <button
            onClick={() => { setQuery(''); setSubmittedQuery('') }}
            className="text-xs text-brand-400 mt-1 hover:text-brand-300"
          >
            Clear search → show recommendations
          </button>
        )}
      </div>

      {/* Recommendation filters */}
      {showFilters && !submittedQuery && (
        <div className="card p-5 mb-6 flex flex-wrap gap-6 items-center animate-slide-up">
          <div>
            <label className="label text-xs">CF vs CB balance (alpha)</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">Content</span>
              <input
                type="range"
                min={0} max={1} step={0.1}
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-32 accent-brand-500"
              />
              <span className="text-xs text-slate-600">Collaborative</span>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timeDecay}
              onChange={(e) => setTimeDecay(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-sm text-slate-300">Time-aware (weight recent reads higher)</span>
          </label>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          {submittedQuery ? 'No books found. Try a different search.' : 'No recommendations yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {books.map((book, i) => (
            <BookCard
              key={book.google_books_id || book.goodreads_id || i}
              book={book}
              onClick={() => navigate(bookPath(book))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
