import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Send, Shield, User, Loader2, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { chatWithSOC, fetchAlerts, fetchAlertById } from '../api'

const SEVERITY_COLORS = {
  critical: 'text-red-400 bg-red-500/15 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  low: 'text-green-400 bg-green-500/15 border-green-500/30',
}

export default function SOCChatbot() {
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis SOC Assistant, votre analyste IA spécialisé en cybersécurité. Je peux vous aider à :\n\n• Analyser des alertes de sécurité\n• Expliquer des techniques MITRE ATT&CK\n• Recommander des actions de remédiation\n• Répondre à vos questions sur les playbooks\n\nComment puis-je vous aider ?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextAlert, setContextAlert] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [showAlertPicker, setShowAlertPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load alert from URL params (coming from AlertDashboard "Chat" button)
  useEffect(() => {
    const alertId = searchParams.get('alertId')
    if (alertId) {
      fetchAlertById(alertId)
        .then(alert => {
          setContextAlert(alert)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🔗 Alerte chargée en contexte :\n**${alert.rule_name}** (${alert.severity?.toUpperCase()})\nHost: ${alert.host} | IP: ${alert.source_ip}\n\nPosez vos questions sur cette alerte, je l'analyserai avec les playbooks MITRE.`,
          }])
        })
        .catch(() => {})
    }
  }, [])

  // Pre-load recent alerts for the picker
  useEffect(() => {
    fetchAlerts({ size: 20, time_range: 'now-7d' })
      .then(data => setRecentAlerts(data.alerts || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = (alert) => {
    if (!alert) return ''
    return [
      `Règle: ${alert.rule_name}`,
      `Sévérité: ${alert.severity}`,
      `Host: ${alert.host}`,
      `Utilisateur: ${alert.user}`,
      `IP Source: ${alert.source_ip}`,
      `Timestamp: ${alert.timestamp}`,
      alert.tactics?.length ? `Tactiques MITRE: ${alert.tactics.join(', ')}` : '',
      alert.techniques?.length ? `Techniques MITRE: ${alert.techniques.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }

  const handleSend = async () => {
    const userMsg = input.trim()
    if (!userMsg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const data = await chatWithSOC(userMsg, buildContext(contextAlert))
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      const detail = err?.response?.data?.detail
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: detail ? `❌ ${detail}` : '❌ Erreur de connexion. Vérifiez que le backend est en cours d\'exécution.',
        error: true,
      }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleSelectAlert = (alert) => {
    setContextAlert(alert)
    setShowAlertPicker(false)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `🔗 Contexte mis à jour :\n**${alert.rule_name}** (${alert.severity?.toUpperCase()})\nHost: ${alert.host} | IP: ${alert.source_ip}\n\nJe vais maintenant répondre en tenant compte de cette alerte.`,
    }])
  }

  const handleClearContext = () => {
    setContextAlert(null)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🗑️ Contexte d\'alerte supprimé. Je réponds maintenant en mode général.',
    }])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-soc-400" />
            SOC Chat Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered cybersecurity assistant — powered by Groq LLaMA 3</p>
        </div>
        {/* Alert Context Selector Button */}
        <div className="relative">
          <button
            onClick={() => setShowAlertPicker(v => !v)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            {contextAlert ? `Alerte: ${contextAlert.rule_name?.slice(0, 22)}…` : 'Lier une alerte'}
            {showAlertPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Dropdown alert picker */}
          {showAlertPicker && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400 font-medium uppercase tracking-wider">
                Alertes récentes (7 jours)
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-800/50">
                {recentAlerts.length === 0 && (
                  <p className="px-3 py-3 text-xs text-gray-500">Aucune alerte disponible</p>
                )}
                {recentAlerts.map(alert => (
                  <button
                    key={alert.id}
                    onClick={() => handleSelectAlert(alert)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${SEVERITY_COLORS[alert.severity] || 'text-gray-400'}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-200 truncate">{alert.rule_name}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 pl-0.5">
                      {alert.source_ip} · {alert.timestamp?.substring(0, 10)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Alert Context Banner */}
      {contextAlert && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 border text-sm ${SEVERITY_COLORS[contextAlert.severity] || 'bg-gray-800 border-gray-700 text-gray-300'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <span className="font-semibold">{contextAlert.rule_name}</span>
              <span className="text-xs opacity-70 ml-2">
                {contextAlert.host} · {contextAlert.source_ip} · {contextAlert.timestamp?.substring(0, 10)}
              </span>
              {contextAlert.techniques?.length > 0 && (
                <span className="ml-2 text-xs opacity-70">
                  {contextAlert.techniques.join(', ')}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleClearContext} className="p-1 rounded hover:bg-black/20 transition-colors flex-shrink-0" title="Retirer le contexte">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-soc-500 to-soc-700 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-soc-600/30 border border-soc-500/20 text-gray-100'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : 'bg-gray-800/50 border border-gray-700/30 text-gray-200'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-soc-500 to-soc-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-800/50 border border-gray-700/30 rounded-xl px-4 py-3">
                <Loader2 className="w-5 h-5 text-soc-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800/50">
          {contextAlert && (
            <p className="text-[10px] text-purple-400/70 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Contexte actif : <span className="font-medium">{contextAlert.rule_name}</span> — vos questions seront analysées en lien avec cette alerte.
            </p>
          )}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={contextAlert ? `Analysez l'alerte "${contextAlert.rule_name?.slice(0, 30)}…"` : 'Posez votre question sur les alertes, MITRE ATT&CK, playbooks...'}
              className="flex-1 bg-gray-800/50 text-gray-200 text-sm rounded-xl px-4 py-3 border border-gray-700/50 focus:border-soc-500 focus:outline-none focus:ring-1 focus:ring-soc-500/30 placeholder-gray-600"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-gradient-to-r from-soc-600 to-soc-700 text-white rounded-xl hover:from-soc-500 hover:to-soc-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-soc-500/10"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            SOC Assistant utilise Groq LLaMA 3 avec RAG sur les playbooks et la documentation MITRE ATT&CK
          </p>
        </div>
      </div>
    </div>
  )
}
