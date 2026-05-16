'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const DIM_NAMES: Record<string, string> = {
  D1: 'Personality',      D2: 'Interests',
  D3: 'Aptitude',         D4: 'Values',
  D5: 'Emotional Makeup', D6: 'Motivation',
  D7: 'Thinking Style',   D8: 'Work Style',
}

const DOMAIN_ICONS: Record<string, string> = {
  'Technology & Systems':          '💻',
  'Science & Discovery':           '🔬',
  'Business & Enterprise':         '📈',
  'Creative & Design':             '🎨',
  'Arts, Media & Expression':      '🎬',
  'People & Social Impact':        '🤝',
  'Health & Life Sciences':        '🏥',
  'Law, Policy & Power':           '⚖️',
  'Finance & Economics':           '💰',
  'Sports, Wellness & Performance':'🏅',
}

// ── Reusable section header (matches PDF style) ─────────────────────
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-signal text-white font-mono text-[9px] font-bold
                       tracking-[0.12em] px-3 py-1.5 rounded-sm flex-shrink-0">
        SECTION {num}
      </div>
      <h2 className="font-serif text-xl md:text-2xl text-paper">{title}</h2>
      <div className="flex-1 h-px bg-[#1A1C22]" />
    </div>
  )
}

// ── Confidence badge ────────────────────────────────────────────────
function ConfBadge({ conf }: { conf: string }) {
  const map: Record<string, string> = {
    HIGH: 'bg-teal/10 text-teal',
    MEDIUM: 'bg-gold/10 text-gold',
    LOW: 'bg-[#2A2C32] text-muted',
  }
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${map[conf] || map.LOW}`}>
      {conf}
    </span>
  )
}

// ── Gap badge ───────────────────────────────────────────────────────
function GapBadge({ gap }: { gap: string }) {
  if (!gap || gap === 'NONE') return null
  const map: Record<string, string> = {
    MILD: 'bg-gold/10 text-gold',
    MODERATE: 'bg-[#E07B39]/10 text-[#E07B39]',
    SIGNIFICANT: 'bg-signal/10 text-signal',
  }
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${map[gap] || ''}`}>
      {gap} GAP
    </span>
  )
}

// ── Score bar ───────────────────────────────────────────────────────
function ScoreBar({ pct, color = 'bg-signal' }: { pct: number; color?: string }) {
  return (
    <div className="h-[6px] bg-[#1A1C22] rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`}
           style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

// ── Narrative block — breaks walls of text ──────────────────────────
// First para = pull-quote box. Others = bold lead sentence + body text.
function NarrativePara({ text, isFirst, accent }: { text: string; isFirst: boolean; accent: string }) {
  // Safe multi-line engine evaluation matching that won't require target config overhauls
  const m    = text.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/)
  const lead = m ? m[1] : text
  const body = m ? m[2] : ''
  if (isFirst) {
    return (
      <div className={`border-l-4 ${accent} bg-[#1A1C22]/40 rounded-r-xl px-5 py-4 mb-2`}>
        <p className="font-serif text-base md:text-lg text-paper leading-relaxed italic">{text}</p>
      </div>
    )
  }
  return (
    <div className="pb-4 border-b border-[#1A1C22] last:border-0 last:pb-0">
      <p className="text-sm font-semibold text-paper leading-relaxed mb-2">{lead}</p>
      {body ? <p className="text-sm text-dim leading-8">{body}</p> : null}
    </div>
  )
}

function NarrativeBlock({ text, accent }: { text?: string; accent: string }) {
  if (!text) return null
  const paras = text.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean)
  return (
    <div className="space-y-4">
      {paras.map((p: string, i: number) => (
        <NarrativePara key={i} text={p} isFirst={i === 0} accent={accent} />
      ))}
    </div>
  )
}

export default function ReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport]     = useState<any>(null)
  const [profile, setProfile]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<number | null>(0)
  const [activeNav, setActiveNav] = useState('cover')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: reportData }, { data: prof }] = await Promise.all([
        supabase.from('reports').select('report_json, created_at').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      if (reportData?.report_json) setReport({ ...reportData.report_json, created_at: reportData.created_at })
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

  const showIndia = (profile?.country || 'INDIA') === 'INDIA'
  const date = report.created_at
    ? new Date(report.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : ''

  const NAV = [
    { id:'cover',    label:'Overview' },
    { id:'dims',     label:'8 Dimensions' },
    { id:'careers',  label:'Top 10 Careers' },
    { id:'domains',  label:'Career Domains' },
    { id:'strengths',label:'Strengths' },
    { id:'pressure', label:'Under Pressure' },
    { id:'drives',   label:'What Drives You' },
    { id:'blindspot',label:'Blind Spots' },
    { id:'growth',   label:'Growth & Action' },
  ]

  function scrollTo(sectionId: string) {
    setActiveNav(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior:'smooth', block:'start' })
  }

  return (
    <div className="min-h-screen" style={{ position:'relative', zIndex:1 }}>

      {/* ── STICKY HEADER ─────────────────────────────────── */}
      <div className="bg-ink/95 backdrop-blur-sm border-b border-[#1A1C22] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="logo">PSY<span>AI</span></div>
            <div className="flex items-center gap-3">
              <a href={`/api/report/pdf?id=${id}`} target="_blank" rel="noopener noreferrer"
                 className="btn-ghost text-xs py-2 px-3 hidden md:flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                PDF
              </a>
              <Link href="/dashboard" className="btn-ghost text-xs py-2 px-3">Dashboard</Link>
            </div>
          </div>

          {/* Section nav */}
          <div className="flex gap-0 overflow-x-auto pb-0 -mx-4 px-4 scrollbar-none">
            {NAV.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className={`flex-shrink-0 text-[11px] py-3 px-3 border-b-2 transition-all duration-150
                  ${activeNav === s.id
                    ? 'border-signal text-paper font-medium'
                    : 'border-transparent text-dim hover:text-paper'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-14">

        {/* ══════════════════════════════════════════════════
            COVER / OVERVIEW
        ══════════════════════════════════════════════════ */}
        <div id="cover" className="scroll-mt-28 animate-fade-up">

          {/* Top meta strip */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="badge badge-signal">{report.accuracy_confidence} accuracy</span>
            <span className="badge badge-teal">{report.contradiction_count} behavioral signals</span>
            {date && <span className="text-xs text-muted">{date}</span>}
          </div>

          {/* Headline */}
          <h1 className="font-serif text-3xl md:text-4xl text-paper leading-tight mb-4 max-w-3xl">
            {report.report_headline}
          </h1>
          {report.dominant_guna && (
            <p className="text-sm text-dim mb-6 max-w-2xl leading-relaxed">{report.dominant_guna}</p>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1A1C22] border border-[#1A1C22] mb-8">
            {[
              { label:'Name',    value: profile?.name || '—' },
              { label:'Country', value: profile?.country || '—' },
              { label:'Profile', value: profile?.persona ? profile.persona.charAt(0).toUpperCase() + profile.persona.slice(1) : '—' },
              { label:'Guna',    value: (report.dominant_guna || '').split(' — ')[0] || '—' },
            ].map(c => (
              <div key={c.label} className="bg-ink px-5 py-4">
                <div className="text-[9px] text-muted uppercase tracking-widest mb-1">{c.label}</div>
                <div className="text-sm font-medium text-paper truncate">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Table of contents cards */}
          <div className="grid md:grid-cols-2 gap-2">
            {[
              ['01', 'Who You Actually Are',       'The paragraph that creates the "how did it know that" moment.'],
              ['02', 'Your 8 Dimensions',           'All 8 behavioral dimensions with confidence and gap analysis.'],
              ['03', 'Career Domain Scores',        'How you score across 10 career worlds — ranked.'],
              ['04', 'Top 10 Career Matches',       'Behaviorally justified — not interest-matched.'],
              ['05', 'Natural Strengths',           'What feels effortless to you but others find genuinely hard.'],
              ['06', 'Under Pressure',              'Who you become when things go wrong.'],
              ['07', 'What Drives You',             'Stated vs revealed motivation. The gap named clearly.'],
              ['08', 'Blind Spots',                 'What you cannot see about yourself. Not softened.'],
              ['09', 'Growth Edges & Action Plan',  'Three areas + what to do this week, month, 3 months.'],
            ].map(([num, title, desc]) => (
              <button key={num} onClick={() => scrollTo(
                num === '01' ? 'portrait' : num === '02' ? 'dims' : num === '03' ? 'domains' :
                num === '04' ? 'careers' : num === '05' ? 'strengths' : num === '06' ? 'pressure' :
                num === '07' ? 'drives' : num === '08' ? 'blindspot' : 'growth'
              )}
                className="flex gap-3 p-4 border border-[#1A1C22] bg-[#0A0C12]
                           hover:border-[#2A2C32] transition-colors text-left">
                <div className="font-mono text-[10px] text-signal opacity-60 pt-0.5 flex-shrink-0">{num}</div>
                <div>
                  <div className="text-sm font-medium text-paper mb-0.5">{title}</div>
                  <div className="text-xs text-muted leading-relaxed">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 01 — PERSONALITY PORTRAIT
        ══════════════════════════════════════════════════ */}
        <div id="portrait" className="scroll-mt-28">
          <SectionHeader num="01" title="Who You Actually Are" />
          {report.dominant_guna && (
            <div className="border-l-2 border-gold bg-[#1A1500] pl-4 py-3 rounded-sm mb-6">
              <span className="text-[9px] uppercase tracking-widest text-gold font-bold">Dominant Guna · </span>
              <span className="text-sm text-dim">{report.dominant_guna}</span>
            </div>
          )}
          <div className="space-y-4">
            <NarrativeBlock text={report.sections?.personality_portrait} accent="border-signal" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 02 — 8 DIMENSIONS
        ══════════════════════════════════════════════════ */}
        <div id="dims" className="scroll-mt-28">
          <SectionHeader num="02" title="Your 8 Behavioral Dimensions" />
          <div className="space-y-3">
            {report.personality && Object.entries(report.personality).map(([dim, d]: [string, any]) => {
              const confPct = d.confidence === 'HIGH' ? 85 : d.confidence === 'MEDIUM' ? 60 : 35
              return (
                <div key={dim} className="border border-[#1A1C22] bg-[#0A0C12] p-5 rounded-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="font-mono text-[9px] text-signal tracking-widest font-bold">{dim}</span>
                    <span className="text-xs text-muted">— {DIM_NAMES[dim]}</span>
                    <span className="text-sm font-medium text-paper">· {d.label}</span>
                    <ConfBadge conf={d.confidence} />
                    <GapBadge gap={d.gap} />
                  </div>
                  <ScoreBar pct={confPct} color={d.confidence === 'HIGH' ? 'bg-teal' : d.confidence === 'MEDIUM' ? 'bg-gold' : 'bg-[#3A3C42]'} />
                  <p className="text-xs text-dim leading-relaxed mt-3">{d.observed}</p>
                  {d.evidence && (
                    <p className="text-[11px] text-muted leading-relaxed mt-2 italic">{d.evidence}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 03 — CAREER DOMAIN SCORES
        ══════════════════════════════════════════════════ */}
        <div id="domains" className="scroll-mt-28">
          <SectionHeader num="03" title="Career Domain Scores" />
          <p className="text-sm text-dim mb-6 leading-relaxed">
            Scored 0–100 based on behavioral alignment across your 70 responses — not self-reported interest.
          </p>
          <div className="space-y-3">
            {[...(report.career_domain_scores || [])]
              .sort((a: any, b: any) => b.score - a.score)
              .map((d: any, i: number) => {
                const pct   = Math.min(100, Math.max(0, d.score))
                const color = pct >= 70 ? 'bg-teal' : pct >= 45 ? 'bg-gold' : 'bg-[#3A3C42]'
                const tc    = pct >= 70 ? 'text-teal' : pct >= 45 ? 'text-gold' : 'text-muted'
                return (
                  <div key={d.domain} className="flex items-center gap-4 border border-[#1A1C22]
                                                   bg-[#0A0C12] px-5 py-4 rounded-sm">
                    <span className="font-mono text-[10px] text-muted w-5 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-lg flex-shrink-0">{DOMAIN_ICONS[d.domain] || '◆'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-paper">{d.domain}</span>
                        <span className={`font-mono text-xs font-bold ${tc}`}>{pct}</span>
                      </div>
                      <ScoreBar pct={pct} color={color} />
                      {d.reason && (
                        <p className="text-[10px] text-muted mt-1.5 leading-relaxed">{d.reason}</p>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 04 — TOP 10 CAREERS
        ══════════════════════════════════════════════════ */}
        <div id="careers" className="scroll-mt-28">
          <SectionHeader num="04" title="Your Top 10 Career Matches" />
          <p className="text-sm text-dim mb-6 leading-relaxed max-w-xl">
            Every match is behaviorally justified using your D1, D4, D5, D6, and D8 synthesis — not interest-matched.
          </p>
          <div className="space-y-3">
            {report.top_10_careers?.map((c: any, i: number) => (
              <div key={c.rank}
                className={`border overflow-hidden transition-all duration-200 rounded-sm
                  ${expanded === i ? 'border-signal/30' : c.rank <= 3 ? 'border-[#2A2C32]' : 'border-[#1A1C22]'}`}>

                {/* Career header row */}
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center gap-4 p-5 text-left
                             hover:bg-[#0D0F14] transition-colors duration-150">
                  <div className={`font-serif text-2xl flex-shrink-0 w-8
                    ${c.rank === 1 ? 'text-gold' : c.rank === 2 ? 'text-paper' : c.rank === 3 ? 'text-[#CD7F32]' : 'text-dim'}`}>
                    {c.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-paper mb-0.5">{c.title}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-signal/10 text-signal px-2 py-0.5 rounded-full font-semibold">
                        {c.fit_score} FIT
                      </span>
                      {(c.natural_strengths_used || []).slice(0, 2).map((s: string) => (
                        <span key={s} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:block flex-shrink-0 w-24">
                    <ScoreBar pct={parseInt(c.fit_score) || 0} color="bg-teal" />
                  </div>
                  <span className={`text-muted text-xs transition-transform duration-200 ${expanded === i ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {/* Expanded detail */}
                {expanded === i && (
                  <div className="border-t border-[#1A1C22] p-5 space-y-5 animate-fade-in bg-[#0A0C12]">

                    {c.why_this_person && (
                      <div>
                        <div className="text-[9px] font-bold tracking-widest uppercase text-signal mb-2">Why you specifically</div>
                        <p className="text-sm text-dim leading-relaxed">{c.why_this_person}</p>
                      </div>
                    )}

                    {c.what_a_day_looks_like && (
                      <div className="border-l-2 border-teal pl-4 py-2">
                        <div className="text-[9px] font-bold tracking-widest uppercase text-teal mb-1">A typical day</div>
                        <p className="text-sm text-dim leading-relaxed">{c.what_a_day_looks_like}</p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-[#131520] border border-[#1A1C22] rounded-sm p-4">
                        <div className="text-[9px] font-bold tracking-widest uppercase text-muted mb-2">
                          {showIndia ? 'Entry Path — India' : 'Entry Path — USA'}
                        </div>
                        <p className="text-xs text-dim leading-relaxed">
                          {showIndia ? c.entry_india : c.entry_usa}
                        </p>
                        {showIndia && c.top_institutions_india?.filter(Boolean).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {c.top_institutions_india.filter(Boolean).map((inst: string) => (
                              <span key={inst} className="text-[10px] bg-[#1A1C22] text-muted px-2 py-1 rounded-sm">{inst}</span>
                            ))}
                          </div>
                        )}
                        {!showIndia && c.top_institutions_usa?.filter(Boolean).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {c.top_institutions_usa.filter(Boolean).map((inst: string) => (
                              <span key={inst} className="text-[10px] bg-[#1A1C22] text-muted px-2 py-1 rounded-sm">{inst}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-[#131520] border border-[#1A1C22] rounded-sm p-4">
                        <div className="text-[9px] font-bold tracking-widest uppercase text-muted mb-2">
                          {showIndia ? 'Salary — India' : 'Salary — USA'}
                        </div>
                        <p className="text-sm font-semibold text-paper">
                          {showIndia ? c.salary_india : c.salary_usa}
                        </p>
                      </div>
                    </div>

                    {c.honest_warning && (
                      <div className="flex gap-3 bg-signal/5 border border-signal/20 p-4 rounded-sm">
                        <span className="text-signal text-sm flex-shrink-0">⚠</span>
                        <div>
                          <div className="text-[9px] font-bold tracking-widest uppercase text-signal mb-1">Honest Warning</div>
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

        {/* ══════════════════════════════════════════════════
            SECTION 05 — NATURAL STRENGTHS
        ══════════════════════════════════════════════════ */}
        <div id="strengths" className="scroll-mt-28">
          <SectionHeader num="05" title="Your Natural Strengths" />
          <p className="text-sm text-dim mb-6 leading-relaxed">
            These are abilities that feel almost effortless to you — but that others find genuinely difficult.
          </p>
          <div className="space-y-3">
            {report.natural_strengths?.filter((s: any) => s.strength).map((s: any, i: number) => (
              <div key={s.strength} className="border border-[#1A1C22] bg-[#0A0C12] p-5 rounded-sm flex gap-4">
                <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center
                                 font-mono text-xs font-bold text-white flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-paper mb-1">{s.strength}</div>
                  <p className="text-xs text-dim leading-relaxed mb-2">{s.evidence}</p>
                  {s.career_relevance && (
                    <p className="text-xs text-teal">→ {s.career_relevance}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 06 — UNDER PRESSURE
        ══════════════════════════════════════════════════ */}
        <div id="pressure" className="scroll-mt-28">
          <SectionHeader num="06" title="Who You Become Under Pressure" />
          {report.contradiction_report?.most_significant && (
            <div className="bg-signal/5 border border-signal/20 p-5 rounded-sm mb-6">
              <div className="badge badge-signal mb-3">⚡ Key contradiction detected</div>
              <p className="text-sm text-paper mb-2 font-medium">{report.contradiction_report.most_significant}</p>
              <p className="text-xs text-dim leading-relaxed">{report.contradiction_report.what_it_means}</p>
            </div>
          )}
          <div className="space-y-4">
            <NarrativeBlock text={report.sections?.under_pressure} accent="border-purple-500" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 07 — WHAT DRIVES YOU
        ══════════════════════════════════════════════════ */}
        <div id="drives" className="scroll-mt-28">
          <SectionHeader num="07" title="What Actually Drives You" />
          <div className="space-y-4">
            <NarrativeBlock text={report.sections?.what_drives_you} accent="border-teal" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 08 — BLIND SPOTS
        ══════════════════════════════════════════════════ */}
        <div id="blindspot" className="scroll-mt-28">
          <SectionHeader num="08" title="Your Blind Spots" />
          <div className="space-y-4">
            <NarrativeBlock text={report.sections?.blind_spots} accent="border-signal" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 09 — GROWTH EDGES + ACTION PLAN
        ══════════════════════════════════════════════════ */}
        <div id="growth" className="scroll-mt-28">
          <SectionHeader num="09" title="Growth Edges & Action Plan" />

          {/* Growth edges */}
          <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
            Three Areas Worth Your Attention
          </div>
          <div className="space-y-3 mb-10">
            {report.sections?.growth_edges?.filter((g: any) => g.area).map((g: any, i: number) => (
              <div key={i} className="border border-[#1A1C22] bg-[#0A0C12] p-5 rounded-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-bold tracking-wider">
                    GROWTH EDGE {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-paper">{g.area}</span>
                </div>
                <p className="text-sm text-dim leading-relaxed mb-2">{g.observation}</p>
                {g.why_it_matters && (
                  <p className="text-xs text-muted leading-relaxed mb-3">
                    <strong className="text-dim">Why it matters: </strong>{g.why_it_matters}
                  </p>
                )}
                {g.action && (
                  <div className="flex gap-2 items-start border-l-2 border-teal pl-4 py-2 bg-teal/5 rounded-sm">
                    <span className="text-teal text-sm flex-shrink-0">→</span>
                    <p className="text-sm text-dim leading-relaxed">{g.action}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action plan */}
          <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
            Your 30-Day Action Plan
          </div>
          <div className="relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-[#1A1C22]" />
            <div className="space-y-5">
              {[
                { period:'This Week',   data: report.sections?.action_plan?.this_week,    color:'bg-signal' },
                { period:'This Month',  data: report.sections?.action_plan?.this_month,   color:'bg-gold'   },
                { period:'3 Months',    data: report.sections?.action_plan?.three_months, color:'bg-teal'   },
              ].filter(s => s.data?.action).map((step, i) => (
                <div key={i} className="flex gap-5">
                  <div className={`w-6 h-6 ${step.color} rounded-full flex-shrink-0 relative z-10 mt-0.5`} />
                  <div className="flex-1 pb-2">
                    <div className="text-[9px] font-bold tracking-widest uppercase text-muted mb-1">
                      {step.period}
                    </div>
                    <p className="text-sm font-medium text-paper mb-1">{step.data.action}</p>
                    <p className="text-xs text-dim leading-relaxed">{step.data.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 10 — PARENT NOTE (conditional)
        ══════════════════════════════════════════════════ */}
        {report.sections?.parent_note?.who_they_are &&
         report.sections.parent_note.who_they_are !== 'N/A' && (
          <div className="border-2 border-gold/30 bg-[#1A1500] p-6 rounded-sm">
            <SectionHeader num="10" title={`A Note to the People Who Matter to ${profile?.name}`} />
            <p className="text-xs text-muted mb-5 italic">
              This section is written for parents, mentors, or anyone who plays a significant role in {profile?.name}'s life.
            </p>
            <div className="space-y-5">
              {[
                { label:'Who they are',          text: report.sections.parent_note.who_they_are },
                { label:'What they need from you',text: report.sections.parent_note.what_they_need },
                { label:'What to avoid',          text: report.sections.parent_note.what_to_avoid },
              ].filter(b => b.text && b.text !== 'N/A').map(block => (
                <div key={block.label}>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-gold mb-2">{block.label}</div>
                  <p className="text-sm text-dim leading-relaxed">{block.text}</p>
                </div>
              ))}
              {report.sections.parent_note.the_one_thing &&
               report.sections.parent_note.the_one_thing !== 'N/A' && (
                <div className="bg-gold/10 border border-gold/20 px-5 py-4 rounded-sm">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-gold mr-2">The one thing:</span>
                  <span className="text-sm text-paper">{report.sections.parent_note.the_one_thing}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            FOOTER ACTIONS
        ══════════════════════════════════════════════════ */}
        <div className="pt-8 border-t border-[#1A1C22] space-y-3">
          <a href={`/api/report/pdf?id=${id}`} target="_blank" rel="noopener noreferrer"
             className="btn-primary w-full text-center block py-4">
            Download PDF Report ↓
          </a>
          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-ghost flex-1 text-center py-3 text-sm">
              ← Dashboard
            </Link>
            <Link href="/assessment" className="btn-ghost flex-1 text-center py-3 text-sm">
              Retake Assessment →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
