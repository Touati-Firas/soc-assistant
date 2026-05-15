import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Alerts ──
export const fetchAlerts = (params = {}) =>
  api.get('/alerts', { params }).then(r => r.data)

export const fetchAlertById = (id) =>
  api.get(`/alerts/${encodeURIComponent(id)}`).then(r => r.data)

export const fetchAlertStats = (timeRange = 'now-7d') =>
  api.get('/alerts/stats', { params: { time_range: timeRange } }).then(r => r.data)

// ── Analysis ──
export const analyzeAlert = (id) =>
  api.post(`/analyze/${encodeURIComponent(id)}`).then(r => r.data)

export const chatWithSOC = (message, context = '') =>
  api.post('/chat', { message, context }).then(r => r.data)

// ── Playbooks ──
export const fetchPlaybooks = () =>
  api.get('/playbooks').then(r => r.data)

export const matchPlaybook = (alertId) =>
  api.get(`/playbook/match/${encodeURIComponent(alertId)}`).then(r => r.data)

export const togglePlaybookStep = (alertId, stepId) =>
  api.put(`/playbook/${encodeURIComponent(alertId)}/step/${stepId}`).then(r => r.data)

export const closeAlertFromPlaybook = (alertId, closeReason) =>
  api.post(`/playbook/${encodeURIComponent(alertId)}/close`, { close_reason: closeReason }).then(r => r.data)

// ── Timeline ──
export const fetchTimelineByHost = (hostname, timeRange = 'now-7d') =>
  api.get(`/timeline/host/${encodeURIComponent(hostname)}`, { params: { time_range: timeRange } }).then(r => r.data)

export const fetchTimelineByIp = (sourceIp, timeRange = 'now-7d') =>
  api.get(`/timeline/ip/${encodeURIComponent(sourceIp)}`, { params: { time_range: timeRange } }).then(r => r.data)

export const fetchTimelineByAlert = (alertId, timeRange = 'now-7d') =>
  api.get(`/timeline/alert/${encodeURIComponent(alertId)}`, { params: { time_range: timeRange } }).then(r => r.data)

// ── Clusters ──
export const fetchClusters = (params = {}) =>
  api.get('/clusters', { params }).then(r => r.data)

// ── Reports ──
export const downloadReport = () =>
  api.get('/report/weekly', { responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `soc_report_${new Date().toISOString().split('T')[0]}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  })

export default api
