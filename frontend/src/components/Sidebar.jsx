import { NavLink } from 'react-router-dom'
import {
  Shield, AlertTriangle, BookOpen, Clock, Network,
  Grid3X3, MessageSquare, ChevronLeft, ChevronRight, Activity, LogOut
} from 'lucide-react'

const navItems = [
  { path: '/', icon: AlertTriangle, label: 'Alerts Dashboard' },
  { path: '/playbooks', icon: BookOpen, label: 'Playbooks' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/clusters', icon: Network, label: 'Clusters' },
  { path: '/mitre', icon: Grid3X3, label: 'MITRE Heatmap' },
  { path: '/chat', icon: MessageSquare, label: 'SOC Chat' },
]

export default function Sidebar({ collapsed, onToggle, user, onLogout }) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/50 transition-all duration-300 z-40 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-soc-500 to-soc-700 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-bold text-white tracking-tight">SOC Assistant</h1>
            <p className="text-[10px] text-gray-500 font-medium">AI-Powered SIEM</p>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-800/30 ${collapsed ? 'justify-center' : ''}`}>
        <div className="relative">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        {!collapsed && (
          <span className="text-xs text-emerald-400 font-medium">System Active</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-soc-600/20 text-soc-400 border border-soc-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="space-y-2 border-t border-gray-800/50 px-2 py-3">
        {user && !collapsed && (
          <div className="px-3 py-2 text-xs text-gray-400">
            <p className="font-medium text-gray-300">{user.username}</p>
            <p className="text-gray-500">{user.email || 'soc-analyst'}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}
