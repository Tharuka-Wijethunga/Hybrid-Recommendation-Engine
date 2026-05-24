import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  useEffect(() => {
    const access = searchParams.get('access_token')
    const refresh = searchParams.get('refresh_token')

    if (!access || !refresh) {
      toast.error('Authentication failed')
      navigate('/login')
      return
    }

    setTokens(access, refresh)
    authApi.me().then(({ data }) => {
      setUser(data)
      toast.success(`Welcome, ${data.display_name || data.username}!`)
      navigate('/')
    }).catch(() => {
      navigate('/login')
    })
  }, [])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-slate-400">Completing sign in…</p>
      </div>
    </div>
  )
}
