import { useState } from 'react'
import SpatialLabs from './SpatialLabs.jsx'
import SpatialStudio from './SpatialStudio.jsx'
import './App.css'

function App() {
  const [showStudio, setShowStudio] = useState(false)

  if (showStudio) {
    return <SpatialStudio onBack={() => setShowStudio(false)} />
  }

  return <SpatialLabs onAccess={() => setShowStudio(true)} />
}

export default App
