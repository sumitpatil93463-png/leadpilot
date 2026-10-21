import { answerLeadFollowUpWithGemini, DEFAULT_GEMINI_MODEL } from '../server/ai.ts'

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  status: (statusCode: number) => ApiResponse
  json: (payload: unknown) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return response.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' })
  }

  let body: unknown
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  } catch {
    return response.status(400).json({ error: 'The request body must be valid JSON.' })
  }

  if (!body || typeof body !== 'object') {
    return response.status(400).json({ error: 'A follow-up request body is required.' })
  }

  const payload = body as {
    lead?: unknown
    analysis?: unknown
    history?: unknown
    message?: unknown
  }

  if (!payload.lead || typeof payload.lead !== 'object' || !payload.analysis || typeof payload.analysis !== 'object') {
    return response.status(400).json({ error: 'A lead and its analysis are required.' })
  }

  if (typeof payload.message !== 'string' || !payload.message.trim()) {
    return response.status(400).json({ error: 'A follow-up message is required.' })
  }

  const history = Array.isArray(payload.history)
    ? payload.history.filter(
        (turn): turn is { role: 'user' | 'assistant'; content: string } =>
          Boolean(turn) &&
          typeof turn === 'object' &&
          ((turn as { role?: unknown }).role === 'user' || (turn as { role?: unknown }).role === 'assistant') &&
          typeof (turn as { content?: unknown }).content === 'string',
      )
    : []

  try {
    const reply = await answerLeadFollowUpWithGemini(
      { ...(payload.lead as object), analysis: payload.analysis } as Parameters<typeof answerLeadFollowUpWithGemini>[0],
      history,
      payload.message,
      apiKey,
      process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    )
    return response.status(200).json({ reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The follow-up answer could not be generated.'
    return response.status(502).json({ error: message })
  }
}
