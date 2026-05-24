import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              ReadSound
            </span>
          </Link>

          <nav className="flex gap-6 text-sm text-slate-500">
            <Link to="/books" className="hover:text-slate-300 transition-colors">Books</Link>
            <Link to="/music" className="hover:text-slate-300 transition-colors">Music</Link>
          </nav>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} ReadSound. Built with FastAPI + React.
          </p>
        </div>
      </div>
    </footer>
  )
}
