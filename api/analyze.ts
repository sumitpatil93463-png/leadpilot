import { analyzeLeadWithGemini, DEFAULT_GEMINI_MODEL } from '../server/ai.ts'

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

  const lead = body && typeof body === 'object' && 'lead' in body ? (body as { lead?: unknown }).lead : undefined

  if (!lead || typeof lead !== 'object') {
    return response.status(400).json({ error: 'A lead object is required.' })
  }

  try {
    const analysis = await analyzeLeadWithGemini(
      lead as Parameters<typeof analyzeLeadWithGemini>[0],
      apiKey,
      process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    )
    return response.status(200).json({ analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The lead could not be analyzed.'
    return response.status(502).json({ error: message })
  }
}
