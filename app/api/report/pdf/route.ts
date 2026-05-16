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

    const r       = reportData.report_json
    const isIndia = (profile?.country || 'INDIA') === 'INDIA'
    const date    = new Date(reportData.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    const validity = new Date(new Date(reportData.created_at).setFullYear(
      new Date(reportData.created_at).getFullYear() + 1
    )).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })

    // ── Color tokens ──────────────────────────────────────────────────
    const C = {
      signal:   '#C8411A', signalLt: '#FFF2EE', signalMd: '#FFE0D6',
      teal:     '#1A7A6E', tealLt:   '#EBF5F4', tealMd:   '#C5E8E5',
      gold:     '#C4871A', goldLt:   '#FFF9F0', goldMd:   '#FFE9C0',
      purple:   '#6B46C1', purpleLt: '#F5F0FF', purpleMd: '#DDD3F8',
      blue:     '#1D6FA4', blueLt:   '#EBF4FB', blueMd:   '#C2DCF0',
      ink:      '#0D0F14', dim:      '#5C5850', muted:    '#9A9489',
      paper:    '#F8F6F2', line:     '#E8E4DC', white:    '#FFFFFF',
    }

    const dimColors: Record<string, {accent:string; lt:string; md:string}> = {
      D1: { accent:C.signal, lt:C.signalLt, md:C.signalMd },
      D2: { accent:C.blue,   lt:C.blueLt,   md:C.blueMd   },
      D3: { accent:C.teal,   lt:C.tealLt,   md:C.tealMd   },
      D4: { accent:C.gold,   lt:C.goldLt,   md:C.goldMd   },
      D5: { accent:C.purple, lt:C.purpleLt, md:C.purpleMd },
      D6: { accent:C.signal, lt:C.signalLt, md:C.signalMd },
      D7: { accent:C.blue,   lt:C.blueLt,   md:C.blueMd   },
      D8: { accent:C.teal,   lt:C.tealLt,   md:C.tealMd   },
    }

    const dimNames: Record<string,string> = {
      D1:'Personality', D2:'Interests', D3:'Aptitude', D4:'Values',
      D5:'Emotional Makeup', D6:'Motivation', D7:'Thinking Style', D8:'Work Style',
    }

    // ── Shared helpers ────────────────────────────────────────────────

    // Inline bar — always renders in PDF
    function bar(pct: number, color: string, h=10) {
      const p = Math.min(100, Math.max(0, pct))
      return `<div style="background:#E8E4DC;border-radius:99px;height:${h}px;overflow:hidden">
        <div style="width:${p}%;height:100%;background:${color};border-radius:99px"></div>
      </div>`
    }

    // Pill badge
    function pill(text: string, bg: string, color: string, fw='600') {
      return `<span style="background:${bg};color:${color};font-size:9px;font-weight:${fw};
        letter-spacing:0.06em;padding:3px 10px;border-radius:99px;
        display:inline-block;line-height:1.6">${text}</span>`
    }

    // Big stat box
    function statBox(value: string, label: string, color: string, bg: string) {
      return `<div style="background:${bg};border:1.5px solid ${color}30;border-radius:10px;
        padding:18px 20px;text-align:center">
        <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;
          color:${color};line-height:1;margin-bottom:5px">${value}</div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
          color:${color}AA;font-weight:600">${label}</div>
      </div>`
    }

    // Section header with full-width color band
    function sectionHeader(num: string, title: string, color: string, bg: string) {
      return `<div style="background:${bg};border-left:5px solid ${color};border-radius:0 8px 8px 0;
        padding:16px 22px;margin:0 0 28px;display:flex;align-items:center;gap:14px;
        page-break-after:avoid">
        <div style="background:${color};color:#fff;font-family:'DM Mono',monospace;
          font-size:9px;font-weight:800;letter-spacing:0.14em;padding:5px 12px;
          border-radius:4px;flex-shrink:0">SECTION ${num}</div>
        <div style="font-family:'Instrument Serif',Georgia,serif;font-size:22px;
          color:${C.ink}">${title}</div>
      </div>`
    }

    // Split a paragraph into [first sentence, rest]
    function splitFirstSentence(text: string): [string, string] {
      // FIXED: Removed the /s flag and targeted [\s\S] for 100% Vercel target compatibility
      const m = text.match(/^([\s\S]+?[.!?])\s+([\s\S]+)$/)
      return m ? [m[1], m[2]] : [text, '']
    }

    // Render a single narrative paragraph — lead sentence bold + rest as body
    function narrativePara(text: string, color: string, bg: string, isFirst: boolean) {
      const [lead, rest] = splitFirstSentence(text.trim())
      return `
      <div style="margin-bottom:22px;padding-bottom:22px;
        border-bottom:1px solid ${C.line}">
        ${isFirst
          // First para: full colored pull-quote box
          ? `<div style="background:${bg};border-left:5px solid ${color};
              border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:0">
              <p style="font-family:'Instrument Serif',Georgia,serif;font-size:13.5pt;
                color:${C.ink};line-height:1.75;margin:0;font-style:italic">${text.trim()}</p>
            </div>`
          // Other paras: bold lead sentence + normal body
          : `<p style="font-size:11.5pt;font-weight:700;color:${C.ink};
              line-height:1.65;margin:0 0 10px">${lead}</p>
             ${rest ? `<p style="font-size:11pt;color:${C.dim};line-height:1.9;margin:0">${rest}</p>` : ''}`
        }
      </div>`
    }

    // Full narrative renderer — breaks up wall of text with visual structure
    function narrative(text: string, color: string, bg: string) {
      if (!text) return ''
      const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
      if (!paras.length) return ''
      return `<div style="margin-bottom:8px">
        ${paras.map((p, i) => narrativePara(p, color, bg, i === 0)).join('')}
      </div>`
    }

    // Accuracy SVG ring
    const accNum  = parseInt(r.accuracy_confidence) || 0
    const circum  = 2 * Math.PI * 52
    const dashAcc = (accNum / 100) * circum
    const accRing = `<svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="52" fill="none" stroke="#E8E4DC" stroke-width="9"/>
      <circle cx="65" cy="65" r="52" fill="none" stroke="${C.signal}" stroke-width="9"
        stroke-dasharray="${dashAcc.toFixed(1)} ${circum.toFixed(1)}"
        stroke-dashoffset="${(circum * 0.25).toFixed(1)}"
        stroke-linecap="round" transform="rotate(-90 65 65)"/>
      <text x="65" y="60" text-anchor="middle" font-family="'DM Mono',monospace"
        font-size="20" font-weight="700" fill="${C.signal}">${accNum}%</text>
      <text x="65" y="76" text-anchor="middle" font-family="'DM Sans',sans-serif"
        font-size="9" fill="${C.muted}">ACCURACY</text>
    </svg>`

    // ─────────────────────────────────────────────────────────────────
    // COVER PAGE
    // ─────────────────────────────────────────────────────────────────
    const cover = `
<div style="min-height:100vh;display:flex;flex-direction:column">
  <div style="height:6px;background:linear-gradient(to right,${C.signal},${C.gold},${C.teal})"></div>

  <div style="flex:1;padding:48px 56px;display:flex;flex-direction:column">

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:56px">
      <div style="font-family:'DM Mono',monospace;font-size:16px;letter-spacing:0.22em;color:${C.ink}">
        PSY<span style="color:${C.signal}">AI</span></div>
      <div style="width:1px;height:20px;background:${C.line}"></div>
      <div style="font-size:10px;color:${C.muted};letter-spacing:0.08em">Behavioral Intelligence Platform</div>
    </div>

    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:${C.signal};
      font-weight:800;margin-bottom:16px">Psychometric Assessment Report</div>

    <div style="font-family:'Instrument Serif',Georgia,serif;font-size:52px;line-height:1.0;
      color:${C.ink};margin-bottom:18px">
      Behavioral<br>Intelligence<br><em style="color:${C.muted}">Profile</em>
    </div>
    <p style="font-size:11.5pt;color:${C.muted};max-width:420px;line-height:1.75;margin:0 0 44px">
      A comprehensive analysis across 8 behavioral dimensions,
      mapped to career paths and growth opportunities.
    </p>

    <div style="height:2px;background:linear-gradient(to right,${C.signal},${C.gold},${C.teal},transparent);
      margin-bottom:44px;border-radius:2px"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr 150px;gap:36px;align-items:start;margin-bottom:44px">

      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;
          color:${C.muted};font-weight:700;margin-bottom:12px">Report Prepared For</div>
        <div style="font-family:'Instrument Serif',Georgia,serif;font-size:32px;
          color:${C.signal};line-height:1.1;margin-bottom:16px">${profile?.name || 'User'}</div>
        <table style="border-spacing:0;font-size:10.5pt;line-height:2.1">
          ${[
            ['Age',      profile?.age],
            ['Country',  profile?.country],
            ['Profile',  profile?.persona ? profile.persona.charAt(0).toUpperCase()+profile.persona.slice(1) : null],
            ['Role',     profile?.job_title],
            ['Industry', profile?.domain],
          ].filter(([,v]) => v).map(([l,v]) =>
            `<tr>
              <td style="color:${C.muted};padding-right:16px;vertical-align:top">${l}</td>
              <td style="color:${C.ink};font-weight:600">${v}</td>
            </tr>`
          ).join('')}
        </table>
      </div>

      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;
          color:${C.muted};font-weight:700;margin-bottom:12px">Report Details</div>
        <table style="border-spacing:0;font-size:10.5pt;line-height:2.1">
          ${[
            ['Generated',  date],
            ['Valid Until', validity],
            ['Questions',  '70 across 8 dimensions'],
            ['Guna',       (r.dominant_guna||'').split(' — ')[0]||'N/A'],
            ['Signals',    `${r.contradiction_count||0} detected`],
          ].map(([l,v]) =>
            `<tr>
              <td style="color:${C.muted};padding-right:16px;vertical-align:top">${l}</td>
              <td style="color:${C.ink};font-weight:600">${v}</td>
            </tr>`
          ).join('')}
        </table>
      </div>

      <div style="text-align:center;padding-top:8px">${accRing}</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:44px">
      ${statBox(r.accuracy_confidence||'—', 'Accuracy', C.signal, C.signalLt)}
      ${statBox(String(r.contradiction_count||0), 'Signals Found', C.teal, C.tealLt)}
      ${statBox('70', 'Questions', C.blue, C.blueLt)}
      ${statBox('8', 'Dimensions', C.gold, C.goldLt)}
    </div>

    <div style="margin-top:auto;background:${C.ink};border-radius:10px;padding:26px 30px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.18em;
        color:${C.signal};font-weight:800;margin-bottom:10px">Report Headline</div>
      <div style="font-family:'Instrument Serif',Georgia,serif;font-size:16pt;
        color:#F8F6F2;line-height:1.6;font-style:italic">
        "${r.report_headline||''}"
      </div>
    </div>

  </div>

  <div style="background:${C.ink};padding:14px 56px;display:flex;justify-content:space-between">
    <span style="font-family:'DM Mono',monospace;font-size:8px;color:#5C5850;letter-spacing:0.12em">PSYAI · BEHAVIORAL INTELLIGENCE</span>
    <span style="font-family:'DM Mono',monospace;font-size:8px;color:#5C5850">CONFIDENTIAL</span>
  </div>
</div>`

    // ─────────────────────────────────────────────────────────────────
    // TABLE OF CONTENTS
    // ─────────────────────────────────────────────────────────────────
    const tocRows = [
      ['01', 'Who You Actually Are',      C.signal],
      ['02', 'Your 8 Dimensions',           C.blue],
      ['03', 'Career Domain Scores',        C.teal],
      ['04', 'Top 10 Career Matches',       C.signal],
      ['05', 'Natural Strengths',           C.gold],
      ['06', 'Under Pressure',              C.purple],
      ['07', 'What Drives You',             C.teal],
      ['08', 'Blind Spots',                 C.signal],
      ['09', 'Growth Edges & Action Plan', C.gold],
      ...(profile?.age < 22 ? [['10', 'For Parents & Mentors', C.teal]] : []),
    ]

    const toc = `
<div style="padding:52px 56px;page-break-before:always">
  <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:${C.signal};font-weight:800;margin-bottom:10px">Contents</div>
  <div style="font-family:'Instrument Serif',Georgia,serif;font-size:34px;color:${C.ink};margin-bottom:32px">Table of Contents</div>
  ${tocRows.map(([num, title, color]) => `
  <div style="display:flex;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid ${C.line}">
    <div style="background:${color}18;color:${color};font-family:'DM Mono',monospace;
      font-size:11px;font-weight:800;padding:5px 11px;border-radius:5px;flex-shrink:0">${num}</div>
    <div style="font-size:12.5pt;font-weight:600;color:${C.ink}">${title}</div>
    <div style="flex:1;border-bottom:1px dashed ${C.line}"></div>
  </div>`).join('')}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 01 — PERSONALITY PORTRAIT
    // ─────────────────────────────────────────────────────────────────
    const s01 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('01', 'Who You Actually Are', C.signal, C.signalLt)}

  ${r.dominant_guna ? `
  <div style="background:${C.goldLt};border-left:4px solid ${C.gold};border-radius:0 8px 8px 0;
    padding:13px 18px;margin-bottom:24px">
    <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
      color:${C.gold};font-weight:800">Dominant Guna · </span>
    <span style="font-size:11pt;color:${C.dim}">${r.dominant_guna}</span>
  </div>` : ''}

  ${narrative(r.sections?.personality_portrait||'', C.signal, C.signalLt)}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 02 — 8 DIMENSIONS
    // ─────────────────────────────────────────────────────────────────
    const dimCards = Object.entries(r.personality||{}).map(([dim, d]: any) => {
      const dc     = dimColors[dim] || { accent:C.signal, lt:C.signalLt, md:C.signalMd }
      const confPct = d.confidence==='HIGH' ? 88 : d.confidence==='MEDIUM' ? 58 : 30
      const gapColors: Record<string,string> = {
        NONE:'', MILD:C.gold, MODERATE:'#E07B39', SIGNIFICANT:C.signal
      }
      const gc = gapColors[d.gap]||''
      return `
<div style="border:1.5px solid ${dc.accent}25;border-radius:10px;overflow:hidden;
  margin-bottom:14px;page-break-inside:avoid">

  <div style="background:${dc.lt};padding:14px 20px;
    border-bottom:1px solid ${dc.accent}20;display:flex;align-items:center;gap:10px">
    <div style="background:${dc.accent};color:#fff;font-family:'DM Mono',monospace;
      font-size:9px;font-weight:800;padding:4px 10px;border-radius:4px">${dim}</div>
    <div style="font-size:9.5px;color:${dc.accent};font-weight:700;
      text-transform:uppercase;letter-spacing:0.08em">${dimNames[dim]||''}</div>
    <div style="font-size:12.5pt;font-weight:700;color:${C.ink};flex:1">— ${d.label||''}</div>
    <div style="display:flex;gap:6px">
      ${pill(d.confidence, dc.md, dc.accent)}
      ${gc ? pill((d.gap||'')+ ' GAP', gc+'22', gc) : ''}
    </div>
  </div>

  <div style="padding:14px 20px 6px">${bar(confPct, dc.accent, 8)}</div>

  <div style="padding:8px 20px 18px">
    <p style="font-size:11pt;color:${C.dim};line-height:1.8;margin:0 0 10px">${d.observed||''}</p>
    ${d.evidence ? `
    <div style="background:${dc.lt};border-left:3px solid ${dc.accent}60;
      padding:10px 14px;border-radius:0 6px 6px 0">
      <p style="font-size:10pt;color:${C.muted};line-height:1.7;margin:0;font-style:italic">
        ${d.evidence}
      </p>
    </div>` : ''}
  </div>
</div>`
    }).join('')

    const s02 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('02', 'Your 8 Behavioral Dimensions', C.blue, C.blueLt)}
  ${dimCards}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 03 — CAREER DOMAIN SCORES
    // ─────────────────────────────────────────────────────────────────
    const sortedDomains = [...(r.career_domain_scores||[])].sort((a:any,b:any)=>b.score-a.score)
    const domainRows = sortedDomains.map((d:any, i:number) => {
      const pct   = Math.min(100, Math.max(0, d.score))
      const color = pct>=70 ? C.teal : pct>=45 ? C.gold : '#BBBBBB'
      const bg    = pct>=70 ? C.tealLt : pct>=45 ? C.goldLt : C.paper
      const label = pct>=70 ? 'STRONG' : pct>=45 ? 'GOOD' : 'LOW'
      return `
<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
  background:${i%2===0?C.white:C.paper};border-radius:8px;margin-bottom:4px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;
    color:${C.muted};width:20px;text-align:right;flex-shrink:0">${i+1}</div>
  <div style="font-size:11pt;color:${C.ink};font-weight:500;width:220px;flex-shrink:0">${d.domain}</div>
  <div style="flex:1">${bar(pct, color, 10)}</div>
  <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;
    color:${color};width:36px;text-align:right;flex-shrink:0">${pct}</div>
  <div style="background:${bg};color:${color};font-size:9px;font-weight:800;
    padding:3px 10px;border-radius:99px;flex-shrink:0;letter-spacing:0.06em">${label}</div>
</div>`
    }).join('')

    const s03 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('03', 'Career Domain Scores', C.teal, C.tealLt)}
  <p style="font-size:11pt;color:${C.muted};margin-bottom:10px;line-height:1.7">
    Scored 0–100 based on behavioral alignment — not self-reported interest.
  </p>

  <div style="display:flex;gap:20px;margin-bottom:22px">
    ${[[C.teal,C.tealLt,'Strong (70+)'],[C.gold,C.goldLt,'Good (45–69)'],['#BBBBBB',C.paper,'Lower (<45)']].map(
      ([c,bg,label])=>`<div style="display:flex;align-items:center;gap:7px">
        <div style="width:12px;height:12px;background:${c};border-radius:50%"></div>
        <span style="font-size:10px;color:${C.muted}">${label}</span>
      </div>`).join('')}
  </div>

  ${domainRows}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 04 — TOP 10 CAREERS
    // ─────────────────────────────────────────────────────────────────
    const rankC = [C.gold,'#9E9E9E','#CD7F32',C.signal,C.signal,C.teal,C.teal,C.blue,C.blue,C.muted]
    const careerCards = (r.top_10_careers||[]).map((c:any, i:number) => {
      const rc  = rankC[i]||C.muted
      const fitN = parseInt(c.fit_score)||0
      const insts = (isIndia ? c.top_institutions_india : c.top_institutions_usa)||[]
      return `
<div style="border:1.5px solid ${C.line};border-radius:10px;overflow:hidden;
  margin-bottom:16px;page-break-inside:avoid">

  <div style="background:${C.ink};padding:18px 22px;display:flex;align-items:center;gap:16px">
    <div style="font-family:'Instrument Serif',Georgia,serif;font-size:28px;
      color:${rc};flex-shrink:0;width:32px;line-height:1">${c.rank}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:14pt;font-weight:700;color:#F8F6F2;margin-bottom:6px">${c.title}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        ${pill(c.fit_score+' FIT', rc+'33', rc, '800')}
        {(c.natural_strengths_used||[]).slice(0,2).map((s:string)=>
          pill(s, C.teal+'33','#6ECEC6')).join('')}
      </div>
    </div>
    <div style="width:110px">
      <div style="font-size:8px;color:${C.muted};margin-bottom:5px;text-align:right;
        letter-spacing:0.08em">BEHAVIORAL FIT</div>
      ${bar(fitN, rc, 6)}
    </div>
  </div>

  <div style="padding:20px 22px">

    <div style="background:${C.paper};border-left:4px solid ${rc};border-radius:0 8px 8px 0;
      padding:14px 18px;margin-bottom:16px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
        color:${rc};font-weight:800;margin-bottom:6px">Why You Specifically</div>
      <p style="font-size:11pt;color:${C.dim};line-height:1.8;margin:0">${c.why_this_person||''}</p>
    </div>

    ${c.what_a_day_looks_like ? `
    <div style="background:${C.tealLt};border-left:3px solid ${C.teal};border-radius:0 6px 6px 0;
      padding:12px 16px;margin-bottom:16px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
        color:${C.teal};font-weight:800;margin-bottom:5px">A Typical Day</div>
      <p style="font-size:10.5pt;color:${C.dim};line-height:1.75;margin:0;font-style:italic">
        ${c.what_a_day_looks_like}
      </p>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="background:${C.paper};border-radius:8px;padding:14px 16px">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
          color:${C.muted};font-weight:700;margin-bottom:6px">
          Entry Path — ${isIndia?'India':'USA'}
        </div>
        <p style="font-size:10pt;color:${C.ink};margin:0;line-height:1.65">
          ${isIndia?(c.entry_india||''):(c.entry_usa||'')}
        </p>
      </div>
      <div style="background:${C.signalLt};border-radius:8px;padding:14px 16px">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
          color:${C.signal};font-weight:700;margin-bottom:6px">
          Salary — ${isIndia?'India':'USA'}
        </div>
        <div style="font-size:13pt;color:${C.ink};font-weight:800;line-height:1.3">
          ${isIndia?(c.salary_india||''):(c.salary_usa||'')}
        </div>
      </div>
    </div>

    ${insts.filter(Boolean).length ? `
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px">
      ${insts.filter(Boolean).map((inst:string)=>
        `<span style="background:${C.blueLt};color:${C.blue};font-size:9px;font-weight:700;
          padding:4px 12px;border-radius:5px">${inst}</span>`).join('')}
    </div>` : ''}

    ${c.honest_warning ? `
    <div style="background:${C.signalLt};border:1px solid ${C.signal}30;
      border-left:4px solid ${C.signal};border-radius:0 8px 8px 0;padding:12px 16px">
      <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;
        color:${C.signal};font-weight:800">Honest Warning · </span>
      <span style="font-size:10.5pt;color:${C.dim}">${c.honest_warning}</span>
    </div>` : ''}
  </div>
</div>`
    }).join('')

    const s04 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('04', 'Top 10 Career Matches', C.signal, C.signalLt)}
  <p style="font-size:11pt;color:${C.muted};margin-bottom:24px;line-height:1.75">
    Every match is behaviorally justified using your D1, D4, D5, D6, and D8 synthesis — not interest-matched.
  </p>
  ${careerCards}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 05 — NATURAL STRENGTHS
    // ─────────────────────────────────────────────────────────────────
    const strColors = [C.signal,C.teal,C.gold,C.blue,C.purple]
    const strengthCards = (r.natural_strengths||[]).filter((s:any)=>s.strength).map((s:any,i:number)=>{
      const sc = strColors[i%strColors.length]
      return `
<div style="border:1.5px solid ${sc}25;border-radius:10px;padding:18px 20px;
  margin-bottom:12px;display:flex;gap:18px;page-break-inside:avoid">
  <div style="background:${sc};color:#fff;font-family:'DM Mono',monospace;font-size:15px;
    font-weight:800;width:38px;height:38px;border-radius:50%;display:flex;
    align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${i+1}</div>
  <div style="flex:1">
    <div style="font-size:13pt;font-weight:700;color:${C.ink};margin-bottom:7px">${s.strength}</div>
    <p style="font-size:11pt;color:${C.dim};line-height:1.8;margin:0 0 9px">${s.evidence||''}</p>
    ${s.career_relevance?`
    <p style="font-size:10pt;color:${sc};margin:0;font-style:italic;font-weight:500">
      → ${s.career_relevance}
    </p>`:''}
  </div>
</div>`
    }).join('')

    const s05 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('05', 'Your Natural Strengths', C.gold, C.goldLt)}
  <p style="font-size:11pt;color:${C.muted};margin-bottom:22px;line-height:1.75">
    Abilities that feel effortless to you — but that others find genuinely difficult.
  </p>
  ${strengthCards}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTIONS 06–08 — NARRATIVE SECTIONS
    // ─────────────────────────────────────────────────────────────────
    const narSections = [
      {
        num:'06', title:'Who You Become Under Pressure', color:C.purple, bg:C.purpleLt,
        content: r.sections?.under_pressure||'',
        extra: r.contradiction_report?.most_significant ? `
        <div style="background:${C.signalLt};border:1px solid ${C.signal}30;
          border-left:4px solid ${C.signal};border-radius:0 10px 10px 0;
          padding:16px 20px;margin-bottom:24px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;
            color:${C.signal};font-weight:800;margin-bottom:8px">Key Contradiction Detected</div>
          <p style="font-size:12pt;color:${C.ink};margin:0 0 8px;font-weight:600;line-height:1.6">
            ${r.contradiction_report.most_significant}
          </p>
          ${r.contradiction_report.what_it_means?`
          <p style="font-size:10.5pt;color:${C.dim};margin:0;line-height:1.7">
            ${r.contradiction_report.what_it_means}
          </p>`:''}
        </div>` : '',
      },
      { num:'07', title:'What Actually Drives You', color:C.teal,   bg:C.tealLt,   content:r.sections?.what_drives_you||'', extra:'' },
      { num:'08', title:'Your Blind Spots',          color:C.signal, bg:C.signalLt, content:r.sections?.blind_spots||'',      extra:'' },
    ]

    const narrativePages = narSections.map(sec=>`
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader(sec.num, sec.title, sec.color, sec.bg)}
  ${sec.extra}
  ${narrative(sec.content, sec.color, sec.bg)}
</div>`).join('')

    // ─────────────────────────────────────────────────────────────────
    // SECTION 09 — GROWTH EDGES + ACTION PLAN
    // ─────────────────────────────────────────────────────────────────
    const edgeC = [C.signal,C.gold,C.teal]
    const growthEdges = (r.sections?.growth_edges||[]).filter((g:any)=>g.area).map((g:any,i:number)=>{
      const gc = edgeC[i%edgeC.length]
      return `
<div style="border:1.5px solid ${gc}25;border-radius:10px;overflow:hidden;
  margin-bottom:14px;page-break-inside:avoid">
  <div style="background:${gc}12;border-bottom:1px solid ${gc}25;padding:14px 20px;
    display:flex;align-items:center;gap:12px">
    ${pill(`GROWTH EDGE ${i+1}`, gc, '#fff', '800')}
    <span style="font-size:13pt;font-weight:700;color:${C.ink}">${g.area}</span>
  </div>
  <div style="padding:16px 20px">
    <p style="font-size:11pt;color:${C.dim};line-height:1.85;margin:0 0 12px">${g.observation||''}</p>
    ${g.why_it_matters?`
    <p style="font-size:10.5pt;color:${C.muted};margin:0 0 14px;line-height:1.7">
      <strong style="color:${C.dim}">Why it matters: </strong>${g.why_it_matters}
    </p>`:''}
    ${g.action?`
    <div style="background:${gc}10;border-left:4px solid ${gc};border-radius:0 8px 8px 0;padding:12px 16px">
      <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
        color:${gc};font-weight:800">Action Step · </span>
      <span style="font-size:11pt;color:${C.ink}">${g.action}</span>
    </div>`:''}
  </div>
</div>`
    }).join('')

    const ap = r.sections?.action_plan||{}
    const actionCards = [
      {period:'This Week',   data:ap.this_week,    color:C.signal, bg:C.signalLt},
      {period:'This Month',  data:ap.this_month,   color:C.gold,   bg:C.goldLt},
      {period:'In 3 Months', data:ap.three_months, color:C.teal,   bg:C.tealLt},
    ].filter(s=>s.data?.action).map(s=>`
<div style="background:${s.bg};border:1.5px solid ${s.color}30;border-radius:10px;
  padding:20px 22px;margin-bottom:12px">
  <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.16em;
    color:${s.color};font-weight:800;margin-bottom:10px">${s.period}</div>
  <div style="font-family:'Instrument Serif',Georgia,serif;font-size:14pt;color:${C.ink};
    line-height:1.5;margin-bottom:8px;font-weight:400">${s.data.action}</div>
  ${s.data.why?`<p style="font-size:10.5pt;color:${C.dim};margin:0;line-height:1.75">${s.data.why}</p>`:''}
</div>`).join('')

    const s09 = `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('09', 'Growth Edges & Action Plan', C.gold, C.goldLt)}

  <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;
    color:${C.muted};font-weight:700;margin-bottom:16px">Three Areas Worth Your Attention</div>
  ${growthEdges}

  <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.14em;
    color:${C.muted};font-weight:700;margin:32px 0 16px">Your 30-Day Action Plan</div>
  ${actionCards}
</div>`

    // ─────────────────────────────────────────────────────────────────
    // SECTION 10 — PARENT NOTE
    // ─────────────────────────────────────────────────────────────────
    const pn = r.sections?.parent_note
    const s10 = pn?.who_they_are && pn.who_they_are!=='N/A' ? `
<div style="padding:52px 56px;page-break-before:always">
  ${sectionHeader('10', `A Note to the People Who Matter to ${profile?.name}`, C.teal, C.tealLt)}
  <div style="background:${C.goldLt};border:2px solid ${C.gold}50;border-radius:10px;padding:28px 32px">
    <p style="font-size:10.5pt;color:${C.muted};margin:0 0 22px;font-style:italic">
      This section is for parents, mentors, or anyone who plays a significant role in ${profile?.name}'s life.
    </p>
    ${[
      {label:'Who They Are',          text:pn.who_they_are},
      {label:'What They Need',       text:pn.what_they_need},
      {label:'What to Avoid',        text:pn.what_to_avoid},
    ].filter(b=>b.text&&b.text!=='N/A').map(b=>`
    <div style="margin-bottom:20px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.14em;
        color:${C.gold};font-weight:800;margin-bottom:7px">${b.label}</div>
      <p style="font-size:11pt;color:${C.dim};margin:0;line-height:1.85">${b.text}</p>
    </div>`).join('')}
    ${pn.the_one_thing&&pn.the_one_thing!=='N/A'?`
    <div style="background:${C.gold};color:#fff;border-radius:8px;padding:16px 20px">
      <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;font-weight:800;margin-right:8px">The One Thing:</span>
      <span style="font-size:11pt;font-weight:500">${pn.the_one_thing}</span>
    </div>`:''}
  </div>
</div>` : ''

    // Assemble the complete document layout sequence
    const htmlPayload = `<html><body>${cover}${toc}${s01}${s02}${s03}${s04}${s05}${narrativePages}${s09}${s10}</body></html>`
    
    // Return standard HTML payload (or pass to your PDF generator instance below)
    return new NextResponse(htmlPayload, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('PDF Route execution dropped:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
