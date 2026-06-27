import { useState, useRef } from 'react'
import { signup, login, saveToken, getAuthBaseUrl } from '../api'
import logo from '../assets/logo.svg'
import './Home.css'

export default function Home({ onAnalyzed, onGoToRadar }) {
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signup')
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [radarHandle, setRadarHandle] = useState('')

  const featuresRef = useRef(null)
  const howRef = useRef(null)
  const radarRef = useRef(null)
  const authRef = useRef(null)

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

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-nav-logo">
          <img src={logo} alt="CP Compass" className="landing-nav-logo-img" />
          CP Compass
        </span>
        <div className="landing-nav-links">
          <button type="button" className="landing-nav-link" onClick={() => scrollTo(featuresRef)}>Features</button>
          <button type="button" className="landing-nav-link" onClick={() => scrollTo(howRef)}>How It Works</button>
          <button type="button" className="landing-nav-link" onClick={() => scrollTo(radarRef)}>Radar</button>
        </div>
        <div className="landing-nav-right">
          <button type="button" className="landing-nav-link" onClick={() => { scrollTo(authRef); setMode('login') }}>Log In</button>
          <button type="button" className="landing-nav-cta btn-primary" onClick={() => scrollTo(authRef)}>Get Started</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <span className="hero-badge">For Competitive Programmers</span>
          <h1 className="hero-title">
            Know exactly what<br />to practice next.
          </h1>
          <p className="hero-subtitle">
            CP Compass analyzes your Codeforces history, finds your precise
            weaknesses per topic, and generates a daily training plan that
            targets exactly where you're losing rating.
          </p>
          <div className="hero-actions">
            <button type="button" className="hero-cta btn-primary" onClick={() => scrollTo(authRef)}>
              Start Training →
            </button>
            <button type="button" className="hero-cta-ghost btn-ghost" onClick={() => scrollTo(radarRef)}>
              Try Radar Free
            </button>
          </div>
          <p className="hero-note">Free. No credit card. Just your CF handle.</p>
        </div>
      </section>

      <section className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-item">
            <span className="stat-number">25+</span>
            <span className="stat-label">CF Tags Analyzed</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">3</span>
            <span className="stat-label">Daily Problems</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">100%</span>
            <span className="stat-label">Free to Use</span>
          </div>
        </div>
      </section>

      <section className="features-section" ref={featuresRef}>
        <span className="section-eyebrow">Features</span>
        <h2 className="section-title">Built for deliberate practice</h2>
        <p className="section-subtitle">
          Not another problem list. CP Compass is a diagnostic engine that tells
          you exactly where you're weak and what to do about it.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrap feature-icon-wrap--danger">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="feature-card-title">Weakness Detection</h3>
            <p className="feature-card-text">
              We compute your actual skill rating per CF tag and compare it to your
              global estimate. Tags where you significantly underperform are flagged
              as weaknesses — with explanations for why.
            </p>
            <div className="feature-preview">
              <div className="fp-weakness-item">
                <span className="fp-tag fp-tag--red">dp</span>
                <span className="fp-rating">1180</span>
              </div>
              <div className="fp-weakness-item">
                <span className="fp-tag fp-tag--red">graphs</span>
                <span className="fp-rating">1240</span>
              </div>
              <div className="fp-weakness-item">
                <span className="fp-tag fp-tag--red">number theory</span>
                <span className="fp-rating">1310</span>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrap feature-icon-wrap--success">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="feature-card-title">Tag Skill Map</h3>
            <p className="feature-card-text">
              A per-topic rating breakdown across every Codeforces tag you've attempted.
              See where you're strong, where you're weak, and share your profile via a
              public radar link.
            </p>
            <div className="feature-preview">
              <div className="fp-bar-row">
                <span className="fp-bar-label">greedy</span>
                <div className="fp-bar-track"><div className="fp-bar-fill fp-bar-fill--green" style={{width: '82%'}} /></div>
                <span className="fp-bar-value">1640</span>
              </div>
              <div className="fp-bar-row">
                <span className="fp-bar-label">impl.</span>
                <div className="fp-bar-track"><div className="fp-bar-fill fp-bar-fill--green" style={{width: '75%'}} /></div>
                <span className="fp-bar-value">1500</span>
              </div>
              <div className="fp-bar-row">
                <span className="fp-bar-label">dp</span>
                <div className="fp-bar-track"><div className="fp-bar-fill fp-bar-fill--red" style={{width: '55%'}} /></div>
                <span className="fp-bar-value">1100</span>
              </div>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrap feature-icon-wrap--indigo">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h3 className="feature-card-title">Daily Training</h3>
            <p className="feature-card-text">
              Three problems a day, hand-picked to target your exact gaps. Each one is
              at the right difficulty for your level and comes with thinking prompts
              that guide your approach.
            </p>
            <div className="feature-preview">
              <div className="fp-problem">
                <span className="fp-problem-name">C. Maximize GCD</span>
                <span className="fp-problem-diff">⚡ 1400</span>
              </div>
              <div className="fp-problem">
                <span className="fp-problem-name">D. Tree Distances</span>
                <span className="fp-problem-diff">⚡ 1600</span>
              </div>
              <div className="fp-problem">
                <span className="fp-problem-name">B. XOR Queries</span>
                <span className="fp-problem-diff">⚡ 1300</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="preview-section">
        <span className="section-eyebrow">See It In Action</span>
        <h2 className="section-title">Your personal training dashboard</h2>
        <p className="section-subtitle">
          Everything you need to practice deliberately — weakness analysis,
          skill map, and targeted problems — in one view.
        </p>
        <div className="preview-window">
          <div className="preview-topbar">
            <div className="preview-dots">
              <span className="preview-dot preview-dot--red" />
              <span className="preview-dot preview-dot--yellow" />
              <span className="preview-dot preview-dot--green" />
            </div>
            <span className="preview-topbar-title">CP Compass — Dashboard</span>
            <span />
          </div>
          <div className="preview-body">
            <div className="preview-nav-bar">
              <span className="preview-brand">CP Compass</span>
              <div className="preview-nav-pills">
                <span className="preview-pill">tourist</span>
                <span className="preview-pill preview-pill--accent">Share Radar ↗</span>
              </div>
            </div>
            <div className="preview-stats-row">
              <div className="preview-stat">
                <span className="preview-stat-value preview-stat-value--indigo">1847</span>
                <span className="preview-stat-label">Global Estimate</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-value preview-stat-value--red">3</span>
                <span className="preview-stat-label">Weaknesses</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-value">14</span>
                <span className="preview-stat-label">Tags Tracked</span>
              </div>
            </div>
            <div className="preview-content-grid">
              <div className="preview-panel">
                <span className="preview-panel-title">⚠ Weaknesses</span>
                <div className="preview-weakness-row">
                  <span className="preview-weak-tag">dp</span>
                  <span className="preview-weak-val">1180</span>
                </div>
                <div className="preview-weakness-row">
                  <span className="preview-weak-tag">graphs</span>
                  <span className="preview-weak-val">1240</span>
                </div>
                <div className="preview-weakness-row">
                  <span className="preview-weak-tag">number theory</span>
                  <span className="preview-weak-val">1310</span>
                </div>
              </div>
              <div className="preview-panel">
                <span className="preview-panel-title">📊 Tag Skill Map</span>
                <div className="preview-bar-row">
                  <span className="preview-bar-name">greedy</span>
                  <div className="preview-bar-track"><div className="preview-bar-fill preview-bar-fill--g" style={{width: '85%'}} /></div>
                </div>
                <div className="preview-bar-row">
                  <span className="preview-bar-name">impl.</span>
                  <div className="preview-bar-track"><div className="preview-bar-fill preview-bar-fill--g" style={{width: '78%'}} /></div>
                </div>
                <div className="preview-bar-row">
                  <span className="preview-bar-name">dp</span>
                  <div className="preview-bar-track"><div className="preview-bar-fill preview-bar-fill--r" style={{width: '52%'}} /></div>
                </div>
                <div className="preview-bar-row">
                  <span className="preview-bar-name">graphs</span>
                  <div className="preview-bar-track"><div className="preview-bar-fill preview-bar-fill--r" style={{width: '58%'}} /></div>
                </div>
                <div className="preview-bar-row">
                  <span className="preview-bar-name">math</span>
                  <div className="preview-bar-track"><div className="preview-bar-fill preview-bar-fill--g" style={{width: '72%'}} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section" ref={howRef}>
        <span className="section-eyebrow">How It Works</span>
        <h2 className="section-title">Three steps to targeted practice</h2>
        <div className="how-grid">
          <div className="how-card">
            <span className="how-number">1</span>
            <h3 className="how-card-title">Connect</h3>
            <p className="how-card-text">
              Sign up and link your Codeforces handle. We pull your entire
              submission history — every AC, WA, and TLE.
            </p>
          </div>
          <div className="how-connector">
            <svg width="40" height="2" viewBox="0 0 40 2">
              <line x1="0" y1="1" x2="40" y2="1" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
          </div>
          <div className="how-card">
            <span className="how-number">2</span>
            <h3 className="how-card-title">Analyze</h3>
            <p className="how-card-text">
              Our engine computes a per-tag skill rating and identifies your
              weakest topics — the ones dragging your rating down.
            </p>
          </div>
          <div className="how-connector">
            <svg width="40" height="2" viewBox="0 0 40 2">
              <line x1="0" y1="1" x2="40" y2="1" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
          </div>
          <div className="how-card">
            <span className="how-number">3</span>
            <h3 className="how-card-title">Train</h3>
            <p className="how-card-text">
              Get 3 problems a day, hand-picked to target your exact gaps.
              Each comes with thinking prompts to guide your approach.
            </p>
          </div>
        </div>
      </section>

      <section className="radar-section" ref={radarRef}>
        <div className="radar-section-inner">
          <span className="section-eyebrow">Try Without Signing Up</span>
          <h2 className="section-title">Check any handle's skill radar</h2>
          <p className="section-subtitle radar-subtitle">
            Enter a Codeforces handle to see their per-tag skill breakdown.
            No account needed.
          </p>
          <div className="radar-input-row">
            <input
              className="input-field radar-input"
              type="text"
              placeholder="Codeforces handle"
              value={radarHandle}
              onChange={e => setRadarHandle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && radarHandle.trim()) onGoToRadar(radarHandle.trim())
              }}
            />
            <button
              className="btn-primary radar-go-btn"
              type="button"
              onClick={() => { if (radarHandle.trim()) onGoToRadar(radarHandle.trim()) }}
            >
              View Radar →
            </button>
          </div>
        </div>
      </section>

      <section className="auth-section" ref={authRef}>
        <div className="auth-card card-surface">
          <h2 className="auth-title">Get your training plan</h2>
          <p className="auth-subtitle">
            Create an account to unlock weakness detection,
            personalized problems, and your full skill profile.
          </p>

          <button
            className="auth-google-btn"
            type="button"
            onClick={() => { window.location.href = getAuthBaseUrl() + '/auth/google' }}
          >
            <svg className="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.84 14.09a6.97 6.97 0 0 1 0-4.17V7.07H2.18a11.01 11.01 0 0 0 0 9.86l3.66-2.84Z" fill="#FBBC05"/>
              <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider-row">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`} onClick={() => setMode('signup')} type="button">Sign Up</button>
            <button className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`} onClick={() => setMode('login')} type="button">Log In</button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <input className="input-field" type="text" placeholder="Codeforces handle" value={handle} onChange={e => setHandle(e.target.value)} disabled={status === 'loading'} />
            )}
            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={status === 'loading'} />
            <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={status === 'loading'} />
            <button className="auth-submit btn-primary" type="submit" disabled={status === 'loading'}>
              <span className="auth-submit-content">
                {status === 'loading' && <span className="auth-spinner" />}
                {status === 'loading'
                  ? (mode === 'signup' ? 'Setting up...' : 'Logging in...')
                  : (mode === 'signup' ? 'Create Account' : 'Log In')}
              </span>
            </button>
          </form>

          {message && (
            <p className={`auth-message ${status === 'error' ? 'auth-message--error' : 'auth-message--success'}`}>
              {message}
            </p>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo">CP Compass</span>
            <p className="landing-footer-tagline">
              Built for competitive programmers who want to improve deliberately.
            </p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Product</span>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo(featuresRef)}>Features</button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo(howRef)}>How It Works</button>
              <button type="button" className="landing-footer-link" onClick={() => scrollTo(radarRef)}>Radar</button>
            </div>
            <div className="landing-footer-col">
              <span className="landing-footer-col-title">Account</span>
              <button type="button" className="landing-footer-link" onClick={() => { scrollTo(authRef); setMode('signup') }}>Sign Up</button>
              <button type="button" className="landing-footer-link" onClick={() => { scrollTo(authRef); setMode('login') }}>Log In</button>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p className="landing-footer-copy">© 2025 CP Compass</p>
        </div>
      </footer>
    </div>
  )
}