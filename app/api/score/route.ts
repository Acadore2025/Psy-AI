import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  buildScoringPromptPart1,
  buildScoringPromptPart2,
  buildUserMessage,
} from '@/lib/scoring/engine'

// ── helpers ──────────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  // 1. Try extracting the outermost { ... } block
  const match = raw.match(/\{[\s\S]*\}/)
  const clean = match
    ? match[0]
    : raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean)
}

// ── route ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { session_id, responses, user_context } = await req.json()
    if (!session_id || !responses || !user_context)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const userMsg   = buildUserMessage(user_context, responses)

    // ── CALL 1: Profile + Careers ─────────────────────────────────────
    // Generates: accuracy_confidence, contradiction_count, report_headline,
    // dominant_guna, personality (8 dims), career_domain_scores,
    // top_10_careers (full, both countries), natural_strengths,
    // contradiction_report
    const msg1 = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system:     buildScoringPromptPart1(user_context, responses),
      messages:   [{ role: 'user', content: userMsg }],
    })

    const raw1 = msg1.content[0].type === 'text' ? msg1.content[0].text : ''
    let part1: any
    try {
      part1 = extractJSON(raw1)
    } catch {
      console.error('Part 1 parse failed. Raw (first 800 chars):', raw1.slice(0, 800))
      return NextResponse.json({ error: 'Report parsing failed (part 1)' }, { status: 500 })
    }

    // ── CALL 2: Written Sections ──────────────────────────────────────
    // Generates: sections.personality_portrait, under_pressure,
    // what_drives_you, blind_spots, career_compass, growth_edges,
    // action_plan, parent_note
    const msg2 = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system:     buildScoringPromptPart2(user_context, responses, part1),
      messages:   [{ role: 'user', content: userMsg }],
    })

    const raw2 = msg2.content[0].type === 'text' ? msg2.content[0].text : ''
    let part2: any
    try {
      part2 = extractJSON(raw2)
    } catch {
      console.error('Part 2 parse failed. Raw (first 800 chars):', raw2.slice(0, 800))
      return NextResponse.json({ error: 'Report parsing failed (part 2)' }, { status: 500 })
    }

    // ── MERGE ─────────────────────────────────────────────────────────
    const report = {
      ...part1,
      sections: part2.sections,
    }

    // ── SAVE ──────────────────────────────────────────────────────────
    const { data: saved } = await supabase.from('reports').insert({
      session_id,
      user_id:      user.id,
      report_json:  report,
      accuracy_conf: report.accuracy_confidence,
      headline:      report.report_headline,
    }).select('id').single()

    await supabase.from('sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session_id)

    return NextResponse.json({ report, report_id: saved?.id })
  } catch (e: any) {
    console.error('Score error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
