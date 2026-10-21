import type { ChangeEvent, FormEvent } from 'react'
import type { FollowUpMessage, Lead } from '../types/lead'

type LeadFollowUpChatProps = {
  lead?: Lead
  messages: FollowUpMessage[]
  draft: string
  isSending: boolean
  error?: string
  onDraftChange: (value: string) => void
  onSend: () => void
}

const suggestedQuestions = [
  'What should I emphasize on the call?',
  'Make my reply more assertive.',
  'What should I clarify first?',
]

function LeadFollowUpChat({
  lead,
  messages,
  draft,
  isSending,
  error,
  onDraftChange,
  onSend,
}: LeadFollowUpChatProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSend()
  }

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onDraftChange(event.target.value)
  }

  const isReady = Boolean(lead?.analysis)

  return (
    <section className={`panel chat-panel ${isReady ? '' : 'chat-panel-disabled'}`}>
      <div className="chat-header">
        <div>
          <p className="section-kicker">Lead-specific copilot</p>
          <h3>Ask about {lead?.name ?? 'this lead'}</h3>
        </div>
        <span className="insight-badge">Chat</span>
      </div>

      {!lead ? (
        <div className="chat-empty-state">
          <p>Select a lead to start a grounded follow-up.</p>
        </div>
      ) : !isReady ? (
        <div className="chat-empty-state">
          <div className="chat-lock">✦</div>
          <p>Run the AI analysis first. Follow-up answers will use this lead’s context.</p>
        </div>
      ) : (
        <>
          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-intro">
                <p>
                  Ask for call guidance, a sharper reply, or a missing discovery question. I’ll stay
                  grounded in {lead.name}’s inquiry.
                </p>
                <div className="suggested-question-list">
                  {suggestedQuestions.map((question) => (
                    <button key={question} onClick={() => onDraftChange(question)} type="button">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div className={`chat-message chat-message-${message.role}`} key={message.createdAt}>
                  <span className="chat-message-role">{message.role === 'user' ? 'You' : 'LeadPilot'}</span>
                  <p>{message.content}</p>
                </div>
              ))
            )}
            {isSending ? (
              <div className="chat-message chat-message-assistant chat-message-loading">
                <span className="chat-message-role">LeadPilot</span>
                <p>Thinking from this lead’s context…</p>
              </div>
            ) : null}
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="lead-follow-up-input">
              Ask a follow-up question about this lead
            </label>
            <textarea
              id="lead-follow-up-input"
              onChange={handleDraftChange}
              placeholder="Ask what to say or do next…"
              rows={2}
              value={draft}
            />
            <button className="chat-send-button" disabled={!draft.trim() || isSending} type="submit">
              {isSending ? '…' : '→'}
            </button>
          </form>
          {error ? <div className="analysis-error chat-error" role="alert">{error}</div> : null}
        </>
      )}
    </section>
  )
}

export default LeadFollowUpChat
