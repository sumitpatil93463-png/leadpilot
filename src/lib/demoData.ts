import type { Lead } from '../types/lead'

function demoTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
}

export function createDemoLeads(): Lead[] {
  return [
    {
      id: 'demo-maya-chen',
      isDemo: true,
      name: 'Maya Chen',
      location: 'Austin, TX',
      propertyRequirement: '3-bedroom home with a backyard, close to good schools',
      budget: '$650k–$800k',
      buyingTimeline: 'As soon as possible',
      customerMessage:
        'We are relocating to Austin for work and need to move within the next 60 days. We have spoken with a lender and would love to see homes with a backyard in a quiet area near strong schools.',
      createdAt: demoTimestamp(2),
      analysis: {
        summary:
          'Maya is a high-intent relocation buyer with a near-term move, a defined budget, and clear family-oriented requirements.',
        intent: 'Find and tour a move-in-ready family home quickly after relocating to Austin.',
        keyRequirements: ['3-bedroom home', 'Backyard', 'Quiet area', 'Near strong schools'],
        concerns: ['Tight 60-day move window', 'School-area fit needs to be confirmed'],
        recommendedNextAction: 'Call today to confirm the target move date and schedule a focused first tour.',
        suggestedResponse:
          'Hi Maya — your Austin move sounds exciting. I can help narrow this to three-bedroom homes with outdoor space in the areas you are considering. Could we spend 10 minutes confirming your move date and school priorities so I can shape the first tour around them?',
        priorityScore: 89,
        priorityBand: 'hot',
        prioritySignals: [
          { label: 'Timeline urgency', strength: 'strong', detail: 'A 60-day relocation window creates a clear near-term decision.' },
          { label: 'Budget clarity', strength: 'strong', detail: 'A defined $650k–$800k range supports focused recommendations.' },
          { label: 'Requirement clarity', strength: 'strong', detail: 'Home type, outdoor space, neighborhood feel, and schools are specific.' },
          { label: 'Conversation readiness', strength: 'strong', detail: 'The buyer has spoken with a lender and is ready to tour.' },
        ],
        callPrep: {
          callObjective: 'Confirm the move date and convert the clear brief into a first-tour plan.',
          talkingPoints: ['Relocation timeline', 'Backyard and school priorities', 'Lender conversation'],
          discoveryQuestions: ['What is the latest acceptable move-in date?', 'Which school areas are non-negotiable?'],
          risksToAddress: ['Limited time for discovery', 'Potential mismatch between school area and budget'],
        },
      },
    },
    {
      id: 'demo-rafael-ortiz',
      isDemo: true,
      name: 'Rafael Ortiz',
      location: 'Denver, CO',
      propertyRequirement: '2-bedroom condo with transit access and a dedicated parking space',
      budget: '$450k–$550k',
      buyingTimeline: 'Within 1–3 months',
      customerMessage:
        'I am moving from Chicago and comparing Denver neighborhoods. I prefer a condo near transit, need parking, and want to understand the monthly costs before I decide where to focus.',
      createdAt: demoTimestamp(8),
      analysis: {
        summary:
          'Rafael is an active comparison shopper with a defined condo brief, but he needs cost and neighborhood clarity before committing.',
        intent: 'Compare Denver neighborhoods and understand the full monthly cost of a transit-friendly condo.',
        keyRequirements: ['2-bedroom condo', 'Near transit', 'Dedicated parking', 'Monthly cost clarity'],
        concerns: ['Still comparing neighborhoods', 'HOA and total monthly costs are unknown'],
        recommendedNextAction: 'Send a short neighborhood comparison and ask for a preferred tour day.',
        suggestedResponse:
          'Hi Rafael — I can help compare neighborhoods using both transit access and the full monthly cost, including HOA considerations. Would you prefer a quick comparison first, or should we choose two areas and tour them this week?',
        priorityScore: 68,
        priorityBand: 'warm',
        prioritySignals: [
          { label: 'Timeline urgency', strength: 'mixed', detail: 'A 1–3 month window is active but leaves room for comparison.' },
          { label: 'Budget clarity', strength: 'strong', detail: 'The target range is clear enough to create a focused condo set.' },
          { label: 'Requirement clarity', strength: 'strong', detail: 'Transit, bedroom count, and parking are concrete filters.' },
          { label: 'Conversation readiness', strength: 'mixed', detail: 'Rafael is engaged but wants more cost and area confidence first.' },
        ],
        callPrep: {
          callObjective: 'Reduce neighborhood uncertainty and agree on two areas to compare in person.',
          talkingPoints: ['Transit access', 'HOA and monthly cost framing', 'Parking availability'],
          discoveryQuestions: ['Which commute matters most?', 'What monthly payment range feels comfortable?'],
          risksToAddress: ['Neighborhood comparison may delay action', 'HOA fees can change affordability'],
        },
      },
    },
    {
      id: 'demo-priya-nair',
      isDemo: true,
      name: 'Priya Nair',
      location: 'Raleigh, NC',
      propertyRequirement: 'First home with a home office and room for a future nursery',
      budget: '$380k–$450k',
      buyingTimeline: 'More than 6 months',
      customerMessage:
        'We are early in our research and may buy next year. We want to learn which Raleigh areas fit our budget and would like a sense of what to watch for before we speak with a lender.',
      createdAt: demoTimestamp(23),
      analysis: {
        summary:
          'Priya is a promising early-stage buyer with a thoughtful brief, but the long timeline calls for education rather than immediate pressure.',
        intent: 'Build confidence around Raleigh neighborhoods, affordability, and the first-home buying process.',
        keyRequirements: ['Home office', 'Future nursery space', 'Budget-fit neighborhoods', 'First-time buyer guidance'],
        concerns: ['Long buying timeline', 'Financing readiness is not established'],
        recommendedNextAction: 'Offer a low-pressure educational call and a simple neighborhood watchlist.',
        suggestedResponse:
          'Hi Priya — starting early is a smart way to make the decision easier. I can share a simple Raleigh neighborhood and affordability overview, then outline the lender questions that will make your search more concrete when you are ready.',
        priorityScore: 42,
        priorityBand: 'cool',
        prioritySignals: [
          { label: 'Timeline urgency', strength: 'weak', detail: 'A six-plus-month window makes immediate conversion less likely.' },
          { label: 'Budget clarity', strength: 'mixed', detail: 'A range is available, but financing readiness is still unknown.' },
          { label: 'Requirement clarity', strength: 'mixed', detail: 'The lifestyle needs are clear, while neighborhood fit is exploratory.' },
          { label: 'Conversation readiness', strength: 'mixed', detail: 'The buyer wants education and a low-pressure next step.' },
        ],
        callPrep: {
          callObjective: 'Build trust with useful education and define a future follow-up milestone.',
          talkingPoints: ['First-time buyer process', 'Neighborhood watchlist', 'Lender preparation'],
          discoveryQuestions: ['What would make you feel ready to speak with a lender?', 'When should we revisit the search?'],
          risksToAddress: ['Too much sales pressure could reduce trust', 'Affordability assumptions need validation'],
        },
      },
    },
  ]
}
