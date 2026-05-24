import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Books from '@/pages/Books'
import BookDetail from '@/pages/BookDetail'
import GoogleBookDetail from '@/pages/GoogleBookDetail'
import Music from '@/pages/Music'
import SongDetail from '@/pages/SongDetail'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/g/:googleBooksId" element={<GoogleBookDetail />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/music" element={<Music />} />
        <Route path="/music/:id" element={<SongDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<Profile />} />
      </Route>
    </Routes>
  )
}
