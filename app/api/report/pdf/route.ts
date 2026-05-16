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

    const r = reportData.report_json
    const isIndia = (profile?.country || 'INDIA') === 'INDIA'
    const date = new Date(reportData.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const validity = new Date(new Date(reportData.created_at).setFullYear(new Date(reportData.created_at).getFullYear() + 1))
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const dimNames: Record<string, string> = {
      D1: 'Personality', D2: 'Interests', D3: 'Aptitude', D4: 'Values',
      D5: 'Emotional Makeup', D6: 'Motivation', D7: 'Thinking Style', D8: 'Work Style'
    }

    // ── helpers ───────────────────────────────────────────────────────
    function bar(score: number, color: string, height = '10px') {
      const pct = Math.min(100, Math.max(0, score))
      return `<div style="background:#EEE;border-radius:4px;height:${height};overflow:hidden;flex:1">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.5s"></div>
      </div>`
    }

    function confidenceBadge(conf: string) {
      const map: Record<string, string> = { HIGH: '#1A7A6E', MEDIUM: '#C4871A', LOW: '#9A9489' }
      const c = map[conf] || '#9A9489'
      return `<span style="background:${c}18;color:${c};font-size:9px;padding:2px 7px;border-radius:20px;font-weight:600;letter-spacing:0.05em">${conf}</span>`
    }

    function gapBadge(gap: string) {
      if (!gap || gap === 'NONE') return ''
      const map: Record<string, string> = { MILD: '#C4871A', MODERATE: '#E07B39', SIGNIFICANT: '#C8411A' }
      const c = map[gap] || '#9A9489'
      return `<span style="background:${c}18;color:${c};font-size:9px;padding:2px 7px;border-radius:20px;margin-left:6px">${gap} GAP</span>`
    }

    function sectionHeader(num: string, title: string) {
      return `<div style="display:flex;align-items:center;gap:12px;margin:0 0 18px">
        <div style="background:#C8411A;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.12em;padding:5px 10px;border-radius:3px;flex-shrink:0">SECTION ${num}</div>
        <div style="font-size:18px;font-weight:700;color:#0D0F14;font-family:'Instrument Serif',Georgia,serif">${title}</div>
        <div style="flex:1;height:1px;background:#E8E4DC"></div>
      </div>`
    }

    function paraText(text: string) {
      if (!text) return ''
      return text.split(/\n\n+/).map(p =>
        `<p style="font-size:10.5pt;color:#3A3830;line-height:1.85;margin:0 0 12px">${p.trim()}</p>`
      ).join('')
    }

    // ── dimensions ────────────────────────────────────────────────────
    const dimRows = Object.entries(r.personality || {}).map(([d, v]: any) => `
      <div style="border:1px solid #ECEAE4;border-radius:6px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-family:'DM Mono',monospace;font-size:9px;color:#C8411A;letter-spacing:0.12em;font-weight:600">${d}</span>
          <span style="font-size:11px;font-weight:600;color:#0D0F14">${dimNames[d] || ''}</span>
          <span style="font-size:11px;color:#5C5850;margin-left:2px">— ${v.label || ''}</span>
          ${confidenceBadge(v.confidence)}
          ${gapBadge(v.gap)}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          ${bar(v.confidence === 'HIGH' ? 85 : v.confidence === 'MEDIUM' ? 60 : 35, '#C8411A')}
        </div>
        <p style="font-size:9.5pt;color:#5C5850;margin:0;line-height:1.6">${v.observed || ''}</p>
        ${v.evidence ? `<p style="font-size:9pt;color:#9A9489;margin:6px 0 0;font-style:italic">${v.evidence}</p>` : ''}
      </div>
    `).join('')

    // ── career domain scores ──────────────────────────────────────────
    const sortedDomains = [...(r.career_domain_scores || [])].sort((a: any, b: any) => b.score - a.score)
    const domainRows = sortedDomains.map((d: any, i: number) => {
      const pct = Math.min(100, Math.max(0, d.score))
      const color = pct >= 70 ? '#1A7A6E' : pct >= 45 ? '#C4871A' : '#AAAAAA'
      return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #F0EDE8">
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:#9A9489;width:18px;text-align:right">${i + 1}</span>
        <span style="font-size:10pt;color:#0D0F14;width:200px;flex-shrink:0">${d.domain}</span>
        ${bar(pct, color)}
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:${color};font-weight:600;width:30px;text-align:right">${pct}</span>
      </div>`
    }).join('')

    // ── top 10 careers ────────────────────────────────────────────────
    const careerCards = (r.top_10_careers || []).map((c: any) => `
      <div style="border:1px solid #ECEAE4;border-radius:6px;padding:16px;margin-bottom:12px;page-break-inside:avoid">
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:10px">
          <div style="background:#C8411A;color:#fff;font-family:'DM Mono',monospace;font-size:18px;font-weight:700;width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.rank}</div>
          <div style="flex:1">
            <div style="font-size:13pt;font-weight:700;color:#0D0F14;margin-bottom:3px">${c.title}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:9px;background:#C8411A18;color:#C8411A;padding:2px 8px;border-radius:20px;font-weight:600">${c.fit_score} BEHAVIORAL FIT</span>
              ${(c.natural_strengths_used || []).slice(0, 2).map((s: string) => `<span style="font-size:9px;background:#1A7A6E18;color:#1A7A6E;padding:2px 8px;border-radius:20px">${s}</span>`).join('')}
            </div>
          </div>
        </div>
        <p style="font-size:10pt;color:#3A3830;line-height:1.75;margin:0 0 10px">${c.why_this_person || ''}</p>
        ${c.what_a_day_looks_like ? `<p style="font-size:9.5pt;color:#5C5850;line-height:1.65;margin:0 0 10px;font-style:italic">${c.what_a_day_looks_like}</p>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
          ${isIndia && c.entry_india ? `<div style="background:#F7F5F0;border-radius:4px;padding:10px 12px">
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:4px">Entry Path — India</div>
            <div style="font-size:9.5pt;color:#0D0F14">${c.entry_india}</div>
          </div>` : ''}
          ${isIndia && c.salary_india ? `<div style="background:#F7F5F0;border-radius:4px;padding:10px 12px">
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:4px">Salary — India</div>
            <div style="font-size:9.5pt;color:#0D0F14">${c.salary_india}</div>
          </div>` : ''}
          ${!isIndia && c.entry_usa ? `<div style="background:#F7F5F0;border-radius:4px;padding:10px 12px">
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:4px">Entry Path — USA</div>
            <div style="font-size:9.5pt;color:#0D0F14">${c.entry_usa}</div>
          </div>` : ''}
          ${!isIndia && c.salary_usa ? `<div style="background:#F7F5F0;border-radius:4px;padding:10px 12px">
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:4px">Salary — USA</div>
            <div style="font-size:9.5pt;color:#0D0F14">${c.salary_usa}</div>
          </div>` : ''}
        </div>
        ${(isIndia && c.top_institutions_india?.length) || (!isIndia && c.top_institutions_usa?.length) ? `
        <div style="margin-top:10px">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:6px">Top Institutions</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(isIndia ? c.top_institutions_india : c.top_institutions_usa || []).map((inst: string) =>
              `<span style="font-size:9px;background:#F0EDE8;color:#5C5850;padding:3px 9px;border-radius:3px">${inst}</span>`
            ).join('')}
          </div>
        </div>` : ''}
        ${c.honest_warning ? `<div style="background:#FFF5F2;border-left:3px solid #C8411A;padding:8px 12px;margin-top:10px;border-radius:0 4px 4px 0">
          <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#C8411A;font-weight:600">Honest Warning · </span>
          <span style="font-size:9.5pt;color:#5C5850">${c.honest_warning}</span>
        </div>` : ''}
      </div>
    `).join('')

    // ── natural strengths ─────────────────────────────────────────────
    const strengthCards = (r.natural_strengths || []).map((s: any, i: number) => `
      <div style="border:1px solid #ECEAE4;border-radius:6px;padding:14px 16px;margin-bottom:10px;display:flex;gap:14px">
        <div style="background:#1A7A6E;color:#fff;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${i + 1}</div>
        <div style="flex:1">
          <div style="font-size:11pt;font-weight:700;color:#0D0F14;margin-bottom:4px">${s.strength || ''}</div>
          <p style="font-size:9.5pt;color:#5C5850;margin:0 0 6px;line-height:1.65">${s.evidence || ''}</p>
          ${s.career_relevance ? `<p style="font-size:9pt;color:#1A7A6E;margin:0;font-style:italic">${s.career_relevance}</p>` : ''}
        </div>
      </div>
    `).join('')

    // ── growth edges ──────────────────────────────────────────────────
    const growthEdges = (r.sections?.growth_edges || []).filter((g: any) => g.area).map((g: any, i: number) => `
      <div style="border:1px solid #ECEAE4;border-radius:6px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="background:#C4871A18;color:#C4871A;font-size:9px;padding:2px 8px;border-radius:20px;font-weight:600">GROWTH EDGE ${i + 1}</span>
          <span style="font-size:11pt;font-weight:700;color:#0D0F14">${g.area}</span>
        </div>
        <p style="font-size:10pt;color:#5C5850;margin:0 0 8px;line-height:1.7">${g.observation || ''}</p>
        ${g.why_it_matters ? `<p style="font-size:9.5pt;color:#9A9489;margin:0 0 8px;line-height:1.65"><strong style="color:#5C5850">Why it matters:</strong> ${g.why_it_matters}</p>` : ''}
        ${g.action ? `<div style="background:#F0F8F6;border-left:3px solid #1A7A6E;padding:8px 12px;border-radius:0 4px 4px 0">
          <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#1A7A6E;font-weight:600">Action Step · </span>
          <span style="font-size:9.5pt;color:#3A3830">${g.action}</span>
        </div>` : ''}
      </div>
    `).join('')

    // ── action plan ───────────────────────────────────────────────────
    const ap = r.sections?.action_plan || {}
    const actionSteps = [
      { period: 'This Week', data: ap.this_week, color: '#C8411A', bg: '#FFF5F2' },
      { period: 'This Month', data: ap.this_month, color: '#C4871A', bg: '#FFFBF0' },
      { period: 'In 3 Months', data: ap.three_months, color: '#1A7A6E', bg: '#F0F8F6' },
    ].filter(s => s.data?.action).map(s => `
      <div style="border:1px solid ${s.color}30;border-radius:6px;padding:14px 16px;margin-bottom:10px;background:${s.bg}">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.12em;color:${s.color};font-weight:700;margin-bottom:6px">${s.period}</div>
        <div style="font-size:11pt;font-weight:600;color:#0D0F14;margin-bottom:4px">${s.data.action}</div>
        ${s.data.why ? `<p style="font-size:9.5pt;color:#5C5850;margin:0;line-height:1.65">${s.data.why}</p>` : ''}
      </div>
    `).join('')

    // ── contradiction report ──────────────────────────────────────────
    const contradictionSection = r.contradiction_report?.most_significant ? `
      <div style="background:#FFF5F2;border:1px solid #C8411A30;border-radius:6px;padding:14px 16px;margin-bottom:18px">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.12em;color:#C8411A;font-weight:700;margin-bottom:6px">Key Contradiction Detected</div>
        <p style="font-size:10.5pt;color:#0D0F14;margin:0 0 6px;line-height:1.75;font-weight:500">${r.contradiction_report.most_significant}</p>
        ${r.contradiction_report.what_it_means ? `<p style="font-size:9.5pt;color:#5C5850;margin:0;line-height:1.65">${r.contradiction_report.what_it_means}</p>` : ''}
      </div>
    ` : ''

    // ── parent note ───────────────────────────────────────────────────
    const pn = r.sections?.parent_note
    const parentSection = pn?.who_they_are && pn.who_they_are !== 'N/A' ? `
      <div style="page-break-before:always">
        ${sectionHeader('10', 'A Note to the People Who Matter')}
        <div style="background:#FFFDF5;border:2px solid #C4871A;border-radius:6px;padding:20px 24px">
          <p style="font-size:10pt;color:#9A9489;margin:0 0 16px;font-style:italic">This section is written for parents, mentors, or anyone who plays a significant role in ${profile?.name}'s life.</p>
          ${pn.who_they_are ? `<div style="margin-bottom:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#C4871A;font-weight:700;margin-bottom:5px">Who They Are</div><p style="font-size:10.5pt;color:#3A3830;margin:0;line-height:1.75">${pn.who_they_are}</p></div>` : ''}
          ${pn.what_they_need ? `<div style="margin-bottom:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#C4871A;font-weight:700;margin-bottom:5px">What They Need</div><p style="font-size:10.5pt;color:#3A3830;margin:0;line-height:1.75">${pn.what_they_need}</p></div>` : ''}
          ${pn.what_to_avoid ? `<div style="margin-bottom:14px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#C4871A;font-weight:700;margin-bottom:5px">What to Avoid</div><p style="font-size:10.5pt;color:#3A3830;margin:0;line-height:1.75">${pn.what_to_avoid}</p></div>` : ''}
          ${pn.the_one_thing ? `<div style="background:#C4871A;color:#fff;border-radius:4px;padding:12px 16px;margin-top:8px"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;opacity:0.8">The One Thing</div><div style="font-size:11pt;font-weight:600">${pn.the_one_thing}</div></div>` : ''}
        </div>
      </div>
    ` : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PsyAI Report — ${profile?.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #fff; color: #0D0F14; font-size: 10.5pt; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  @media print {
    body { font-size: 10pt; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    @page { size: A4; margin: 14mm 12mm; }
  }
  .print-btn {
    position: fixed; bottom: 24px; right: 24px;
    background: #C8411A; color: #fff; border: none;
    padding: 12px 24px; font-size: 13px; font-family: 'DM Sans', sans-serif;
    font-weight: 600; border-radius: 4px; cursor: pointer; z-index: 999;
    box-shadow: 0 4px 16px rgba(200,65,26,0.3);
  }
  .print-btn:hover { background: #A8340F; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Download PDF ↓</button>

<!-- ══════════════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════════ -->
<div style="min-height:100vh;display:flex;flex-direction:column;padding:0">

  <!-- Top stripe -->
  <div style="background:#C8411A;height:8px;width:100%"></div>

  <!-- Cover content -->
  <div style="flex:1;display:flex;flex-direction:column;padding:48px 52px">

    <!-- Logo -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:60px">
      <div style="font-family:'DM Mono',monospace;font-size:14px;letter-spacing:0.2em;color:#0D0F14;font-weight:500">PSY<span style="color:#C8411A">AI</span></div>
      <div style="width:1px;height:16px;background:#D8D3C8"></div>
      <div style="font-size:10px;color:#9A9489;letter-spacing:0.08em">Behavioral Intelligence Platform</div>
    </div>

    <!-- Report title -->
    <div style="margin-bottom:48px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#C8411A;font-weight:700;margin-bottom:12px">Psychometric Assessment Report</div>
      <div style="font-family:'Instrument Serif',Georgia,serif;font-size:42px;line-height:1.05;color:#0D0F14;margin-bottom:16px">Behavioral<br>Intelligence<br><em style="color:#5C5850">Profile</em></div>
      <p style="font-size:11pt;color:#9A9489;max-width:400px;line-height:1.7">A comprehensive analysis across 8 behavioral dimensions, mapped to career paths and growth opportunities.</p>
    </div>

    <!-- Divider -->
    <div style="height:1px;background:linear-gradient(to right,#C8411A,#E8E4DC);margin-bottom:40px"></div>

    <!-- User + dates grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:auto">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9A9489;margin-bottom:10px">Report Prepared For</div>
        <div style="font-family:'Instrument Serif',Georgia,serif;font-size:26px;color:#C8411A;margin-bottom:8px">${profile?.name || 'User'}</div>
        <div style="font-size:10pt;color:#5C5850;line-height:1.8">
          ${profile?.age ? `Age: ${profile.age}<br>` : ''}
          ${profile?.country ? `Country: ${profile.country}<br>` : ''}
          ${profile?.persona ? `Profile: ${profile.persona.charAt(0).toUpperCase() + profile.persona.slice(1)}<br>` : ''}
          ${profile?.job_title ? `Role: ${profile.job_title}<br>` : ''}
          ${profile?.domain ? `Industry: ${profile.domain}` : ''}
        </div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9A9489;margin-bottom:10px">Report Details</div>
        <div style="font-size:10pt;color:#5C5850;line-height:2">
          <strong style="color:#0D0F14">Generated:</strong> ${date}<br>
          <strong style="color:#0D0F14">Valid Until:</strong> ${validity}<br>
          <strong style="color:#0D0F14">Accuracy:</strong> ${r.accuracy_confidence || 'N/A'}<br>
          <strong style="color:#0D0F14">Questions:</strong> 70 across 8 dimensions<br>
          <strong style="color:#0D0F14">Dominant Guna:</strong> ${(r.dominant_guna || '').split(' — ')[0] || 'N/A'}
        </div>
      </div>
    </div>

    <!-- Headline -->
    <div style="margin-top:40px;background:#0D0F14;border-radius:6px;padding:20px 24px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#C8411A;margin-bottom:8px">Report Headline</div>
      <div style="font-family:'Instrument Serif',Georgia,serif;font-size:15pt;color:#F5F2EC;line-height:1.5;font-style:italic">"${r.report_headline || ''}"</div>
    </div>

  </div>

  <!-- Bottom stripe -->
  <div style="background:#0D0F14;padding:16px 52px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-family:'DM Mono',monospace;font-size:9px;color:#9A9489;letter-spacing:0.1em">PSYAI · BEHAVIORAL INTELLIGENCE</div>
    <div style="font-family:'DM Mono',monospace;font-size:9px;color:#9A9489">CONFIDENTIAL</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════════════════ -->
<div style="padding:48px 52px;page-break-before:always">
  <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#C8411A;font-weight:700;margin-bottom:8px">Contents</div>
  <div style="font-family:'Instrument Serif',Georgia,serif;font-size:28px;color:#0D0F14;margin-bottom:32px">Table of Contents</div>
  <div style="height:2px;background:#C8411A;width:48px;margin-bottom:32px"></div>

  ${[
    ['01', 'Who You Actually Are', 'Your personality portrait — the paragraph that creates the "how did it know that" moment.'],
    ['02', 'Your 8 Dimensions', 'Personality, Interests, Aptitude, Values, Emotional Makeup, Motivation, Thinking Style, Work Style.'],
    ['03', 'Career Domain Scores', 'How you score across 10 career worlds — where you belong and why.'],
    ['04', 'Top 10 Career Matches', 'Behaviorally justified career matches with entry paths, salaries, and honest warnings.'],
    ['05', 'Natural Strengths', 'Five abilities that feel effortless to you but others find genuinely hard.'],
    ['06', 'Under Pressure', 'Who you become when things go wrong — your stress response portrait.'],
    ['07', 'What Drives You', 'Stated motivation vs revealed motivation. The gap named clearly.'],
    ['08', 'Blind Spots', 'What you cannot see about yourself. Written with honesty, not softened.'],
    ['09', 'Growth Edges & Action Plan', 'Three specific growth areas with actionable steps — this week, this month, 3 months.'],
    profile?.age < 22 ? ['10', 'For Parents & Mentors', 'A plain-language note for the people who matter most to you.'] : null,
  ].filter(Boolean).map(([num, title, desc]: any) => `
    <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #F0EDE8;align-items:flex-start">
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:#C8411A;font-weight:600;flex-shrink:0;width:24px;padding-top:2px">${num}</div>
      <div style="flex:1">
        <div style="font-size:11pt;font-weight:600;color:#0D0F14;margin-bottom:3px">${title}</div>
        <div style="font-size:9.5pt;color:#9A9489;line-height:1.5">${desc}</div>
      </div>
    </div>
  `).join('')}
</div>

<!-- ══════════════════════════════════════════════════════
     MAIN REPORT
══════════════════════════════════════════════════════ -->
<div style="padding:48px 52px;page-break-before:always">

  <!-- SECTION 01: Personality Portrait -->
  ${sectionHeader('01', 'Who You Actually Are')}
  ${r.dominant_guna ? `<div style="background:#F7F5F0;border-left:3px solid #C4871A;padding:10px 14px;border-radius:0 4px 4px 0;margin-bottom:18px">
    <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#C4871A;font-weight:700">Dominant Guna · </span>
    <span style="font-size:10pt;color:#5C5850">${r.dominant_guna}</span>
  </div>` : ''}
  ${paraText(r.sections?.personality_portrait || '')}

  <!-- SECTION 02: 8 Dimensions -->
  <div style="margin-top:36px">
    ${sectionHeader('02', 'Your 8 Behavioral Dimensions')}
    ${dimRows}
  </div>

  <!-- SECTION 03: Career Domain Scores -->
  <div style="margin-top:36px;page-break-before:always">
    ${sectionHeader('03', 'Career Domain Scores')}
    <p style="font-size:10pt;color:#9A9489;margin-bottom:18px">Scored 0–100 based on behavioral alignment across your 70 responses. Not self-reported interest — actual behavioral fit.</p>
    ${domainRows}
  </div>

  <!-- SECTION 04: Top 10 Career Matches -->
  <div style="margin-top:36px;page-break-before:always">
    ${sectionHeader('04', 'Top 10 Career Matches')}
    <p style="font-size:10pt;color:#9A9489;margin-bottom:18px">Every match is behaviorally justified using your D1, D4, D5, D6, and D8 synthesis — not interest-matched.</p>
    ${careerCards}
  </div>

  <!-- SECTION 05: Natural Strengths -->
  <div style="margin-top:36px;page-break-before:always">
    ${sectionHeader('05', 'Your Natural Strengths')}
    <p style="font-size:10pt;color:#9A9489;margin-bottom:18px">These are abilities that feel almost effortless to you — but that others find genuinely difficult.</p>
    ${strengthCards}
  </div>

  <!-- SECTION 06: Under Pressure -->
  <div style="margin-top:36px">
    ${sectionHeader('06', 'Who You Become Under Pressure')}
    ${r.contradiction_report?.most_significant ? contradictionSection : ''}
    ${paraText(r.sections?.under_pressure || '')}
  </div>

  <!-- SECTION 07: What Drives You -->
  <div style="margin-top:36px">
    ${sectionHeader('07', 'What Actually Drives You')}
    ${paraText(r.sections?.what_drives_you || '')}
  </div>

  <!-- SECTION 08: Blind Spots -->
  <div style="margin-top:36px;page-break-before:always">
    ${sectionHeader('08', 'Your Blind Spots')}
    ${paraText(r.sections?.blind_spots || '')}
  </div>

  <!-- SECTION 09: Growth Edges + Action Plan -->
  <div style="margin-top:36px">
    ${sectionHeader('09', 'Growth Edges & Action Plan')}
    <div style="margin-bottom:24px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:12px">Three Areas Worth Your Attention</div>
      ${growthEdges}
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9489;margin-bottom:12px">Your 30-Day Action Plan</div>
      ${actionSteps}
    </div>
  </div>

  <!-- SECTION 10: Parent Note (conditional) -->
  ${parentSection}

  <!-- Footer -->
  <div style="margin-top:48px;padding-top:16px;border-top:1px solid #E8E4DC;display:flex;justify-content:space-between;align-items:center">
    <div style="font-family:'DM Mono',monospace;font-size:8px;color:#9A9489;letter-spacing:0.1em">PSYAI · BEHAVIORAL INTELLIGENCE PLATFORM</div>
    <div style="font-family:'DM Mono',monospace;font-size:8px;color:#9A9489">${profile?.name} · ${date} · CONFIDENTIAL</div>
  </div>

</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
