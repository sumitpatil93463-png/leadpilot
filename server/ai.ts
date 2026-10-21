import type { Lead, LeadAnalysis, PriorityBand } from '../src/types/lead.ts'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

type LeadContext = Pick<
  Lead,
  'name' | 'location' | 'propertyRequirement' | 'budget' | 'buyingTimeline' | 'customerMessage'
>

const leadAnalysisSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    intent: { type: 'STRING' },
    keyRequirements: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    concerns: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    recommendedNextAction: { type: 'STRING' },
    suggestedResponse: { type: 'STRING' },
    priorityScore: {
      type: 'INTEGER',
      minimum: 0,
      maximum: 100,
    },
    priorityBand: {
      type: 'STRING',
      enum: ['hot', 'warm', 'cool'],
    },
    callPrep: {
      type: 'OBJECT',
      properties: {
        talkingPoints: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        discoveryQuestions: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        risksToAddress: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        callObjective: { type: 'STRING' },
      },
      required: ['talkingPoints', 'discoveryQuestions', 'risksToAddress', 'callObjective'],
    },
  },
  required: [
    'summary',
    'intent',
    'keyRequirements',
    'concerns',
    'recommendedNextAction',
    'suggestedResponse',
    'priorityScore',
    'priorityBand',
    'callPrep',
  ],
}

function buildLeadPrompt(lead: LeadContext): string {
  return `You are LeadPilot, an AI copilot for a real-estate salesperson. Analyze the inbound lead below and produce concise, practical guidance for the next human action.

Use only facts present in the lead context. If a detail is missing, say that it is unknown instead of inventing it.

Scoring guidance:
- Score from 0 to 100 using buying-timeline urgency, budget clarity, requirement clarity, and likelihood of a useful next conversation.
- Use "hot" for 75-100, "warm" for 50-74, and "cool" for 0-49.

Write the suggested response as a natural, helpful message that the salesperson could send. Keep it specific to this lead and avoid promising availability or pricing that was not provided.

Lead context:
- Name: ${lead.name}
- Location: ${lead.location}
- Property requirement: ${lead.propertyRequirement}
- Budget: ${lead.budget}
- Buying timeline: ${lead.buyingTimeline}
- Customer message or transcript: ${lead.customerMessage}

Return only the JSON object matching the requested schema.`
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
}

function clampScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

function fallbackPriorityBand(score: number): PriorityBand {
  if (score >= 75) {
    return 'hot'
  }

  if (score >= 50) {
    return 'warm'
  }

  return 'cool'
}

function normalizeAnalysis(value: unknown): LeadAnalysis {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const priorityScore = clampScore(raw.priorityScore)
  const requestedBand = raw.priorityBand
  const priorityBand: PriorityBand =
    requestedBand === 'hot' || requestedBand === 'warm' || requestedBand === 'cool'
      ? requestedBand
      : fallbackPriorityBand(priorityScore)
  const rawCallPrep = raw.callPrep && typeof raw.callPrep === 'object' ? (raw.callPrep as Record<string, unknown>) : {}

  return {
    summary: asString(raw.summary, 'The AI did not return a summary.'),
    intent: asString(raw.intent, 'Customer intent is unclear from the provided message.'),
    keyRequirements: asStringArray(raw.keyRequirements),
    concerns: asStringArray(raw.concerns),
    recommendedNextAction: asString(raw.recommendedNextAction, 'Review the lead and follow up for missing details.'),
    suggestedResponse: asString(raw.suggestedResponse, 'Thanks for reaching out. I would love to learn a little more about what you are looking for.'),
    priorityScore,
    priorityBand,
    callPrep: {
      talkingPoints: asStringArray(rawCallPrep.talkingPoints),
      discoveryQuestions: asStringArray(rawCallPrep.discoveryQuestions),
      risksToAddress: asStringArray(rawCallPrep.risksToAddress),
      callObjective: asString(rawCallPrep.callObjective, 'Clarify the lead\'s needs and agree on a useful next step.'),
    },
  }
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) {
    return ''
  }

  const firstCandidate = candidates[0]
  if (!firstCandidate || typeof firstCandidate !== 'object') {
    return ''
  }

  const content = (firstCandidate as { content?: unknown }).content
  if (!content || typeof content !== 'object') {
    return ''
  }

  const parts = (content as { parts?: unknown }).parts
  if (!Array.isArray(parts)) {
    return ''
  }

  return parts
    .map((part) => (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : ''))
    .join('')
    .trim()
}

function parseJsonResponse(text: string): unknown {
  const withoutCodeFence = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(withoutCodeFence)
}

export async function analyzeLeadWithGemini(
  lead: LeadContext,
  apiKey: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<LeadAnalysis> {
  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local and restart the server.')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildLeadPrompt(lead) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: leadAnalysisSchema,
      },
    }),
  })

  const payload: unknown = await response.json()
  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error === 'object' && 'message' in payload.error
        ? String((payload.error as { message?: unknown }).message)
        : `Gemini returned HTTP ${response.status}.`
    throw new Error(errorMessage)
  }

  const responseText = extractResponseText(payload)
  if (!responseText) {
    throw new Error('Gemini returned an empty analysis.')
  }

  try {
    return normalizeAnalysis(parseJsonResponse(responseText))
  } catch {
    throw new Error('Gemini returned an invalid analysis format. Please retry this lead.')
  }
}

type FollowUpTurn = {
  role: 'user' | 'assistant'
  content: string
}

type LeadWithAnalysis = LeadContext & {
  analysis: LeadAnalysis
}

const followUpSchema = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
  },
  required: ['reply'],
}

function buildFollowUpPrompt(lead: LeadWithAnalysis, history: FollowUpTurn[], question: string): string {
  const historyText = history.length
    ? history.map((turn) => `${turn.role === 'user' ? 'Salesperson' : 'LeadPilot'}: ${turn.content}`).join('\n')
    : 'No earlier follow-up messages.'

  return `You are LeadPilot, a real-estate sales copilot. Answer the salesperson's follow-up question using only the selected lead's context and analysis below.

Do not act like a generic chatbot. Ground every answer in this lead. If the context does not contain an answer, say what is unknown and suggest the most useful question to ask next. Never invent listings, availability, pricing, financing approval, school ratings, or customer facts.

Selected lead:
- Name: ${lead.name}
- Location: ${lead.location}
- Property requirement: ${lead.propertyRequirement}
- Budget: ${lead.budget}
- Buying timeline: ${lead.buyingTimeline}
- Customer message or transcript: ${lead.customerMessage}

AI analysis:
${JSON.stringify(lead.analysis, null, 2)}

Earlier conversation:
${historyText}

Current salesperson question:
${question}

Return a concise, practical answer for the salesperson. Return only the JSON object matching the requested schema.`
}

export async function answerLeadFollowUpWithGemini(
  lead: LeadWithAnalysis,
  history: FollowUpTurn[],
  question: string,
  apiKey: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local and restart the server.')
  }

  if (!question.trim()) {
    throw new Error('A follow-up question is required.')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildFollowUpPrompt(lead, history, question.trim()) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema: followUpSchema,
      },
    }),
  })

  const payload: unknown = await response.json()
  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error === 'object' && 'message' in payload.error
        ? String((payload.error as { message?: unknown }).message)
        : `Gemini returned HTTP ${response.status}.`
    throw new Error(errorMessage)
  }

  const responseText = extractResponseText(payload)
  if (!responseText) {
    throw new Error('Gemini returned an empty follow-up answer.')
  }

  try {
    const parsed = parseJsonResponse(responseText)
    const raw = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    return asString(raw.reply, 'I could not find enough context to answer that yet.')
  } catch {
    throw new Error('Gemini returned an invalid follow-up format. Please retry.')
  }
}
