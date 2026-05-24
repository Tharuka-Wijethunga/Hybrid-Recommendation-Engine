import { Music, Play, Heart } from 'lucide-react'
import { useState } from 'react'
import type { Song } from '@/types'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { musicApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  song: Song
  onClick?: () => void
  compact?: boolean
}

export default function SongCard({ song, onClick, compact = false }: Props) {
  const { isAuthenticated } = useAuthStore()
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated()) {
      toast.error('Sign in to save songs')
      return
    }
    setLiking(true)
    try {
      await musicApi.likeSong(song.spotify_id, !liked)
      setLiked((l) => !l)
      toast.success(liked ? 'Removed from liked songs' : 'Added to liked songs')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLiking(false)
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card group flex items-center gap-4 p-4 cursor-pointer animate-fade-in',
        compact && 'py-3',
      )}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-border">
        {song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={20} className="text-slate-600" />
          </div>
        )}
        {song.preview_url && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={20} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-100 truncate group-hover:text-brand-300 transition-colors">
          {song.title}
        </p>
        <p className="text-xs text-slate-500 truncate">{song.artist}</p>
        {song.album && <p className="text-xs text-slate-600 truncate">{song.album}</p>}
      </div>

      {/* Mood indicators */}
      {(song.energy !== undefined || song.valence !== undefined) && (
        <div className="hidden sm:flex flex-col gap-1 text-right">
          {song.energy !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Energy</span>
              <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-purple-500"
                  style={{ width: `${(song.energy || 0) * 100}%` }}
                />
              </div>
            </div>
          )}
          {song.valence !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Mood</span>
              <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-green-500"
                  style={{ width: `${(song.valence || 0) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duration + like */}
      <div className="flex items-center gap-3">
        {song.duration_ms && (
          <span className="text-xs text-slate-600">{formatDuration(song.duration_ms)}</span>
        )}
        <button
          onClick={handleLike}
          disabled={liking}
          className={clsx(
            'p-1.5 rounded-lg transition-all',
            liked ? 'text-red-400' : 'text-slate-600 hover:text-red-400',
          )}
        >
          <Heart size={16} className={liked ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  )
}
