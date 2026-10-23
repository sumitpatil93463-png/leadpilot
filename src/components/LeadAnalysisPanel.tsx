import { useEffect, useState } from 'react'
import type { Lead } from '../types/lead'

type LeadAnalysisPanelProps = {
  lead?: Lead
  isAnalyzing: boolean
  error?: string
  onAnalyze: () => void
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="analysis-list-block">
      <p className="analysis-label">{title}</p>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="analysis-muted">No specific details surfaced.</p>
      )}
    </div>
  )
}

function formatMarkdownList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None provided'
}

function downloadLeadBrief(lead: Lead): void {
  if (!lead.analysis) {
    return
  }

  const { analysis } = lead
  const callPrep = analysis.callPrep
  const brief = `# LeadPilot brief: ${lead.name}

## Snapshot

- **Location:** ${lead.location}
- **Budget:** ${lead.budget}
- **Timeline:** ${lead.buyingTimeline}
- **Priority:** ${analysis.priorityScore}/100 (${analysis.priorityBand})

## Summary

${analysis.summary}

## Customer intent

${analysis.intent}

## Priority signals

${formatMarkdownList(
    analysis.prioritySignals?.map((signal) => `${signal.label} (${signal.strength}): ${signal.detail}`) ?? [],
  )}

## Key requirements

${formatMarkdownList(analysis.keyRequirements)}

## Concerns

${formatMarkdownList(analysis.concerns)}

## Recommended next action

${analysis.recommendedNextAction}

## Suggested response

${analysis.suggestedResponse}

${callPrep ? `## Call Prep Brief

### Objective

${callPrep.callObjective}

### Talking points

${formatMarkdownList(callPrep.talkingPoints)}

### Discovery questions

${formatMarkdownList(callPrep.discoveryQuestions)}

### Risks to address

${formatMarkdownList(callPrep.risksToAddress)}
` : ''}
`
  const filename = `${lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lead'}-brief.md`
  const blob = new Blob([brief], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function SalesInsight() {
  return (
    <aside className="panel insight-panel">
      <div className="panel-heading compact-heading">
        <div>
          <p className="section-kicker">Today’s edge</p>
          <h3>Sales insight</h3>
        </div>
        <span className="insight-badge">AI</span>
      </div>
      <div className="insight-quote">
        <span className="quote-mark">“</span>
        <p>
          A clear buying timeline is one of the strongest signals. Ask for the move-in date early.
        </p>
      </div>
      <div className="insight-divider" />
      <div className="insight-footer">
        <span>AI playbook heuristic</span>
        <span className="insight-arrow">↗</span>
      </div>
    </aside>
  )
}

function LeadAnalysisPanel({ lead, isAnalyzing, error, onAnalyze }: LeadAnalysisPanelProps) {
  const [copyLabel, setCopyLabel] = useState('Copy response')

  useEffect(() => {
    setCopyLabel('Copy response')
  }, [lead?.id])

  async function copySuggestedResponse(response: string) {
    if (!navigator.clipboard) {
      setCopyLabel('Copy unavailable')
      return
    }

    try {
      await navigator.clipboard.writeText(response)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy response'), 1800)
    } catch {
      setCopyLabel('Copy unavailable')
    }
  }

  if (!lead) {
    return <SalesInsight />
  }

  if (!lead.analysis) {
    return (
      <aside className="panel analysis-panel analysis-pending-panel">
        <div className="analysis-panel-header">
          <div>
            <p className="section-kicker">Selected lead</p>
            <h3>{lead.name}</h3>
            <p>{lead.location} · {lead.buyingTimeline}</p>
          </div>
          <span className="lead-status is-pending">{isAnalyzing ? 'Analyzing' : 'Pending'}</span>
        </div>
        <div className="analysis-pending-content">
          <div className="analysis-orb">✦</div>
          <p className="analysis-label">AI analysis</p>
          <h4>{isAnalyzing ? 'Reading the customer story…' : 'Turn this inquiry into a next step.'}</h4>
          <p>
            {isAnalyzing
              ? 'LeadPilot is extracting intent, urgency, concerns, and a focused call plan.'
              : 'Use the customer’s message and requirements to generate a grounded sales brief.'}
          </p>
          <button className="button button-accent" disabled={isAnalyzing} onClick={onAnalyze} type="button">
            {isAnalyzing ? 'Analyzing…' : 'Analyze with AI'}
            {!isAnalyzing ? <span className="button-arrow">→</span> : null}
          </button>
          {error ? <div className="analysis-error" role="alert">{error}</div> : null}
        </div>
      </aside>
    )
  }

  const { analysis } = lead
  const callPrep = analysis.callPrep

  return (
    <aside className="panel analysis-panel">
      <div className="analysis-panel-header">
        <div>
          <p className="section-kicker">AI analysis</p>
          <h3>{lead.name}</h3>
          <p>{lead.location} · {lead.buyingTimeline}</p>
        </div>
        <div className="analysis-header-actions">
          <button className="export-button" onClick={() => downloadLeadBrief(lead)} type="button">
            Download brief <span>↓</span>
          </button>
          <div className={`priority-badge priority-${analysis.priorityBand}`}>
            <strong>{analysis.priorityScore}</strong>
            <span>{analysis.priorityBand}</span>
          </div>
        </div>
      </div>

      <div className="analysis-summary-card">
        <p className="analysis-label">Lead summary</p>
        <p>{analysis.summary}</p>
      </div>

      <div className="priority-signals-card">
        <div className="priority-signals-header">
          <div>
            <p className="analysis-label">Why this score</p>
            <p className="priority-signals-copy">
              A transparent read on the signals that shaped the AI priority recommendation.
            </p>
          </div>
          <span className="response-chip">Explainable</span>
        </div>
        {analysis.prioritySignals?.length ? (
          <div className="priority-signal-grid">
            {analysis.prioritySignals.map((signal) => (
              <div className="priority-signal" key={`${signal.label}-${signal.detail}`}>
                <div className="priority-signal-topline">
                  <span className="priority-signal-label">{signal.label}</span>
                  <span className={`priority-signal-strength signal-${signal.strength}`}>{signal.strength}</span>
                </div>
                <p>{signal.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="analysis-muted priority-signals-empty">
            Re-run this lead to generate the score signals.
          </p>
        )}
      </div>

      <div className="analysis-two-column">
        <div>
          <p className="analysis-label">Customer intent</p>
          <p className="analysis-copy">{analysis.intent}</p>
        </div>
        <div>
          <p className="analysis-label">Recommended next action</p>
          <p className="analysis-copy">{analysis.recommendedNextAction}</p>
        </div>
      </div>

      <div className="analysis-lists">
        <AnalysisList title="Key requirements" items={analysis.keyRequirements} />
        <AnalysisList title="Objections / concerns" items={analysis.concerns} />
      </div>

      <div className="response-card">
        <div className="response-card-header">
          <p className="analysis-label">Suggested response</p>
          <div className="response-actions">
            <span className="response-chip">Ready to edit</span>
            <button
              className={`copy-button ${copyLabel === 'Copied' ? 'is-copied' : ''}`}
              onClick={() => void copySuggestedResponse(analysis.suggestedResponse)}
              type="button"
            >
              {copyLabel}
            </button>
          </div>
        </div>
        <p>“{analysis.suggestedResponse}”</p>
      </div>

      {callPrep ? (
        <div className="call-prep-card">
          <div className="call-prep-header">
            <div>
              <p className="analysis-label">Call Prep Brief</p>
              <h4>{callPrep.callObjective}</h4>
            </div>
            <span className="insight-badge">Your edge</span>
          </div>
          <div className="analysis-lists call-prep-lists">
            <AnalysisList title="Talking points" items={callPrep.talkingPoints} />
            <AnalysisList title="Discovery questions" items={callPrep.discoveryQuestions} />
            <AnalysisList title="Risks to address" items={callPrep.risksToAddress} />
          </div>
        </div>
      ) : null}

      <button className="text-button analysis-rerun" onClick={onAnalyze} type="button">
        Re-run analysis <span>↻</span>
      </button>
    </aside>
  )
}

export default LeadAnalysisPanel
