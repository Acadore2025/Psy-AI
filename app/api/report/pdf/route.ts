import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get('id')
  if (!reportId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: reportData }, { data: profile }] = await Promise.all([
      supabase.from('reports').select('report_json, created_at').eq('id', reportId).eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

    if (!reportData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const r    = reportData.report_json
    const isIndia = (profile?.country || 'INDIA') === 'INDIA'
    const date = new Date(reportData.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    const validity = new Date(new Date(reportData.created_at).setFullYear(
      new Date(reportData.created_at).getFullYear() + 1
    )).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })

    // ── Color palette ─────────────────────────────────────────────────
    const C = {
      signal:   '#C8411A',
      signalLt: '#FFF0EB',
      teal:     '#1A7A6E',
      tealLt:   '#EBF5F4',
      gold:     '#C4871A',
      goldLt:   '#FFF8EC',
      purple:   '#6B46C1',
      purpleLt: '#F3EFFE',
      blue:     '#1D6FA4',
      blueLt:   '#EBF4FB',
      ink:      '#0D0F14',
      paper:    '#F8F6F2',
      muted:    '#9A9489',
      dim:      '#5C5850',
      line:     '#E8E4DC',
    }

    // ── Dimension color map ───────────────────────────────────────────
    const dimColors: Record<string, { bg: string; accent: string; text: string }> = {
      D1: { bg: '#FFF0EB', accent: C.signal,  text: '#7A200A' },
      D2: { bg: '#EBF4FB', accent: C.blue,    text: '#0D3D5C' },
      D3: { bg: '#EBF5F4', accent: C.teal,    text: '#0A3D36' },
      D4: { bg: '#FFF8EC', accent: C.gold,    text: '#6B4500' },
      D5: { bg: '#F3EFFE', accent: C.purple,  text: '#3D1F8C' },
      D6: { bg: '#FFF0EB', accent: C.signal,  text: '#7A200A' },
      D7: { bg: '#EBF4FB', accent: C.blue,    text: '#0D3D5C' },
      D8: { bg: '#EBF5F4', accent: C.teal,    text: '#0A3D36' },
    }

    const dimNames: Record<string, string> = {
      D1:'Personality', D2:'Interests', D3:'Aptitude', D4:'Values',
      D5:'Emotional Makeup', D6:'Motivation', D7:'Thinking Style', D8:'Work Style',
    }

    // ── Helpers ───────────────────────────────────────────────────────
    function inlineBar(pct: number, color: string, height = 10) {
      const p = Math.min(100, Math.max(0, pct))
      return `<div style="background:#E8E4DC;border-radius:6px;height:${height}px;overflow:hidden;width:100%">
        <div style="width:${p}%;height:100%;background:${color};border-radius:6px"></div>
      </div>`
    }

    function pill(text: string, bg: string, color: string) {
      return `<span style="background:${bg};color:${color};font-size:9px;font-weight:700;
        letter-spacing:0.06em;padding:3px 9px;border-radius:20px;display:inline-block">${text}</span>`
    }

    function sectionHeader(num: string, title: string, color = C.signal) {
      return `<div style="display:flex;align-items:center;gap:14px;margin:0 0 20px;page-break-after:avoid">
        <div style="background:${color};color:#fff;font-size:9px;font-weight:800;
          letter-spacing:0.14em;padding:6px 12px;border-radius:4px;flex-shrink:0;white-space:nowrap">
          SECTION ${num}
        </div>
        <div style="font-family:'Instrument Serif',Georgia,serif;font-size:20px;
          font-weight:400;color:${C.ink};">${title}</div>
        <div style="flex:1;height:1px;background:${C.line}"></div>
      </div>`
    }

    function paraText(text: string) {
      if (!text) return ''
      return text.split(/\n\n+/).map((p, i) =>
        `<p style="font-size:10.5pt;color:${i === 0 ? C.ink : C.dim};
          line-height:1.85;margin:0 0 14px;font-weight:${i === 0 ? '500' : '400'}">${p.trim()}</p>`
      ).join('')
    }

    // ── Accuracy ring (SVG) ───────────────────────────────────────────
    const accNum = parseInt(r.accuracy_confidence) || 0
    const circum = 2 * Math.PI * 54
    const dash   = (accNum / 100) * circum
    const accRing = `<svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="54" fill="none" stroke="#E8E4DC" stroke-width="10"/>
      <circle cx="70" cy="70" r="54" fill="none" stroke="${C.signal}" stroke-width="10"
        stroke-dasharray="${dash} ${circum}" stroke-dashoffset="${circum * 0.25}"
        stroke-linecap="round" transform="rotate(-90 70 70)"/>
      <text x="70" y="64" text-anchor="middle" font-family="DM Mono,monospace"
        font-size="22" font-weight="700" fill="${C.signal}">${accNum}%</text>
      <text x="70" y="82" text-anchor="middle" font-family="DM Sans,sans-serif"
        font-size="10" fill="${C.muted}">accuracy</text>
    </svg>`

    // ── Cover ─────────────────────────────────────────────────────────
    const cover = `
    <div style="min-height:100vh;display:flex;flex-direction:column;background:#fff">

      <!-- Red top bar -->
      <div style="background:${C.signal};height:6px"></div>

      <div style="flex:1;padding:44px 52px;display:flex;flex-direction:column">

        <!-- Logo row -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:52px">
          <div style="font-family:'DM Mono',monospace;font-size:15px;letter-spacing:0.2em;color:${C.ink};font-weight:500">
            PSY<span style="color:${C.signal}">AI</span>
          </div>
          <div style="width:1px;height:18px;background:${C.line}"></div>
          <div style="font-size:10px;color:${C.muted};letter-spacing:0.08em">Behavioral Intelligence Platform</div>
        </div>

        <!-- Tag + Title -->
        <div style="margin-bottom:36px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;
            color:${C.signal};font-weight:800;margin-bottom:14px">
            Psychometric Assessment Report
          </div>
          <div style="font-family:'Instrument Serif',Georgia,serif;font-size:46px;
            line-height:1.02;color:${C.ink};margin-bottom:14px">
            Behavioral<br>Intelligence<br><em style="color:${C.muted}">Profile</em>
          </div>
          <p style="font-size:11pt;color:${C.muted};max-width:380px;line-height:1.7;margin:0">
            A comprehensive analysis across 8 behavioral dimensions,<br>
            mapped to career paths and growth opportunities.
          </p>
        </div>

        <!-- Red gradient divider -->
        <div style="height:3px;background:linear-gradient(to right,${C.signal},${C.gold},${C.teal});
          border-radius:2px;margin-bottom:40px"></div>

        <!-- User + Accuracy grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 140px;gap:32px;margin-bottom:36px;align-items:start">

          <!-- User details -->
          <div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
              color:${C.muted};margin-bottom:10px;font-weight:700">Report Prepared For</div>
            <div style="font-family:'Instrument Serif',Georgia,serif;font-size:28px;
              color:${C.signal};margin-bottom:10px">${profile?.name || 'User'}</div>
            <table style="font-size:10pt;color:${C.dim};line-height:2;border-spacing:0">
              ${profile?.age ? `<tr><td style="color:${C.muted};padding-right:12px">Age</td><td style="font-weight:500;color:${C.ink}">${profile.age}</td></tr>` : ''}
              ${profile?.country ? `<tr><td style="color:${C.muted};padding-right:12px">Country</td><td style="font-weight:500;color:${C.ink}">${profile.country}</td></tr>` : ''}
              ${profile?.persona ? `<tr><td style="color:${C.muted};padding-right:12px">Profile</td><td style="font-weight:500;color:${C.ink}">${profile.persona.charAt(0).toUpperCase() + profile.persona.slice(1)}</td></tr>` : ''}
              ${profile?.job_title ? `<tr><td style="color:${C.muted};padding-right:12px">Role</td><td style="font-weight:500;color:${C.ink}">${profile.job_title}</td></tr>` : ''}
              ${profile?.domain ? `<tr><td style="color:${C.muted};padding-right:12px">Industry</td><td style="font-weight:500;color:${C.ink}">${profile.domain}</td></tr>` : ''}
            </table>
          </div>

          <!-- Report details -->
          <div>
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
              color:${C.muted};margin-bottom:10px;font-weight:700">Report Details</div>
            <table style="font-size:10pt;color:${C.dim};line-height:2;border-spacing:0">
              <tr><td style="color:${C.muted};padding-right:12px">Generated</td><td style="font-weight:500;color:${C.ink}">${date}</td></tr>
              <tr><td style="color:${C.muted};padding-right:12px">Valid Until</td><td style="font-weight:500;color:${C.ink}">${validity}</td></tr>
              <tr><td style="color:${C.muted};padding-right:12px">Questions</td><td style="font-weight:500;color:${C.ink}">70 across 8 dimensions</td></tr>
              <tr><td style="color:${C.muted};padding-right:12px">Guna</td><td style="font-weight:500;color:${C.ink}">${(r.dominant_guna || '').split(' — ')[0] || 'N/A'}</td></tr>
              <tr><td style="color:${C.muted};padding-right:12px">Signals</td><td style="font-weight:500;color:${C.ink}">${r.contradiction_count || 0} detected</td></tr>
            </table>
          </div>

          <!-- Accuracy ring -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            ${accRing}
          </div>
        </div>

        <!-- Headline banner -->
        <div style="background:${C.ink};border-radius:8px;padding:22px 28px;margin-top:auto">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;
            color:${C.signal};margin-bottom:8px;font-weight:700">Report Headline</div>
          <div style="font-family:'Instrument Serif',Georgia,serif;font-size:15pt;
            color:#F8F6F2;line-height:1.55;font-style:italic">
            "${r.report_headline || ''}"
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:${C.ink};padding:14px 52px;display:flex;justify-content:space-between">
        <div style="font-family:'DM Mono',monospace;font-size:8px;color:#5C5850;letter-spacing:0.12em">
          PSYAI · BEHAVIORAL INTELLIGENCE
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:8px;color:#5C5850;letter-spacing:0.08em">
          CONFIDENTIAL
        </div>
      </div>
    </div>`

    // ── TOC ───────────────────────────────────────────────────────────
    const tocItems = [
      ['01', 'Who You Actually Are',      C.signal,  'Your personality portrait — the paragraph that creates the "how did it know that" moment.'],
      ['02', 'Your 8 Dimensions',          C.blue,    'Personality, Interests, Aptitude, Values, Emotional Makeup, Motivation, Thinking Style, Work Style.'],
      ['03', 'Career Domain Scores',       C.teal,    'How you score across 10 career worlds — where you belong and why.'],
      ['04', 'Top 10 Career Matches',      C.signal,  'Behaviorally justified career matches with entry paths, salaries, and honest warnings.'],
      ['05', 'Natural Strengths',          C.gold,    'Five abilities that feel effortless to you but others find genuinely hard.'],
      ['06', 'Under Pressure',             C.purple,  'Who you become when things go wrong — your stress response portrait.'],
      ['07', 'What Drives You',            C.teal,    'Stated motivation vs revealed motivation. The gap named clearly.'],
      ['08', 'Blind Spots',                C.signal,  'What you cannot see about yourself. Written with honesty, not softened.'],
      ['09', 'Growth Edges & Action Plan', C.gold,    'Three specific growth areas with actionable steps — this week, this month, 3 months.'],
      ...(profile?.age < 22 ? [['10', 'For Parents & Mentors', C.teal, 'A plain-language note for the people who matter most.']] : []),
    ]

    const toc = `
    <div style="padding:48px 52px;page-break-before:always">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;
        color:${C.signal};font-weight:800;margin-bottom:8px">Contents</div>
      <div style="font-family:'Instrument Serif',Georgia,serif;font-size:30px;
        color:${C.ink};margin-bottom:10px">Table of Contents</div>
      <div style="width:48px;height:3px;background:${C.signal};border-radius:2px;margin-bottom:32px"></div>

      ${tocItems.map(([num, title, color, desc]) => `
        <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid ${C.line};align-items:flex-start">
          <div style="background:${color}18;color:${color};font-family:'DM Mono',monospace;
            font-size:10px;font-weight:800;padding:4px 8px;border-radius:4px;
            flex-shrink:0;min-width:28px;text-align:center">${num}</div>
          <div style="flex:1">
            <div style="font-size:11.5pt;font-weight:600;color:${C.ink};margin-bottom:3px">${title}</div>
            <div style="font-size:9.5pt;color:${C.muted};line-height:1.5">${desc}</div>
          </div>
        </div>`).join('')}
    </div>`

    // ── Section 01: Portrait ──────────────────────────────────────────
    const s01 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('01', 'Who You Actually Are', C.signal)}

      ${r.dominant_guna ? `
      <div style="background:${C.goldLt};border-left:4px solid ${C.gold};padding:12px 16px;
        border-radius:0 6px 6px 0;margin-bottom:22px">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
          color:${C.gold};font-weight:800">Dominant Guna · </span>
        <span style="font-size:10.5pt;color:${C.dim}">${r.dominant_guna}</span>
      </div>` : ''}

      ${paraText(r.sections?.personality_portrait || '')}
    </div>`

    // ── Section 02: 8 Dimensions ──────────────────────────────────────
    const dimCards = Object.entries(r.personality || {}).map(([dim, d]: any) => {
      const dc      = dimColors[dim] || { bg: C.paper, accent: C.signal, text: C.ink }
      const confPct = d.confidence === 'HIGH' ? 88 : d.confidence === 'MEDIUM' ? 60 : 32
      const gapMap: Record<string, string> = {
        NONE: '', MILD: C.gold, MODERATE: '#E07B39', SIGNIFICANT: C.signal
      }
      const gapColor = gapMap[d.gap] || ''
      return `
      <div style="border:1px solid ${C.line};border-radius:8px;overflow:hidden;
        margin-bottom:12px;page-break-inside:avoid">
        <!-- Dim header -->
        <div style="background:${dc.bg};padding:14px 18px;display:flex;align-items:center;gap:10px">
          <div style="background:${dc.accent};color:#fff;font-family:'DM Mono',monospace;
            font-size:9px;font-weight:800;padding:4px 9px;border-radius:4px">${dim}</div>
          <div style="font-size:10px;color:${dc.text};font-weight:600;letter-spacing:0.05em">
            ${dimNames[dim] || ''}
          </div>
          <div style="font-size:12pt;font-weight:700;color:${C.ink};flex:1">— ${d.label || ''}</div>
          <div style="display:flex;gap:6px;align-items:center">
            ${pill(d.confidence, dc.bg, dc.accent)}
            ${d.gap && d.gap !== 'NONE' ? pill(d.gap + ' GAP', gapColor + '18', gapColor) : ''}
          </div>
        </div>
        <!-- Confidence bar -->
        <div style="padding:0 18px;margin:12px 0 4px">
          ${inlineBar(confPct, dc.accent, 8)}
        </div>
        <!-- Body -->
        <div style="padding:0 18px 14px">
          <p style="font-size:10pt;color:${C.dim};line-height:1.75;margin:0 0 8px">${d.observed || ''}</p>
          ${d.evidence ? `<p style="font-size:9.5pt;color:${C.muted};line-height:1.65;
            margin:0;font-style:italic;border-left:2px solid ${dc.accent}30;
            padding-left:10px">${d.evidence}</p>` : ''}
        </div>
      </div>`
    }).join('')

    const s02 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('02', 'Your 8 Behavioral Dimensions', C.blue)}
      ${dimCards}
    </div>`

    // ── Section 03: Career Domain Scores ─────────────────────────────
    const sortedDomains = [...(r.career_domain_scores || [])].sort((a: any, b: any) => b.score - a.score)
    const domainRows = sortedDomains.map((d: any, i: number) => {
      const pct   = Math.min(100, Math.max(0, d.score))
      const color = pct >= 70 ? C.teal : pct >= 45 ? C.gold : '#BBBBBB'
      const bg    = pct >= 70 ? C.tealLt : pct >= 45 ? C.goldLt : C.paper
      return `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;
        background:${i % 2 === 0 ? '#fff' : C.paper};border-radius:6px;margin-bottom:4px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:${C.muted};
          width:18px;text-align:right;flex-shrink:0">${i + 1}</div>
        <div style="font-size:10.5pt;color:${C.ink};width:210px;flex-shrink:0">${d.domain}</div>
        <div style="flex:1">${inlineBar(pct, color, 10)}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:800;
          color:${color};width:32px;text-align:right;flex-shrink:0">${pct}</div>
        <div style="background:${bg};color:${color};font-size:9px;font-weight:700;
          padding:2px 8px;border-radius:20px;flex-shrink:0;white-space:nowrap">
          ${pct >= 70 ? 'STRONG' : pct >= 45 ? 'GOOD' : 'LOW'}
        </div>
      </div>`
    }).join('')

    const s03 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('03', 'Career Domain Scores', C.teal)}
      <p style="font-size:10pt;color:${C.muted};margin-bottom:20px;line-height:1.65">
        Scored 0–100 based on behavioral alignment across your 70 responses.
        Not self-reported interest — actual behavioral fit.
      </p>

      <!-- Legend -->
      <div style="display:flex;gap:16px;margin-bottom:20px">
        ${[
          { label:'Strong Fit (70+)', color: C.teal, bg: C.tealLt },
          { label:'Good Fit (45–69)', color: C.gold, bg: C.goldLt },
          { label:'Lower Fit (<45)', color: '#BBBBBB', bg: C.paper },
        ].map(l => `
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:12px;height:12px;background:${l.color};border-radius:50%"></div>
            <span style="font-size:9px;color:${C.muted}">${l.label}</span>
          </div>`).join('')}
      </div>

      ${domainRows}
    </div>`

    // ── Section 04: Top 10 Careers ────────────────────────────────────
    const rankColors = [C.gold, '#9E9E9E', '#CD7F32', C.signal, C.signal,
                        C.teal, C.teal, C.blue, C.blue, C.muted]
    const careerCards = (r.top_10_careers || []).map((c: any, i: number) => {
      const rc   = rankColors[i] || C.muted
      const fitN = parseInt(c.fit_score) || 0
      return `
      <div style="border:1px solid ${C.line};border-radius:8px;overflow:hidden;
        margin-bottom:14px;page-break-inside:avoid">

        <!-- Career header -->
        <div style="background:${C.ink};padding:16px 20px;display:flex;align-items:center;gap:14px">
          <div style="font-family:'Instrument Serif',Georgia,serif;font-size:24px;
            color:${rc};flex-shrink:0;width:28px">${c.rank}</div>
          <div style="flex:1">
            <div style="font-size:13pt;font-weight:700;color:#F8F6F2;margin-bottom:4px">${c.title}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${pill(c.fit_score + ' FIT', C.signal + '30', '#FF9980')}
              ${(c.natural_strengths_used || []).slice(0, 2).map((s: string) =>
                pill(s, C.teal + '30', '#6ECEC6')).join('')}
            </div>
          </div>
          <!-- Fit bar -->
          <div style="width:100px">
            ${inlineBar(fitN, rc, 6)}
          </div>
        </div>

        <!-- Career body -->
        <div style="padding:16px 20px">
          <p style="font-size:10.5pt;color:${C.dim};line-height:1.8;margin:0 0 12px">
            ${c.why_this_person || ''}
          </p>

          ${c.what_a_day_looks_like ? `
          <div style="background:${C.tealLt};border-left:3px solid ${C.teal};
            padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:14px">
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
              color:${C.teal};font-weight:800;margin-bottom:4px">A Typical Day</div>
            <p style="font-size:9.5pt;color:${C.dim};margin:0;line-height:1.65;font-style:italic">
              ${c.what_a_day_looks_like}
            </p>
          </div>` : ''}

          <!-- Entry + Salary grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            ${isIndia && c.entry_india ? `
            <div style="background:${C.paper};border-radius:6px;padding:12px 14px">
              <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
                color:${C.muted};margin-bottom:4px;font-weight:700">Entry Path — India</div>
              <div style="font-size:9.5pt;color:${C.ink};line-height:1.6">${c.entry_india}</div>
            </div>` : ''}
            ${isIndia && c.salary_india ? `
            <div style="background:${C.signalLt};border-radius:6px;padding:12px 14px">
              <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
                color:${C.signal};margin-bottom:4px;font-weight:700">Salary — India</div>
              <div style="font-size:11pt;color:${C.ink};font-weight:700">${c.salary_india}</div>
            </div>` : ''}
            ${!isIndia && c.entry_usa ? `
            <div style="background:${C.paper};border-radius:6px;padding:12px 14px">
              <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
                color:${C.muted};margin-bottom:4px;font-weight:700">Entry Path — USA</div>
              <div style="font-size:9.5pt;color:${C.ink};line-height:1.6">${c.entry_usa}</div>
            </div>` : ''}
            ${!isIndia && c.salary_usa ? `
            <div style="background:${C.signalLt};border-radius:6px;padding:12px 14px">
              <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
                color:${C.signal};margin-bottom:4px;font-weight:700">Salary — USA</div>
              <div style="font-size:11pt;color:${C.ink};font-weight:700">${c.salary_usa}</div>
            </div>` : ''}
          </div>

          <!-- Institutions -->
          ${(() => {
            const insts = isIndia ? c.top_institutions_india : c.top_institutions_usa
            if (!insts?.filter(Boolean).length) return ''
            return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
              ${insts.filter(Boolean).map((inst: string) =>
                `<span style="background:${C.blueLt};color:${C.blue};font-size:9px;
                  font-weight:600;padding:3px 10px;border-radius:4px">${inst}</span>`
              ).join('')}
            </div>`
          })()}

          <!-- Honest warning -->
          ${c.honest_warning ? `
          <div style="background:${C.signalLt};border:1px solid ${C.signal}30;
            border-left:4px solid ${C.signal};border-radius:0 6px 6px 0;padding:10px 14px">
            <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
              color:${C.signal};font-weight:800">Honest Warning · </span>
            <span style="font-size:9.5pt;color:${C.dim}">${c.honest_warning}</span>
          </div>` : ''}
        </div>
      </div>`
    }).join('')

    const s04 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('04', 'Top 10 Career Matches', C.signal)}
      <p style="font-size:10pt;color:${C.muted};margin-bottom:20px;line-height:1.65">
        Every match is behaviorally justified using your D1, D4, D5, D6, and D8 synthesis — not interest-matched.
      </p>
      ${careerCards}
    </div>`

    // ── Section 05: Natural Strengths ─────────────────────────────────
    const strengthColors = [C.signal, C.teal, C.gold, C.blue, C.purple]
    const strengthCards = (r.natural_strengths || []).filter((s: any) => s.strength).map((s: any, i: number) => {
      const sc = strengthColors[i % strengthColors.length]
      return `
      <div style="border:1px solid ${C.line};border-radius:8px;padding:16px 18px;
        margin-bottom:10px;display:flex;gap:16px;page-break-inside:avoid">
        <div style="background:${sc};color:#fff;font-family:'DM Mono',monospace;font-size:13px;
          font-weight:800;width:34px;height:34px;border-radius:50%;display:flex;
          align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${i + 1}</div>
        <div style="flex:1">
          <div style="font-size:12pt;font-weight:700;color:${C.ink};margin-bottom:6px">${s.strength}</div>
          <p style="font-size:10pt;color:${C.dim};line-height:1.7;margin:0 0 8px">${s.evidence || ''}</p>
          ${s.career_relevance ? `
          <p style="font-size:9.5pt;color:${sc};margin:0;font-style:italic">
            → ${s.career_relevance}
          </p>` : ''}
        </div>
      </div>`
    }).join('')

    const s05 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('05', 'Your Natural Strengths', C.gold)}
      <p style="font-size:10pt;color:${C.muted};margin-bottom:20px;line-height:1.65">
        These are abilities that feel almost effortless to you — but that others find genuinely difficult.
      </p>
      ${strengthCards}
    </div>`

    // ── Sections 06–08: Narrative ─────────────────────────────────────
    const narrativeSections = [
      { num:'06', title:'Who You Become Under Pressure', color: C.purple,
        content: r.sections?.under_pressure,
        prefix: r.contradiction_report?.most_significant ? `
        <div style="background:${C.signalLt};border:1px solid ${C.signal}30;
          border-left:4px solid ${C.signal};border-radius:0 8px 8px 0;
          padding:14px 18px;margin-bottom:22px">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.12em;
            color:${C.signal};font-weight:800;margin-bottom:6px">Key Contradiction Detected</div>
          <p style="font-size:11pt;color:${C.ink};margin:0 0 6px;font-weight:600;line-height:1.6">
            ${r.contradiction_report.most_significant}
          </p>
          ${r.contradiction_report.what_it_means ? `
          <p style="font-size:9.5pt;color:${C.dim};margin:0;line-height:1.65">
            ${r.contradiction_report.what_it_means}
          </p>` : ''}
        </div>` : '' },
      { num:'07', title:'What Actually Drives You',       color: C.teal,   content: r.sections?.what_drives_you,  prefix: '' },
      { num:'08', title:'Your Blind Spots',               color: C.signal, content: r.sections?.blind_spots,       prefix: '' },
    ].map(sec => `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader(sec.num, sec.title, sec.color)}
      ${sec.prefix}
      ${paraText(sec.content || '')}
    </div>`).join('')

    // ── Section 09: Growth Edges + Action Plan ────────────────────────
    const edgeColors = [C.signal, C.gold, C.teal]
    const growthEdges = (r.sections?.growth_edges || []).filter((g: any) => g.area).map((g: any, i: number) => {
      const gc = edgeColors[i % edgeColors.length]
      return `
      <div style="border:1px solid ${C.line};border-radius:8px;overflow:hidden;
        margin-bottom:12px;page-break-inside:avoid">
        <div style="background:${gc}12;border-bottom:1px solid ${gc}30;
          padding:12px 18px;display:flex;align-items:center;gap:10px">
          <span style="background:${gc};color:#fff;font-size:9px;font-weight:800;
            letter-spacing:0.08em;padding:3px 10px;border-radius:20px">GROWTH EDGE ${i + 1}</span>
          <span style="font-size:12pt;font-weight:700;color:${C.ink}">${g.area}</span>
        </div>
        <div style="padding:14px 18px">
          <p style="font-size:10.5pt;color:${C.dim};line-height:1.75;margin:0 0 10px">${g.observation || ''}</p>
          ${g.why_it_matters ? `
          <p style="font-size:9.5pt;color:${C.muted};margin:0 0 12px;line-height:1.65">
            <strong style="color:${C.dim}">Why it matters: </strong>${g.why_it_matters}
          </p>` : ''}
          ${g.action ? `
          <div style="background:${gc}10;border-left:4px solid ${gc};
            padding:10px 14px;border-radius:0 6px 6px 0">
            <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
              color:${gc};font-weight:800">Action Step · </span>
            <span style="font-size:10pt;color:${C.ink}">${g.action}</span>
          </div>` : ''}
        </div>
      </div>`
    }).join('')

    const ap = r.sections?.action_plan || {}
    const actionSteps = [
      { period:'This Week',   data: ap.this_week,      color: C.signal,  bg: C.signalLt },
      { period:'This Month',  data: ap.this_month,     color: C.gold,    bg: C.goldLt   },
      { period:'In 3 Months', data: ap.three_months,   color: C.teal,    bg: C.tealLt   },
    ].filter(s => s.data?.action).map(s => `
      <div style="border:1px solid ${s.color}30;border-radius:8px;padding:16px 18px;
        margin-bottom:10px;background:${s.bg}">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.14em;
          color:${s.color};font-weight:800;margin-bottom:8px">${s.period}</div>
        <div style="font-size:12pt;font-weight:700;color:${C.ink};margin-bottom:6px;line-height:1.4">
          ${s.data.action}
        </div>
        ${s.data.why ? `<p style="font-size:9.5pt;color:${C.dim};margin:0;line-height:1.65">${s.data.why}</p>` : ''}
      </div>`).join('')

    const s09 = `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('09', 'Growth Edges & Action Plan', C.gold)}

      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;
        color:${C.muted};margin-bottom:14px;font-weight:700">Three Areas Worth Your Attention</div>
      ${growthEdges}

      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;
        color:${C.muted};margin:28px 0 14px;font-weight:700">Your 30-Day Action Plan</div>
      ${actionSteps}
    </div>`

    // ── Section 10: Parent Note ───────────────────────────────────────
    const pn = r.sections?.parent_note
    const s10 = pn?.who_they_are && pn.who_they_are !== 'N/A' ? `
    <div style="padding:48px 52px;page-break-before:always">
      ${sectionHeader('10', `A Note to the People Who Matter to ${profile?.name}`, C.teal)}
      <div style="background:${C.goldLt};border:2px solid ${C.gold};border-radius:8px;padding:24px 28px">
        <p style="font-size:10pt;color:${C.muted};margin:0 0 20px;font-style:italic">
          This section is written for parents, mentors, or anyone who plays a significant role in ${profile?.name}'s life.
        </p>
        ${[
          { label:'Who They Are',         text: pn.who_they_are },
          { label:'What They Need',       text: pn.what_they_need },
          { label:'What to Avoid',        text: pn.what_to_avoid },
        ].filter(b => b.text && b.text !== 'N/A').map(b => `
          <div style="margin-bottom:16px">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
              color:${C.gold};font-weight:800;margin-bottom:6px">${b.label}</div>
            <p style="font-size:10.5pt;color:${C.dim};margin:0;line-height:1.75">${b.text}</p>
          </div>`).join('')}
        ${pn.the_one_thing && pn.the_one_thing !== 'N/A' ? `
        <div style="background:${C.gold};color:#fff;border-radius:6px;padding:14px 18px;margin-top:8px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
            opacity:0.8;margin-bottom:5px">The One Thing</div>
          <div style="font-size:12pt;font-weight:700">${pn.the_one_thing}</div>
        </div>` : ''}
      </div>
    </div>` : ''

    // ── Footer ────────────────────────────────────────────────────────
    const footer = `
    <div style="padding:0 52px 32px">
      <div style="border-top:1px solid ${C.line};padding-top:12px;
        display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'DM Mono',monospace;font-size:8px;color:${C.muted};letter-spacing:0.1em">
          PSYAI · BEHAVIORAL INTELLIGENCE PLATFORM
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:8px;color:${C.muted}">
          ${profile?.name} · ${date} · CONFIDENTIAL
        </div>
      </div>
    </div>`

    // ── Assemble ──────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PsyAI Report — ${profile?.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',sans-serif; background:#fff; color:#0D0F14;
         -webkit-font-smoothing:antialiased; }
  @media print {
    .no-print { display:none !important; }
    @page { size:A4; margin:10mm 8mm; }
    body { font-size:10pt; }
  }
  .print-btn {
    position:fixed; bottom:24px; right:24px;
    background:#C8411A; color:#fff; border:none;
    padding:13px 26px; font-size:13px; font-family:'DM Sans',sans-serif;
    font-weight:700; border-radius:6px; cursor:pointer; z-index:999;
    box-shadow:0 4px 20px rgba(200,65,26,0.35);
  }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Download PDF ↓</button>
${cover}
${toc}
${s01}
${s02}
${s03}
${s04}
${s05}
${narrativeSections}
${s09}
${s10}
${footer}
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
