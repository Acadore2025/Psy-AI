import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSession } from '@/lib/questions'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile?.country) return NextResponse.json({ error: 'Profile incomplete' }, { status: 400 })

    const country = profile.country
    const { data: answered } = await supabase
      .from('answered_questions').select('question_id')
      .eq('user_id', user.id).eq('country', country)

    const answeredIds = answered?.map((a:any) => a.question_id) || []
    const questions = buildSession(country, answeredIds)

    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id, country, status: 'in_progress',
      question_ids: questions.map(q => q.question_id),
    }).select('id').single()

    return NextResponse.json({ session_id: session?.id, questions, total: questions.length, country })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { session_id, response } = await req.json()

    await Promise.all([
      supabase.from('responses').insert({
        session_id, user_id: user.id,
        question_id: response.question_id,
        dimension: response.dimension,
        question_type: response.question_type,
        question_text: response.question_text,
        answer: response.answer,
        timing_ms: response.timing_ms,
      }),
      supabase.from('answered_questions').upsert({
        user_id: user.id,
        question_id: response.question_id,
        country: response.country,
      }, { onConflict: 'user_id,question_id' })
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
