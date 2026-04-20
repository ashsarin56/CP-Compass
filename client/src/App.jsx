import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Radar from './pages/Radar'

// Read URL once at startup — no useEffect needed
function getInitialState() {
  const path = window.location.pathname
  const radarMatch = path.match(/^\/radar\/(.+)/)
  if (radarMatch) {
    return { view: 'radar', radarHandle: radarMatch[1].toUpperCase(), handle: null }
  }
  return { view: 'home', radarHandle: null, handle: null }
}

const initial = getInitialState()

export default function App() {
  const [view, setView] = useState(initial.view)
  const [handle, setHandle] = useState(initial.handle)
  const [radarHandle, setRadarHandle] = useState(initial.radarHandle)

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

  if (view === 'radar' && radarHandle) {
    return <Radar handle={radarHandle} onAnalyze={goToDashboard} />
  }

  if (view === 'dashboard' && handle) {
    return <Dashboard handle={handle} onBack={() => setView('home')} />
  }

  return (
    <Home onAnalyzed={(h) => {
      setHandle(h)
      setView('dashboard')
    }}
    onGoToRadar={goToRadar}
    />
  )
}