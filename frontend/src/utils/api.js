// 배포/로컬 환경 자동 분기
const API_BASE = import.meta.env.PROD 
  ? 'https://calzero-api.onrender.com/api'  // 배포용
  : 'http://localhost:8000/api'              // 로컬용

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export default {
  // Device API
  devices: {
    list: () => fetchAPI('/devices'),
    get: (id) => fetchAPI(`/devices/${id}`),
    create: (data) => fetchAPI('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id, data) => fetchAPI(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => fetchAPI(`/devices/${id}`, { method: 'DELETE' }),
  },

  // Actuator Calibration API
  actuator: {
    list: (deviceId) => fetchAPI(`/calibrations/actuator?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/actuator', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/actuator/${id}?device_id=${deviceId}`, { 
      method: 'DELETE' 
    }),
    activate: (id, deviceId) => fetchAPI(`/calibrations/actuator/${id}/activate?device_id=${deviceId}`, {
      method: 'PUT',
    }),
  },

  // Intrinsic Calibration API
  intrinsic: {
    list: (deviceId) => fetchAPI(`/calibrations/intrinsic?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/intrinsic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/intrinsic/${id}?device_id=${deviceId}`, { 
      method: 'DELETE' 
    }),
    activate: (id, deviceId) => fetchAPI(`/calibrations/intrinsic/${id}/activate?device_id=${deviceId}`, {
      method: 'PUT',
    }),
  },

  // Extrinsic Calibration API
  extrinsic: {
    list: (deviceId) => fetchAPI(`/calibrations/extrinsic?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/extrinsic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/extrinsic/${id}?device_id=${deviceId}`, { 
      method: 'DELETE' 
    }),
    activate: (id, deviceId) => fetchAPI(`/calibrations/extrinsic/${id}/activate?device_id=${deviceId}`, {
      method: 'PUT',
    }),
  },

  // Hand-Eye Calibration API
  handeye: {
    list: (deviceId) => fetchAPI(`/calibrations/handeye?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/handeye', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/handeye/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
    activate: (id, deviceId) => fetchAPI(`/calibrations/handeye/${id}/activate?device_id=${deviceId}`, {
      method: 'PUT',
    }),
  },

  // Replay Test API
  replay: {
    list: (deviceId) => fetchAPI(`/replay-tests?device_id=${deviceId}`),
    create: (data) => fetchAPI('/replay-tests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/replay-tests/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
  },

  // Auth API
  auth: {
    login: (email, password) => fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    register: (email, password, name) => fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
    me: (token) => fetchAPI('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  },

  // Backup/Restore API
  backup: {
    create: () => fetchAPI('/backup'),
    restore: (data) => fetchAPI('/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    reset: () => fetchAPI('/reset', { method: 'DELETE' }),
  },
}
