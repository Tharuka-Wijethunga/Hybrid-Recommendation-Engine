import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Music, User, LogOut, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/books', label: 'Books', icon: BookOpen },
    { to: '/music', label: 'Music', icon: Music },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              ReadSound
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-600/20 text-brand-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-surface-card',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated() ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-surface-card transition-all"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || user.username}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  <span>{user?.display_name || user?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary py-2 px-4 text-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-card transition-all"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface-card px-4 py-4 space-y-2 animate-fade-in">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'bg-brand-600/20 text-brand-400' : 'text-slate-300 hover:bg-surface-hover',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <hr className="border-surface-border" />
          {isAuthenticated() ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-300 hover:bg-surface-hover transition-all"
              >
                <User size={18} />
                Profile
              </Link>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all w-full"
              >
                <LogOut size={18} />
                Log out
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary flex-1 justify-center">
                Log in
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 justify-center">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
