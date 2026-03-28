'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const DIM_NAMES: Record<string, string> = {
  D1: 'Personality',     D2: 'Interests',
  D3: 'Aptitude',        D4: 'Values',
  D5: 'Emotional Makeup',D6: 'Motivation',
  D7: 'Thinking Style',  D8: 'Work Style',
}

const DOMAIN_ICONS: Record<string, string> = {
  'Technology & Systems':        '💻',
  'Science & Discovery':         '🔬',
  'Business & Enterprise':       '📈',
  'Creative & Design':           '🎨',
  'Arts, Media & Expression':    '🎬',
  'People & Social Impact':      '🤝',
  'Health & Life Sciences':      '🏥',
  'Law, Policy & Power':         '⚖️',
  'Finance & Economics':         '💰',
  'Sports, Wellness & Performance':'🏅',
}

export default function ReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('portrait')
  const [expanded, setExpanded] = useState<number | null>(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: reportData }, { data: prof }] = await Promise.all([
        supabase.from('reports').select('report_json').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      if (reportData?.report_json) setReport(reportData.report_json)
      if (prof) setProfile(prof)
      setLoading(false)
    }
    load()
  }, [id, router])

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

  if (!report) return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ position:'relative', zIndex:1 }}>
      <div className="text-center">
        <p className="text-dim mb-4 text-sm">Report not found.</p>
        <Link href="/dashboard" className="btn-primary">← Dashboard</Link>
      </div>
    </div>
  )

  const country = profile?.country || 'INDIA'
  const showIndia = country === 'INDIA'

  const NAV_SECTIONS = [
    { id:'portrait',  label:'Who You Are' },
    { id:'careers',   label:'Top 10 Careers' },
    { id:'domains',   label:'Career Domains' },
    { id:'pressure',  label:'Under Pressure' },
    { id:'drives',    label:'What Drives You' },
    { id:'blindspot', label:'Blind Spots' },
    { id:'growth',    label:'Growth Edges' },
    { id:'action',    label:'Action Plan' },
  ]

  return (
    <div className="min-h-screen" style={{ position:'relative', zIndex:1 }}>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="bg-ink border-b border-[#1A1C22] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="logo">PSY<span>AI</span></div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-dim hidden md:block">
                {profile?.name}'s Report
              </span>
              <Link href="/dashboard" className="btn-ghost text-xs py-2 px-4">
                Dashboard
              </Link>
            </div>
          </div>

          {/* Section nav */}
          <div className="flex gap-0 overflow-x-auto pb-0 scrollbar-none -mx-4 px-4">
            {NAV_SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => {
                  setActiveSection(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior:'smooth', block:'start' })
                }}
                className={`flex-shrink-0 text-xs py-3 px-4 border-b-2 transition-all duration-150
                  ${activeSection === s.id
                    ? 'border-signal text-paper font-medium'
                    : 'border-transparent text-dim hover:text-paper'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-16">

        {/* ── COVER ─────────────────────────────────────────── */}
        <div className="animate-fade-up">
          <div className="badge badge-signal mb-4">
            {report.accuracy_confidence} accuracy · {report.contradiction_count} behavioral signals detected
          </div>
          <h1 className="font-serif text-3xl md:text-5xl text-paper leading-tight mb-4 max-w-3xl">
            {report.report_headline}
          </h1>
          <p className="text-sm text-dim">
            {report.dominant_guna}
          </p>
        </div>

        {/* ── DIMENSION GRID ────────────────────────────────── */}
        <div>
          <p className="sec-tag">8 Dimensions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1A1C22]
                           border border-[#1A1C22]">
            {report.personality && Object.entries(report.personality).map(([dim, d]: [string, any]) => {
              const confPct = d.confidence === 'HIGH' ? 85 : d.confidence === 'MEDIUM' ? 60 : 35
              const gapColor = d.gap === 'NONE' ? 'text-teal' :
                               d.gap === 'MILD' ? 'text-gold' :
                               d.gap === 'MODERATE' ? 'text-[#E07850]' : 'text-signal'
              return (
                <div key={dim} className="bg-ink p-5">
                  <div className="font-mono text-[9px] text-signal tracking-widest mb-1">{dim}</div>
                  <div className="text-xs text-muted mb-2">{DIM_NAMES[dim]}</div>
                  <div className="text-sm font-medium text-paper mb-3 leading-tight">{d.label}</div>
                  <div className="report-bar-track mb-1">
                    <div className="report-bar-fill high animate-bar-fill"
                         style={{ '--target-width': `${confPct}%` } as any} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-muted">{d.confidence} confidence</div>
                    {d.gap !== 'NONE' && (
                      <div className={`text-[10px] font-medium ${gapColor}`}>
                        {d.gap} gap
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── PORTRAIT ──────────────────────────────────────── */}
        <div id="portrait" className="scroll-mt-32">
          <p className="sec-tag">Section 01</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Who You Actually Are
          </h2>
          <div className="prose-report">
            {report.sections?.personality_portrait
              ?.split(/\n\n+/)
              .map((p: string, i: number) => (
                <p key={i} className={`text-sm leading-8 text-dim mb-5
                  ${i === 0 ? 'text-base text-paper leading-relaxed font-medium' : ''}`}>
                  {p}
                </p>
              ))}
          </div>
        </div>

        {/* ── TOP 10 CAREERS ────────────────────────────────── */}
        <div id="careers" className="scroll-mt-32">
          <p className="sec-tag">Section 02</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-2">
            Your Top 10 Career Matches
          </h2>
          <p className="text-sm text-dim mb-8 leading-relaxed max-w-xl">
            Behaviorally matched — not percentage-guessed. Each recommendation
            is justified by what your answers revealed across all 8 dimensions.
          </p>

          <div className="space-y-3">
            {report.top_10_careers?.map((c: any, i: number) => (
              <div key={c.rank}
                className={`border overflow-hidden transition-all duration-200
                  ${c.rank <= 3 ? 'border-[#2A2C32]' : 'border-[#1A1C22]'}
                  ${expanded === i ? 'border-signal/30' : ''}`}>

                {/* Career header */}
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#0D0F14]
                              transition-colors duration-150">
                  <div className={`font-serif text-2xl flex-shrink-0
                    ${c.rank === 1 ? 'text-gold' : c.rank === 2 ? 'text-paper' : c.rank === 3 ? 'text-[#CD7F32]' : 'text-dim'}`}>
                    {c.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-paper">{c.title}</div>
                    <div className="text-xs text-dim mt-0.5">{c.fit_score} behavioral fit</div>
                  </div>
                  {/* Fit bar */}
                  <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 h-1 bg-[#1A1C22] overflow-hidden rounded-sm">
                      <div className="h-full bg-teal rounded-sm"
                           style={{ width: c.fit_score }} />
                    </div>
                  </div>
                  <div className={`text-muted text-xs transition-transform duration-200
                    ${expanded === i ? 'rotate-180' : ''}`}>▼</div>
                </button>

                {/* Expanded detail */}
                {expanded === i && (
                  <div className="border-t border-[#1A1C22] p-5 space-y-5 animate-fade-in">

                    {/* Why this person */}
                    <div>
                      <div className="text-[10px] font-semibold tracking-widest uppercase
                                       text-signal mb-2">Why you specifically</div>
                      <p className="text-sm text-dim leading-relaxed">{c.why_this_person}</p>
                    </div>

                    {/* Day in life */}
                    {c.what_a_day_looks_like && (
                      <div className="bg-[#0A0C12] border-l-2 border-teal pl-4 py-3">
                        <div className="text-[10px] font-semibold tracking-widest uppercase
                                         text-teal mb-1">A typical day</div>
                        <p className="text-sm text-dim leading-relaxed">{c.what_a_day_looks_like}</p>
                      </div>
                    )}

                    {/* Entry paths + Salary */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-semibold tracking-widest uppercase
                                         text-muted mb-2">
                          {showIndia ? 'Entry Path — India' : 'Entry Path — USA'}
                        </div>
                        <p className="text-xs text-dim leading-relaxed">
                          {showIndia ? c.entry_india : c.entry_usa}
                        </p>
                        {showIndia && c.top_institutions_india?.filter(Boolean).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {c.top_institutions_india.filter(Boolean).map((inst: string) => (
                              <span key={inst} className="text-[10px] bg-[#1A1C22]
                                                          text-muted px-2 py-1 rounded-sm">
                                {inst}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold tracking-widest uppercase
                                         text-muted mb-2">
                          {showIndia ? 'Salary — India' : 'Salary — USA'}
                        </div>
                        <p className="text-sm font-medium text-paper">
                          {showIndia ? c.salary_india : c.salary_usa}
                        </p>
                        {!showIndia && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {c.top_institutions_usa?.filter(Boolean).map((inst: string) => (
                              <span key={inst} className="text-[10px] bg-[#1A1C22]
                                                          text-muted px-2 py-1 rounded-sm">
                                {inst}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Honest warning */}
                    {c.honest_warning && (
                      <div className="flex gap-3 bg-[#1A0D0A] border border-signal/20 p-4 rounded-sm">
                        <span className="text-signal text-sm flex-shrink-0">⚠</span>
                        <div>
                          <div className="text-[10px] font-semibold tracking-widest uppercase
                                           text-signal mb-1">One honest note</div>
                          <p className="text-xs text-dim leading-relaxed">{c.honest_warning}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CAREER DOMAINS ────────────────────────────────── */}
        <div id="domains" className="scroll-mt-32">
          <p className="sec-tag">Section 03</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Career Domain Scores
          </h2>
          <div className="space-y-3">
            {report.career_domain_scores
              ?.sort((a: any, b: any) => b.score - a.score)
              .map((d: any) => {
                const pct = Math.min(100, Math.max(0, d.score))
                const cls = pct >= 70 ? 'high' : pct >= 45 ? 'mid' : 'low'
                return (
                  <div key={d.domain} className="flex items-center gap-4">
                    <div className="w-7 text-lg flex-shrink-0">
                      {DOMAIN_ICONS[d.domain] || '◆'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-sm text-paper">{d.domain}</span>
                        <span className="font-mono text-xs text-muted flex-shrink-0 ml-3">
                          {pct}
                        </span>
                      </div>
                      <div className="report-bar-track">
                        <div className={`report-bar-fill ${cls}`}
                             style={{ '--target-width': `${pct}%` } as any} />
                      </div>
                      <p className="text-[10px] text-muted mt-1 leading-relaxed">
                        {d.reason}
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* ── NATURAL STRENGTHS ─────────────────────────────── */}
        <div>
          <p className="sec-tag">Section 04</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Your Natural Strengths
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {report.natural_strengths?.filter((s: any) => s.strength).map((s: any) => (
              <div key={s.strength} className="card p-5">
                <div className="text-sm font-medium text-paper mb-1">{s.strength}</div>
                <p className="text-xs text-dim leading-relaxed mb-3">{s.evidence}</p>
                <div className="text-[10px] text-teal">→ {s.career_relevance}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── UNDER PRESSURE ────────────────────────────────── */}
        <div id="pressure" className="scroll-mt-32">
          <p className="sec-tag">Section 05</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Under Pressure
          </h2>
          <div className="prose-report">
            {report.sections?.under_pressure
              ?.split(/\n\n+/)
              .map((p: string, i: number) => (
                <p key={i} className="text-sm leading-8 text-dim mb-5">{p}</p>
              ))}
          </div>
        </div>

        {/* ── WHAT DRIVES YOU ───────────────────────────────── */}
        <div id="drives" className="scroll-mt-32">
          <p className="sec-tag">Section 06</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            What Drives You
          </h2>
          <div className="prose-report">
            {report.sections?.what_drives_you
              ?.split(/\n\n+/)
              .map((p: string, i: number) => (
                <p key={i} className="text-sm leading-8 text-dim mb-5">{p}</p>
              ))}
          </div>
        </div>

        {/* ── BLIND SPOTS ───────────────────────────────────── */}
        <div id="blindspot" className="scroll-mt-32">
          <p className="sec-tag">Section 07</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-4">
            Your Blind Spots
          </h2>

          {/* Contradiction highlight */}
          {report.contradiction_report?.most_significant && (
            <div className="bg-[#1A0F0A] border border-signal/20 p-5 mb-8 rounded-sm">
              <div className="badge badge-signal mb-3">⚡ Key contradiction detected</div>
              <p className="text-sm text-paper mb-2">
                {report.contradiction_report.most_significant}
              </p>
              <p className="text-xs text-dim leading-relaxed">
                {report.contradiction_report.what_it_means}
              </p>
            </div>
          )}

          <div className="prose-report">
            {report.sections?.blind_spots
              ?.split(/\n\n+/)
              .map((p: string, i: number) => (
                <p key={i} className="text-sm leading-8 text-dim mb-5">{p}</p>
              ))}
          </div>
        </div>

        {/* ── GROWTH EDGES ──────────────────────────────────── */}
        <div id="growth" className="scroll-mt-32">
          <p className="sec-tag">Section 08</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Your Growth Edges
          </h2>
          <div className="space-y-4">
            {report.sections?.growth_edges
              ?.filter((g: any) => g.area)
              .map((g: any, i: number) => (
                <div key={i} className="card p-6">
                  <div className="text-[10px] font-semibold tracking-widest uppercase
                                   text-gold mb-2">Growth Edge {i+1}</div>
                  <h3 className="text-base font-medium text-paper mb-3">{g.area}</h3>
                  <p className="text-sm text-dim leading-relaxed mb-3">{g.observation}</p>
                  <p className="text-xs text-muted leading-relaxed mb-4">{g.why_it_matters}</p>
                  <div className="flex gap-2 items-start bg-[#0A1A18] border-l-2
                                   border-teal pl-4 py-3 rounded-sm">
                    <span className="text-teal text-sm">→</span>
                    <p className="text-sm text-dim leading-relaxed">{g.action}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ── ACTION PLAN ───────────────────────────────────── */}
        <div id="action" className="scroll-mt-32">
          <p className="sec-tag">Section 09</p>
          <h2 className="font-serif text-2xl md:text-3xl text-paper mb-8">
            Your 30-Day Action Plan
          </h2>

          <div className="relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-[#1A1C22]" />
            <div className="space-y-6">
              {[
                { period:'This Week', data: report.sections?.action_plan?.this_week, color:'bg-signal' },
                { period:'This Month', data: report.sections?.action_plan?.this_month, color:'bg-gold' },
                { period:'3 Months', data: report.sections?.action_plan?.three_months, color:'bg-teal' },
              ].map((step, i) => step.data?.action && (
                <div key={i} className="flex gap-5">
                  <div className={`w-6 h-6 ${step.color} rounded-full flex-shrink-0
                                    relative z-10 mt-0.5`} />
                  <div className="flex-1 pb-2">
                    <div className="text-[10px] font-semibold tracking-widest uppercase
                                     text-muted mb-1">{step.period}</div>
                    <p className="text-sm font-medium text-paper mb-1">{step.data.action}</p>
                    <p className="text-xs text-dim leading-relaxed">{step.data.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PARENT NOTE ───────────────────────────────────── */}
        {report.sections?.parent_note?.include !== false &&
         report.sections?.parent_note?.who_they_are && (
          <div className="border-2 border-gold/30 bg-[#1A1500] p-8 rounded-sm">
            <p className="sec-tag">For Parents & Mentors</p>
            <h2 className="font-serif text-2xl text-paper mb-6">
              A Note to the People Who Matter to {profile?.name}
            </h2>
            <div className="space-y-5">
              {[
                { label:'Who they are', text: report.sections.parent_note.who_they_are },
                { label:'What they need from you', text: report.sections.parent_note.what_they_need },
                { label:'What to avoid', text: report.sections.parent_note.what_to_avoid },
              ].map(block => block.text && (
                <div key={block.label}>
                  <div className="text-[10px] font-semibold tracking-widest uppercase
                                   text-gold mb-2">{block.label}</div>
                  <p className="text-sm text-dim leading-relaxed">{block.text}</p>
                </div>
              ))}
              {report.sections.parent_note.the_one_thing && (
                <div className="bg-gold/10 border border-gold/20 px-5 py-4 rounded-sm">
                  <span className="text-[10px] font-bold tracking-widest uppercase
                                    text-gold mr-2">The one thing:</span>
                  <span className="text-sm text-paper">
                    {report.sections.parent_note.the_one_thing}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RETAKE / DASHBOARD ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-[#1A1C22]">
          <Link href="/dashboard" className="btn-ghost flex-1 text-center">
            ← Dashboard & Past Reports
          </Link>
          <Link href="/assessment" className="btn-primary flex-1 text-center">
            Retake →
          </Link>
        </div>
        <a href={`/api/report/pdf?id=${id}`} target="_blank" rel="noopener noreferrer"
           className="btn-outline w-full text-center block mt-2 py-3 text-sm">
          Download PDF Report ↓
        </a>

        <p className="text-xs text-muted text-center pb-8">
          Your answers are never shown. Only this analyzed report is saved.
        </p>
      </div>
    </div>
  )
}
