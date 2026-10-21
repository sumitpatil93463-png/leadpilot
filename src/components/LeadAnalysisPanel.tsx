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
          Leads with a clear buying timeline are converting <strong>2.4× faster</strong>. Ask for
          the move-in date early.
        </p>
      </div>
      <div className="insight-divider" />
      <div className="insight-footer">
        <span>Based on your recent pipeline</span>
        <span className="insight-arrow">↗</span>
      </div>
    </aside>
  )
}

function LeadAnalysisPanel({ lead, isAnalyzing, error, onAnalyze }: LeadAnalysisPanelProps) {
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
        <div className={`priority-badge priority-${analysis.priorityBand}`}>
          <strong>{analysis.priorityScore}</strong>
          <span>{analysis.priorityBand}</span>
        </div>
      </div>

      <div className="analysis-summary-card">
        <p className="analysis-label">Lead summary</p>
        <p>{analysis.summary}</p>
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
          <span className="response-chip">Ready to edit</span>
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
