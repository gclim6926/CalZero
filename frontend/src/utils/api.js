const API_BASE = 'http://localhost:8000/api'

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

// port 필드 정리 유틸리티
function cleanDeviceData(data) {
  const cleanData = { ...data }
  if (cleanData.port === '' || cleanData.port === null || cleanData.port === undefined) {
    delete cleanData.port
  } else {
    cleanData.port = parseInt(cleanData.port)
  }
  return cleanData
}

const api = {
  // Device API
  device: {
    getAll: () => fetchAPI('/devices'),
    create: (data) => fetchAPI('/devices', {
      method: 'POST',
      body: JSON.stringify(cleanDeviceData(data)),
    }),
    update: (id, data) => fetchAPI(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanDeviceData(data)),
    }),
    delete: (id) => fetchAPI(`/devices/${id}`, { method: 'DELETE' }),
  },

  // Actuator Calibration API
  actuator: {
    getAll: (deviceId) => fetchAPI(`/calibrations/actuator?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/actuator', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/actuator/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
  },

  // Intrinsic Calibration API
  intrinsic: {
    getAll: (deviceId) => fetchAPI(`/calibrations/intrinsic?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/intrinsic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/intrinsic/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
  },

  // Extrinsic Calibration API
  extrinsic: {
    getAll: (deviceId) => fetchAPI(`/calibrations/extrinsic?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/extrinsic', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/extrinsic/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
  },

  // Hand-Eye Calibration API
  handeye: {
    getAll: (deviceId) => fetchAPI(`/calibrations/handeye?device_id=${deviceId}`),
    create: (data) => fetchAPI('/calibrations/handeye', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id, deviceId) => fetchAPI(`/calibrations/handeye/${id}?device_id=${deviceId}`, {
      method: 'DELETE'
    }),
    activate: (id, deviceId) => fetchAPI(`/calibrations/handeye/${id}/activate?device_id=${deviceId}`, {
      method: 'PUT'
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

export default api
