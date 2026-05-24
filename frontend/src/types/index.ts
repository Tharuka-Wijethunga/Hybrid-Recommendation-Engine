export interface User {
  id: number
  username: string
  email: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  spotify_id: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Book {
  id?: number
  google_books_id?: string
  goodreads_id?: number
  title: string
  authors?: string
  description?: string
  cover_url?: string
  published_year?: number
  genres?: string
  average_rating?: number
  ratings_count?: number
  score?: number
  source?: string
}

export interface Song {
  id?: number
  spotify_id: string
  title: string
  artist: string
  album?: string
  cover_url?: string
  preview_url?: string
  spotify_url?: string
  duration_ms?: number
  danceability?: number
  energy?: number
  valence?: number
  tempo?: number
  score?: number
}

export interface Review {
  id: number
  user_id: number
  content_type: 'book' | 'song'
  content_id: number
  body: string
  rating: number | null
  contains_spoilers: boolean
  created_at: string
  updated_at: string
  user: User
}

export interface UserBookRating {
  id: number
  book_id: number
  rating: number | null
  status: 'want_to_read' | 'reading' | 'read'
  created_at: string
  updated_at: string
}

export interface UserSongRating {
  id: number
  song_id: number
  liked: boolean
  rating: number | null
  created_at: string
}

export type Mood = 'happy' | 'sad' | 'energetic' | 'calm'
