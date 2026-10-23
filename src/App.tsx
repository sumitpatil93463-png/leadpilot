import { useEffect, useMemo, useState } from 'react'
import LeadForm, { type LeadDraft } from './components/LeadForm'
import LeadAnalysisPanel from './components/LeadAnalysisPanel'
import LeadFollowUpChat from './components/LeadFollowUpChat'
import { createDemoLeads } from './lib/demoData'
import { loadLeads, saveLeads } from './lib/storage'
import type { FollowUpMessage, Lead, PriorityBand } from './types/lead'

type WorkspaceView = 'Inbox' | 'Call prep' | 'Follow-ups' | 'All leads'

type NavItem = {
  label: WorkspaceView
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

function getNavItems(leadCount: number, analyzedLeadCount: number): NavItem[] {
  return [
    { label: 'Inbox', icon: '↗', badge: leadCount ? String(leadCount) : undefined },
    { label: 'Call prep', icon: '✦', badge: analyzedLeadCount ? String(analyzedLeadCount) : undefined },
    { label: 'Follow-ups', icon: '↻', badge: analyzedLeadCount ? String(analyzedLeadCount) : undefined },
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

function getViewLeads(leads: Lead[], view: WorkspaceView): Lead[] {
  if (view === 'Call prep' || view === 'Follow-ups') {
    return leads.filter((lead) => Boolean(lead.analysis))
  }

  return leads
}

function getViewCopy(view: WorkspaceView): { kicker: string; title: string; description: string } {
  if (view === 'Call prep') {
    return {
      kicker: 'Conversion-ready context',
      title: 'Walk into every call with a point of view.',
      description: 'Review the highest-priority briefs, risks, and discovery questions before you reach out.',
    }
  }

  if (view === 'Follow-ups') {
    return {
      kicker: 'Grounded follow-up queue',
      title: 'Turn context into a better next message.',
      description: 'Use the lead-specific copilot to sharpen your reply without losing the customer story.',
    }
  }

  if (view === 'All leads') {
    return {
      kicker: 'Full pipeline view',
      title: 'Keep every opportunity within reach.',
      description: 'Browse saved inquiries, then sort them by urgency and AI priority when it is time to act.',
    }
  }

  return {
    kicker: 'Your pipeline at a glance',
    title: 'Focus on the leads most likely to move.',
    description: 'LeadPilot turns every inbound message into a clear next step for your team.',
  }
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
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
  const [activeView, setActiveView] = useState<WorkspaceView>('Inbox')
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

  const navItems = getNavItems(leads.length, leads.filter((lead) => Boolean(lead.analysis)).length)
  const viewCopy = getViewCopy(activeView)
  const viewLeads = useMemo(() => getViewLeads(leads, activeView), [leads, activeView])
  const priorityCards = useMemo(() => getPriorityCards(leads), [leads])
  const visibleLeads = useMemo(() => {
    const filteredLeads = viewLeads.filter((lead) => {
      if (priorityFilter === 'all') {
        return true
      }

      if (priorityFilter === 'pending') {
        return !lead.analysis
      }

      return lead.analysis?.priorityBand === priorityFilter
    })

    return sortLeadsByPriority(filteredLeads)
  }, [priorityFilter, viewLeads])
  const selectedLead = visibleLeads.find((lead) => lead.id === selectedLeadId) ?? visibleLeads[0]

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

  function handleNavSelection(view: WorkspaceView) {
    setActiveView(view)
    setFollowUpDraft('')

    if (view === 'Inbox' || view === 'All leads') {
      setPriorityFilter('all')
      return
    }

    setPriorityFilter('all')
    const firstAnalyzedLead = sortLeadsByPriority(leads.filter((lead) => Boolean(lead.analysis)))[0]
    if (!firstAnalyzedLead) {
      return
    }

    setSelectedLeadId(firstAnalyzedLead.id)
    window.requestAnimationFrame(() => {
      document
        .querySelector(view === 'Call prep' ? '.analysis-panel' : '.chat-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleLoadDemoWorkspace() {
    const demoLeads = createDemoLeads()
    setLeads(demoLeads)
    setSelectedLeadId(demoLeads[0]?.id ?? null)
    setPriorityFilter('all')
    setActiveView('Inbox')
    setAnalysisErrors({})
    setFollowUpErrors({})
    setFollowUpMessagesByLead({})
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
              onClick={() => handleNavSelection(item.label)}
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
            <p className="eyebrow">{formatCurrentDate()}</p>
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
            <p className="section-kicker">{viewCopy.kicker}</p>
            <h2>{viewCopy.title}</h2>
            <p className="hero-copy">{viewCopy.description}</p>
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
                  <h3>{activeView === 'Inbox' ? 'Lead inbox' : activeView}</h3>
                  <span className="count-pill">{viewLeads.length} active</span>
                </div>
                <p>
                  {viewLeads.length
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
                      <span>{getFilterCount(viewLeads, filter.value)}</span>
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
                <div className="empty-actions">
                  <button className="button button-accent" onClick={() => setIsFormOpen(true)} type="button">
                    <span className="button-plus">+</span>
                    Add your first lead
                  </button>
                  <button className="button button-quiet" onClick={handleLoadDemoWorkspace} type="button">
                    Load demo workspace
                    <span className="button-arrow">↗</span>
                  </button>
                </div>
                <small className="demo-note">Three labeled demo leads let reviewers explore the full workflow instantly.</small>
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
                        {lead.isDemo ? <span className="lead-source-badge">Demo</span> : null}
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
