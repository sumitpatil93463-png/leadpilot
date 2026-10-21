import type { Lead } from '../types/lead'

const LEADS_STORAGE_KEY = 'leadpilot.leads'

export function loadLeads(): Lead[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedLeads = window.localStorage.getItem(LEADS_STORAGE_KEY)
    if (!storedLeads) {
      return []
    }

    const parsedLeads: unknown = JSON.parse(storedLeads)
    return Array.isArray(parsedLeads) ? (parsedLeads as Lead[]) : []
  } catch {
    return []
  }
}

export function saveLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
}
