import { useState } from 'react'
import { linkCfHandle } from '../api'
import './LinkHandle.css'

export default function LinkHandle({ onLinked }) {
  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = handle.trim()
    if (!trimmed) return

    setStatus('loading')
    setError('')

    try {
      const result = await linkCfHandle(trimmed)
      if (!result.success) throw new Error(result.error || 'Failed to link handle')
      setStatus('success')
      onLinked(result.user?.cf_handle || trimmed)
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not link handle. Please check and try again.')
    }
  }

  return (
    <div className="link-container page-center">
      <div className="link-card card-surface">
        <span className="link-step">Step 2</span>
        <h1 className="link-title">Link your Codeforces handle</h1>

        <p className="link-subtitle">
          Your competitive programming profile is needed to analyze
          your strengths and weaknesses.
        </p>

        <form onSubmit={handleSubmit} className="link-form">
          <input
            className="input-field"
            type="text"
            placeholder="Your Codeforces handle"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            disabled={status === 'loading'}
            autoFocus
          />
          <button
            className="link-submit btn-primary"
            type="submit"
            disabled={status === 'loading' || !handle.trim()}
          >
            <span className="link-submit-content">
              {status === 'loading' && <span className="link-spinner" />}
              {status === 'loading' ? 'Linking & Syncing...' : 'Link & Sync'}
            </span>
          </button>
        </form>

        {error && (
          <p className="link-message link-message--error">{error}</p>
        )}

        <p className="link-note">
          We'll sync your submission history to build your skill profile.
        </p>
      </div>
    </div>
  )
}
