import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface FormData {
  email: string
  username: string
  password: string
  display_name: string
}

export default function Register() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    try {
      const { data: tokens } = await authApi.register(
        data.email, data.username, data.password, data.display_name || undefined,
      )
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: user } = await authApi.me()
      setUser(user)
      toast.success('Account created! Welcome to ReadSound.')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-2xl mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              ReadSound
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-white mt-4">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Free forever. No credit card required.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Display name</label>
              <input
                type="text"
                {...register('display_name')}
                className="input"
                placeholder="Your name (optional)"
              />
            </div>

            <div>
              <label className="label">Username</label>
              <input
                type="text"
                {...register('username', {
                  required: 'Username is required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                  pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers, and _ only' },
                })}
                className="input"
                placeholder="coolreader42"
              />
              {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
                className="input"
                placeholder="Min. 8 characters"
              />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
