import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { musicApi } from '@/lib/api'
import SongCard from '@/components/music/SongCard'
import SearchBar from '@/components/common/SearchBar'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { Mood, Song } from '@/types'
import clsx from 'clsx'

const MOODS: { key: Mood; label: string; emoji: string }[] = [
  { key: 'energetic', label: 'Energetic', emoji: '⚡' },
  { key: 'happy', label: 'Happy', emoji: '😊' },
  { key: 'calm', label: 'Calm', emoji: '🌙' },
  { key: 'sad', label: 'Melancholic', emoji: '🌧️' },
]

export default function Music() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['music-search', submittedQuery],
    queryFn: () => musicApi.search(submittedQuery, 30).then((r) => r.data),
    enabled: submittedQuery.length > 0,
  })

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['music-recs', selectedMood],
    queryFn: () => musicApi.recommendations({ top_n: 30, mood: selectedMood || undefined }).then((r) => r.data),
    enabled: submittedQuery.length === 0,
  })

  const songs: Song[] = submittedQuery ? (searchResults || []) : (recommendations || [])
  const isLoading = submittedQuery ? searching : loadingRecs

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title">Music</h1>
        <p className="text-slate-500 text-sm mt-1">
          {submittedQuery ? `Results for "${submittedQuery}"` : 'Personalised tracks powered by Spotify'}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-xl">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => setSubmittedQuery(query)}
          placeholder="Search songs, artists, albums…"
        />
        {submittedQuery && (
          <button
            onClick={() => { setQuery(''); setSubmittedQuery('') }}
            className="text-xs text-brand-400 mt-1 hover:text-brand-300"
          >
            Clear search → show recommendations
          </button>
        )}
      </div>

      {/* Mood picker */}
      {!submittedQuery && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedMood(null)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              !selectedMood
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200',
            )}
          >
            All
          </button>
          {MOODS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setSelectedMood(selectedMood === key ? null : key)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                selectedMood === key
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200',
              )}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      )}

      {/* Songs */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          {submittedQuery ? 'No tracks found.' : 'No recommendations yet. Connect Spotify for personalised music.'}
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, i) => (
            <SongCard key={song.spotify_id || i} song={song} />
          ))}
        </div>
      )}
    </div>
  )
}
