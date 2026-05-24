import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Music, Play, ExternalLink } from 'lucide-react'
import { musicApi, reviewsApi } from '@/lib/api'
import StarRating from '@/components/common/StarRating'
import ReviewCard from '@/components/reviews/ReviewCard'
import ReviewForm from '@/components/reviews/ReviewForm'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const songId = parseInt(id || '0')
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => musicApi.getSong(songId).then((r) => r.data),
    enabled: songId > 0,
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'song', songId],
    queryFn: () => reviewsApi.list({ content_type: 'song', content_id: songId }).then((r) => r.data),
    enabled: songId > 0,
  })

  if (isLoading) {
    return <div className="flex justify-center py-32"><LoadingSpinner /></div>
  }
  if (!song) {
    return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-500">Song not found.</div>
  }

  const audioFeatures = [
    { label: 'Energy', value: song.energy },
    { label: 'Danceability', value: song.danceability },
    { label: 'Positivity', value: song.valence },
  ].filter((f) => f.value !== undefined && f.value !== null)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-8 mb-12">
        <div className="flex-shrink-0">
          <div className="w-48 h-48 rounded-2xl overflow-hidden bg-surface-card border border-surface-border shadow-xl">
            {song.cover_url ? (
              <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={48} className="text-slate-700" />
              </div>
            )}
          </div>
          {song.preview_url && (
            <audio controls src={song.preview_url} className="mt-4 w-48 rounded-lg" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Song</p>
          <h1 className="text-3xl font-display font-bold text-white leading-tight mb-1">{song.title}</h1>
          <p className="text-slate-400 text-xl mb-1">{song.artist}</p>
          {song.album && <p className="text-slate-600 mb-4">{song.album}</p>}

          {song.spotify_url && (
            <a
              href={song.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex mb-6"
            >
              <Play size={16} />
              Open in Spotify
              <ExternalLink size={14} />
            </a>
          )}

          {audioFeatures.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 uppercase tracking-wider">Audio Features</p>
              {audioFeatures.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-24">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-purple-500 transition-all"
                      style={{ width: `${(value as number) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 w-10 text-right">
                    {((value as number) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {song.tempo && (
                <p className="text-sm text-slate-500">{Math.round(song.tempo)} BPM</p>
              )}
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="section-title mb-6">Reviews</h2>
        {isAuthenticated() && (
          <div className="mb-6">
            <ReviewForm
              contentType="song"
              contentId={songId}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['reviews', 'song', songId] })}
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
                onDelete={() => qc.invalidateQueries({ queryKey: ['reviews', 'song', songId] })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
