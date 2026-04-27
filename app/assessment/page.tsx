'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SessionQuestion } from '@/lib/questions/types'

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
type Answer = {
  question_id: string
  dimension: string
  facet: string
  question_type: string
  question_text: string
  answer: string
  timing_ms?: number
}

type InputMode = 'text' | 'voice'

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────
const LIKERT_LABELS = [
  { val: '5', short: 'Strongly\nAgree' },
  { val: '4', short: 'Agree' },
  { val: '3', short: 'Neutral' },
  { val: '2', short: 'Disagree' },
  { val: '1', short: 'Strongly\nDisagree' },
]

// ─────────────────────────────────────────────────────────────────────
// Voice helpers
// ─────────────────────────────────────────────────────────────────────

/** Returns the SpeechRecognition constructor — works in Chrome, Edge, Safari. */
function getSpeechRecognition(): SpeechRecognitionStatic | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

/** True when running on HTTPS or localhost (required for mic access). */
function isSecureOrigin(): boolean {
  if (typeof window === 'undefined') return true
  const { protocol, hostname } = window.location
  return (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  )
}

/** True when running in Safari (used for workarounds). */
function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/** Match spoken text to an AG Likert scale value. */
function matchAGVoice(t: string): string | null {
  const s = t.toLowerCase().trim()
  if (s.includes('strongly agree')    || s === '5') return '5'
  if (s.includes('strongly disagree') || s === '1') return '1'
  if (s.includes('agree')             || s === '4') return '4'
  if (s.includes('disagree')          || s === '2') return '2'
  if (s.includes('neutral') || s.includes('neither') || s === '3') return '3'
  return null
}

/** Match spoken text to one of the option IDs or their text. */
function matchOptionVoice(
  t: string,
  options: { id: string; text: string }[]
): string | null {
  const s = t.toLowerCase().trim()
  for (const opt of options) {
    const id = opt.id.toLowerCase()
    if (s === id || s.startsWith(id + ' ') || s.startsWith(id + '.')) return opt.id
    const snippet = opt.text.toLowerCase().split(' ').slice(0, 4).join(' ')
    if (snippet.length >= 6 && s.includes(snippet.slice(0, snippet.length - 1)))
      return opt.id
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function MicButton({
  isListening,
  disabled,
  onClick,
}: {
  isListening: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      className={`w-20 h-20 rounded-full flex items-center justify-center
        transition-all duration-200 border-2 relative
        ${
          disabled
            ? 'border-[#1A1C22] opacity-40 cursor-not-allowed'
            : isListening
            ? 'border-signal bg-signal/10 scale-110'
            : 'border-[#2A2C32] bg-[#131520] hover:border-signal hover:scale-105'
        }`}
    >
      {isListening && !disabled && (
        <span className="absolute inset-0 rounded-full border border-signal/40 animate-ping" />
      )}
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke={isListening && !disabled ? '#C8411A' : '#5C5850'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8"  y1="23" x2="16" y2="23" />
      </svg>
    </button>
  )
}

function InputModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode
  onChange: (m: InputMode) => void
}) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0 bg-[#1A1C22] rounded-sm p-0.5">
      <button
        onClick={() => onChange('text')}
        title="Type your answer"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-medium
          transition-all duration-150
          ${mode === 'text' ? 'bg-[#2A2C32] text-paper' : 'text-muted hover:text-paper'}`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="7" y1="8"  x2="17" y2="8"  />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="7" y1="16" x2="13" y2="16" />
        </svg>
        Write
      </button>
      <button
        onClick={() => onChange('voice')}
        title="Speak your answer"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-medium
          transition-all duration-150
          ${mode === 'voice' ? 'bg-[#2A2C32] text-paper' : 'text-muted hover:text-paper'}`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8"  y1="23" x2="16" y2="23" />
        </svg>
        Voice
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────
export default function AssessmentPage() {
  const router = useRouter()

  // Session
  const [questions,  setQuestions]  = useState<SessionQuestion[]>([])
  const [sessionId,  setSessionId]  = useState('')
  const [qi,         setQi]         = useState(0)
  const [answers,    setAnswers]     = useState<Answer[]>([])
  const [selected,   setSelected]   = useState('')
  const [textVal,    setTextVal]     = useState('')
  const [loading,    setLoading]     = useState(true)
  const [submitting, setSubmitting]  = useState(false)
  const [error,      setError]       = useState('')
  const [profile,    setProfile]     = useState<any>(null)

  // IP timer
  const [timerLeft,    setTimerLeft]    = useState(8)
  const [timerRunning, setTimerRunning] = useState(false)
  const [froze,        setFroze]        = useState(false)

  // Voice
  const [inputMode,       setInputMode]       = useState<InputMode>('text')
  const [isListening,     setIsListening]     = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError,      setVoiceError]      = useState('')
  // FIX 2: detect browser support separately (Firefox has neither variant)
  const [voiceSupported,  setVoiceSupported]  = useState(false)
  // FIX 1: detect insecure origin (HTTP outside localhost)
  const [insecureOrigin,  setInsecureOrigin]  = useState(false)

  // Refs
  const qStartRef         = useRef<number>(Date.now())
  const firstKeyRef       = useRef<number | null>(null)
  const timerRef          = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef    = useRef<SpeechRecognition | null>(null)
  const currentQRef       = useRef<SessionQuestion | null>(null)
  // FIX 3 (Safari): accumulate transcript here; process in onend, not onresult
  const lastTranscriptRef = useRef('')
  // FIX 5 (Safari CS): need to know inputMode inside recognition callbacks
  const inputModeRef      = useRef<InputMode>('text')

  // ── Boot ──────────────────────────────────────────────────────
  useEffect(() => {
    setInsecureOrigin(!isSecureOrigin())
    setVoiceSupported(getSpeechRecognition() !== null)
  }, [])

  // Keep refs in sync so recognition callbacks never go stale
  useEffect(() => {
    currentQRef.current = questions[qi] ?? null
  }, [qi, questions])

  useEffect(() => {
    inputModeRef.current = inputMode
  }, [inputMode])

  // Load profile and create session
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!prof?.country) { router.push('/signup'); return }
      setProfile(prof)

      const res  = await fetch('/api/session', { method: 'POST' })
      const data = await res.json()

      if (data.error) { setError(data.error); setLoading(false); return }
      setQuestions(data.questions)
      setSessionId(data.session_id)
      setLoading(false)
      qStartRef.current = Date.now()
    }
    init()
  }, [router])

  // IP countdown timer
  useEffect(() => {
    const q = questions[qi]
    if (!q || q.type !== 'IP') return
    setTimerLeft(8)
    setFroze(false)
    setTimerRunning(true)
    firstKeyRef.current = null
    qStartRef.current   = Date.now()

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
  }, [qi, questions])

  // FIX 4: when IP timer freezes, stop the mic immediately
  useEffect(() => {
    if (froze) stopListening()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [froze])

  // FIX 4: auto-start mic for IP questions when voice mode is active
  useEffect(() => {
    if (inputMode !== 'voice' || !voiceSupported || insecureOrigin) return
    const q = questions[qi]
    if (!q || q.type !== 'IP') return
    const t = setTimeout(() => startListening(), 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, inputMode, voiceSupported, questions, insecureOrigin])

  // Reset per-question state
  useEffect(() => {
    setSelected('')
    setTextVal('')
    setVoiceTranscript('')
    setVoiceError('')
    lastTranscriptRef.current = ''
    firstKeyRef.current = null
    qStartRef.current   = Date.now()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    setIsListening(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi])

  // ── Helpers ───────────────────────────────────────────────────
  function onFirstKey() {
    if (!firstKeyRef.current) {
      firstKeyRef.current = Date.now() - qStartRef.current
    }
  }

  function selectOption(val: string) {
    onFirstKey()
    setSelected(val)
    const q = questions[qi]
    if (q?.type === 'IP') {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerRunning(false)
      setTimeout(() => advance(val), 400)
    }
  }

  // ── Voice ─────────────────────────────────────────────────────
  function handleModeChange(m: InputMode) {
    stopListening()
    setInputMode(m)
    setVoiceError('')
    setVoiceTranscript('')
    lastTranscriptRef.current = ''
  }

  // useCallback so the IP auto-start effect can depend on it safely
  const startListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) return

    // FIX 1: refuse to start on insecure origins
    if (!isSecureOrigin()) {
      setVoiceError('Voice input requires HTTPS. Please deploy to Vercel or use localhost.')
      return
    }

    // Tear down any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }

    setVoiceError('')
    setVoiceTranscript('')
    lastTranscriptRef.current = ''

    const safari = isSafariBrowser()

    const recognition = new SR()
    // FIX 5 (Safari): Safari's continuous mode is unreliable.
    // For CS on Safari we use single-shot and re-start automatically in onend.
    recognition.continuous     = currentQRef.current?.type === 'CS' && !safari
    recognition.interimResults = true
    recognition.lang           = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      onFirstKey()
    }

    // FIX 3 (Safari): accumulate ALL results into a ref.
    // Don't act on isFinal here — do it in onend which fires reliably everywhere.
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let combined = ''
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript
      }
      const t = combined.trim()
      lastTranscriptRef.current = t
      setVoiceTranscript(t)

      // For CS: stream words into the textarea live
      if (currentQRef.current?.type === 'CS') {
        setTextVal(t)
        onFirstKey()
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          setVoiceError(
            'Microphone access denied. Click the padlock in the address bar and allow the microphone.'
          )
          break
        case 'no-speech':
          // Silently ignore — user just didn't speak yet
          break
        case 'network':
          setVoiceError('Network error. Check your connection and try again.')
          break
        default:
          setVoiceError(`Voice error (${event.error}). Please try again.`)
      }
    }

    // FIX 3 + FIX 5: do all matching here in onend.
    // This is the only event that fires reliably on Chrome, Edge, AND Safari.
    recognition.onend = () => {
      setIsListening(false)

      const q = currentQRef.current
      if (!q) return

      const t = lastTranscriptRef.current

      if (q.type === 'CS') {
        // Transcript is already in textVal from onresult.
        // FIX 5 (Safari): re-start so the user can keep speaking naturally.
        if (safari && inputModeRef.current === 'voice') {
          setTimeout(() => {
            if (currentQRef.current?.type === 'CS') startListening()
          }, 300)
        }
        return
      }

      // Choice questions: match the last spoken phrase
      if (!t) return

      let matched: string | null = null
      if (q.type === 'AG') {
        matched = matchAGVoice(t)
      } else if (q.options) {
        matched = matchOptionVoice(t, q.options)
      }

      if (matched) {
        setVoiceTranscript(`✓ "${t}" → ${matched}`)
        selectOption(matched)
      } else {
        setVoiceError(`Couldn't match "${t}". Try again or click an option below.`)
        setVoiceTranscript('')
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (_) {
      // Swallow "already started" race condition
      setIsListening(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopListening() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  function toggleListening() {
    if (isListening) stopListening()
    else startListening()
  }

  // ── Advance ──────────────────────────────────────────────────
  async function advance(val?: string) {
    const q = questions[qi]
    if (!q) return

    const answerVal = val ?? (selected || textVal)
    if (!answerVal && q.type !== 'IP') return

    const answer: Answer = {
      question_id:   q.question_id,
      dimension:     q.dimension,
      facet:         q.facet,
      question_type: q.type,
      question_text: q.text,
      answer: froze
        ? 'FREEZE — no answer given in time'
        : answerVal || 'NO_ANSWER',
      timing_ms: firstKeyRef.current ?? undefined,
    }

    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        response:   { ...answer, country: profile?.country },
      }),
    }).catch(console.error)

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

      const res  = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          responses:  allAnswers,
          user_context: {
            name:     prof?.name     || 'Unknown',
            age:      prof?.age      || 20,
            country:  prof?.country  || 'INDIA',
            persona:  prof?.persona  || 'general',
            jobTitle: prof?.job_title,
            domain:   prof?.domain,
          },
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      router.push(`/report/${data.report_id}`)
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please try again.')
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Loading / error screens
  // ─────────────────────────────────────────────────────────────
  if (loading || submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
           style={{ position: 'relative', zIndex: 1 }}>
        <div className="logo">PSY<span>AI</span></div>
        {submitting ? (
          <>
            <p className="font-serif text-2xl text-paper text-center max-w-sm">
              Analyzing your responses across 8 dimensions...
            </p>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
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
              {[0, 1, 2].map(i => (
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
           style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-sm text-center">
          <p className="text-signal mb-4 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questions[qi]
  if (!currentQ) return null

  const pct        = Math.round((qi / questions.length) * 100)
  const canAdvance = currentQ.type === 'CS'
    ? textVal.trim().length >= 10
    : !!selected || froze

  const voiceHint =
    currentQ.type === 'AG'
      ? 'Say "Strongly Agree", "Agree", "Neutral", "Disagree", or "Strongly Disagree"'
      : currentQ.type === 'CS'
      ? 'Speak your answer — it transcribes live and you can edit it before submitting'
      : `Say the option letter: ${currentQ.options?.map(o => `"${o.id}"`).join(', ')}`

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-ink/95 backdrop-blur-sm border-b border-[#1A1C22]">

        {/* FIX 1: HTTPS warning — only shown when voice mode is active on HTTP */}
        {insecureOrigin && inputMode === 'voice' && (
          <div className="bg-[#1A1000] border-b border-gold/30 px-4 py-2 text-center">
            <p className="text-[11px] text-gold">
              ⚠ Voice input requires HTTPS. It will work on Vercel — use Write mode for now on localhost HTTP.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 md:px-8 py-4">
          <div className="logo text-[10px]">PSY<span>AI</span></div>

          <div className="flex-1">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* FIX 2: toggle hidden in Firefox (no SpeechRecognition at all) */}
          {voiceSupported && (
            <InputModeToggle mode={inputMode} onChange={handleModeChange} />
          )}

          <div className="font-mono text-xs text-muted flex-shrink-0">
            {qi + 1} / {questions.length}
          </div>
        </div>

        {currentQ.type === 'IP' && timerRunning && (
          <div className="h-[3px] bg-signal/20 overflow-hidden">
            <div className="timer-bar" />
          </div>
        )}
      </div>

      {/* ── Question area ─────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8 pt-8">
        <div className="w-full max-w-2xl animate-fade-up" key={qi}>

          {/* Meta row */}
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] text-signal tracking-widest">
              Q{String(qi + 1).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium tracking-wider uppercase text-dim bg-[#1A1C22] px-2 py-1 rounded-sm">
              {currentQ.facet}
            </span>
            {currentQ.type === 'IP' && (
              <span className="badge badge-signal ml-auto">⚡ {timerLeft}s</span>
            )}
            {inputMode === 'voice' && voiceSupported && currentQ.type !== 'IP' && (
              <span className={`badge ml-auto ${isListening ? 'badge-signal' : 'badge-teal'}`}>
                {isListening ? '● Recording' : '🎙 Voice on'}
              </span>
            )}
          </div>

          {/* Question text */}
          <h2 className="font-serif text-xl md:text-2xl text-paper leading-snug mb-8">
            {currentQ.text}
          </h2>

          {/* ═══════════════════════════════════════════════
              VOICE PANEL
          ═══════════════════════════════════════════════ */}
          {inputMode === 'voice' && voiceSupported && (
            <div className="mb-6">
              <p className="text-[11px] text-muted mb-5 leading-relaxed border-l-2 border-[#2A2C32] pl-3 italic">
                {voiceHint}
              </p>

              {/* FIX 4: IP auto-listens — show status only, no manual button */}
              {currentQ.type === 'IP' ? (
                <div className="flex flex-col items-center gap-3 py-4 border border-[#1A1C22] bg-[#0A0C12] rounded-sm mb-4">
                  <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-signal animate-pulse' : 'bg-[#2A2C32]'}`} />
                  <p className="text-xs text-muted">
                    {isListening
                      ? <span className="text-signal">Listening automatically…</span>
                      : froze ? "Time's up" : 'Starting mic…'}
                  </p>
                  {voiceTranscript && (
                    <div className="w-full max-w-sm px-4 py-2 border border-[#2A2C32] bg-[#131520] text-sm text-paper rounded-sm text-center">
                      {voiceTranscript}
                    </div>
                  )}
                  {voiceError && (
                    <p className="text-xs text-signal text-center px-4">{voiceError}</p>
                  )}
                </div>
              ) : (
                /* Manual mic for AG, TC, SC, CS */
                <div className="flex flex-col items-center gap-4 py-6 border border-[#1A1C22] bg-[#0A0C12] rounded-sm">
                  <MicButton
                    isListening={isListening}
                    disabled={insecureOrigin}
                    onClick={toggleListening}
                  />
                  <p className="text-xs text-muted">
                    {insecureOrigin
                      ? 'Requires HTTPS — use Write mode or deploy to Vercel'
                      : isListening
                      ? <span className="text-signal">Listening… tap to stop</span>
                      : 'Tap to speak'}
                  </p>
                  {voiceTranscript && (
                    <div className={`w-full max-w-sm px-4 py-2.5 border text-sm rounded-sm text-center transition-colors
                      ${voiceTranscript.startsWith('✓')
                        ? 'border-teal bg-[#0A1A18] text-teal'
                        : 'border-[#2A2C32] bg-[#131520] text-paper'}`}>
                      {voiceTranscript}
                    </div>
                  )}
                  {voiceError && (
                    <p className="text-xs text-signal text-center px-4">{voiceError}</p>
                  )}
                </div>
              )}

              {/* CS: editable transcription area */}
              {currentQ.type === 'CS' && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
                    Transcribed answer — edit freely before submitting
                  </p>
                  <textarea
                    className="answer-area"
                    placeholder="Your spoken words appear here. You can also type or correct…"
                    value={textVal}
                    onChange={e => { setTextVal(e.target.value); onFirstKey() }}
                    rows={4}
                  />
                  <p className="text-[10px] text-muted mt-2">
                    Minimum 10 characters · {textVal.length} typed
                  </p>
                </div>
              )}

              {/* Divider: "or select below" for choice types */}
              {currentQ.type !== 'CS' && (
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px bg-[#1E2028]" />
                  <span className="text-[10px] text-muted uppercase tracking-wider whitespace-nowrap">
                    or select below
                  </span>
                  <div className="flex-1 h-px bg-[#1E2028]" />
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              ANSWER OPTIONS
          ═══════════════════════════════════════════════ */}

          {/* AG: Agree / Disagree */}
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

          {/* TC / IP: This or That / Instant Pick */}
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

          {/* SC: Situation Card */}
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

          {/* CS: Complete the Sentence — text mode */}
          {currentQ.type === 'CS' && inputMode === 'text' && (
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

          {/* Next / Complete */}
          <button
            onClick={() => advance()}
            disabled={!canAdvance}
            className="btn-primary w-full py-4"
          >
            {qi + 1 >= questions.length ? 'Complete Assessment →' : 'Next Question →'}
          </button>

          {/* Skip (non-IP only) */}
          {currentQ.type !== 'IP' && (
            <button
              onClick={() => { setSelected('SKIPPED'); advance('SKIPPED') }}
              className="btn-ghost w-full mt-2 text-xs"
            >
              Skip this question
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
