'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBankStats } from '@/lib/questions'

// Simple admin panel — shows stats, recent sessions, reports
// Access: /admin (protect with env var ADMIN_EMAIL in production)

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')

  const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '2026'

  function checkPin() {
    if (pin === ADMIN_PIN) setAuthed(true)
    else alert('Wrong PIN')
  }

  useEffect(() => {
    if (!authed) return
    async function load() {
      const supabase = createClient()
      const bankStats = getBankStats()

      const [{ data: sessData }, { data: reportData }, { data: userCount }] = await Promise.all([
        supabase.from('sessions').select('id, status, country, started_at, completed_at')
          .order('started_at', { ascending: false }).limit(20),
        supabase.from('reports').select('id, accuracy_conf, headline, created_at')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('id', { count: 'exact' }),
      ])

      setStats({
        bank: bankStats,
        totalSessions: sessData?.length || 0,
        totalUsers: (userCount as any)?.length || 0,
        completedSessions: sessData?.filter((s:any) => s.status === 'completed').length || 0,
        recentReports: reportData || [],
      })
      setSessions(sessData || [])
      setLoading(false)
    }
    load()
  }, [authed])

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ position:'relative', zIndex:1 }}>
      <div className="card p-8 max-w-sm w-full">
        <div className="logo mb-6">PSY<span>AI</span> Admin</div>
        <div className="space-y-3">
          <div>
            <label className="form-label">Admin PIN</label>
            <input className="form-input" type="password" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkPin()} />
          </div>
          <button onClick={checkPin} className="btn-primary w-full">Enter →</button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ position:'relative', zIndex:1 }}>
      <p className="text-dim text-sm">Loading...</p>
    </div>
  )

  const bankStats = getBankStats()

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ position:'relative', zIndex:1 }}>
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="logo mb-1">PSY<span>AI</span> Admin</div>
            <p className="text-dim text-sm">Platform overview</p>
          </div>
          <a href="/" className="btn-ghost text-xs">← Back to app</a>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1A1C22] border border-[#1A1C22] mb-8">
          {[
            { n: String(stats?.totalUsers || 0), label: 'Total users' },
            { n: String(stats?.totalSessions || 0), label: 'Sessions started' },
            { n: String(stats?.completedSessions || 0), label: 'Completed' },
            { n: String(bankStats.total), label: 'Questions in bank' },
          ].map(s => (
            <div key={s.label} className="bg-ink p-5 text-center">
              <div className="font-serif text-3xl text-paper mb-1">{s.n}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Question bank breakdown */}
        <div className="card p-6 mb-6">
          <p className="sec-tag mb-4">Question Bank</p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {bankStats.byDim.map((d:any) => (
              <div key={d.dim} className="text-center">
                <div className="font-mono text-xs text-signal">{d.dim}</div>
                <div className="font-serif text-xl text-paper">{d.count}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted mt-4">Total: {bankStats.total} questions · 72 per session · {Math.floor(bankStats.total/72)} retakes per user</div>
        </div>

        {/* Recent sessions */}
        <div className="card p-6 mb-6">
          <p className="sec-tag mb-4">Recent Sessions</p>
          <div className="space-y-2">
            {sessions.slice(0,10).map((s:any) => (
              <div key={s.id} className="flex items-center gap-4 text-xs">
                <span className={`w-16 text-center py-0.5 rounded-sm font-medium
                  ${s.status==='completed' ? 'bg-[#0A1A18] text-teal' :
                    s.status==='in_progress' ? 'bg-[#1A1500] text-gold' :
                    'bg-[#1A1C22] text-muted'}`}>
                  {s.status}
                </span>
                <span className="text-muted">{s.country}</span>
                <span className="text-dim flex-1">
                  {new Date(s.started_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </span>
                {s.completed_at && (
                  <span className="text-teal">
                    {Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)} min
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div className="card p-6">
          <p className="sec-tag mb-4">Recent Reports</p>
          <div className="space-y-3">
            {(stats?.recentReports || []).map((r:any) => (
              <div key={r.id} className="flex items-start gap-4">
                <span className="font-mono text-xs text-teal flex-shrink-0 pt-0.5">{r.accuracy_conf}</span>
                <p className="text-sm text-dim leading-snug line-clamp-1 flex-1">{r.headline}</p>
                <span className="text-xs text-muted flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
