import './ErrorPage.css'

function BrokenCompass() {
  return (
    <svg className="error-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="52" stroke="rgba(99,102,241,0.3)" strokeWidth="2" strokeDasharray="8 4" />
      <circle cx="60" cy="60" r="44" stroke="rgba(139,92,246,0.2)" strokeWidth="1.5" />
      <text x="60" y="18" textAnchor="middle" fill="rgba(99,102,241,0.5)" fontSize="10" fontWeight="700">N</text>
      <text x="60" y="110" textAnchor="middle" fill="rgba(99,102,241,0.3)" fontSize="10" fontWeight="700">S</text>
      <text x="10" y="64" textAnchor="middle" fill="rgba(99,102,241,0.3)" fontSize="10" fontWeight="700">W</text>
      <text x="110" y="64" textAnchor="middle" fill="rgba(99,102,241,0.3)" fontSize="10" fontWeight="700">E</text>
      <line x1="60" y1="28" x2="55" y2="56" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="64" x2="60" y2="92" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="4" fill="#6366f1" />
      <line x1="56" y1="56" x2="48" y2="50" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="64" x2="72" y2="70" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <text x="82" y="38" fill="rgba(239,68,68,0.5)" fontSize="18" fontWeight="700">?</text>
    </svg>
  )
}

function CrashIcon() {
  return (
    <svg className="error-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M60 20L105 95H15L60 20Z"
        stroke="rgba(99,102,241,0.3)"
        strokeWidth="2"
        fill="rgba(99,102,241,0.04)"
        strokeLinejoin="round"
      />
      <path
        d="M60 35L92 88H28L60 35Z"
        stroke="rgba(139,92,246,0.15)"
        strokeWidth="1"
        fill="none"
      />
      <line x1="60" y1="48" x2="60" y2="72" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="82" r="3" fill="#8b5cf6" />
      <line x1="38" y1="30" x2="32" y2="22" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="82" y1="30" x2="88" y2="22" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="70" x2="10" y2="68" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="100" y1="70" x2="110" y2="68" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function GenericIcon() {
  return (
    <svg className="error-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="50" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeDasharray="6 4" />
      <circle cx="60" cy="60" r="38" stroke="rgba(139,92,246,0.15)" strokeWidth="1.5" fill="rgba(99,102,241,0.04)" />
      <line x1="60" y1="38" x2="60" y2="68" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="80" r="3.5" fill="#8b5cf6" />
    </svg>
  )
}

function getIcon(code) {
  if (code === 404) return <BrokenCompass />
  if (code === 500) return <CrashIcon />
  return <GenericIcon />
}

export default function ErrorPage({ code = 500, title, message, onRetry, onHome }) {
  const displayTitle = title || (code === 404 ? 'Page Not Found' : 'Something Went Wrong')
  const displayMessage = message || (
    code === 404
      ? "The page you're looking for doesn't exist or has been moved."
      : 'An unexpected error occurred. Please try again.'
  )

  return (
    <div className="error-container page-center">
      <div className="error-card card-surface">
        <div className="error-icon-wrapper">
          {getIcon(code)}
        </div>

        <h1 className="error-code">{code}</h1>

        <h2 className="error-title">{displayTitle}</h2>

        <p className="error-message">{displayMessage}</p>

        <div className="error-actions">
          {onRetry && (
            <button className="btn-primary" onClick={onRetry}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.5M13.5 8a5.5 5.5 0 0 1-9.68 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12.5 1v3.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 15v-3.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Try Again
            </button>
          )}
          {onHome && (
            <button className="btn-ghost" onClick={onHome}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
