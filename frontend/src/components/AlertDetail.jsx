import { useState } from 'react'
import { X, ExternalLink, Shield, User, Monitor, Globe, Terminal, FileText, Activity } from 'lucide-react'

const severityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', glow: 'glow-red' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
}

export default function AlertDetail({ alert, onClose, onViewTimeline, onExecutePlaybook }) {
  const [activeTab, setActiveTab] = useState('details')
  if (!alert) return null

  const sev = severityConfig[alert.severity] || severityConfig.low

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-hidden glass-card animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800/50 ${alert.severity === 'critical' ? 'glow-red' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${sev.bg} ${sev.color} ${sev.border} border`}>
                  {alert.severity}
                </span>
                <span className="text-xs text-gray-500">{alert.id?.substring(0, 12)}...</span>
              </div>
              <h2 className="text-lg font-semibold text-white">{alert.rule_name}</h2>
              <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800/50">
          {['details', 'raw'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-soc-400 border-b-2 border-soc-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'details' ? 'Details' : 'Raw JSON'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Alert ID</h3>
                <code className="text-xs text-emerald-400 bg-gray-900/80 p-2 rounded block break-all">
                  {alert.id || 'N/A'}
                </code>
              </div>

              {/* Key fields grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Monitor} label="Host" value={alert.host} />
                <InfoCard icon={User} label="User" value={alert.user} />
                <InfoCard icon={Globe} label="Source IP" value={alert.source_ip} />
                <InfoCard icon={Globe} label="Destination IP" value={alert.destination_ip} />
                <InfoCard icon={Terminal} label="Process" value={alert.process_name} />
                <InfoCard icon={FileText} label="Event Action" value={alert.event_action} />
                <InfoCard icon={Activity} label="Risk Score" value={alert.risk_score} />
                <InfoCard icon={Shield} label="Status" value={alert.status} />
              </div>

              {/* MITRE ATT&CK */}
              {(alert.tactics?.length > 0 || alert.techniques?.length > 0) && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-soc-400 mb-2">MITRE ATT&CK</h3>
                  <div className="flex flex-wrap gap-2">
                    {alert.tactics?.map((t, i) => (
                      <span key={`tactic-${i}`} className="px-2 py-1 rounded text-xs bg-soc-600/20 text-soc-300 border border-soc-500/20">
                        {t}
                      </span>
                    ))}
                    {alert.techniques?.map((t, i) => (
                      <span key={`tech-${i}`} className="px-2 py-1 rounded text-xs bg-purple-600/20 text-purple-300 border border-purple-500/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Process details */}
              {alert.process_command_line && alert.process_command_line !== 'N/A' && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Command Line</h3>
                  <code className="text-xs text-emerald-400 bg-gray-900/80 p-2 rounded block break-all">
                    {alert.process_command_line}
                  </code>
                </div>
              )}

              {/* Rule description */}
              {alert.rule_description && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Rule Description</h3>
                  <p className="text-sm text-gray-400">{alert.rule_description}</p>
                </div>
              )}
            </div>
          ) : (
            <pre className="text-xs text-gray-300 bg-gray-900/80 p-4 rounded-lg overflow-auto max-h-[50vh]">
              {JSON.stringify(alert.raw || alert, null, 2)}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-800/50 flex gap-3">
          <button
            onClick={() => onExecutePlaybook?.(alert.id)}
            className="flex items-center gap-2 px-4 py-2 bg-soc-600 text-white text-sm font-medium rounded-lg hover:bg-soc-500 transition-colors"
          >
            <Shield className="w-4 h-4" /> Executer Playbook
          </button>
          <button
            onClick={() => {
              const identifier = (alert.host && alert.host !== 'N/A') ? alert.host : alert.source_ip
              onViewTimeline?.(identifier)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View Timeline
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-200 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  )
}
