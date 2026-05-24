import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Music, Star, Users } from 'lucide-react'
import type { Book } from '@/types'

function bookPath(book: Book): string {
  if (book.id) return `/books/${book.id}`
  if (book.google_books_id) return `/books/g/${book.google_books_id}`
  return '/books'
}
import { useQuery } from '@tanstack/react-query'
import { booksApi, musicApi } from '@/lib/api'
import BookCard from '@/components/books/BookCard'
import SongCard from '@/components/music/SongCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'

export default function Home() {
  const { isAuthenticated } = useAuthStore()

  const { data: bookRecs, isLoading: loadingBooks } = useQuery({
    queryKey: ['home-book-recs'],
    queryFn: () => booksApi.recommendations({ top_n: 6 }).then((r) => r.data),
  })

  const { data: musicRecs, isLoading: loadingMusic } = useQuery({
    queryKey: ['home-music-recs'],
    queryFn: () => musicApi.recommendations({ top_n: 6 }).then((r) => r.data),
  })

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-glow">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-semibold mb-6">
            <Star size={12} className="fill-current" />
            AI-powered recommendations
          </span>

          <h1 className="text-5xl sm:text-6xl font-display font-extrabold text-white leading-tight mb-6">
            Discover your next
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              favourite story &amp; song
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10">
            A personalised recommendation engine for books and music — powered by your taste.
            Rate, review, and discover.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/books" className="btn-primary text-base px-8 py-3">
              Explore Books <ArrowRight size={18} />
            </Link>
            <Link to="/music" className="btn-secondary text-base px-8 py-3">
              Discover Music <Music size={18} />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-20 pt-10 border-t border-surface-border">
            {[
              { icon: BookOpen, value: '2M+', label: 'Books indexed' },
              { icon: Music, value: 'Spotify', label: 'Music powered by' },
              { icon: Users, value: 'Hybrid', label: 'SVD + TF-IDF AI' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <Icon size={20} className="text-brand-400 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">{value}</p>
                <p className="text-xs text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book Recommendations */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">
              {isAuthenticated() ? 'Recommended for You' : 'Popular Books'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isAuthenticated()
                ? 'Based on your reading history'
                : 'Sign in to get personalised picks'}
            </p>
          </div>
          <Link to="/books" className="flex items-center gap-1 text-brand-400 text-sm hover:text-brand-300 transition-colors">
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {loadingBooks ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {(bookRecs || []).slice(0, 6).map((book: any, i: number) => (
              <Link key={book.google_books_id || book.goodreads_id || i} to={bookPath(book)}>
                <BookCard book={book} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Music Recommendations */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">
              {isAuthenticated() ? 'Music For You' : 'Trending Tracks'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isAuthenticated()
                ? 'Tailored to your listening history'
                : 'Connect Spotify for personalised music'}
            </p>
          </div>
          <Link to="/music" className="flex items-center gap-1 text-brand-400 text-sm hover:text-brand-300 transition-colors">
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {loadingMusic ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(musicRecs || []).slice(0, 6).map((song: any, i: number) => (
              <SongCard key={song.spotify_id || i} song={song} />
            ))}
          </div>
        )}
      </section>

      {/* CTA for unauthenticated */}
      {!isAuthenticated() && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="card p-10 text-center bg-gradient-to-br from-brand-950 to-surface-card border-brand-800/50">
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              Get personalised recommendations
            </h2>
            <p className="text-slate-400 mb-8">
              Create a free account to unlock AI-powered book and music recommendations tailored specifically to your taste.
            </p>
            <Link to="/register" className="btn-primary text-base px-10 py-3">
              Create free account <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
