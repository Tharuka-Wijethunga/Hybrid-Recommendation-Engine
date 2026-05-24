import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// Use relative URLs so Vite's dev proxy forwards requests to the backend.
// In production, set VITE_API_URL to the full backend domain.
const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          useAuthStore.getState().logout()
        }
      }
    }
    return Promise.reject(error)
  },
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, username: string, password: string, display_name?: string) =>
    api.post('/auth/register', { email, username, password, display_name }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  spotifyLoginUrl: () => `http://127.0.0.1:8000/api/v1/auth/spotify/login`,
}

// ─── Books ────────────────────────────────────────────────────────────────────

export const booksApi = {
  search: (q: string, limit = 20) =>
    api.get('/books/search', { params: { q, limit } }),

  recommendations: (params?: { top_n?: number; alpha?: number; time_decay?: boolean }) =>
    api.get('/books/recommendations', { params }),

  getBook: (id: number) =>
    api.get(`/books/${id}`),

  getGoogleBook: (googleBooksId: string) =>
    api.get(`/books/google/${googleBooksId}`),

  rateBook: (bookId: number, rating: number | null, status: string) =>
    api.post(`/books/${bookId}/rate`, { rating, status }),

  library: () =>
    api.get('/books/user/library'),
}

// ─── Music ────────────────────────────────────────────────────────────────────

export const musicApi = {
  search: (q: string, limit = 20) =>
    api.get('/music/search', { params: { q, limit } }),

  recommendations: (params?: { top_n?: number; mood?: string }) =>
    api.get('/music/recommendations', { params }),

  getSong: (id: number) =>
    api.get(`/music/${id}`),

  likeSong: (spotifyId: string, liked = true, rating?: number) =>
    api.post('/music/like', { liked, rating }, { params: { spotify_id: spotifyId } }),

  likedSongs: () =>
    api.get('/music/user/liked'),
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (params?: { content_type?: string; content_id?: number; user_id?: number; page?: number }) =>
    api.get('/reviews/', { params }),

  create: (body: { content_type: string; content_id: number; body: string; rating?: number; contains_spoilers?: boolean }) =>
    api.post('/reviews/', body),

  update: (id: number, body: { body?: string; rating?: number; contains_spoilers?: boolean }) =>
    api.patch(`/reviews/${id}`, body),

  delete: (id: number) =>
    api.delete(`/reviews/${id}`),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => api.get('/users/me'),

  update: (data: { display_name?: string; bio?: string; avatar_url?: string }) =>
    api.patch('/users/me', data),

  getByUsername: (username: string) =>
    api.get(`/users/${username}`),
}
