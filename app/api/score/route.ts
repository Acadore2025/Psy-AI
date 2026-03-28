import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildScoringPrompt, buildUserMessage } from '@/lib/scoring/engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { session_id, responses, user_context } = await req.json()
    if (!session_id || !responses || !user_context)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: buildScoringPrompt(user_context, responses),
      messages: [{ role: 'user', content: buildUserMessage(user_context, responses) }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()

    let report
    try { report = JSON.parse(clean) }
    catch { return NextResponse.json({ error: 'Report parsing failed' }, { status: 500 }) }

    const { data: saved } = await supabase.from('reports').insert({
      session_id, user_id: user.id, report_json: report,
      accuracy_conf: report.accuracy_confidence,
      headline: report.report_headline,
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
