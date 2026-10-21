import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzeLeadWithGemini, answerLeadFollowUpWithGemini, DEFAULT_GEMINI_MODEL } from './server/ai.ts'

type ReadableRequest = {
  on: (event: string, listener: (...args: any[]) => void) => unknown
}

function readRequestBody(request: ReadableRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk: unknown) => {
      body += String(chunk)
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function sendJson(response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, statusCode: number, payload: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function localApiPlugin(apiKey: string, model: string): Plugin {
  return {
    name: 'leadpilot-local-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (request, response) => {
        const method = (request as unknown as { method?: string }).method
        if (method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }

        if (!apiKey) {
          sendJson(response, 500, { error: 'GEMINI_API_KEY is missing from .env.local.' })
          return
        }

        try {
          const bodyText = await readRequestBody(request as unknown as ReadableRequest)
          const body: unknown = JSON.parse(bodyText)
          const lead = body && typeof body === 'object' && 'lead' in body ? (body as { lead?: unknown }).lead : undefined

          if (!lead || typeof lead !== 'object') {
            sendJson(response, 400, { error: 'A lead object is required.' })
            return
          }

          const analysis = await analyzeLeadWithGemini(
            lead as Parameters<typeof analyzeLeadWithGemini>[0],
            apiKey,
            model,
          )
          sendJson(response, 200, { analysis })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'The lead could not be analyzed.'
          sendJson(response, 502, { error: message })
        }
      })

      server.middlewares.use('/api/follow-up', async (request, response) => {
        const method = (request as unknown as { method?: string }).method
        if (method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }

        if (!apiKey) {
          sendJson(response, 500, { error: 'GEMINI_API_KEY is missing from .env.local.' })
          return
        }

        try {
          const bodyText = await readRequestBody(request as unknown as ReadableRequest)
          const body: unknown = JSON.parse(bodyText)
          if (!body || typeof body !== 'object') {
            sendJson(response, 400, { error: 'A follow-up request body is required.' })
            return
          }

          const payload = body as {
            lead?: unknown
            analysis?: unknown
            history?: unknown
            message?: unknown
          }
          if (!payload.lead || typeof payload.lead !== 'object' || !payload.analysis || typeof payload.analysis !== 'object') {
            sendJson(response, 400, { error: 'A lead and its analysis are required.' })
            return
          }

          if (typeof payload.message !== 'string' || !payload.message.trim()) {
            sendJson(response, 400, { error: 'A follow-up message is required.' })
            return
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

          const reply = await answerLeadFollowUpWithGemini(
            { ...(payload.lead as object), analysis: payload.analysis } as Parameters<typeof answerLeadFollowUpWithGemini>[0],
            history,
            payload.message,
            apiKey,
            model,
          )
          sendJson(response, 200, { reply })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'The follow-up answer could not be generated.'
          sendJson(response, 502, { error: message })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.GEMINI_API_KEY ?? ''
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL

  return {
    plugins: [react(), localApiPlugin(apiKey, model)],
  }
})
