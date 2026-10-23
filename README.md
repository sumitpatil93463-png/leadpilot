# LeadPilot

LeadPilot is an AI-assisted workspace for real-estate sales teams. It is being built for the Masal AI FDE assignment: prioritize inbound leads, understand what each customer wants, and decide what to do next.

## Current status

The core assignment workflow is complete and the project is deployment-ready: intake, real Gemini analysis, explainable priority signals, priority sorting, contextual follow-up chat, and the Call Prep Brief are implemented. A labeled demo workspace is also available so a reviewer can understand the product without first entering data.

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
- Explainable priority signals for timeline, budget, requirements, and conversation readiness
- Lead-specific follow-up context with in-memory chat history per lead
- Priority sorting and filter controls for fast lead triage
- Vercel-compatible deployment target

## System flow

```mermaid
flowchart LR
    Salesperson[Salesperson] --> Dashboard[React + TypeScript dashboard]
    Dashboard --> Intake[Lead intake form]
    Dashboard --> Inbox[Priority inbox + Call Prep Brief]
    Dashboard --> Copilot[Lead-specific follow-up copilot]
    Dashboard --> Storage[(Browser localStorage)]
    Intake --> Analyze[/api/analyze]
    Copilot --> FollowUp[/api/follow-up]
    Analyze --> Shared[Shared server/ai.ts]
    FollowUp --> Shared
    Shared --> Gemini[Gemini API]
    Gemini --> Shared
    Shared --> Structured[Structured analysis + explainable signals]
    Structured --> Inbox
    Structured --> Copilot
```

The browser owns the salesperson workflow and local persistence. Both server endpoints share the same Gemini prompt, model normalization, response parsing, and fallback handling so local development and Vercel use the same product logic without exposing the API key to the client.

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

1. Open the dashboard and click **Load demo workspace** to make the complete workflow visible immediately.
2. Explain that the inbox ranks inbound opportunities by AI priority and shows the signals behind each score.
3. Add a new lead with a customer message, budget, location, and timeline to demonstrate the real Gemini path.
4. Show the generated score, Hot/Warm/Cool label, explainable signals, summary, intent, concerns, and recommended next action.
5. Open the Call Prep Brief and explain how it turns analysis into a pre-call checklist.
6. Copy the suggested response, then ask the lead-specific copilot: "What should I emphasize on the call?"
7. Use the priority filters to show Hot, Warm, Cool, and Needs analysis groups.

## Known limitations

- Leads are persisted in browser `localStorage`, so they are not shared across browsers or teammates.
- Follow-up chat history is held in memory for the current browser session.
- There is no authentication, CRM sync, or database yet.
- The AI output is an assistant draft and should be reviewed by a salesperson before sending.
- Deployment requires a Gemini API key in the hosting provider's server-side environment variables.

## Shortlist-ready product touches

- **Explainability:** every AI score can show the four signals that shaped the recommendation instead of presenting a black-box number.
- **Fast evaluation:** the demo workspace gives reviewers realistic records, scores, call prep, and follow-up context in one click.
- **Human-in-the-loop workflow:** suggested responses are editable and copyable, and the footer makes the human approval boundary explicit.
- **Portable architecture:** local Vite middleware and Vercel functions share the same server-side AI module.

## AI usage disclosure

This project was built with the OmniRush coding assistant for implementation planning, React scaffolding, prompt design, API integration, debugging, and README drafting. Gemini is used at runtime as the real product AI for lead analysis and contextual follow-up responses.

## Assignment feature

LeadPilot's differentiating feature will be a **Call Prep Brief**: a concise pre-call checklist containing talking points, discovery questions, risks to address, and a suggested call objective.
