import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Radar from './pages/Radar'
import { getMe, clearToken } from './api'

function getInitialState() {
  const path = window.location.pathname
  const radarMatch = path.match(/^\/radar\/(.+)/)
  if (radarMatch) {
    return { view: 'radar', radarHandle: radarMatch[1].toUpperCase(), handle: null }
  }
  // Check for existing token
  const token = localStorage.getItem('cp_compass_token')
  if (token) {
    return { view: 'loading', radarHandle: null, handle: null }
  }
  return { view: 'home', radarHandle: null, handle: null }
}

const initial = getInitialState()

export default function App() {
  const [view, setView] = useState(initial.view)
  const [handle, setHandle] = useState(initial.handle)
  const [radarHandle, setRadarHandle] = useState(initial.radarHandle)

  // verify token
  useState(() => {
    if (initial.view === 'loading') {
      getMe().then(result => {
        if (result.success) {
          setHandle(result.user.cf_handle)
          setView('dashboard')
        } else {
          clearToken()
          setView('home')
        }
      }).catch(() => {
        clearToken()
        setView('home')
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

  if (view === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', 
      justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#555' }}>Restoring session...</p>
    </div>
  )

  if (view === 'radar' && radarHandle) {
    return <Radar handle={radarHandle} onAnalyze={goToDashboard} />
  }

  if (view === 'dashboard' && handle) {
    return <Dashboard handle={handle} onBack={() => {
      clearToken()
      setView('home')
    }} />
  }

  return (
    <Home
      onAnalyzed={(h) => { setHandle(h); setView('dashboard') }}
      onGoToRadar={goToRadar}
    />
  )
}