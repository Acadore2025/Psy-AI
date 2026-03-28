'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [stats, setStats] = useState({ answered: 0, sessions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: rpts }, { data: aqData }, { data: sessData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reports')
          .select('id, headline, accuracy_conf, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('answered_questions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
        supabase.from('sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
      ])

      setProfile(prof)
      setReports(rpts || [])
      setStats({
        answered: (aqData as any)?.length || 0,
        sessions: (sessData as any)?.length || 0,
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ position:'relative', zIndex:1 }}>
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-signal rounded-full animate-pulse-dot"
               style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  )

  const retakesLeft = Math.max(0, 6 - stats.sessions)
  const questionsLeft = 420 - stats.answered

  return (
    <div className="min-h-screen" style={{ position:'relative', zIndex:1 }}>

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="border-b border-[#1A1C22] px-4 md:px-8 py-4
                        flex items-center justify-between sticky top-0 z-40
                        bg-ink/95 backdrop-blur-sm">
        <div className="logo">PSY<span>AI</span></div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-dim hidden md:block">{profile?.name}</span>
          <button onClick={signOut} className="btn-ghost text-xs py-2 px-4">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">

        {/* Welcome */}
        <div className="mb-10 animate-fade-up">
          <p className="sec-tag">Welcome back</p>
          <h1 className="font-serif text-3xl md:text-4xl text-paper mb-2">
            {profile?.name}
          </h1>
          <p className="text-sm text-dim">
            {profile?.country === 'INDIA' ? '🇮🇳' : '🇺🇸'} {profile?.country}
            {' · '}{profile?.persona}
            {profile?.job_title ? ` · ${profile.job_title}` : ''}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-[#1A1C22] border border-[#1A1C22] mb-10">
          {[
            { n: String(stats.sessions), label: 'Assessments taken' },
            { n: String(stats.answered), label: 'Questions answered' },
            { n: String(retakesLeft), label: 'Retakes remaining' },
          ].map(s => (
            <div key={s.label} className="bg-ink p-5 text-center">
              <div className="font-serif text-3xl text-paper mb-1">{s.n}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-10">
          <Link href="/assessment"
            className="btn-primary w-full py-4 text-base text-center block">
            {stats.sessions === 0
              ? 'Take Your First Assessment →'
              : 'Retake Assessment — Fresh Questions →'}
          </Link>
          {stats.sessions > 0 && (
            <p className="text-xs text-muted text-center mt-2">
              {questionsLeft > 0
                ? `${questionsLeft} unseen questions remaining — your result will be consistent`
                : 'Question bank reset — 420 fresh questions available'}
            </p>
          )}
        </div>

        {/* Past reports */}
        {reports.length > 0 && (
          <div>
            <p className="sec-tag mb-4">Your Reports</p>
            <div className="space-y-2">
              {reports.map((r, i) => (
                <Link key={r.id} href={`/report/${r.id}`}
                  className="flex items-start gap-4 p-5 border border-[#1A1C22]
                               hover:border-[#2A2C32] transition-colors duration-150
                               bg-[#0A0C12] block group">
                  <div className="font-mono text-xs text-signal opacity-60 pt-0.5 flex-shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-paper leading-snug mb-1 line-clamp-2">
                      {r.headline || 'View Report'}
                    </p>
                    <p className="text-xs text-muted">
                      {r.accuracy_conf} accuracy ·{' '}
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-muted text-xs group-hover:text-paper
                                   transition-colors duration-150 flex-shrink-0 pt-0.5">
                    View →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {reports.length === 0 && (
          <div className="text-center py-16 border border-[#1A1C22] border-dashed">
            <div className="text-3xl mb-4">📊</div>
            <p className="text-paper font-medium mb-2">No reports yet</p>
            <p className="text-sm text-dim mb-6 max-w-xs mx-auto">
              Take your first assessment to get your complete behavioral profile.
            </p>
            <Link href="/assessment" className="btn-primary">
              Start Assessment →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
