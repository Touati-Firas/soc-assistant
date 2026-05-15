import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Shield, TrendingUp, Eye, Search,
  ChevronLeft, ChevronRight, RefreshCw, Download, Filter, MessageSquare
} from 'lucide-react'
import { fetchAlerts, fetchAlertStats, fetchAlertById, downloadReport } from '../api'
import AlertDetail from './AlertDetail'

const SEVERITY_COLORS = {
  critical: 'text-red-400 bg-red-500/15 border-red-500/25',
  high: 'text-orange-400 bg-orange-500/15 border-orange-500/25',
  medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25',
  low: 'text-green-400 bg-green-500/15 border-green-500/25',
}

export default function AlertDashboard() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState('now-7d')
  const [selectedAlert, setSelectedAlert] = useState(null)

  useEffect(() => {
    loadAlerts()
    loadStats()
  }, [page, severityFilter, statusFilter, timeRange])

  const loadAlerts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAlerts({ page, size: 20, severity: severityFilter || undefined, status: statusFilter || undefined, time_range: timeRange })
      setAlerts(data.alerts || [])
      setTotalPages(data.pages || 1)
    } catch (err) {
      console.error('Failed to load alerts:', err)
      setAlerts([])
      setError(err?.response?.data?.detail || 'Unable to fetch alerts from backend.')
    }
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const data = await fetchAlertStats(timeRange)
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleViewDetail = async (alertId) => {
    try {
      const detail = await fetchAlertById(alertId)
      setSelectedAlert(detail)
    } catch (err) {
      console.error('Failed to fetch alert detail:', err)
    }
  }



  const severityCounts = stats?.by_severity || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-soc-400" />
            Security Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time alert monitoring from Elastic SIEM</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadReport()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Weekly Report
          </button>
          <button
            onClick={() => { loadAlerts(); loadStats() }}
            className="flex items-center gap-2 px-3 py-2 bg-soc-600 text-white text-sm rounded-lg hover:bg-soc-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Alerts"
          value={stats?.total || 0}
          icon={AlertTriangle}
          color="text-soc-400"
          bgColor="bg-soc-500/10"
        />
        <StatCard
          label="Critical"
          value={severityCounts.critical || 0}
          icon={Shield}
          color="text-red-400"
          bgColor="bg-red-500/10"
          pulse={severityCounts.critical > 0}
        />
        <StatCard
          label="High"
          value={severityCounts.high || 0}
          icon={TrendingUp}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatCard
          label="Medium"
          value={severityCounts.medium || 0}
          icon={Eye}
          color="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          label="Low"
          value={severityCounts.low || 0}
          icon={Shield}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 glass-card p-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setPage(1) }}
          className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-soc-500 focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-soc-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={timeRange}
          onChange={e => { setTimeRange(e.target.value); setPage(1) }}
          className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-soc-500 focus:outline-none"
        >
          <option value="now-1h">Last 1 hour</option>
          <option value="now-24h">Last 24 hours</option>
          <option value="now-7d">Last 7 days (recommended)</option>
          <option value="now-30d">Last 30 days</option>
        </select>
      </div>

      {/* Alert Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Host</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MITRE</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading alerts...
                </td></tr>
              ) : error ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-red-300">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-red-400" />
                  {error}
                </td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  No alerts found for this period. Try Last 7 days or Last 30 days.
                </td></tr>
              ) : alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${SEVERITY_COLORS[alert.severity] || ''}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-200 font-medium">{alert.rule_name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{alert.host}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {statusFilter === 'closed' ? (alert.closed_by || alert.user) : alert.user}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-emerald-400 bg-gray-800/50 px-1.5 py-0.5 rounded">{alert.source_ip}</code>
                  </td>
                  <td className="px-4 py-3">
                    {statusFilter === 'closed' ? (
                      <span className="text-sm text-gray-300">
                        {alert.close_reason || 'N/A'}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {alert.techniques?.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{alert.timestamp?.substring(0, 19)?.replace('T', ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleViewDetail(alert.id)}
                        className="p-1.5 rounded-lg bg-soc-600/20 text-soc-400 hover:bg-soc-600/40 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/chat?alertId=${alert.id}&ruleName=${encodeURIComponent(alert.rule_name)}&severity=${alert.severity}&host=${encodeURIComponent(alert.host)}&ip=${encodeURIComponent(alert.source_ip)}`)}
                        className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 transition-colors"
                        title="Chat about this alert"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800/50">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Alert Detail Popup */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onExecutePlaybook={(alertId) => { setSelectedAlert(null); navigate(`/playbooks?alertId=${encodeURIComponent(alertId)}`) }}
          onViewTimeline={(host) => { setSelectedAlert(null); navigate(`/timeline?host=${host}`) }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bgColor, pulse = false }) {
  return (
    <div className={`glass-card-hover p-4 ${pulse ? 'animate-pulse-glow' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}
