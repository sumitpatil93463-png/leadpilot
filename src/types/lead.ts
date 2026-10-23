export type PriorityBand = 'hot' | 'warm' | 'cool'

export type PrioritySignal = {
  label: string
  strength: 'strong' | 'mixed' | 'weak'
  detail: string
}

export type LeadAnalysis = {
  summary: string
  intent: string
  keyRequirements: string[]
  concerns: string[]
  recommendedNextAction: string
  suggestedResponse: string
  priorityScore: number
  priorityBand: PriorityBand
  prioritySignals?: PrioritySignal[]
  callPrep?: {
    talkingPoints: string[]
    discoveryQuestions: string[]
    risksToAddress: string[]
    callObjective: string
  }
}

export type Lead = {
  id: string
  name: string
  location: string
  propertyRequirement: string
  budget: string
  buyingTimeline: string
  customerMessage: string
  analysis?: LeadAnalysis
  createdAt: string
  isDemo?: boolean
}

export type FollowUpMessage = {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
