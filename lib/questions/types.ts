export type QuestionType = 'AG' | 'TC' | 'SC' | 'IP' | 'CS'
export type Dimension = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8'
export type Country = 'INDIA' | 'USA'

export interface Option {
  id: string
  text: string
}

export interface Question {
  question_id: string
  dimension: Dimension
  facet: string
  type: QuestionType
  text_india: string
  text_usa: string
  options_india?: Option[]
  options_usa?: Option[]
  timer_seconds?: number
}

export interface SessionQuestion {
  question_id: string
  dimension: Dimension
  facet: string
  type: QuestionType
  text: string
  options?: Option[]
  timer_seconds?: number
}
