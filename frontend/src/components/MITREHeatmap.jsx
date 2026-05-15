import { useState, useEffect } from 'react'
import { Grid3X3, RefreshCw } from 'lucide-react'
import { fetchAlertStats } from '../api'

// MITRE ATT&CK Matrix structure
const MITRE_MATRIX = {
  'Reconnaissance': ['T1595', 'T1592', 'T1589', 'T1590', 'T1591', 'T1598'],
  'Resource Development': ['T1583', 'T1584', 'T1587', 'T1588', 'T1608'],
  'Initial Access': ['T1566', 'T1190', 'T1133', 'T1200', 'T1078', 'T1189'],
  'Execution': ['T1059', 'T1204', 'T1047', 'T1053', 'T1569'],
  'Persistence': ['T1547', 'T1136', 'T1543', 'T1546', 'T1574'],
  'Privilege Escalation': ['T1068', 'T1134', 'T1548', 'T1547', 'T1574'],
  'Defense Evasion': ['T1070', 'T1036', 'T1027', 'T1218', 'T1562'],
  'Credential Access': ['T1110', 'T1003', 'T1555', 'T1056', 'T1557'],
  'Discovery': ['T1087', 'T1083', 'T1057', 'T1018', 'T1082'],
  'Lateral Movement': ['T1021', 'T1570', 'T1563', 'T1080'],
  'Collection': ['T1005', 'T1039', 'T1074', 'T1114', 'T1560'],
  'Command and Control': ['T1071', 'T1095', 'T1573', 'T1571', 'T1572'],
  'Exfiltration': ['T1041', 'T1048', 'T1567', 'T1029', 'T1030'],
  'Impact': ['T1486', 'T1490', 'T1489', 'T1498', 'T1499'],
}

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

export default function MITREHeatmap() {
  const [techCounts, setTechCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('now-7d')

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const stats = await fetchAlertStats(timeRange)
      setTechCounts(stats.by_technique || {})
    } catch (err) {
      console.error('Failed to load MITRE data:', err)
    }
    setLoading(false)
  }

  // Determine max count for color intensity
  const maxCount = Math.max(1, ...Object.values(techCounts))

  const getIntensity = (techId) => {
    // Check if any matching technique exists (including sub-techniques)
    let count = 0
    Object.entries(techCounts).forEach(([key, val]) => {
      if (key.startsWith(techId)) {
        count += val
      }
    })
    return count
  }

  const getCellColor = (count) => {
    if (count === 0) return 'bg-gray-800/30'
    const ratio = count / maxCount
    if (ratio > 0.7) return 'bg-red-600/70'
    if (ratio > 0.4) return 'bg-orange-600/60'
    if (ratio > 0.2) return 'bg-yellow-600/50'
    return 'bg-green-600/30'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Grid3X3 className="w-7 h-7 text-soc-400" />
            MITRE ATT&CK Heatmap
          </h1>
          <p className="text-sm text-gray-500 mt-1">Technique detection coverage across the ATT&CK matrix</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-soc-500 focus:outline-none"
          >
            <option value="now-24h">Last 24h</option>
            <option value="now-7d">Last 7 days</option>
            <option value="now-30d">Last 30 days</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-soc-600 text-white text-sm rounded-lg hover:bg-soc-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="glass-card p-4 flex items-center gap-6">
        <span className="text-xs text-gray-500">Intensity:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded bg-gray-800/30" />
          <span className="text-xs text-gray-500">None</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded bg-green-600/30" />
          <span className="text-xs text-gray-500">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded bg-yellow-600/50" />
          <span className="text-xs text-gray-500">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded bg-orange-600/60" />
          <span className="text-xs text-gray-500">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded bg-red-600/70" />
          <span className="text-xs text-gray-500">Critical</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="glass-card overflow-x-auto">
        <div className="min-w-[1200px] p-4">
          <div className="grid grid-cols-14 gap-1">
            {Object.entries(MITRE_MATRIX).map(([tactic, techniques]) => (
              <div key={tactic} className="space-y-1">
                {/* Tactic header */}
                <div
                  className="px-2 py-2 rounded-lg text-center"
                  style={{ backgroundColor: TACTIC_COLORS[tactic] + '20', borderLeft: `3px solid ${TACTIC_COLORS[tactic]}` }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TACTIC_COLORS[tactic] }}>
                    {tactic}
                  </p>
                </div>

                {/* Technique cells */}
                {techniques.map((techId) => {
                  const count = getIntensity(techId)
                  return (
                    <div
                      key={techId}
                      className={`px-2 py-1.5 rounded text-center cursor-pointer ${getCellColor(count)} 
                        hover:ring-1 hover:ring-soc-400/50 transition-all group relative`}
                      title={`${techId}: ${count} detections`}
                    >
                      <p className="text-[9px] font-mono text-gray-400 group-hover:text-gray-200">
                        {techId}
                      </p>
                      {count > 0 && (
                        <p className="text-[8px] font-bold text-gray-300">{count}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detection Stats */}
      {Object.keys(techCounts).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Detected Techniques</h3>
          <div className="space-y-2">
            {Object.entries(techCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([tech, count]) => (
                <div key={tech} className="flex items-center gap-4">
                  <span className="text-xs font-mono text-purple-300 w-24">{tech}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-soc-600 to-purple-500 rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
