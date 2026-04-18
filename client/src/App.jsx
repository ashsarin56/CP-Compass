import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [handle, setHandle] = useState(null)

  return handle
    ? <Dashboard handle={handle} onBack={() => setHandle(null)} />
    : <Home onAnalyzed={setHandle} />
}