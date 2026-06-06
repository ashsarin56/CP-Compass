import { useState } from 'react'
import { signup, login, saveToken } from '../api'

export default function Home({ onAnalyzed, onGoToRadar }) {
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signup')
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')

    try {
      if (mode === 'signup') {
        setMessage('Syncing your CF history...')
        const result = await signup(handle.trim(), email.trim(), password)
        if (!result.success) throw new Error(result.error)
        saveToken(result.token)
        setMessage('Profile ready!')
        onAnalyzed(result.user.handle)
      } else {
        setMessage('Logging in...')
        const result = await login(email.trim(), password)
        if (!result.success) throw new Error(result.error)
        saveToken(result.token)
        setMessage('Welcome back!')
        onAnalyzed(result.user.handle)
      }
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

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
            onClick={() => setMode('signup')}
          >Sign Up</button>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => setMode('login')}
          >Log In</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <input
              style={styles.input}
              type="text"
              placeholder="Codeforces handle"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              disabled={status === 'loading'}
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            style={{ ...styles.button, opacity: status === 'loading' ? 0.6 : 1 }}
            type="submit"
            disabled={status === 'loading'}
          >
            {status === 'loading'
              ? (mode === 'signup' ? 'Setting up...' : 'Logging in...')
              : (mode === 'signup' ? 'Create Account' : 'Log In')}
          </button>
        </form>

        {message && (
          <p style={{ ...styles.message, color: status === 'error' ? '#ef4444' : '#22c55e' }}>
            {message}
          </p>
        )}

        <p style={styles.radarLink}>
          Just want to see your skill map?{' '}
          <button
            style={styles.radarLinkBtn}
            onClick={() => { if (handle.trim()) onGoToRadar(handle.trim()) }}
          >
            View Radar Only →
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  hero: { maxWidth: '420px', width: '100%', textAlign: 'center' },
  title: { fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '1rem', background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '1rem', color: '#a0a0a0', lineHeight: '1.6', marginBottom: '2rem' },
  tabs: { display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '4px', marginBottom: '1.5rem' },
  tab: { flex: 1, padding: '0.5rem', background: 'none', border: 'none', color: '#555', fontSize: '0.9rem', borderRadius: '6px', cursor: 'pointer' },
  tabActive: { background: '#2a2a2a', color: '#e5e5e5' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.875rem 1rem', fontSize: '1rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5', outline: 'none' },
  button: { padding: '0.875rem', fontSize: '1rem', fontWeight: '600', background: 'linear-gradient(135deg, #4a9eed, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' },
  message: { marginTop: '1rem', fontSize: '0.9rem' },
  radarLink: { marginTop: '1.5rem', fontSize: '0.85rem', color: '#555' },
  radarLinkBtn: { background: 'none', border: 'none', color: '#4a9eed', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }
}