# LeadPilot

LeadPilot is an AI-assisted workspace for real-estate sales teams. It is being built for the Masal AI FDE assignment: prioritize inbound leads, understand what each customer wants, and decide what to do next.

## Current status

The core assignment workflow is complete and the project is deployment-ready: intake, real Gemini analysis, priority sorting, contextual follow-up chat, and the Call Prep Brief are implemented.

## Local setup

```bash
npm install
npm run dev
```

Create a local `.env.local` file in the project root before analyzing a lead:

```env
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

The local Vite server handles `/api/analyze` and `/api/follow-up` without exposing the key to the browser. Matching serverless routes live under `api/` for a Vercel deployment.

For a production build:

```bash
npm run build
npm run preview
```

## Architecture

- React + TypeScript + Vite frontend
- Local browser persistence for saved leads
- Shared Gemini request/normalization logic in `server/ai.ts`
- Local development API middleware in `vite.config.ts`
- Vercel serverless API route under `api/`
- Structured Gemini response with JSON schema validation
- Lead-specific follow-up context with in-memory chat history per lead
- Priority sorting and filter controls for fast lead triage
- Vercel-compatible deployment target

## Deployment

The project is configured for Vercel with `vercel.json`.

1. Push this repository to a public GitHub repository.
2. Import the repository into Vercel.
3. Keep the default build settings, or use:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these Vercel environment variables for the Production environment:

```env
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

5. Deploy and test the live URL in a private browser window.

Never commit `.env.local` or paste the Gemini key into the repository. The API routes read the key server-side.

## Three-minute demo flow

1. Open the dashboard and explain that the inbox ranks inbound opportunities by AI priority.
2. Add a new lead with a customer message, budget, location, and timeline.
3. Show the generated score, Hot/Warm/Cool label, summary, intent, concerns, and recommended next action.
4. Open the Call Prep Brief and explain how it turns analysis into a pre-call checklist.
5. Ask the lead-specific copilot: "What should I emphasize on the call?"
6. Use the priority filters to show Hot, Warm, Cool, and Needs analysis groups.

## Known limitations

- Leads are persisted in browser `localStorage`, so they are not shared across browsers or teammates.
- Follow-up chat history is held in memory for the current browser session.
- There is no authentication, CRM sync, or database yet.
- The AI output is an assistant draft and should be reviewed by a salesperson before sending.
- Deployment requires a Gemini API key in the hosting provider's server-side environment variables.

## AI usage disclosure

This project was built with the OmniRush coding assistant for implementation planning, React scaffolding, prompt design, API integration, debugging, and README drafting. Gemini is used at runtime as the real product AI for lead analysis and contextual follow-up responses.

## Assignment feature

LeadPilot's differentiating feature will be a **Call Prep Brief**: a concise pre-call checklist containing talking points, discovery questions, risks to address, and a suggested call objective.
