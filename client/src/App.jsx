import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Radar from './pages/Radar'
import ErrorPage from './pages/ErrorPage'
import LinkHandle from './pages/LinkHandle'
import ErrorBoundary from './components/ErrorBoundary'
import { getMe, clearToken, saveToken } from './api'
import './App.css'

function getInitialState() {
  const params = new URLSearchParams(window.location.search)
  const oauthToken = params.get('token')
  if (oauthToken) {
    saveToken(oauthToken)
    window.history.replaceState({}, '', window.location.pathname)
    return { view: 'loading', radarHandle: null, handle: null, errorInfo: null }
  }

  const path = window.location.pathname
  const radarMatch = path.match(/^\/radar\/(.+)/)
  if (radarMatch) {
    return { view: 'radar', radarHandle: radarMatch[1].toUpperCase(), handle: null, errorInfo: null }
  }
  const token = localStorage.getItem('cp_compass_token')
  if (token) {
    return { view: 'loading', radarHandle: null, handle: null, errorInfo: null }
  }
  return { view: 'home', radarHandle: null, handle: null, errorInfo: null }
}

const initial = getInitialState()

export default function App() {
  const [view, setView] = useState(initial.view)
  const [handle, setHandle] = useState(initial.handle)
  const [radarHandle, setRadarHandle] = useState(initial.radarHandle)
  const [errorInfo, setErrorInfo] = useState(initial.errorInfo)

  function showError(code, title, message) {
    setErrorInfo({ code, title, message })
    setView('error')
  }

  useState(() => {
    if (initial.view === 'loading') {
      getMe().then(result => {
        if (result.success) {
          const cfHandle = result.user.cf_handle
          if (!cfHandle || cfHandle.startsWith('PENDING_')) {
            setView('link-handle')
          } else {
            setHandle(cfHandle)
            setView('dashboard')
          }
        } else {
          clearToken()
          setView('home')
        }
      }).catch((err) => {
        clearToken()
        if (err.code === 401) {
          setView('home')
        } else {
          showError(
            err.code || 500,
            'Connection Error',
            err.message || 'Could not verify your session. Please try again.'
          )
        }
      })
    }
  })

  function goToRadar(h) {
    const upper = h.toUpperCase()
    setRadarHandle(upper)
    setView('radar')
    window.history.pushState({}, '', `/radar/${upper}`)
  }

  function goToDashboard(h) {
    setHandle(h)
    setView('dashboard')
    window.history.pushState({}, '', `/`)
  }

  function goHome() {
    clearToken()
    setView('home')
    window.history.pushState({}, '', `/`)
  }

  return (
    <ErrorBoundary>
      {view === 'loading' && (
        <div className="app-loading">
          <div className="spinner" />
          <p className="app-loading-text">Restoring session...</p>
        </div>
      )}

      {view === 'error' && errorInfo && (
        <ErrorPage
          code={errorInfo.code}
          title={errorInfo.title}
          message={errorInfo.message}
          onRetry={() => {
            setView('loading')
            setErrorInfo(null)
            getMe().then(result => {
              if (result.success) {
                const cfHandle = result.user.cf_handle
                if (!cfHandle || cfHandle.startsWith('PENDING_')) {
                  setView('link-handle')
                } else {
                  setHandle(cfHandle)
                  setView('dashboard')
                }
              } else {
                clearToken()
                setView('home')
              }
            }).catch(() => {
              clearToken()
              setView('home')
            })
          }}
          onHome={goHome}
        />
      )}

      {view === 'link-handle' && (
        <LinkHandle
          onLinked={(h) => {
            setHandle(h)
            setView('dashboard')
            window.history.pushState({}, '', `/`)
          }}
        />
      )}

      {view === 'radar' && radarHandle && (
        <Radar handle={radarHandle} onAnalyze={goToDashboard} />
      )}

      {view === 'dashboard' && handle && (
        <Dashboard handle={handle} onBack={goHome} />
      )}

      {view === 'home' && (
        <Home
          onAnalyzed={(h) => { setHandle(h); setView('dashboard') }}
          onGoToRadar={goToRadar}
        />
      )}
    </ErrorBoundary>
  )
}