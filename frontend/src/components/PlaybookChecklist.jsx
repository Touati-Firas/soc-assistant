import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { fetchPlaybooks, matchPlaybook, togglePlaybookStep, closeAlertFromPlaybook } from '../api'

const CLOSE_REASONS = [
  'Close without reason',
  'Duplicate',
  'False Positive',
  'True positive',
  'Benign positive',
]

export default function PlaybookChecklist() {
  const [searchParams] = useSearchParams()
  const [playbooks, setPlaybooks] = useState([])
  const [selectedPlaybook, setSelectedPlaybook] = useState(null)
  const [alertId, setAlertId] = useState('')
  const [closeReason, setCloseReason] = useState(CLOSE_REASONS[0])
  const [matchedPlaybook, setMatchedPlaybook] = useState(null)
  const [stepStates, setStepStates] = useState({})
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [closing, setClosing] = useState(false)
  const [matchMessage, setMatchMessage] = useState('')
  const [matchError, setMatchError] = useState('')
  const [closeMessage, setCloseMessage] = useState('')
  const [closeError, setCloseError] = useState('')

  useEffect(() => {
    loadPlaybooks()
  }, [])

  useEffect(() => {
    const initialAlertId = searchParams.get('alertId') || ''
    if (initialAlertId) {
      setAlertId(initialAlertId)
      handleMatchById(initialAlertId.trim())
    }
  }, [searchParams])

  const loadPlaybooks = async () => {
    try {
      const data = await fetchPlaybooks()
      setPlaybooks(data.playbooks || [])
    } catch (err) {
      console.error('Failed to load playbooks:', err)
    }
    setLoading(false)
  }

  const handleMatchById = async (normalizedAlertId) => {
    if (!normalizedAlertId) return
    setMatching(true)
    setMatchedPlaybook(null)
    setSelectedPlaybook(null)
    setMatchError('')
    setMatchMessage('')
    setCloseMessage('')
    setCloseError('')
    try {
      const data = await matchPlaybook(normalizedAlertId)
      setMatchedPlaybook(data.matched ? data.playbook : null)
      if (data.matched) {
        setMatchMessage(`Playbook trouvé pour l'alerte ${normalizedAlertId}`)
      } else {
        setMatchMessage(data.message || 'Aucun playbook correspondant pour cette alerte.')
      }
    } catch (err) {
      console.error('Match failed:', err)
      setMatchError(err?.response?.data?.detail || 'Impossible de retrouver cette alerte ou de faire le matching.')
    }
    setMatching(false)
  }

  const handleMatch = async () => {
    await handleMatchById(alertId.trim())
  }

  const handleCloseAlert = async () => {
    if (!alertId.trim()) return
    setClosing(true)
    setCloseError('')
    setCloseMessage('')
    try {
      const normalizedAlertId = alertId.trim()
      const result = await closeAlertFromPlaybook(normalizedAlertId, closeReason)
      setCloseMessage(`Alert ${normalizedAlertId} closed as ${result.close_reason}`)
    } catch (err) {
      console.error('Close alert failed:', err)
      setCloseError(err?.response?.data?.detail || 'Impossible de fermer cette alerte.')
    }
    setClosing(false)
  }

  const handleToggleStep = async (pbAlertId, stepId) => {
    const key = `${pbAlertId}-${stepId}`
    setStepStates(prev => ({ ...prev, [key]: !prev[key] }))
    try {
      await togglePlaybookStep(pbAlertId, stepId)
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  const activePlaybook = matchedPlaybook || selectedPlaybook

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-soc-400" />
          Investigation Playbooks
        </h1>
        <p className="text-sm text-gray-500 mt-1">Step-by-step investigation guides sourced from MITRE ATT&CK & Sigma Rules</p>
      </div>

      {/* Alert Match */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Match Playbook to Alert
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={alertId}
            onChange={e => setAlertId(e.target.value)}
            placeholder="Enter Alert ID..."
            className="flex-1 bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2 border border-gray-700 focus:border-soc-500 focus:outline-none"
          />
          <button
            onClick={handleMatch}
            disabled={matching}
            className="px-4 py-2 bg-soc-600 text-white text-sm font-medium rounded-lg hover:bg-soc-500 transition-colors"
          >
            {matching ? 'Matching...' : 'Match'}
          </button>
        </div>
        {matchMessage && (
          <p className="mt-3 text-sm text-emerald-400">{matchMessage}</p>
        )}
        {matchError && (
          <p className="mt-3 text-sm text-red-400">{matchError}</p>
        )}
        {closeMessage && (
          <p className="mt-3 text-sm text-emerald-400">{closeMessage}</p>
        )}
        {closeError && (
          <p className="mt-3 text-sm text-red-400">{closeError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playbook List */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-300">Available Playbooks ({playbooks.length})</h3>
          </div>
          <div className="divide-y divide-gray-800/30 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">Loading...</p>
            ) : playbooks.map((pb) => (
              <button
                key={pb.id}
                onClick={() => { setSelectedPlaybook(pb); setMatchedPlaybook(null) }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800/30 transition-colors ${
                  activePlaybook?.id === pb.id ? 'bg-soc-600/10 border-l-2 border-soc-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{pb.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {pb.mitre_techniques?.slice(0, 3).map((t, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300">
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Playbook Detail / Checklist */}
        <div className="lg:col-span-2">
          {activePlaybook ? (
            <div className="glass-card overflow-hidden">
              {/* Playbook header */}
              <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-soc-900/30 to-transparent">
                <h2 className="text-lg font-bold text-white">{activePlaybook.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(activePlaybook.mitre_tactics || []).map((t, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-soc-600/20 text-soc-300 border border-soc-500/20">
                      {t}
                    </span>
                  ))}
                  {(activePlaybook.mitre_techniques || []).map((t, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/20">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Severity threshold: <span className="text-yellow-400">{activePlaybook.severity_threshold}</span>
                </p>
              </div>

              {/* Investigation Steps */}
              <div className="p-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Investigation Steps</h3>
                {(activePlaybook.investigation_steps || []).map((step) => {
                  const key = `${alertId || activePlaybook.id}-${step.id}`
                  const completed = stepStates[key] || step.completed || false

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-lg border transition-all ${
                        step.critical
                          ? 'border-red-500/30 bg-red-500/5'
                          : completed
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-gray-800/50 bg-gray-800/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleStep(alertId || activePlaybook.id, step.id)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-600 hover:text-soc-400 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                              Step {step.id}: {step.title}
                            </span>
                            {step.critical && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
                                <AlertTriangle className="w-3 h-3" /> CRITICAL
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                          {step.elastic_query && (
                            <code className="block text-[10px] text-emerald-400 bg-gray-900/60 px-2 py-1 rounded mt-2 break-all">
                              {step.elastic_query}
                            </code>
                          )}
                          {step.expected_finding && (
                            <p className="text-[10px] text-yellow-400/80 mt-1">
                              Expected: {step.expected_finding}
                            </p>
                          )}
                          {step.tools && (
                            <div className="flex gap-1.5 mt-2">
                              {step.tools.map((tool, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Remediation */}
              {activePlaybook.remediation && (
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Remediation</h3>
                  {Object.entries(activePlaybook.remediation).map(([phase, actions]) => (
                    <div key={phase} className="mb-3">
                      <p className="text-xs font-medium text-soc-400 capitalize mb-1">{phase.replace('_', ' ')}</p>
                      <ul className="space-y-1">
                        {(Array.isArray(actions) ? actions : [actions]).map((action, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-gray-600 mt-0.5">›</span> {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {alertId.trim() && (
                <div className="px-6 pb-6">
                  <div className="border-t border-gray-800/50 pt-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Close Alert</h3>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-400 mb-2">Close reason</label>
                        <select
                          value={closeReason}
                          onChange={e => setCloseReason(e.target.value)}
                          className="w-full bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-soc-500 focus:outline-none"
                        >
                          {CLOSE_REASONS.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleCloseAlert}
                        disabled={closing || !alertId.trim()}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        {closing ? 'Closing...' : 'Close Alert'}
                      </button>
                    </div>
                    {closeMessage && (
                      <p className="mt-3 text-sm text-emerald-400">{closeMessage}</p>
                    )}
                    {closeError && (
                      <p className="mt-3 text-sm text-red-400">{closeError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Select a playbook or match one to an alert</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
