'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1|2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    country: '' as 'INDIA'|'USA'|'',
    age: '', persona: '' as 'school'|'college'|'professional'|'general'|'',
    jobTitle: '', domain: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleStep1() {
    if (!form.name.trim()) return setError('Please enter your name')
    if (!form.email.trim()) return setError('Please enter your email')
    if (!form.password || form.password.length < 8)
      return setError('Password must be at least 8 characters')
    if (!form.country) return setError('Please select your country')
    setError('')
    setStep(2)
  }

  async function handleSignup() {
    if (!form.age || parseInt(form.age) < 13)
      return setError('Please enter a valid age')
    if (!form.persona) return setError('Please select where you are in life')
    if (form.persona === 'professional' && !form.jobTitle.trim())
      return setError('Please enter your job title')

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name } }
      })

      if (authError) throw authError
      if (!data.user) throw new Error('Signup failed')

      // Determine age version
      const age = parseInt(form.age)
      const ageVersion = age <= 17 ? 'A' : age <= 22 ? 'B' : 'C'
      const finalAgeVersion = form.persona === 'professional' ? 'C' : ageVersion

      // Update profile
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        name: form.name,
        age,
        country: form.country,
        persona: form.persona,
        age_version: finalAgeVersion,
        job_title: form.jobTitle || null,
        domain: form.domain || null,
      })

      router.push('/assessment')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const PERSONAS = [
    { id:'school',       icon:'📚', title:'School Student',      desc:'Class 9–12. Figuring out stream or career direction.' },
    { id:'college',      icon:'🎓', title:'College Student',      desc:'Undergraduate or postgraduate. Choosing your path.' },
    { id:'professional', icon:'💼', title:'Working Professional', desc:'Currently employed. Exploring fit or what comes next.' },
    { id:'general',      icon:'🔍', title:'Exploring',            desc:'Between chapters. Want to understand yourself better.' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ position:'relative', zIndex:1 }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="logo inline-block">PSY<span>AI</span></Link>
        </div>

        <div className="card p-8">

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-8">
            <div className={`h-[3px] flex-1 rounded-sm transition-colors duration-300
              ${step >= 1 ? 'bg-signal' : 'bg-[#2A2C32]'}`} />
            <div className={`h-[3px] flex-1 rounded-sm transition-colors duration-300
              ${step >= 2 ? 'bg-signal' : 'bg-[#2A2C32]'}`} />
          </div>

          {step === 1 && (
            <div className="animate-fade-up">
              <h1 className="font-serif text-2xl text-paper mb-1">Create your account</h1>
              <p className="text-sm text-dim mb-8 leading-relaxed">
                Your assessment, your results, saved forever.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Your name</label>
                  <input className="form-input" placeholder="What should we call you?"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="your@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="At least 8 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Country</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['INDIA','USA'] as const).map(c => (
                      <button key={c} onClick={() => set('country', c)}
                        className={`py-3 border text-sm font-medium transition-all duration-150 rounded-sm
                          ${form.country === c
                            ? 'border-signal bg-[#1A0F0A] text-paper'
                            : 'border-[#2A2C32] text-dim hover:border-[#4A4C52]'}`}>
                        {c === 'INDIA' ? '🇮🇳 India' : '🇺🇸 United States'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-signal text-xs mt-4">{error}</p>}

              <button onClick={handleStep1}
                className="btn-primary w-full mt-6">
                Continue →
              </button>

              <p className="text-center text-xs text-muted mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-paper hover:text-signal transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-up">
              <h1 className="font-serif text-2xl text-paper mb-1">About you</h1>
              <p className="text-sm text-dim mb-8 leading-relaxed">
                This shapes which questions you get and how your report reads.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Your age</label>
                  <input className="form-input" type="number" min="13" max="90"
                    placeholder="Age" value={form.age}
                    onChange={e => set('age', e.target.value)} />
                </div>

                <div>
                  <label className="form-label">Where are you right now?</label>
                  <div className="space-y-2 mt-1">
                    {PERSONAS.map(p => (
                      <button key={p.id} onClick={() => set('persona', p.id)}
                        className={`w-full text-left flex items-start gap-3 p-4 border
                          transition-all duration-150 rounded-sm
                          ${form.persona === p.id
                            ? 'border-signal bg-[#1A0F0A]'
                            : 'border-[#2A2C32] hover:border-[#3A3C42]'}`}>
                        <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                        <div>
                          <div className={`text-sm font-medium mb-0.5
                            ${form.persona === p.id ? 'text-paper' : 'text-dim'}`}>
                            {p.title}
                          </div>
                          <div className="text-xs text-muted leading-relaxed">{p.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {form.persona === 'professional' && (
                  <div className="space-y-3 animate-fade-up">
                    <div>
                      <label className="form-label">Job title</label>
                      <input className="form-input"
                        placeholder="e.g. Software Engineer, Marketing Manager"
                        value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Industry</label>
                      <select className="form-input"
                        value={form.domain} onChange={e => set('domain', e.target.value)}>
                        <option value="">Select industry...</option>
                        {['Technology / IT','Finance / Banking','Marketing / Advertising',
                          'Sales / Business Development','Human Resources','Operations',
                          'Consulting / Strategy','Healthcare / Pharma','Education / Training',
                          'Media / Content','Design / Creative','Legal','Manufacturing',
                          'Government / Public sector','Startup / Entrepreneurship','Other'
                        ].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-signal text-xs mt-4">{error}</p>}

              <button onClick={handleSignup} disabled={loading}
                className="btn-primary w-full mt-6">
                {loading ? 'Creating account...' : 'Begin Assessment →'}
              </button>

              <button onClick={() => { setStep(1); setError('') }}
                className="btn-ghost w-full mt-2 text-sm">
                ← Back
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6 leading-relaxed">
          Your answers are processed in real-time. No raw responses stored.
          No account sharing. No ads. Ever.
        </p>
      </div>
    </div>
  )
}
