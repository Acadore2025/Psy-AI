import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  buildScoringPromptPart1,
  buildScoringPromptPart2A,
  buildScoringPromptPart2B,
  buildUserMessage,
} from '@/lib/scoring/engine'

// ── helpers ──────────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  // Strip markdown fences
  let clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

  // Try direct parse first
  try { return JSON.parse(clean) } catch (_) {}

  // Extract outermost { ... } block
  const match = clean.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch (_) {}
  }

  // Last resort: find the largest valid JSON object
  // Walk backwards from end to find valid closing
  for (let i = clean.length; i > 0; i--) {
    if (clean[i] === '}') {
      try {
        const attempt = clean.substring(0, i + 1)
        const start   = attempt.indexOf('{')
        if (start >= 0) return JSON.parse(attempt.substring(start))
      } catch (_) {}
    }
  }

  throw new Error('Could not extract valid JSON')
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

    // ── CALL 1: Structured data ───────────────────────────────────────
    // personality, careers, domain scores, strengths, contradiction
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

    // ── CALL 2A: Narrative sections (portrait, pressure, drives, blindspots) ──
    const msg2a = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system:     buildScoringPromptPart2A(user_context, responses, part1),
      messages:   [{ role: 'user', content: userMsg }],
    })

    const raw2a = msg2a.content[0].type === 'text' ? msg2a.content[0].text : ''
    let part2a: any
    try {
      part2a = extractJSON(raw2a)
    } catch {
      console.error('Part 2A parse failed. Raw (first 800 chars):', raw2a.slice(0, 800))
      return NextResponse.json({ error: 'Report parsing failed (part 2A)' }, { status: 500 })
    }

    // ── CALL 2B: Growth edges, action plan, parent note ───────────────
    const msg2b = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system:     buildScoringPromptPart2B(user_context, responses, part1),
      messages:   [{ role: 'user', content: userMsg }],
    })

    const raw2b = msg2b.content[0].type === 'text' ? msg2b.content[0].text : ''
    let part2b: any
    try {
      part2b = extractJSON(raw2b)
    } catch {
      console.error('Part 2B parse failed. Raw (first 800 chars):', raw2b.slice(0, 800))
      // Part 2B failing is non-fatal — use empty defaults
      part2b = {
        growth_edges: [],
        action_plan:  { this_week: null, this_month: null, three_months: null },
        parent_note:  { who_they_are: 'N/A', what_they_need: 'N/A', what_to_avoid: 'N/A', the_one_thing: 'N/A' },
      }
    }

    // ── MERGE all three parts ─────────────────────────────────────────
    const report = {
      ...part1,
      sections: {
        personality_portrait: part2a.sections?.personality_portrait || '',
        under_pressure:       part2a.sections?.under_pressure       || '',
        what_drives_you:      part2a.sections?.what_drives_you      || '',
        blind_spots:          part2a.sections?.blind_spots          || '',
        career_compass:       part2a.sections?.career_compass       || '',
        growth_edges:         part2b.growth_edges                   || [],
        action_plan:          part2b.action_plan                    || {},
        parent_note:          part2b.parent_note                    || {},
      },
    }

    // ── SAVE ──────────────────────────────────────────────────────────
    const { data: saved } = await supabase.from('reports').insert({
      session_id,
      user_id:       user.id,
      report_json:   report,
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
