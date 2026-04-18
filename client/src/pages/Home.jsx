import { useState } from 'react'
import { registerUser, computeProfile } from '../api'

export default function Home({ onAnalyzed }) {
  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'error'
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!handle.trim()) return

    setStatus('loading')
    setMessage('Fetching your CF submissions...')

    try {
      // Step 1: sync submissions
      const reg = await registerUser(handle.trim())
      if (!reg.success) throw new Error(reg.error)

      setMessage(`Synced ${reg.data.submissionsStored} submissions. Building your skill profile...`)

      // Step 2: compute profile
      const profile = await computeProfile(handle.trim())
      if (!profile.success) throw new Error(profile.error)

      setMessage('Profile ready!')
      onAnalyzed(handle.trim())

    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>CP Compass</h1>
        <p style={styles.subtitle}>
          Precise diagnosis of your competitive programming weaknesses.
          Not a sheet. Not an editorial. A training engine.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter your Codeforces handle"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            style={{
              ...styles.button,
              opacity: status === 'loading' ? 0.6 : 1
            }}
            type="submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Analyzing...' : 'Analyze My Profile'}
          </button>
        </form>

        {message && (
          <p style={{
            ...styles.message,
            color: status === 'error' ? '#ef4444' : '#22c55e'
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  hero: {
    maxWidth: '560px',
    width: '100%',
    textAlign: 'center'
  },
  title: {
    fontSize: '3rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#a0a0a0',
    lineHeight: '1.6',
    marginBottom: '2.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  input: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e5e5e5',
    outline: 'none'
  },
  button: {
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff'
  },
  message: {
    marginTop: '1rem',
    fontSize: '0.9rem'
  }
}