import { useState, useEffect } from 'react'
import { Network, RefreshCw, AlertTriangle, Shield, Monitor } from 'lucide-react'
import { fetchClusters } from '../api'

export default function ClusterView() {
  const [clusterData, setClusterData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ days: 7, eps: 0.5, min_samples: 3 })
  const [expandedCluster, setExpandedCluster] = useState(null)

  useEffect(() => {
    loadClusters()
  }, [])

  const loadClusters = async () => {
    setLoading(true)
    try {
      const data = await fetchClusters(params)
      setClusterData(data)
    } catch (err) {
      console.error('Failed to load clusters:', err)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Network className="w-7 h-7 text-soc-400" />
            Alert Clusters
          </h1>
          <p className="text-sm text-gray-500 mt-1">DBSCAN-based similar alert detection and campaign identification</p>
        </div>
        <button
          onClick={loadClusters}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-soc-600 text-white text-sm font-medium rounded-lg hover:bg-soc-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Analyze
        </button>
      </div>

      {/* Parameters */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">DBSCAN Parameters</h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Days to analyze</label>
            <input
              type="number"
              value={params.days}
              onChange={e => setParams(p => ({ ...p, days: parseInt(e.target.value) || 7 }))}
              className="w-24 bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Epsilon (eps)</label>
            <input
              type="number"
              step="0.1"
              value={params.eps}
              onChange={e => setParams(p => ({ ...p, eps: parseFloat(e.target.value) || 0.5 }))}
              className="w-24 bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Min Samples</label>
            <input
              type="number"
              value={params.min_samples}
              onChange={e => setParams(p => ({ ...p, min_samples: parseInt(e.target.value) || 3 }))}
              className="w-24 bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {clusterData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase">Total Alerts Analyzed</p>
            <p className="text-2xl font-bold text-soc-400 mt-1">{clusterData.total_alerts}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase">Clusters Detected</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{clusterData.total_clusters}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase">Campaigns</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{clusterData.campaigns?.length || 0}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase">Noise (Unclustered)</p>
            <p className="text-2xl font-bold text-gray-400 mt-1">{clusterData.noise_count}</p>
          </div>
        </div>
      )}

      {/* Campaign Alerts */}
      {clusterData?.campaigns?.length > 0 && (
        <div className="glass-card p-6 border-red-500/20 glow-red">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" /> Active Campaigns Detected
          </h3>
          <div className="space-y-3">
            {clusterData.campaigns.map((campaign, i) => (
              <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-300">{campaign.description}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">
                    {campaign.severity}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {campaign.techniques?.map((t, j) => (
                    <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">{t}</span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Alerts: {campaign.alert_count}</span>
                  <span>Hosts: {campaign.hosts_affected?.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clusters */}
      {clusterData?.clusters?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detected Clusters</h3>
          {clusterData.clusters.map((cluster) => (
            <div key={cluster.cluster_id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedCluster(expandedCluster === cluster.cluster_id ? null : cluster.cluster_id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Network className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-200">Cluster #{cluster.cluster_id}</p>
                    <p className="text-xs text-gray-500">{cluster.alert_count} alerts · {cluster.hosts_affected?.length || 0} hosts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap gap-1">
                    {cluster.techniques?.slice(0, 3).map((t, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">{t}</span>
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold severity-${cluster.max_severity}`}>
                    {cluster.max_severity}
                  </span>
                </div>
              </button>

              {expandedCluster === cluster.cluster_id && (
                <div className="border-t border-gray-800/50 px-6 py-4 bg-gray-900/30">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tactics</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.tactics?.map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-soc-600/20 text-soc-300">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Affected Hosts</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.hosts_affected?.map((h, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cluster.alerts?.slice(0, 20).map((alert, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800/30 rounded px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full severity-${alert.severity}`} />
                          <span className="text-xs text-gray-300">{alert.rule_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{alert.timestamp?.substring(0, 19)?.replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="glass-card p-12 text-center">
          <RefreshCw className="w-8 h-8 text-soc-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Running DBSCAN clustering analysis...</p>
        </div>
      )}
    </div>
  )
}
