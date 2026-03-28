'use client'
import Link from 'next/link'

const STATS = [
  { n: '480', label: 'Questions in bank' },
  { n: '70',  label: 'Per session' },
  { n: '8',   label: 'Dimensions measured' },
  { n: '10',  label: 'Career worlds mapped' },
]

const DIFFERENTIATORS = [
  {
    icon: '⚡',
    title: 'Behavioral — not self-report',
    body: 'Timed pressure choices, contradiction detection, and linguistic analysis reveal what you actually are — not what you think you are.',
  },
  {
    icon: '🌍',
    title: 'India and USA — both countries',
    body: 'Every question exists in two versions. Every career has India and USA pathways, institutions, and salary data.',
  },
  {
    icon: '🔁',
    title: 'Retake 6 times — fresh questions',
    body: 'Your answered question IDs are tracked. Every retake draws from unanswered questions. Same personality. New questions.',
  },
  {
    icon: '✉️',
    title: 'The report nobody else writes',
    body: 'The first paragraph says something true about you that you have never been told before. That is the standard we build to.',
  },
]

export default function LandingPage() {
  return (
    <main className="relative min-h-screen flex flex-col" style={{ zIndex: 1 }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-16 py-6
                      border-b border-[#1A1C22] sticky top-0 z-50
                      bg-ink/90 backdrop-blur-sm">
        <div className="logo">PSY<span>AI</span></div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-xs py-2 px-4">Sign In</Link>
          <Link href="/signup" className="btn-primary text-xs py-2 px-4">Start Free →</Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center
                           text-center px-6 py-24 md:py-36">

        <div className="badge badge-signal mb-8">
          <span className="w-1.5 h-1.5 bg-signal rounded-full animate-pulse-dot"></span>
          World-class behavioral intelligence
        </div>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl
                        leading-[0.92] tracking-tight text-paper
                        max-w-4xl mx-auto mb-6">
          Know yourself.<br/>
          <em className="text-[#7A7060] not-italic">Really.</em>
        </h1>

        <p className="text-base md:text-lg text-dim max-w-xl mx-auto
                       leading-relaxed mb-10">
          Not a personality quiz. A behavioral intelligence system that reads
          how you{' '}actually{' '}think, decide, and respond — across 8 dimensions,
          70 questions, 25 minutes. The report tells you something you have
          never been told before.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link href="/signup" className="btn-primary px-8 py-4 text-base">
            Take the Assessment →
          </Link>
          <Link href="#how" className="btn-ghost px-8 py-4 text-base">
            See how it works
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px
                         bg-[#1A1C22] border border-[#1A1C22]
                         max-w-2xl w-full mx-auto">
          {STATS.map(s => (
            <div key={s.n} className="bg-ink flex flex-col items-center
                                        justify-center py-6 px-4">
              <div className="font-serif text-3xl text-paper mb-1">{s.n}</div>
              <div className="text-xs text-muted tracking-wide text-center">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" className="px-6 md:px-16 py-24 border-t border-[#1A1C22]">
        <div className="max-w-4xl mx-auto">
          <p className="sec-tag text-center">How it works</p>
          <h2 className="font-serif text-4xl md:text-5xl text-paper
                           text-center mb-16 max-w-2xl mx-auto leading-tight">
            Five question formats. Zero right answers.
          </h2>

          <div className="grid md:grid-cols-5 gap-px bg-[#1A1C22] border border-[#1A1C22]">
            {[
              { code:'AG', name:'Agree / Disagree', count:'20', desc:'Baseline across all 8 dimensions.' },
              { code:'TC', name:'This or That',     count:'15', desc:'Forced choice. Values under pressure.' },
              { code:'SC', name:'Situation Card',   count:'15', desc:'Real scenarios. 4 options. What do you actually do.' },
              { code:'IP', name:'Instant Pick',     count:'10', desc:'8-second timer. No thinking allowed.' },
              { code:'CS', name:'Complete the Sentence', count:'10', desc:'The questions that make the report feel personal.' },
            ].map(f => (
              <div key={f.code} className="bg-ink p-6">
                <div className="font-mono text-[10px] text-signal tracking-widest mb-3">{f.code}</div>
                <div className="text-sm font-medium text-paper mb-1">{f.name}</div>
                <div className="font-serif text-2xl text-muted mb-3">{f.count}</div>
                <div className="text-xs text-dim leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ──────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-[#1A1C22]">
        <div className="max-w-4xl mx-auto">
          <p className="sec-tag text-center">Why different</p>
          <h2 className="font-serif text-4xl md:text-5xl text-paper
                           text-center mb-16 max-w-2xl mx-auto leading-tight">
            What Mindler and Edumilestones cannot do
          </h2>

          <div className="grid md:grid-cols-2 gap-px bg-[#1A1C22] border border-[#1A1C22]">
            {DIFFERENTIATORS.map(d => (
              <div key={d.title} className="bg-ink p-8">
                <div className="text-2xl mb-4">{d.icon}</div>
                <h3 className="text-paper font-medium mb-2">{d.title}</h3>
                <p className="text-sm text-dim leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REPORT PREVIEW ───────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-[#1A1C22]">
        <div className="max-w-4xl mx-auto">
          <p className="sec-tag text-center">The report</p>
          <h2 className="font-serif text-4xl md:text-5xl text-paper
                           text-center mb-4 max-w-2xl mx-auto leading-tight">
            Eight sections. Every line earns its place.
          </h2>
          <p className="text-dim text-center mb-16 max-w-xl mx-auto text-sm leading-relaxed">
            Not 34 pages of bar charts. Not templates. A report written
            specifically for one person — because it was.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { n:'01', title:'Who You Actually Are',     sub:'The paragraph that creates the "how did it know that" moment.' },
              { n:'02', title:'Top 10 Career Matches',    sub:'Behaviorally justified. Not percentage-matched.' },
              { n:'03', title:'Career Domain Scores',     sub:'10 career worlds. Where you belong and why.' },
              { n:'04', title:'Your Natural Strengths',   sub:'What feels effortless to you that others find hard.' },
              { n:'05', title:'Under Pressure',           sub:'Who you actually become when things go wrong.' },
              { n:'06', title:'What Drives You',          sub:'Stated motivation vs revealed motivation. The gap named clearly.' },
              { n:'07', title:'Your Blind Spots',         sub:'Written with care. Not softened.' },
              { n:'08', title:'30-Day Action Plan',       sub:'Three steps. This week, this month, three months.' },
            ].map(s => (
              <div key={s.n} className="flex gap-4 p-5 border border-[#1A1C22]
                                          bg-[#0A0C12] hover:border-[#2A2C32]
                                          transition-colors duration-200">
                <div className="font-mono text-xs text-signal opacity-60 pt-0.5 flex-shrink-0">{s.n}</div>
                <div>
                  <div className="text-sm font-medium text-paper mb-1">{s.title}</div>
                  <div className="text-xs text-dim leading-relaxed">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-[#1A1C22]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl text-paper mb-4 leading-tight">
            Ready to find out<br/>
            <em className="text-[#7A7060] not-italic">who you actually are?</em>
          </h2>
          <p className="text-dim text-sm mb-8 leading-relaxed">
            25 minutes. 70 questions. A report that tells you something
            you have never been told before.
          </p>
          <Link href="/signup" className="btn-primary px-10 py-4 text-base">
            Start Your Assessment →
          </Link>
          <p className="text-xs text-muted mt-4">
            India · USA · Students · Professionals · Parents
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-[#1A1C22] px-6 md:px-16 py-8
                          flex items-center justify-between">
        <div className="logo">PSY<span>AI</span></div>
        <p className="text-xs text-muted">
          © 2026 PsyAI. All rights reserved.
        </p>
      </footer>

    </main>
  )
}
