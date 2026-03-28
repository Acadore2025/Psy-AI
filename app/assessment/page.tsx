'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SessionQuestion } from '@/lib/questions/types'

type Answer = {
  question_id: string
  dimension: string
  facet: string
  question_type: string
  question_text: string
  answer: string
  timing_ms?: number
}

const LIKERT_LABELS = [
  { val:'5', short:'Strongly\nAgree' },
  { val:'4', short:'Agree' },
  { val:'3', short:'Neutral' },
  { val:'2', short:'Disagree' },
  { val:'1', short:'Strongly\nDisagree' },
]

export default function AssessmentPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<SessionQuestion[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [qi, setQi] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selected, setSelected] = useState<string>('')
  const [textVal, setTextVal] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [timerLeft, setTimerLeft] = useState(8)
  const [timerRunning, setTimerRunning] = useState(false)
  const [froze, setFroze] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const qStartRef = useRef<number>(Date.now())
  const firstKeyRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load profile and start session
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!prof?.country) { router.push('/signup'); return }
      setProfile(prof)

      // Create session and get questions
      const res = await fetch('/api/session', { method: 'POST' })
      const data = await res.json()

      if (data.error) { setError(data.error); setLoading(false); return }

      setQuestions(data.questions)
      setSessionId(data.session_id)
      setLoading(false)
      qStartRef.current = Date.now()
    }
    init()
  }, [router])

  const currentQ = questions[qi]

  // Start timer for IP questions
  useEffect(() => {
    if (!currentQ || currentQ.type !== 'IP') return
    setTimerLeft(8)
    setFroze(false)
    setTimerRunning(true)
    firstKeyRef.current = null
    qStartRef.current = Date.now()

    const interval = setInterval(() => {
      setTimerLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimerRunning(false)
          setFroze(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    timerRef.current = interval
    return () => clearInterval(interval)
  }, [qi, currentQ?.type])

  // Reset state when question changes
  useEffect(() => {
    setSelected('')
    setTextVal('')
    firstKeyRef.current = null
    qStartRef.current = Date.now()
  }, [qi])

  function onFirstKey() {
    if (!firstKeyRef.current) {
      firstKeyRef.current = Date.now() - qStartRef.current
    }
  }

  function selectOption(val: string) {
    onFirstKey()
    setSelected(val)
    // Auto-advance for IP questions (instant pick)
    if (currentQ?.type === 'IP') {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerRunning(false)
      setTimeout(() => advance(val), 400)
    }
  }

  async function advance(val?: string) {
    const q = currentQ
    if (!q) return

    const answerVal = val || selected || textVal
    if (!answerVal && q.type !== 'IP') return

    const answer: Answer = {
      question_id: q.question_id,
      dimension: q.dimension,
      facet: q.facet,
      question_type: q.type,
      question_text: q.text,
      answer: froze ? 'FREEZE — no answer given in time' : (answerVal || 'NO_ANSWER'),
      timing_ms: firstKeyRef.current || undefined,
    }

    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // Save response to DB (non-blocking)
    fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        response: { ...answer, country: profile?.country }
      })
    }).catch(console.error)

    // Check if done
    if (qi + 1 >= questions.length) {
      await finish(newAnswers)
    } else {
      setQi(qi + 1)
    }
  }

  async function finish(allAnswers: Answer[]) {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user!.id).single()

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          responses: allAnswers,
          user_context: {
            name: prof?.name || 'Unknown',
            age: prof?.age || 20,
            country: prof?.country || 'INDIA',
            persona: prof?.persona || 'general',
            jobTitle: prof?.job_title,
            domain: prof?.domain,
          }
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      router.push(`/report/${data.report_id}`)
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please try again.')
      setSubmitting(false)
    }
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (loading || submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
           style={{ position:'relative', zIndex:1 }}>
        <div className="logo">PSY<span>AI</span></div>
        {submitting ? (
          <>
            <p className="font-serif text-2xl text-paper text-center max-w-sm">
              Analyzing your responses across 8 dimensions...
            </p>
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-signal rounded-full animate-pulse-dot"
                     style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="text-xs text-dim text-center max-w-xs">
              Reading 70 answers simultaneously across personality, values, aptitude,
              thinking style, motivation, emotional makeup, and work preferences.
              This takes about 30 seconds.
            </p>
          </>
        ) : (
          <>
            <p className="text-dim text-sm">Preparing your questions...</p>
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-[#2A2C32] rounded-full animate-pulse-dot"
                     style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
           style={{ position:'relative', zIndex:1 }}>
        <div className="max-w-sm text-center">
          <p className="text-signal mb-4 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!currentQ) return null

  const pct = Math.round((qi / questions.length) * 100)
  const canAdvance = currentQ.type === 'CS'
    ? textVal.trim().length >= 10
    : !!selected || froze

  // ── ASSESSMENT UI ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ position:'relative', zIndex:1 }}>

      {/* Progress bar */}
      <div className="sticky top-0 z-40 bg-ink/95 backdrop-blur-sm border-b border-[#1A1C22]">
        <div className="flex items-center gap-4 px-4 md:px-8 py-4">
          <div className="logo text-[10px]">PSY<span>AI</span></div>
          <div className="flex-1">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="font-mono text-xs text-muted flex-shrink-0">
            {qi + 1} / {questions.length}
          </div>
        </div>

        {/* IP timer bar */}
        {currentQ.type === 'IP' && timerRunning && (
          <div className="h-[3px] bg-signal/20 overflow-hidden">
            <div className="timer-bar" />
          </div>
        )}
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8 pt-8">
        <div className="w-full max-w-2xl animate-fade-up" key={qi}>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] text-signal tracking-widest">
              Q{String(qi + 1).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium tracking-wider uppercase
                              text-dim bg-[#1A1C22] px-2 py-1 rounded-sm">
              {currentQ.facet}
            </span>
            {currentQ.type === 'IP' && (
              <span className="badge badge-signal ml-auto">
                ⚡ {timerLeft}s
              </span>
            )}
          </div>

          {/* Question text */}
          <h2 className="font-serif text-xl md:text-2xl text-paper leading-snug mb-8">
            {currentQ.text}
          </h2>

          {/* ── AG: Agree/Disagree ── */}
          {currentQ.type === 'AG' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                {LIKERT_LABELS.map(l => (
                  <button key={l.val}
                    onClick={() => selectOption(l.val)}
                    className={`flex flex-col items-center gap-2 flex-1 py-4 border
                      transition-all duration-150 rounded-sm
                      ${selected === l.val
                        ? 'border-signal bg-[#1A0F0A]'
                        : 'border-[#2A2C32] hover:border-[#3A3C42]'}`}>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
                      text-xs font-mono transition-all duration-150
                      ${selected === l.val
                        ? 'border-signal bg-signal text-white'
                        : 'border-[#3A3C42] text-dim'}`}>
                      {l.val}
                    </div>
                    <span className={`text-[10px] text-center leading-tight whitespace-pre-line
                      ${selected === l.val ? 'text-paper' : 'text-muted'}`}>
                      {l.short}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted px-1 mb-8">
                <span>Strongly Agree</span>
                <span>Strongly Disagree</span>
              </div>
            </div>
          )}

          {/* ── TC/IP: This or That / Instant Pick ── */}
          {(currentQ.type === 'TC' || currentQ.type === 'IP') && currentQ.options && (
            <div className="space-y-3 mb-8">
              {currentQ.options.map(opt => (
                <button key={opt.id}
                  onClick={() => selectOption(opt.id)}
                  className={`choice-btn ${selected === opt.id ? 'selected' : ''}`}>
                  <span className="font-mono text-[10px] text-signal mr-3">{opt.id}</span>
                  {opt.text}
                </button>
              ))}
              {currentQ.type === 'IP' && froze && (
                <div className="text-xs text-muted text-center py-2 border border-[#2A2C32] rounded-sm">
                  Time's up — moving on
                </div>
              )}
            </div>
          )}

          {/* ── SC: Situation Card ── */}
          {currentQ.type === 'SC' && currentQ.options && (
            <div className="space-y-2 mb-8">
              {currentQ.options.map(opt => (
                <button key={opt.id}
                  onClick={() => selectOption(opt.id)}
                  className={`choice-btn flex items-start gap-4 py-5
                    ${selected === opt.id ? 'selected' : ''}`}>
                  <span className={`font-mono text-xs flex-shrink-0 mt-0.5
                    ${selected === opt.id ? 'text-signal' : 'text-dim'}`}>
                    {opt.id}
                  </span>
                  <span className="text-left leading-relaxed">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── CS: Complete the Sentence ── */}
          {currentQ.type === 'CS' && (
            <div className="mb-8">
              <textarea
                className="answer-area"
                placeholder="Complete the sentence honestly — there is no right answer here..."
                value={textVal}
                onChange={e => { setTextVal(e.target.value); onFirstKey() }}
                rows={4}
                autoFocus
              />
              <p className="text-[10px] text-muted mt-2">
                Minimum 10 characters · {textVal.length} typed
              </p>
            </div>
          )}

          {/* Next button */}
          <button
            onClick={() => advance()}
            disabled={!canAdvance}
            className="btn-primary w-full py-4">
            {qi + 1 >= questions.length ? 'Complete Assessment →' : 'Next Question →'}
          </button>

          {/* Skip for non-IP questions (marks as no answer) */}
          {currentQ.type !== 'IP' && (
            <button
              onClick={() => { setSelected('SKIPPED'); advance('SKIPPED') }}
              className="btn-ghost w-full mt-2 text-xs">
              Skip this question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
