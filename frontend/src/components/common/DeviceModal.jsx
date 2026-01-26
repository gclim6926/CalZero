import { useState, useEffect } from 'react'

// 기본 장치 타입 (로컬스토리지에서 추가된 것도 불러옴)
const getDeviceTypes = () => {
  const defaultTypes = [
    { value: 'so101_follower', label: 'SO101 Follower Arm', icon: '🦾' },
    { value: 'so101_leader', label: 'SO101 Leader Arm', icon: '🎮' },
    { value: 'alice_m1', label: 'Alice M1', icon: '🤖' },
    { value: 'robo1', label: 'Robo1', icon: '⚙️' },
    { value: 'robo2', label: 'Robo2', icon: '🔧' },
  ]

  try {
    const customTypes = JSON.parse(localStorage.getItem('calzero_device_types') || '[]')
    return [...defaultTypes, ...customTypes]
  } catch {
    return defaultTypes
  }
}

const saveCustomType = (newType) => {
  try {
    const customTypes = JSON.parse(localStorage.getItem('calzero_device_types') || '[]')
    customTypes.push(newType)
    localStorage.setItem('calzero_device_types', JSON.stringify(customTypes))
  } catch (e) {
    console.error('Failed to save custom type:', e)
  }
}

function DeviceModal({ isOpen, onClose, onSave, device = null }) {
  const [deviceTypes, setDeviceTypes] = useState(getDeviceTypes())
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: '',
    type: 'so101_follower',
    status: 'offline',
    description: '',
    ip_address: '',
    port: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    firmware_version: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showAddType, setShowAddType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeIcon, setNewTypeIcon] = useState('🔩')

  const isEdit = !!device

  useEffect(() => {
    if (device) {
      setFormData({
        name: device.name || '',
        location: device.location || '',
        manager: device.manager || '',
        type: device.type || 'so101_follower',
        status: device.status || 'offline',
        description: device.description || '',
        ip_address: device.ip_address || '',
        port: device.port || '',
        serial_number: device.serial_number || '',
        manufacturer: device.manufacturer || '',
        model: device.model || '',
        firmware_version: device.firmware_version || '',
      })
    } else {
      setFormData({
        name: '',
        location: '',
        manager: '',
        type: 'so101_follower',
        status: 'offline',
        description: '',
        ip_address: '',
        port: '',
        serial_number: '',
        manufacturer: '',
        model: '',
        firmware_version: '',
      })
    }
    setErrors({})
    setShowAddType(false)
    setDeviceTypes(getDeviceTypes())
  }, [device, isOpen])

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = '장치 이름을 입력하세요'
    }
    if (!formData.location.trim()) {
      newErrors.location = '설치 장소를 입력하세요'
    }
    if (!formData.manager.trim()) {
      newErrors.manager = '관리자를 입력하세요'
    }
    if (formData.ip_address && !/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.ip_address)) {
      newErrors.ip_address = '올바른 IP 주소 형식이 아닙니다'
    }
    if (formData.port && (isNaN(formData.port) || formData.port < 1 || formData.port > 65535)) {
      newErrors.port = '포트 번호는 1-65535 사이여야 합니다'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data = { ...formData }
      if (data.port) data.port = parseInt(data.port)
      await onSave(data, device?.id)
      onClose()
    } catch (error) {
      console.error('Failed to save device:', error)
      setErrors({ submit: error.message || '저장에 실패했습니다' })
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAddType = () => {
    if (!newTypeName.trim()) return

    const newType = {
      value: newTypeName.toLowerCase().replace(/\s+/g, '_'),
      label: newTypeName.trim(),
      icon: newTypeIcon,
      custom: true,
    }

    saveCustomType(newType)
    setDeviceTypes(prev => [...prev, newType])
    setFormData(prev => ({ ...prev, type: newType.value }))
    setNewTypeName('')
    setNewTypeIcon('🔩')
    setShowAddType(false)
  }

  if (!isOpen) return null

  const iconOptions = ['🔩', '🛠️', '⚡', '🎯', '📡', '🔬', '💡', '🔌', '📦', '🏭']

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-emerald-500', desc: '연결됨' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-500', desc: '연결 안됨' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-amber-500', desc: '점검 중' },
    { value: 'error', label: 'Error', color: 'bg-rose-500', desc: '오류 상태' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-xl">{isEdit ? '✏️' : '➕'}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? '장치 수정' : '새 장치 추가'}
              </h2>
              <p className="text-slate-400 text-xs">장치 정보를 입력하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 에러 메시지 */}
          {errors.submit && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg">
              <p className="text-rose-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* 기본 정보 (필수) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              기본 정보
              <span className="text-rose-400 text-xs font-normal">(필수)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 장치 이름 */}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">
                  장치 이름 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="예: Robot Arm #1"
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-600 focus:border-cyan-500'
                  }`}
                  autoFocus
                />
                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* 설치 장소 */}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">
                  설치 장소 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="예: Lab 101"
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.location ? 'border-rose-500 focus:border-rose-500' : 'border-slate-600 focus:border-cyan-500'
                  }`}
                />
                {errors.location && <p className="text-rose-400 text-xs mt-1">{errors.location}</p>}
              </div>

              {/* 관리자 */}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">
                  관리자 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => handleChange('manager', e.target.value)}
                  placeholder="예: 홍길동"
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.manager ? 'border-rose-500 focus:border-rose-500' : 'border-slate-600 focus:border-cyan-500'
                  }`}
                />
                {errors.manager && <p className="text-rose-400 text-xs mt-1">{errors.manager}</p>}
              </div>
            </div>
          </div>

          {/* 장치 타입 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              장치 타입
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {deviceTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('type', type.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.type === type.value
                      ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      formData.type === type.value ? 'bg-cyan-500/30' : 'bg-slate-600/50'
                    }`}>
                      <span className="text-lg">{type.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium block truncate ${
                        formData.type === type.value ? 'text-cyan-300' : 'text-slate-200'
                      }`}>{type.label}</span>
                      {type.custom && <span className="text-[10px] text-slate-500">사용자 정의</span>}
                    </div>
                  </div>
                </button>
              ))}

              {/* 추가 버튼 */}
              <button
                type="button"
                onClick={() => setShowAddType(true)}
                className="p-3 rounded-xl border-2 border-dashed border-slate-600/50 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">타입 추가</span>
              </button>
            </div>

            {/* 타입 추가 폼 */}
            {showAddType && (
              <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-300 font-medium">새 장치 타입 추가</span>
                </div>
                <div className="flex gap-3">
                  {/* 아이콘 선택 */}
                  <div className="flex-shrink-0">
                    <label className="block text-slate-400 text-xs mb-1">아이콘</label>
                    <div className="flex flex-wrap gap-1 w-32">
                      {iconOptions.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewTypeIcon(icon)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                            newTypeIcon === icon
                              ? 'bg-cyan-500/30 border border-cyan-500/50'
                              : 'bg-slate-600/50 hover:bg-slate-600'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 이름 입력 */}
                  <div className="flex-1">
                    <label className="block text-slate-400 text-xs mb-1">타입 이름</label>
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="예: Custom Robot"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddType()
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddType(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleAddType}
                    disabled={!newTypeName.trim()}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 상태 (선택) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              상태
              <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleChange('status', status.value)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                    formData.status === status.value
                      ? 'bg-slate-700 border-slate-500'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                  <span className={`text-sm ${
                    formData.status === status.value ? 'text-white' : 'text-slate-400'
                  }`}>{status.label}</span>
                  <span className="text-[10px] text-slate-500">({status.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 연결 정보 (선택) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              연결 정보
              <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">IP 주소</label>
                <input
                  type="text"
                  value={formData.ip_address}
                  onChange={(e) => handleChange('ip_address', e.target.value)}
                  placeholder="예: 192.168.1.100"
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.ip_address ? 'border-rose-500' : 'border-slate-600 focus:border-cyan-500'
                  }`}
                />
                {errors.ip_address && <p className="text-rose-400 text-xs mt-1">{errors.ip_address}</p>}
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">포트</label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="예: 502"
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.port ? 'border-rose-500' : 'border-slate-600 focus:border-cyan-500'
                  }`}
                />
                {errors.port && <p className="text-rose-400 text-xs mt-1">{errors.port}</p>}
              </div>
            </div>
          </div>

          {/* 장치 상세 정보 (선택) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              장치 상세 정보
              <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">시리얼 번호</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => handleChange('serial_number', e.target.value)}
                  placeholder="예: SN-2024-001234"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">제조사</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="예: Universal Robots"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">모델명</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="예: UR5e"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">펌웨어 버전</label>
                <input
                  type="text"
                  value={formData.firmware_version}
                  onChange={(e) => handleChange('firmware_version', e.target.value)}
                  placeholder="예: v5.12.0"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">메모</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="장치에 대한 간단한 메모"
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
              />
            </div>
          </div>
        </form>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3 bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition text-sm font-medium shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                저장 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdit ? '수정' : '추가'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeviceModal
