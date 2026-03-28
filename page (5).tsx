'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) return setError('Please enter your email and password')
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ position:'relative', zIndex:1 }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="logo inline-block">PSY<span>AI</span></Link>
        </div>

        <div className="card p-8">
          <h1 className="font-serif text-2xl text-paper mb-1">Welcome back</h1>
          <p className="text-sm text-dim mb-8">Sign in to access your reports and retake the assessment.</p>

          <div className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Your password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
          </div>

          {error && <p className="text-signal text-xs mt-3">{error}</p>}

          <button onClick={handleLogin} disabled={loading}
            className="btn-primary w-full mt-6">
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <p className="text-center text-xs text-muted mt-4">
            No account?{' '}
            <Link href="/signup" className="text-paper hover:text-signal transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
