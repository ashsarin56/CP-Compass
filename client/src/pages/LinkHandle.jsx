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
    <div className="link-container">
      <div className="link-grid-bg" />

      <div className="link-card">
        <div className="link-icon-wrapper">
          <svg className="link-icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="34" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
            <circle cx="40" cy="40" r="28" stroke="rgba(139,92,246,0.15)" strokeWidth="1" strokeDasharray="4 3" />
            <path d="M40 16L44 40L40 44L36 40L40 16Z" fill="#6366f1" opacity="0.8" />
            <path d="M40 64L36 40L40 36L44 40L40 64Z" fill="#8b5cf6" opacity="0.6" />
            <circle cx="40" cy="40" r="3" fill="#6366f1" />
            <circle cx="62" cy="18" r="10" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            <path d="M58 18h8M62 14v8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="link-title">Almost There!</h1>

        <p className="link-subtitle">
          Link your Codeforces handle to unlock all features.
          Your competitive programming profile is required to use this app.
        </p>

        <form onSubmit={handleSubmit} className="link-form">
          <input
            className="link-input"
            type="text"
            placeholder="Your Codeforces handle"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            disabled={status === 'loading'}
            autoFocus
          />
          <button
            className="link-submit"
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
