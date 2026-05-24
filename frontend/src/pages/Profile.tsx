import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { BookOpen, Music, Edit2, Check, X } from 'lucide-react'
import { useState } from 'react'
import { usersApi, reviewsApi, booksApi, musicApi, api } from '@/lib/api'
import ReviewCard from '@/components/reviews/ReviewCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'reviews' | 'library' | 'liked_music'

export default function Profile() {
  const { username } = useParams<{ username?: string }>()
  const { user: me, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('reviews')
  const [editing, setEditing] = useState(false)

  const isOwnProfile = !username || username === me?.username

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['user', username || me?.username],
    queryFn: () =>
      username
        ? usersApi.getByUsername(username).then((r) => r.data)
        : usersApi.me().then((r) => r.data),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'user', profileUser?.id],
    queryFn: () =>
      reviewsApi.list({ user_id: profileUser!.id }).then((r) => r.data),
    enabled: !!profileUser?.id && activeTab === 'reviews',
  })

  const { data: library } = useQuery({
    queryKey: ['library'],
    queryFn: () => booksApi.library().then((r) => r.data),
    enabled: isOwnProfile && activeTab === 'library',
  })

  const { data: likedSongs } = useQuery({
    queryKey: ['liked-songs'],
    queryFn: () => musicApi.likedSongs().then((r) => r.data),
    enabled: isOwnProfile && activeTab === 'liked_music',
  })

  const { register, handleSubmit, reset } = useForm({
    values: { display_name: profileUser?.display_name || '', bio: profileUser?.bio || '' },
  })

  const handleConnectSpotify = async () => {
    try {
      const { data } = await api.post('/auth/spotify/link-init')
      window.location.href = data.url
    } catch {
      toast.error('Failed to start Spotify connection')
    }
  }

  const onSave = async (data: any) => {
    try {
      const { data: updated } = await usersApi.update(data)
      setUser(updated)
      qc.invalidateQueries({ queryKey: ['user', me?.username] })
      toast.success('Profile updated')
      setEditing(false)
    } catch {
      toast.error('Update failed')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-32"><LoadingSpinner /></div>
  }

  if (!profileUser) {
    return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-slate-500">User not found.</div>
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'reviews', label: 'Reviews', icon: Edit2 },
    ...(isOwnProfile ? [
      { key: 'library' as Tab, label: 'My Books', icon: BookOpen },
      { key: 'liked_music' as Tab, label: 'Liked Music', icon: Music },
    ] : []),
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      {/* Profile header */}
      <div className="card p-8 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt={profileUser.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-brand-300">
                {(profileUser.display_name || profileUser.username)[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <form onSubmit={handleSubmit(onSave)} className="space-y-3">
                <input {...register('display_name')} className="input" placeholder="Display name" />
                <textarea {...register('bio')} className="input resize-none" rows={2} placeholder="Short bio…" />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary py-2"><Check size={15} /> Save</button>
                  <button type="button" onClick={() => { setEditing(false); reset() }} className="btn-secondary py-2"><X size={15} /> Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-display font-bold text-white">
                    {profileUser.display_name || profileUser.username}
                  </h1>
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
                <p className="text-slate-500 text-sm">@{profileUser.username}</p>
                {profileUser.bio && (
                  <p className="text-slate-300 text-sm mt-2">{profileUser.bio}</p>
                )}
                {profileUser.spotify_id ? (
                  <span className="inline-flex items-center gap-1 mt-2 badge bg-green-900/30 text-green-400">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify connected
                  </span>
                ) : isOwnProfile && (
                  <button
                    onClick={handleConnectSpotify}
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 text-sm font-medium transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Connect Spotify
                  </button>
                )}
                <p className="text-xs text-slate-600 mt-2">
                  Joined {new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {!reviews ? (
            <LoadingSpinner className="mx-auto" />
          ) : reviews.length === 0 ? (
            <p className="text-slate-500 text-sm">No reviews yet.</p>
          ) : (
            reviews.map((review: any) => (
              <ReviewCard
                key={review.id}
                review={review}
                onDelete={() => qc.invalidateQueries({ queryKey: ['reviews', 'user', profileUser.id] })}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'library' && (
        <div>
          {!library ? (
            <LoadingSpinner className="mx-auto" />
          ) : library.length === 0 ? (
            <p className="text-slate-500 text-sm">No books in library yet.</p>
          ) : (
            <div className="space-y-2">
              {library.map((item: any) => (
                <div key={item.id} className="card p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-300">Book #{item.book_id}</span>
                  <div className="flex items-center gap-3">
                    <span className="badge bg-surface-border text-slate-400">{item.status.replace('_', ' ')}</span>
                    {item.rating && <span className="text-sm text-yellow-400">★ {item.rating}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'liked_music' && (
        <div>
          {!likedSongs ? (
            <LoadingSpinner className="mx-auto" />
          ) : likedSongs.length === 0 ? (
            <p className="text-slate-500 text-sm">No liked songs yet.</p>
          ) : (
            <div className="space-y-2">
              {likedSongs.map((item: any) => (
                <div key={item.id} className="card p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-300">Song #{item.song_id}</span>
                  {item.rating && <span className="text-sm text-yellow-400">★ {item.rating}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
