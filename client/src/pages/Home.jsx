import { useState } from 'react'
import { signup, login, saveToken, getAuthBaseUrl } from '../api'
import './Home.css'

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
    <div className="home-container">
      {/* Animated grid background */}
      <div className="home-grid-bg" />

      <div className="home-card">
        {/* Title */}
        <h1 className="home-title">CP Compass</h1>

        {/* Subtitle */}
        <p className="home-subtitle">
          Precise diagnosis of your competitive programming weaknesses.
          Not a sheet. Not an editorial. A training engine.
        </p>

        {/* Feature pills */}
        <div className="home-pills">
          <span className="home-pill">⚡ Skill Analysis</span>
          <span className="home-pill">🎯 Smart Recommendations</span>
          <span className="home-pill">📊 Progress Tracking</span>
        </div>

        <button
          className="home-google-btn"
          type="button"
          onClick={() => { window.location.href = getAuthBaseUrl() + '/auth/google' }}
        >
          <svg className="home-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
            <path d="M5.84 14.09a6.97 6.97 0 0 1 0-4.17V7.07H2.18a11.01 11.01 0 0 0 0 9.86l3.66-2.84Z" fill="#FBBC05"/>
            <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="home-divider-row">
          <span className="home-divider-line" />
          <span className="home-divider-text">or</span>
          <span className="home-divider-line" />
        </div>

        {/* Auth tabs */}
        <div className="home-tabs">
          <button
            className={`home-tab${mode === 'signup' ? ' home-tab--active' : ''}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Sign Up
          </button>
          <button
            className={`home-tab${mode === 'login' ? ' home-tab--active' : ''}`}
            onClick={() => setMode('login')}
            type="button"
          >
            Log In
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="home-form">
          {mode === 'signup' && (
            <input
              className="home-input"
              type="text"
              placeholder="Codeforces handle"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              disabled={status === 'loading'}
            />
          )}
          <input
            className="home-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <input
            className="home-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            className="home-submit"
            type="submit"
            disabled={status === 'loading'}
          >
            <span className="home-submit-content">
              {status === 'loading' && <span className="home-spinner" />}
              {status === 'loading'
                ? (mode === 'signup' ? 'Setting up...' : 'Logging in...')
                : (mode === 'signup' ? 'Create Account' : 'Log In')}
            </span>
          </button>
        </form>

        {/* Status message */}
        {message && (
          <p className={`home-message ${status === 'error' ? 'home-message--error' : 'home-message--success'}`}>
            {message}
          </p>
        )}

        {/* Radar only link */}
        <p className="home-radar">
          Just want to see your skill map?{' '}
          <button
            className="home-radar-btn"
            onClick={() => { if (handle.trim()) onGoToRadar(handle.trim()) }}
            type="button"
          >
            View Radar Only →
          </button>
        </p>

        {/* Footer */}
        <hr className="home-divider" />
        <p className="home-footer">Built for competitive programmers</p>
      </div>
    </div>
  )
}