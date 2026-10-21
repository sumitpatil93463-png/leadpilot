import { useEffect, useMemo, useState } from 'react'
import LeadForm, { type LeadDraft } from './components/LeadForm'
import LeadAnalysisPanel from './components/LeadAnalysisPanel'
import LeadFollowUpChat from './components/LeadFollowUpChat'
import { loadLeads, saveLeads } from './lib/storage'
import type { FollowUpMessage, Lead, PriorityBand } from './types/lead'

type NavItem = {
  label: string
  icon: string
  badge?: string
}

type PriorityFilter = 'all' | 'hot' | 'warm' | 'cool' | 'pending'

const priorityFilters: Array<{ value: PriorityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'pending', label: 'Needs analysis' },
]

function getNavItems(leadCount: number): NavItem[] {
  return [
    { label: 'Inbox', icon: '↗', badge: leadCount ? String(leadCount) : undefined },
  { label: 'Call prep', icon: '✦' },
    { label: 'Follow-ups', icon: '↻', badge: leadCount ? '—' : undefined },
    { label: 'All leads', icon: '☷' },
  ]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function createLeadId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getFilterCount(leads: Lead[], filter: PriorityFilter): number {
  if (filter === 'all') {
    return leads.length
  }

  if (filter === 'pending') {
    return leads.filter((lead) => !lead.analysis).length
  }

  return leads.filter((lead) => lead.analysis?.priorityBand === filter).length
}

function sortLeadsByPriority(leads: Lead[]): Lead[] {
  return [...leads].sort((firstLead, secondLead) => {
    if (firstLead.analysis && secondLead.analysis) {
      return (
        secondLead.analysis.priorityScore - firstLead.analysis.priorityScore ||
        secondLead.createdAt.localeCompare(firstLead.createdAt)
      )
    }

    if (firstLead.analysis) {
      return -1
    }

    if (secondLead.analysis) {
      return 1
    }

    return secondLead.createdAt.localeCompare(firstLead.createdAt)
  })
}

function getPriorityCards(leads: Lead[]): Array<{
  label: string
  value: string
  detail: string
  tone: PriorityBand | 'neutral'
}> {
  const analyzedLeads = leads.filter((lead) => lead.analysis)
  const averageScore = analyzedLeads.length
    ? Math.round(
        analyzedLeads.reduce((total, lead) => total + (lead.analysis?.priorityScore ?? 0), 0) /
          analyzedLeads.length,
      )
    : null

  return [
    {
      label: 'Saved leads',
      value: String(leads.length).padStart(2, '0'),
      detail: leads.length ? 'Stored in this browser' : 'Your inbox is empty',
      tone: 'hot',
    },
    {
      label: 'Need analysis',
      value: String(leads.filter((lead) => !lead.analysis).length).padStart(2, '0'),
      detail: leads.length ? 'Ready for the AI step' : 'Add your first inquiry',
      tone: 'warm',
    },
    {
      label: 'Avg. lead score',
      value: averageScore === null ? '—' : String(averageScore),
      detail: averageScore === null ? 'Appears after analysis' : 'Across analyzed leads',
      tone: 'neutral',
    },
  ]
}

function App() {
  const [activeView, setActiveView] = useState('Inbox')
  const [leads, setLeads] = useState<Lead[]>(loadLeads)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [analyzingLeadId, setAnalyzingLeadId] = useState<string | null>(null)
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({})
  const [followUpMessagesByLead, setFollowUpMessagesByLead] = useState<Record<string, FollowUpMessage[]>>({})
  const [followUpDraft, setFollowUpDraft] = useState('')
  const [sendingFollowUpLeadId, setSendingFollowUpLeadId] = useState<string | null>(null)
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({})
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  useEffect(() => {
    saveLeads(leads)
  }, [leads])

  const navItems = getNavItems(leads.length)
  const priorityCards = useMemo(() => getPriorityCards(leads), [leads])
  const visibleLeads = useMemo(() => {
    const filteredLeads = leads.filter((lead) => {
      if (priorityFilter === 'all') {
        return true
      }

      if (priorityFilter === 'pending') {
        return !lead.analysis
      }

      return lead.analysis?.priorityBand === priorityFilter
    })

    return sortLeadsByPriority(filteredLeads)
  }, [leads, priorityFilter])
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0]

  function selectLead(leadId: string) {
    setSelectedLeadId(leadId)
    setFollowUpDraft('')
  }

  async function analyzeLead(lead: Lead) {
    setSelectedLeadId(lead.id)
    setAnalyzingLeadId(lead.id)
    setAnalysisErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[lead.id]
      return nextErrors
    })

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error?: unknown }).error)
            : 'The lead could not be analyzed.'
        throw new Error(message)
      }

      const analysis =
        payload && typeof payload === 'object' && 'analysis' in payload
          ? (payload as { analysis?: Lead['analysis'] }).analysis
          : undefined

      if (!analysis) {
        throw new Error('The AI returned no analysis. Please retry this lead.')
      }

      setLeads((currentLeads) =>
        currentLeads.map((currentLead) =>
          currentLead.id === lead.id ? { ...currentLead, analysis } : currentLead,
        ),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The lead could not be analyzed.'
      setAnalysisErrors((currentErrors) => ({ ...currentErrors, [lead.id]: message }))
    } finally {
      setAnalyzingLeadId(null)
    }
  }

  async function sendFollowUp() {
    if (!selectedLead?.analysis || !followUpDraft.trim() || sendingFollowUpLeadId) {
      return
    }

    const lead = selectedLead
    const question = followUpDraft.trim()
    const history = followUpMessagesByLead[lead.id] ?? []
    const userMessage: FollowUpMessage = {
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    }

    setFollowUpMessagesByLead((currentMessages) => ({
      ...currentMessages,
      [lead.id]: [...(currentMessages[lead.id] ?? []), userMessage],
    }))
    setFollowUpDraft('')
    setSendingFollowUpLeadId(lead.id)
    setFollowUpErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[lead.id]
      return nextErrors
    })

    try {
      const response = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          analysis: lead.analysis,
          history: history.map(({ role, content }) => ({ role, content })),
          message: question,
        }),
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error?: unknown }).error)
            : 'The follow-up answer could not be generated.'
        throw new Error(message)
      }

      const reply =
        payload && typeof payload === 'object' && 'reply' in payload
          ? (payload as { reply?: unknown }).reply
          : undefined

      if (typeof reply !== 'string' || !reply.trim()) {
        throw new Error('The AI returned no follow-up answer. Please retry.')
      }

      const assistantMessage: FollowUpMessage = {
        role: 'assistant',
        content: reply.trim(),
        createdAt: new Date().toISOString(),
      }
      setFollowUpMessagesByLead((currentMessages) => ({
        ...currentMessages,
        [lead.id]: [...(currentMessages[lead.id] ?? []), assistantMessage],
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The follow-up answer could not be generated.'
      setFollowUpErrors((currentErrors) => ({ ...currentErrors, [lead.id]: message }))
      if (selectedLeadId === lead.id) {
        setFollowUpDraft(question)
      }
    } finally {
      setSendingFollowUpLeadId(null)
    }
  }

  function handleCreateLead(draft: LeadDraft) {
    const newLead: Lead = {
      ...draft,
      id: createLeadId(),
      createdAt: new Date().toISOString(),
    }

    setLeads((currentLeads) => [newLead, ...currentLeads])
    setSelectedLeadId(newLead.id)
    setIsFormOpen(false)
    setActiveView('Inbox')
    void analyzeLead(newLead)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">L</div>
          <div>
            <p className="eyebrow">AI workspace</p>
            <p className="brand-name">LeadPilot</p>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="avatar avatar-indigo">AR</div>
          <div className="workspace-copy">
            <span className="workspace-label">Workspace</span>
            <strong>Atlas Realty</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeView === item.label ? 'is-active' : ''}`}
              key={item.label}
              onClick={() => setActiveView(item.label)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="support-card" type="button">
            <span className="support-icon">?</span>
            <span>
              <strong>Need a hand?</strong>
              <small>View the quick guide</small>
            </span>
            <span className="arrow">↗</span>
          </button>
          <div className="profile-row">
            <div className="avatar avatar-coral">JD</div>
            <div>
              <strong>Jordan Davis</strong>
              <span>Sales manager</span>
            </div>
            <span className="more-button">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Wednesday, October 21, 2026</p>
            <h1>{activeView === 'Inbox' ? 'Good morning, Jordan' : activeView}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Search">
              ⌕
            </button>
            <button className="icon-button notification-button" type="button" aria-label="Notifications">
              ♢<span className="notification-dot" />
            </button>
            <button className="button button-dark" onClick={() => setIsFormOpen(true)} type="button">
              <span className="button-plus">+</span>
              Add lead
            </button>
          </div>
        </header>

        <section className="hero-row">
          <div>
            <p className="section-kicker">Your pipeline at a glance</p>
            <h2>Focus on the leads most likely to move.</h2>
            <p className="hero-copy">
              LeadPilot turns every inbound message into a clear next step for your team.
            </p>
          </div>
          <div className="date-filter">
            <span className="filter-icon">◷</span>
            Last 7 days
            <span className="chevron">⌄</span>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Pipeline metrics">
          {priorityCards.map((card) => (
            <article className={`metric-card metric-${card.tone}`} key={card.label}>
              <div className="metric-topline">
                <span>{card.label}</span>
                <span className="metric-spark">↗</span>
              </div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-detail">{card.detail}</div>
            </article>
          ))}
        </section>

        <section className="workspace-grid">
          <article className="panel leads-panel">
            <div className="panel-heading lead-inbox-heading">
              <div>
                <div className="heading-with-count">
                  <h3>Lead inbox</h3>
                  <span className="count-pill">{leads.length} active</span>
                </div>
                <p>
                  {leads.length
                    ? `Sorted by AI priority score · ${visibleLeads.length} shown`
                    : 'Sorted by AI priority score'}
                </p>
              </div>
              <button className="text-button" onClick={() => setPriorityFilter('all')} type="button">
                View all <span>→</span>
              </button>
            </div>

            {leads.length ? (
              <div className="priority-filter-row">
                <span className="filter-caption">Show</span>
                <div className="priority-filter-bar" role="group" aria-label="Filter leads by priority">
                  {priorityFilters.map((filter) => (
                    <button
                      className={`priority-filter ${priorityFilter === filter.value ? 'is-active' : ''}`}
                      key={filter.value}
                      onClick={() => setPriorityFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                      <span>{getFilterCount(leads, filter.value)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {leads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-illustration">
                  <span className="illustration-sun" />
                  <span className="illustration-house house-one" />
                  <span className="illustration-house house-two" />
                  <span className="illustration-window window-one" />
                  <span className="illustration-window window-two" />
                  <span className="illustration-path" />
                </div>
                <span className="empty-kicker">Your smartest follow-up starts here</span>
                <h4>Bring in your first lead</h4>
                <p>
                  Add an inquiry, chat transcript, or call note. We’ll turn it into a prioritized,
                  ready-to-use action plan.
                </p>
                <button className="button button-accent" onClick={() => setIsFormOpen(true)} type="button">
                  <span className="button-plus">+</span>
                  Add your first lead
                </button>
              </div>
            ) : visibleLeads.length === 0 ? (
              <div className="filtered-empty-state">
                <span className="empty-kicker">No matching leads yet</span>
                <h4>Nothing in this group</h4>
                <p>Try another priority filter or return to all leads.</p>
                <button className="button button-quiet" onClick={() => setPriorityFilter('all')} type="button">
                  Show all leads
                </button>
              </div>
            ) : (
              <div className="lead-list">
                {visibleLeads.map((lead) => (
                  <article
                    className={`lead-row ${selectedLead?.id === lead.id ? 'is-selected' : ''}`}
                    key={lead.id}
                    onClick={() => selectLead(lead.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectLead(lead.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="lead-avatar">{getInitials(lead.name)}</div>
                    <div className="lead-row-main">
                      <div className="lead-row-title">
                        <h4>{lead.name}</h4>
                        <span
                          className={`lead-status ${lead.analysis ? 'is-ready' : analyzingLeadId === lead.id ? 'is-analyzing' : analysisErrors[lead.id] ? 'is-error' : 'is-pending'}`}
                        >
                          {lead.analysis
                            ? 'Analyzed'
                            : analyzingLeadId === lead.id
                              ? 'Analyzing'
                              : analysisErrors[lead.id]
                                ? 'Analysis failed'
                                : 'Analysis pending'}
                        </span>
                        {lead.analysis ? (
                          <span className={`lead-band lead-band-${lead.analysis.priorityBand}`}>
                            {lead.analysis.priorityBand}
                          </span>
                        ) : null}
                      </div>
                      <p>{lead.propertyRequirement}</p>
                      <div className="lead-row-meta">
                        <span>{lead.location}</span>
                        <span>{lead.budget}</span>
                        <span>{lead.buyingTimeline}</span>
                      </div>
                    </div>
                    <div className="lead-row-score">
                      <span>
                        {lead.analysis ? `${lead.analysis.priorityScore}/100` : analyzingLeadId === lead.id ? '…' : '—'}
                      </span>
                      <small>{lead.analysis ? 'priority' : 'select to view'}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className="detail-stack">
            <LeadAnalysisPanel
              error={selectedLead ? analysisErrors[selectedLead.id] : undefined}
              isAnalyzing={selectedLead ? analyzingLeadId === selectedLead.id : false}
              lead={selectedLead}
              onAnalyze={() => {
                if (selectedLead) {
                  void analyzeLead(selectedLead)
                }
              }}
            />
            <LeadFollowUpChat
              draft={followUpDraft}
              error={selectedLead ? followUpErrors[selectedLead.id] : undefined}
              isSending={selectedLead ? sendingFollowUpLeadId === selectedLead.id : false}
              lead={selectedLead}
              messages={selectedLead ? followUpMessagesByLead[selectedLead.id] ?? [] : []}
              onDraftChange={setFollowUpDraft}
              onSend={() => void sendFollowUp()}
            />
          </div>
        </section>

        <footer className="page-footer">
          <span>{leads.length ? `${leads.length} lead${leads.length === 1 ? '' : 's'} saved` : 'LeadPilot preview'}</span>
          <span>AI-assisted, human-approved</span>
        </footer>
      </main>

      {isFormOpen ? <LeadForm onCancel={() => setIsFormOpen(false)} onSubmit={handleCreateLead} /> : null}
    </div>
  )
}

export default App
