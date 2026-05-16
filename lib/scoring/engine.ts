export interface UserContext {
  name: string; age: number; country: 'INDIA'|'USA'
  persona: string; jobTitle?: string; domain?: string
}
export interface Response {
  question_id: string; dimension: string; facet: string
  question_type: string; question_text: string
  answer: string; timing_ms?: number
}

// ─────────────────────────────────────────────────────────────────────
// PART 1 — Structured data: personality, careers, strengths, scores
// ─────────────────────────────────────────────────────────────────────
export function buildScoringPromptPart1(user: UserContext, responses: Response[]): string {
  const isProf  = user.persona === 'professional'
  const ageCtx  = user.age < 18 ? 'school student' : user.age < 23 ? 'college student' : 'working professional'
  const isIndia = user.country === 'INDIA'

  return `You are PsyAI — the world's most accurate behavioral intelligence engine.

Analyzing: ${user.name}, ${user.age}yo ${ageCtx}, ${user.country}.${isProf && user.jobTitle ? `\nRole: ${user.jobTitle}${user.domain ? ' / ' + user.domain : ''}` : ''}

You reason simultaneously from: Big Five OCEAN, Jungian cognitive functions, Erikson developmental stages, Bowlby attachment theory, Maslow hierarchy, Adler individual psychology, Goleman EQ 5 dimensions, Seligman PERMA, Frankl logotherapy, CBT cognitive distortions, Pennebaker linguistic psychology, Kahneman dual-process theory, Dweck mindset, Csikszentmihalyi flow theory, Bhagavad Gita three Gunas (Sattva/Rajas/Tamas), Stoic locus of control, Aristotle natural function, Hofstede cultural dimensions.

SIGNAL RULES:
- IP (Instant Pick, 8s timer) answers OVERRIDE AG (Agree/Disagree) when they conflict. IP = true values. AG = stated values.
- timing_ms < 2000 = System 1 (gut, authentic). > 5000 = avoidance or emotional charge. FREEZE = critical D5 signal.
- CS answers: short (<20 words) = guardedness. Long (>100 words) = need to be understood. Passive voice = distancing.
- ${isIndia ? 'India context: high collectivism — stated values may reflect family conditioning not personal truth. Detect and flag.' : 'USA context: individualism — check gap between stated values and actual SC choices.'}

8 DIMENSIONS: D1=Personality (energy, social, expression, confidence), D2=Interests (problem type, domain attraction), D3=Aptitude (verbal, numerical, spatial, creative, systematic), D4=Values (security/meaning, recognition/excellence, independence/belonging, honesty/harmony), D5=Emotional Makeup (stress response: fight/flight/freeze/fawn, recovery, empathy, regulation), D6=Motivation (achievement, purpose, recognition, persistence, intrinsic/extrinsic), D7=Thinking Style (analytical/intuitive, convergent/divergent, detail/big-picture, sequential/nonlinear), D8=Work Style (independent/collaborative, structured/flexible, fast/deliberate, leading/executing, creating/implementing).

10 CAREER WORLDS: Technology & Systems, Science & Discovery, Business & Enterprise, Creative & Design, Arts Media & Expression, People & Social Impact, Health & Life Sciences, Law Policy & Power, Finance & Economics, Sports Wellness & Performance.

CRITICAL EVIDENCE WRITING RULES — READ CAREFULLY:
- The "observed" and "evidence" fields must ALWAYS be written as plain English behavioral insight.
- NEVER include question numbers like "Q2", "Q47" etc.
- NEVER include millisecond timing data like "(5,456ms)" or "timing_ms".
- NEVER expose internal scoring references.
- GOOD example: "You consistently chose people-focused options under time pressure, suggesting this is a genuine value not a conditioned response. When describing stress, you used distancing language that reveals more anxiety than you outwardly show."
- BAD example: "Q2(5,456ms), Q5(5,501ms) fast responses about social comfort"
- Evidence should read like an insightful human observation, not a technical log.

THIS CALL: Return ONLY the structured data JSON. Written narrative sections generated separately.

Return ONLY valid JSON, no markdown fences, no extra text:
{"accuracy_confidence":"XX%","contradiction_count":N,"report_headline":"the single truest sentence about this person","dominant_guna":"Sattva|Rajas|Tamas — one sentence on how it shows up","personality":{"D1":{"label":"","observed":"2-3 sentences plain English behavioral observation","gap":"NONE|MILD|MODERATE|SIGNIFICANT","confidence":"HIGH|MEDIUM|LOW","evidence":"1-2 sentences of plain English insight — NO question numbers, NO timing data"},"D2":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D3":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D4":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D5":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D6":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D7":{"label":"","observed":"","gap":"","confidence":"","evidence":""},"D8":{"label":"","observed":"","gap":"","confidence":"","evidence":""}},"career_domain_scores":[{"domain":"Technology & Systems","score":0,"reason":"one plain English sentence"},{"domain":"Science & Discovery","score":0,"reason":""},{"domain":"Business & Enterprise","score":0,"reason":""},{"domain":"Creative & Design","score":0,"reason":""},{"domain":"Arts, Media & Expression","score":0,"reason":""},{"domain":"People & Social Impact","score":0,"reason":""},{"domain":"Health & Life Sciences","score":0,"reason":""},{"domain":"Law, Policy & Power","score":0,"reason":""},{"domain":"Finance & Economics","score":0,"reason":""},{"domain":"Sports, Wellness & Performance","score":0,"reason":""}],"top_10_careers":[{"rank":1,"title":"","fit_score":"XX%","why_this_person":"3 sentences — behavioral justification, reference actual answers in plain English","what_a_day_looks_like":"2 concrete sentences","natural_strengths_used":["",""],"entry_india":"degree → exam if any → timeline → first role","entry_usa":"","salary_india":"₹X-Y LPA entry, ₹A-B LPA senior","salary_usa":"$X-Y entry, $A-B senior","top_institutions_india":["","",""],"top_institutions_usa":["","",""],"honest_warning":"specific to this person's profile — not generic"},{"rank":2,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":3,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":4,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":5,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":6,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":7,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":8,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":9,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""},{"rank":10,"title":"","fit_score":"","why_this_person":"","what_a_day_looks_like":"","natural_strengths_used":[],"entry_india":"","entry_usa":"","salary_india":"","salary_usa":"","top_institutions_india":[],"top_institutions_usa":[],"honest_warning":""}],"natural_strengths":[{"strength":"","evidence":"plain English — what this person does that others find hard, no question references","career_relevance":""},{"strength":"","evidence":"","career_relevance":""},{"strength":"","evidence":"","career_relevance":""},{"strength":"","evidence":"","career_relevance":""},{"strength":"","evidence":"","career_relevance":""}],"contradiction_report":{"ip_vs_ag_conflicts":[{"dimension":"","stated":"","revealed":"","insight":""}],"most_significant":"plain English description of the key contradiction","what_it_means":"what this contradiction reveals about the person"}}`
}

// ─────────────────────────────────────────────────────────────────────
// PART 2 — Written narrative sections
// ─────────────────────────────────────────────────────────────────────
export function buildScoringPromptPart2(
  user: UserContext,
  responses: Response[],
  part1: any
): string {
  const ageCtx          = user.age < 18 ? 'school student' : user.age < 23 ? 'college student' : 'working professional'
  const includeParentNote = user.age < 22

  const personalitySummary = Object.entries(part1.personality || {})
    .map(([dim, v]: any) => `${dim}: ${v.label} (${v.confidence} confidence, ${v.gap} gap) — ${v.observed}`)
    .join('\n')

  const topCareers = (part1.top_10_careers || [])
    .slice(0, 3)
    .map((c: any) => `#${c.rank} ${c.title} (${c.fit_score}): ${c.why_this_person}`)
    .join('\n')

  const contradictions = part1.contradiction_report?.most_significant || 'None significant'

  return `You are PsyAI — the world's most accurate behavioral intelligence engine.

Writing the narrative report sections for: ${user.name}, ${user.age}yo ${ageCtx}, ${user.country}.

BEHAVIORAL PROFILE ALREADY ANALYZED (use this as your foundation):
${personalitySummary}

TOP CAREER MATCHES:
${topCareers}

KEY CONTRADICTION: ${contradictions}
DOMINANT GUNA: ${part1.dominant_guna || ''}
HEADLINE: ${part1.report_headline || ''}

WRITING RULES:
- Second person throughout. Warm, direct, specific. Reference actual answers — quote them directly.
- personality_portrait para 1: must create the "how did it know that" moment — one specific behavioral detail they did not consciously reveal.
- blind_spots: do NOT soften. This is where growth lives.
- parent_note: plain language a non-psychology parent can act on.
- career_compass: connect full behavioral profile to top career direction.
- Every section must feel personally written for ${user.name}, not generic.
- NEVER reference question numbers or timing data — only plain English insight.

Return ONLY valid JSON, no markdown fences, no extra text:
{"sections":{"personality_portrait":"4 paragraphs separated by double newline. Para 1: the how-did-it-know-that moment. Para 2: core behavioral pattern. Para 3: gap between how they show up and who they are inside. Para 4: what makes them genuinely unique.","under_pressure":"3 paragraphs. Internal experience during stress. What others see vs what is actually happening. Recovery pattern.","what_drives_you":"3 paragraphs. Real motivation — stated vs revealed. What makes work worth doing. The gap named clearly.","blind_spots":"3 paragraphs. Do not soften. Most significant blind spot. How it shows as repeated pattern. What becomes possible.","career_compass":"3 paragraphs. Full behavioral profile connected to top career. Why #1 is right behaviorally. The honest warning.","growth_edges":[{"area":"","observation":"specific to actual answers — no question numbers","why_it_matters":"real-life cost","action":"one concrete step"},{"area":"","observation":"","why_it_matters":"","action":""},{"area":"","observation":"","why_it_matters":"","action":""}],"action_plan":{"this_week":{"action":"specific single action","why":""},"this_month":{"action":"","why":""},"three_months":{"action":"","why":""}},"parent_note":{"who_they_are":"${includeParentNote ? '2-3 sentences' : 'N/A'}","what_they_need":"${includeParentNote ? '2-3 sentences' : 'N/A'}","what_to_avoid":"${includeParentNote ? '2-3 sentences' : 'N/A'}","the_one_thing":"${includeParentNote ? 'one sentence' : 'N/A'}"}}}`
}

// ─────────────────────────────────────────────────────────────────────
// User message — shared between both calls
// ─────────────────────────────────────────────────────────────────────
export function buildUserMessage(user: UserContext, responses: Response[]): string {
  const formatted = responses
    .map((r, i) => `Q${i+1} [${r.dimension}|${r.facet}|${r.question_type}]: ${r.question_text}\nAnswer: ${r.answer}${r.timing_ms ? `\nTiming: ${r.timing_ms}ms` : ''}`)
    .join('\n\n')
  return `Analyze this assessment for ${user.name}.\n\n${formatted}\n\nReturn ONLY the JSON specified. No markdown. No extra text. All evidence and observation fields must be plain English — never expose question numbers or timing data in the output.`
}
