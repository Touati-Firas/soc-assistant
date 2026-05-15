import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, Eye, Shield } from 'lucide-react'
import { fetchTimelineByHost, fetchTimelineByIp, fetchTimelineByAlert, fetchAlertById } from '../api'
import AlertDetail from './AlertDetail'

const TACTIC_COLORS = {
  'Reconnaissance': '#94a3b8',
  'Resource Development': '#a78bfa',
  'Initial Access': '#f97316',
  'Execution': '#ef4444',
  'Persistence': '#dc2626',
  'Privilege Escalation': '#b91c1c',
  'Defense Evasion': '#eab308',
  'Credential Access': '#f59e0b',
  'Discovery': '#22d3ee',
  'Lateral Movement': '#3b82f6',
  'Collection': '#8b5cf6',
  'Command and Control': '#6366f1',
  'Exfiltration': '#ec4899',
  'Impact': '#991b1b',
}

export default function IncidentTimeline() {
  const [searchParams] = useSearchParams()
  const initialHost = searchParams.get('host') || ''
  
  // Detect if initialHost is an IP or hostname
  const isIpAddress = (value) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    return ipRegex.test(value)
  }
  
  const initialSearchType = initialHost && isIpAddress(initialHost) ? 'ip' : 'host'
  
  const [searchType, setSearchType] = useState(initialSearchType)
  const [searchValue, setSearchValue] = useState(initialHost)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const handleSearch = async () => {
    if (!searchValue) return
    setLoading(true)
    try {
      let data
      if (searchType === 'host') {
        data = await fetchTimelineByHost(searchValue)
      } else if (searchType === 'ip') {
        data = await fetchTimelineByIp(searchValue)
      } else {
        data = await fetchTimelineByAlert(searchValue)
      }
      setTimeline(data)
    } catch (err) {
      console.error('Timeline search failed:', err)
    }
    setLoading(false)
  }

  // Auto-search when URL contains host parameter
  useEffect(() => {
    if (initialHost) {
      handleSearch()
    }
  }, [initialHost])

  const handleViewDetail = async (alertId) => {
    try {
      const detail = await fetchAlertById(alertId)
      setSelectedAlert(detail)
    } catch (err) {
      console.error('Failed to fetch alert:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Clock className="w-7 h-7 text-soc-400" />
          Incident Timeline
        </h1>
        <p className="text-sm text-gray-500 mt-1">Chronological view of correlated security events</p>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <select
            value={searchType}
            onChange={e => setSearchType(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-soc-500 focus:outline-none"
          >
            <option value="host">By Hostname</option>
            <option value="ip">By Source IP</option>
            <option value="alert">By Alert ID</option>
          </select>
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={
              searchType === 'host'
                ? 'Enter hostname...'
                : searchType === 'ip'
                ? 'Enter source IP...'
                : 'Enter alert ID...'
            }
            className="flex-1 bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2 border border-gray-700 focus:border-soc-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-soc-600 text-white text-sm font-medium rounded-lg hover:bg-soc-500 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {/* MITRE Legend */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">MITRE ATT&CK Kill Chain</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TACTIC_COLORS).map(([tactic, color]) => (
            <span
              key={tactic}
              className="text-[10px] px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
            >
              {tactic}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {timeline && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-300">
              {timeline.total_events} events for {timeline.entity_type}: <span className="text-soc-400">{timeline.entity || timeline.host}</span>
            </h3>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-800" />

            <div className="space-y-4">
              {timeline.timeline?.map((event, i) => {
                const color = event.tactic_color || '#64748b'
                return (
                  <div key={i} className="relative flex items-start gap-4 pl-12 group">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-[18px] top-2 w-3 h-3 rounded-full border-2 border-gray-900 z-10"
                      style={{ backgroundColor: color }}
                    />

                    {/* Event card */}
                    <div className="flex-1 bg-gray-800/30 rounded-lg p-4 border border-gray-800/50 hover:border-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase severity-${event.severity}`}
                            >
                              {event.severity}
                            </span>
                            <span className="text-xs text-gray-500">{event.timestamp?.substring(0, 19)?.replace('T', ' ')}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-200">{event.rule_name}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.tactics?.map((t, j) => (
                              <span
                                key={j}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: TACTIC_COLORS[t] + '20', color: TACTIC_COLORS[t] || '#64748b' }}
                              >
                                {t}
                              </span>
                            ))}
                            {event.techniques?.map((t, j) => (
                              <span key={`t-${j}`} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>Host: {event.host}</span>
                            <span>User: {event.user}</span>
                            <span>IP: {event.source_ip}</span>
                          </div>
                        </div>
                        {/* Mini detail button */}
                        <button
                          onClick={() => handleViewDetail(event.id)}
                          className="p-1.5 rounded-lg bg-soc-600/20 text-soc-400 hover:bg-soc-600/40 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {!timeline && !loading && (
        <div className="glass-card p-12 text-center">
          <Clock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Search by hostname, source IP, or alert ID to build the incident timeline</p>
        </div>
      )}

      {/* Alert Detail Popup */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  )
}
