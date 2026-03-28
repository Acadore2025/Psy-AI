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
    const showIndia = (profile?.country || 'INDIA') === 'INDIA'
    const date = new Date(reportData.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    const top3 = (r.top_10_careers || []).slice(0, 3)
    const domains = [...(r.career_domain_scores || [])].sort((a:any,b:any) => b.score - a.score).slice(0, 5)

    const dimNames: Record<string,string> = {
      D1:'Personality', D2:'Interests', D3:'Aptitude', D4:'Values',
      D5:'Emotional Makeup', D6:'Motivation', D7:'Thinking Style', D8:'Work Style'
    }

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>PsyAI — ${profile?.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#0D0F14;background:#fff;font-size:10.5pt;line-height:1.65}
.page{max-width:720px;margin:0 auto;padding:48px 40px}
@media print{.page{padding:32px}.no-print{display:none}@page{size:A4;margin:12mm}}
h1{font-family:'Instrument Serif',serif;font-size:28pt;line-height:1.05;margin-bottom:8px}
h2{font-family:'Instrument Serif',serif;font-size:18pt;margin:28px 0 10px}
h3{font-size:10pt;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#9A9489;margin:16px 0 6px}
p{color:#5C5850;margin-bottom:10px;line-height:1.8}
.logo{font-family:'DM Mono',monospace;font-size:8pt;letter-spacing:.18em;color:#9A9489;text-transform:uppercase;margin-bottom:6px}
.logo span{color:#C8411A}
hr{border:none;border-top:1px solid #E8E4DC;margin:24px 0}
.tag{font-family:'DM Mono',monospace;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#C8411A;display:block;margin-bottom:4px}
.dims{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.dim{border:1px solid #E8E4DC;padding:10px 12px}
.dim-code{font-family:'DM Mono',monospace;font-size:7pt;color:#C8411A;letter-spacing:.12em}
.dim-label{font-size:11pt;font-weight:500;margin:4px 0 6px}
.bar{height:3px;background:#E8E4DC}
.bar-inner{height:100%;background:#1A7A6E}
.career{border:1px solid #E8E4DC;padding:16px;margin:10px 0;page-break-inside:avoid}
.rank{font-family:'Instrument Serif',serif;font-size:22pt;color:#C4871A;float:left;margin:0 12px 8px 0;line-height:1}
.title{font-size:13pt;font-weight:500}
.fit{font-size:8pt;color:#9A9489;margin:2px 0 10px}
.why{font-size:10pt;color:#5C5850;line-height:1.75;margin-bottom:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dl{font-size:7pt;text-transform:uppercase;letter-spacing:.08em;color:#9A9489;margin-bottom:3px}
.dv{font-size:9.5pt}
.warn{background:#FFF5F2;border-left:3px solid #C8411A;padding:8px 10px;margin-top:10px;font-size:9pt;color:#5C5850;clear:both}
.drow{display:flex;align-items:center;gap:10px;margin:6px 0}
.dname{font-size:10pt;width:200px}
.dbar{flex:1;height:6px;background:#E8E4DC}
.dfill-h{height:100%;background:#1A7A6E}
.dfill-m{height:100%;background:#C4871A}
.dfill-l{height:100%;background:#D8D3C8}
.dscore{font-family:'DM Mono',monospace;font-size:9pt;color:#9A9489;width:24px;text-align:right}
.astep{display:flex;gap:14px;margin:10px 0}
.adot{width:12px;height:12px;border-radius:50%;flex-shrink:0;margin-top:3px}
.aperiod{font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#9A9489;margin-bottom:2px}
.atext{font-size:10.5pt;font-weight:500}
.awhy{font-size:9pt;color:#9A9489}
.parent{border:2px solid #C4871A;padding:18px;margin:20px 0;background:#FFFDF5}
.one-thing{background:#C4871A;color:#fff;padding:10px 14px;margin-top:10px;font-size:10pt}
.footer{border-top:1px solid #E8E4DC;padding-top:10px;margin-top:28px;display:flex;justify-content:space-between;font-size:8pt;color:#9A9489}
.print-btn{position:fixed;bottom:20px;right:20px;background:#C8411A;color:#fff;border:none;padding:12px 24px;font-size:11pt;cursor:pointer;font-family:'DM Sans',sans-serif;z-index:999;border-radius:2px}
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">Download PDF ↓</button>
<div class="page">

<div style="border-bottom:3px solid #C8411A;padding-bottom:18px;margin-bottom:28px">
  <div class="logo">PSY<span>AI</span></div>
  <h1>${r.report_headline || 'Your Behavioral Profile'}</h1>
  <div style="font-size:9pt;color:#9A9489;margin-top:6px">${profile?.name} &middot; ${date} &middot; ${r.accuracy_confidence} accuracy</div>
  ${r.dominant_guna ? `<div style="font-size:9pt;color:#1A7A6E;margin-top:3px">${r.dominant_guna}</div>` : ''}
</div>

<span class="tag">Section 01 &mdash; Who You Actually Are</span>
<h2>Your Personality Portrait</h2>
${(r.sections?.personality_portrait||'').split(/\n\n+/).map((p:string,i:number)=>`<p style="${i===0?'font-size:11.5pt;color:#0D0F14;font-weight:500':''}">${p}</p>`).join('')}

<hr>
<span class="tag">8 Dimensions</span>
<div class="dims">
${Object.entries(r.personality||{}).map(([d,v]:any)=>`
<div class="dim">
  <div class="dim-code">${d} &mdash; ${dimNames[d]||''}</div>
  <div class="dim-label">${v.label||''}</div>
  <div class="bar"><div class="bar-inner" style="width:${v.confidence==='HIGH'?85:v.confidence==='MEDIUM'?60:35}%"></div></div>
  ${v.gap&&v.gap!=='NONE'?`<div style="font-size:8pt;color:#C4871A;margin-top:3px">${v.gap} gap</div>`:''}
</div>`).join('')}
</div>

<hr>
<span class="tag">Section 02 &mdash; Career Domains</span>
<h2>Where You Belong</h2>
${domains.map((d:any)=>{
  const pct=Math.min(100,Math.max(0,d.score))
  const cls=pct>=70?'dfill-h':pct>=45?'dfill-m':'dfill-l'
  return `<div class="drow"><div class="dname">${d.domain}</div><div class="dbar"><div class="${cls}" style="width:${pct}%"></div></div><div class="dscore">${pct}</div></div>`
}).join('')}

<hr>
<span class="tag">Section 03 &mdash; Top Career Matches</span>
<h2>Your Top 3 Careers</h2>
${top3.map((c:any)=>`
<div class="career">
  <div class="rank">${c.rank}</div>
  <div class="title">${c.title}</div>
  <div class="fit">${c.fit_score} behavioral fit</div>
  <div class="why">${c.why_this_person}</div>
  <div class="grid2" style="clear:both">
    <div><div class="dl">${showIndia?'Entry — India':'Entry — USA'}</div><div class="dv">${showIndia?(c.entry_india||''):(c.entry_usa||'')}</div></div>
    <div><div class="dl">${showIndia?'Salary — India':'Salary — USA'}</div><div class="dv">${showIndia?(c.salary_india||''):(c.salary_usa||'')}</div></div>
  </div>
  ${c.honest_warning?`<div class="warn">&there4; ${c.honest_warning}</div>`:''}
</div>`).join('')}

<hr>
<span class="tag">Section 04 &mdash; Under Pressure</span>
<h2>Who You Become Under Stress</h2>
${(r.sections?.under_pressure||'').split(/\n\n+/).map((p:string)=>`<p>${p}</p>`).join('')}

<hr>
<span class="tag">Section 05 &mdash; What Drives You</span>
<h2>Your Motivation</h2>
${(r.sections?.what_drives_you||'').split(/\n\n+/).map((p:string)=>`<p>${p}</p>`).join('')}

<hr>
<span class="tag">Section 06 &mdash; Blind Spots</span>
<h2>What You Cannot See About Yourself</h2>
${r.contradiction_report?.most_significant?`<div style="background:#FFF5F2;border-left:3px solid #C8411A;padding:10px 14px;margin-bottom:14px"><div style="font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#C8411A;margin-bottom:4px">Key Contradiction</div><p style="margin:0;color:#0D0F14">${r.contradiction_report.most_significant}</p></div>`:''}
${(r.sections?.blind_spots||'').split(/\n\n+/).map((p:string)=>`<p>${p}</p>`).join('')}

<hr>
<span class="tag">Section 07 &mdash; Growth Edges</span>
<h2>Three Areas Worth Your Attention</h2>
${(r.sections?.growth_edges||[]).filter((g:any)=>g.area).map((g:any,i:number)=>`
<div style="border:1px solid #E8E4DC;padding:12px;margin:8px 0">
  <div style="font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#C4871A;margin-bottom:4px">Growth Edge ${i+1}</div>
  <div style="font-size:11pt;font-weight:500;margin-bottom:6px">${g.area}</div>
  <p style="font-size:9.5pt">${g.observation}</p>
  <div style="background:#F0F8F6;border-left:2px solid #1A7A6E;padding:8px 10px;margin-top:8px;font-size:9.5pt;color:#5C5850">&rarr; ${g.action}</div>
</div>`).join('')}

<hr>
<span class="tag">Section 08 &mdash; Action Plan</span>
<h2>What to Do Next</h2>
${[
  {period:'This Week',data:r.sections?.action_plan?.this_week,color:'#C8411A'},
  {period:'This Month',data:r.sections?.action_plan?.this_month,color:'#C4871A'},
  {period:'3 Months',data:r.sections?.action_plan?.three_months,color:'#1A7A6E'},
].filter(s=>s.data?.action).map(s=>`
<div class="astep">
  <div class="adot" style="background:${s.color}"></div>
  <div>
    <div class="aperiod">${s.period}</div>
    <div class="atext">${s.data!.action}</div>
    <div class="awhy">${s.data!.why||''}</div>
  </div>
</div>`).join('')}

${r.sections?.parent_note?.who_they_are?`
<hr>
<span class="tag">For Parents &amp; Mentors</span>
<div class="parent">
  <h2 style="margin-top:0">A Note to the People Who Matter to ${profile?.name}</h2>
  ${r.sections.parent_note.who_they_are?`<p><strong>Who they are:</strong> ${r.sections.parent_note.who_they_are}</p>`:''}
  ${r.sections.parent_note.what_they_need?`<p><strong>What they need:</strong> ${r.sections.parent_note.what_they_need}</p>`:''}
  ${r.sections.parent_note.what_to_avoid?`<p><strong>What to avoid:</strong> ${r.sections.parent_note.what_to_avoid}</p>`:''}
  ${r.sections.parent_note.the_one_thing?`<div class="one-thing"><strong>The one thing:</strong> ${r.sections.parent_note.the_one_thing}</div>`:''}
</div>`:''}

<div class="footer">
  <span>PsyAI &mdash; psyai.app</span>
  <span>${profile?.name} &middot; ${date}</span>
  <span>Confidential</span>
</div>
</div>
</body></html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
