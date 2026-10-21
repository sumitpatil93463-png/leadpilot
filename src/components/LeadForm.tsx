import { useState, type FormEvent } from 'react'

export type LeadDraft = {
  name: string
  location: string
  propertyRequirement: string
  budget: string
  buyingTimeline: string
  customerMessage: string
}

type LeadFormProps = {
  onCancel: () => void
  onSubmit: (draft: LeadDraft) => void
}

const initialDraft: LeadDraft = {
  name: '',
  location: '',
  propertyRequirement: '',
  budget: '',
  buyingTimeline: '',
  customerMessage: '',
}

const requiredFields: Array<keyof LeadDraft> = [
  'name',
  'location',
  'propertyRequirement',
  'budget',
  'buyingTimeline',
  'customerMessage',
]

function LeadForm({ onCancel, onSubmit }: LeadFormProps) {
  const [draft, setDraft] = useState<LeadDraft>(initialDraft)
  const [formError, setFormError] = useState('')

  function updateField(field: keyof LeadDraft, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
    if (formError) {
      setFormError('')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const hasMissingField = requiredFields.some((field) => !draft[field].trim())
    if (hasMissingField) {
      setFormError('Complete every field so the AI has enough context to prioritize this lead.')
      return
    }

    onSubmit({
      name: draft.name.trim(),
      location: draft.location.trim(),
      propertyRequirement: draft.propertyRequirement.trim(),
      budget: draft.budget.trim(),
      buyingTimeline: draft.buyingTimeline.trim(),
      customerMessage: draft.customerMessage.trim(),
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <section className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-form-title">
        <div className="form-header">
          <div>
            <p className="section-kicker">New inbound lead</p>
            <h2 id="lead-form-title">Give your next opportunity some context.</h2>
            <p>
              Add the details you already have. LeadPilot will use the full story to recommend what
              to do next.
            </p>
          </div>
          <button className="modal-close" onClick={onCancel} type="button" aria-label="Close form">
            ×
          </button>
        </div>

        <form className="lead-form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-two">
            <label className="form-field">
              <span>Customer name</span>
              <input
                autoFocus
                value={draft.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Maya Chen"
                required
              />
            </label>
            <label className="form-field">
              <span>Location</span>
              <input
                value={draft.location}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="e.g. Austin, TX"
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span>Property requirement</span>
            <textarea
              value={draft.propertyRequirement}
              onChange={(event) => updateField('propertyRequirement', event.target.value)}
              placeholder="e.g. 3-bedroom home with a backyard, close to good schools"
              rows={3}
              required
            />
          </label>

          <div className="form-grid form-grid-two">
            <label className="form-field">
              <span>Budget</span>
              <input
                value={draft.budget}
                onChange={(event) => updateField('budget', event.target.value)}
                placeholder="e.g. $650k–$800k"
                required
              />
            </label>
            <label className="form-field">
              <span>Buying timeline</span>
              <select
                value={draft.buyingTimeline}
                onChange={(event) => updateField('buyingTimeline', event.target.value)}
                required
              >
                <option value="" disabled>
                  Select a timeline
                </option>
                <option value="As soon as possible">As soon as possible</option>
                <option value="Within 1–3 months">Within 1–3 months</option>
                <option value="Within 3–6 months">Within 3–6 months</option>
                <option value="More than 6 months">More than 6 months</option>
                <option value="Just exploring">Just exploring</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Customer message or transcript</span>
            <textarea
              value={draft.customerMessage}
              onChange={(event) => updateField('customerMessage', event.target.value)}
              placeholder="Paste the inquiry, chat transcript, or notes from your first conversation..."
              rows={6}
              required
            />
            <small>Include the customer's own words whenever possible.</small>
          </label>

          {formError ? <div className="form-error" role="alert">{formError}</div> : null}

          <div className="form-actions">
            <button className="button button-quiet" onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="button button-accent" type="submit">
              Save lead
              <span className="button-arrow">→</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default LeadForm
