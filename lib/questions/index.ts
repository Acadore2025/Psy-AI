import { Question, SessionQuestion, Country, Dimension } from './types'
import D1_QUESTIONS from './d1-personality'
import D2_QUESTIONS from './d2-interests'
import D3_QUESTIONS from './d3-aptitude'
import D4_QUESTIONS from './d4-values'
import D5_QUESTIONS from './d5-emotional'
import D6_QUESTIONS from './d6-motivation'
import D7_QUESTIONS from './d7-thinking'
import D8_QUESTIONS from './d8-workstyle'

export const ALL_QUESTIONS: Question[] = [
  ...D1_QUESTIONS,
  ...D2_QUESTIONS,
  ...D3_QUESTIONS,
  ...D4_QUESTIONS,
  ...D5_QUESTIONS,
  ...D6_QUESTIONS,
  ...D7_QUESTIONS,
  ...D8_QUESTIONS,
]

const DIMS: Dimension[] = ['D1','D2','D3','D4','D5','D6','D7','D8']
const PER_DIM = 9

export function buildSession(country: Country, answeredIds: string[] = []): SessionQuestion[] {
  const answered = new Set(answeredIds)
  const pool: SessionQuestion[] = []

  DIMS.forEach(dim => {
    const dimQs = ALL_QUESTIONS.filter(q => q.dimension === dim && !answered.has(q.question_id))
    const shuffled = [...dimQs].sort(() => Math.random() - 0.5).slice(0, PER_DIM)
    shuffled.forEach(q => pool.push(resolve(q, country)))
  })

  return interleave(pool)
}

function resolve(q: Question, country: Country): SessionQuestion {
  return {
    question_id: q.question_id,
    dimension: q.dimension,
    facet: q.facet,
    type: q.type,
    text: country === 'INDIA' ? q.text_india : q.text_usa,
    options: country === 'INDIA'
      ? q.options_india
      : (q.options_usa || q.options_india),
    timer_seconds: q.timer_seconds,
  }
}

function interleave(qs: SessionQuestion[]): SessionQuestion[] {
  const buckets: Record<string, SessionQuestion[]> = { AG:[], TC:[], SC:[], IP:[], CS:[] }
  qs.forEach(q => { if (buckets[q.type]) buckets[q.type].push(q) })
  Object.values(buckets).forEach(b => b.sort(() => Math.random() - 0.5))

  // Build sequence: warm up AG, then TC/SC mix, then IP scattered, end with CS
  const sequence: SessionQuestion[] = []
  const pattern = [
    'AG','AG','AG','TC','AG','SC','AG','AG','SC','IP',
    'AG','TC','SC','AG','IP','SC','TC','AG','SC','IP',
    'AG','SC','TC','IP','SC','AG','TC','SC','IP','SC',
    'TC','AG','SC','IP','TC','SC','AG','IP','SC','TC',
    'SC','IP','TC','SC','IP','CS','SC','TC','IP','CS',
    'SC','TC','CS','IP','SC','CS','TC','CS','IP','CS',
    'CS','CS','CS','CS','CS','CS','CS','CS','CS','CS',
  ]

  pattern.forEach(type => {
    const b = buckets[type]
    if (b && b.length > 0) sequence.push(b.shift()!)
  })

  Object.values(buckets).forEach(b => sequence.push(...b))
  return sequence.slice(0, 70)
}

export function getBankStats() {
  const byDim = DIMS.map(d => ({
    dim: d,
    count: ALL_QUESTIONS.filter(q => q.dimension === d).length
  }))
  return { total: ALL_QUESTIONS.length, byDim }
}

export type { Question, SessionQuestion, Country, Dimension }
