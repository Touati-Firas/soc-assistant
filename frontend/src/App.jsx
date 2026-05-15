import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import AlertDashboard from './components/AlertDashboard'
import PlaybookChecklist from './components/PlaybookChecklist'
import IncidentTimeline from './components/IncidentTimeline'
import ClusterView from './components/ClusterView'
import MITREHeatmap from './components/MITREHeatmap'
import SOCChatbot from './components/SOCChatbot'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
    setLoading(false)

    // Sync logout across browser tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'access_token' && !e.newValue) {
        // Token was removed in another tab
        setIsAuthenticated(false)
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
  }

  if (loading) {
    return <div className="h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Routes><Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} /></Routes>
  }

  // Show app if authenticated
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={handleLogout}
      />
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="p-6">
          <Routes>
            <Route path="/" element={<AlertDashboard />} />
            <Route path="/playbooks" element={<PlaybookChecklist />} />
            <Route path="/timeline" element={<IncidentTimeline />} />
            <Route path="/clusters" element={<ClusterView />} />
            <Route path="/mitre" element={<MITREHeatmap />} />
            <Route path="/chat" element={<SOCChatbot />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
