import { useState, useEffect } from 'react'
import { getRobotTypeIcon, defaultDeviceTypes } from '../../utils/robotIcons'

// 로컬스토리지에서 커스텀 타입 불러오기
const getDeviceTypes = () => {
  try {
    const customTypes = JSON.parse(localStorage.getItem('calzero_device_types') || '[]')
    return [...defaultDeviceTypes.filter(t => t.value !== 'isaac_sim'), ...customTypes]
  } catch {
    return defaultDeviceTypes.filter(t => t.value !== 'isaac_sim')
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

function DeviceModal({ isOpen, onClose, onSave, device = null, robots = [], defaultCategory = 'physical' }) {
  const [deviceTypes, setDeviceTypes] = useState(getDeviceTypes())
  const [robotCategory, setRobotCategory] = useState('physical')
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
    usd_file_path: '',
    target_device_ids: [],
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showAddType, setShowAddType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [linkedSimId, setLinkedSimId] = useState(null)

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
        usd_file_path: device.usd_file_path || '',
        target_device_ids: device.target_device_ids || [],
      })
      setRobotCategory(device.type === 'isaac_sim' ? 'simulation' : 'physical')
      // 편집 시 연결된 Sim 탐지
      if (device.type !== 'isaac_sim') {
        const linkedSim = robots.find(r => r.type === 'isaac_sim' && (r.target_device_ids || []).includes(device.id))
        setLinkedSimId(linkedSim ? linkedSim.id : null)
      } else {
        setLinkedSimId(null)
      }
    } else {
      const isSim = defaultCategory === 'simulation'
      setFormData({
        name: '',
        location: '',
        manager: '',
        type: isSim ? 'isaac_sim' : 'so101_follower',
        status: 'offline',
        description: '',
        ip_address: '',
        port: '',
        serial_number: '',
        manufacturer: '',
        model: '',
        firmware_version: '',
        usd_file_path: '',
        target_device_ids: [],
      })
      setRobotCategory(isSim ? 'simulation' : 'physical')
      setLinkedSimId(null)
    }
    setErrors({})
    setShowAddType(false)
    setDeviceTypes(getDeviceTypes())
  }, [device, isOpen])

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = '장치 이름을 입력하세요'
    if (!formData.manager.trim()) newErrors.manager = '관리자를 입력하세요'
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
      if (data.port && data.port !== '') {
        data.port = parseInt(data.port)
      } else {
        data.port = null
      }
      await onSave(data, device?.id, linkedSimId)
      onClose()
    } catch (error) {
      console.error('Failed to save device:', error)
      setErrors({ submit: error.message || '저장에 실패했습니다' })
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleAddType = () => {
    if (!newTypeName.trim()) return
    const newType = {
      value: newTypeName.toLowerCase().replace(/\s+/g, '_'),
      label: newTypeName.trim(),
      custom: true,
    }
    saveCustomType(newType)
    setDeviceTypes(prev => [...prev, newType])
    setFormData(prev => ({ ...prev, type: newType.value }))
    setNewTypeName('')
    setShowAddType(false)
  }

  if (!isOpen) return null

  const isSimulation = robotCategory === 'simulation'
  const physicalRobots = robots.filter(r => r.type !== 'isaac_sim' && r.id !== device?.id)
  const simDevices = robots.filter(r => r.type === 'isaac_sim')

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-emerald-500', desc: '연결됨' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-500', desc: '연결 안됨' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-amber-500', desc: '점검 중' },
    { value: 'error', label: 'Error', color: 'bg-rose-500', desc: '오류 상태' },
  ]

  const accentColor = isSimulation
    ? { bg: 'from-violet-500 to-purple-600', bgLight: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/50', text: 'text-violet-300', dot: 'bg-violet-400', shadow: 'shadow-violet-500/25', btn: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700' }
    : { bg: 'from-cyan-500 to-blue-600', bgLight: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300', dot: 'bg-cyan-400', shadow: 'shadow-cyan-500/25', btn: 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentColor.bg} flex items-center justify-center text-white`}>
              {isSimulation
                ? getRobotTypeIcon('isaac_sim', 'w-5 h-5')
                : <span className="text-xl">{isEdit ? '✏️' : '➕'}</span>
              }
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? (isSimulation ? 'Sim 모델 수정' : '장치 수정') : (isSimulation ? '새 Sim 모델 추가' : '새 장치 추가')}
              </h2>
              <p className="text-slate-400 text-xs">
                {isSimulation ? 'Isaac Sim 모델 정보를 입력하세요' : '장치 정보를 입력하세요'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errors.submit && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg">
              <p className="text-rose-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* 기본 정보 (필수) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${accentColor.dot}`}></span>
              기본 정보
              <span className="text-rose-400 text-xs font-normal">(필수)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">
                  {isSimulation ? '모델 이름' : '장치 이름'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={isSimulation ? '예: Isaac Franka' : '예: Robot Arm #1'}
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${
                    errors.name ? 'border-rose-500 focus:border-rose-500' : `border-slate-600 focus:${accentColor.border}`
                  }`}
                  autoFocus
                />
                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
              </div>
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
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">설치 장소</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder={isSimulation ? '예: Sim Server #1' : '예: Lab 101'}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Physical Robot: 장치 타입 선택 */}
          {!isSimulation && (
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
                        formData.type === type.value ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-600/50 text-slate-400'
                      }`}>
                        {getRobotTypeIcon(type.value, 'w-4 h-4')}
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

              {showAddType && (
                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 space-y-3">
                  <span className="text-sm text-slate-300 font-medium">새 장치 타입 추가</span>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-slate-400 text-xs mb-1">타입 이름</label>
                      <input
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="예: Custom Robot"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddType() } }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAddType(false)} className="px-3 py-2 text-slate-400 hover:text-white text-sm transition">취소</button>
                      <button type="button" onClick={handleAddType} disabled={!newTypeName.trim()} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition disabled:opacity-50">추가</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Physical Robot: Isaac Sim 연결 드롭다운 */}
          {!isSimulation && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Isaac Sim 연결
                <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
              </h3>
              {simDevices.length === 0 ? (
                <div className="p-4 bg-slate-700/20 border border-slate-600/30 rounded-xl">
                  <p className="text-slate-500 text-sm">등록된 Isaac Sim이 없습니다. Isaac Sim 탭에서 먼저 추가하세요.</p>
                </div>
              ) : (
                <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-2">
                  <div className="relative">
                    <select
                      value={linkedSimId || ''}
                      onChange={(e) => setLinkedSimId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-violet-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-violet-400 transition appearance-none cursor-pointer"
                    >
                      <option value="">연결 안 함</option>
                      {simDevices.map(sim => (
                        <option key={sim.id} value={sim.id}>{sim.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs">이 Physical Robot을 배포할 Isaac Sim을 선택하세요</p>
                </div>
              )}
            </div>
          )}

          {/* Isaac Sim: 전용 설정 */}
          {isSimulation && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                Isaac Sim 설정
              </h3>
              <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-4">
                {/* USD 파일 경로 */}
                <div>
                  <label className="block text-violet-300 text-sm mb-1.5">USD 파일 경로</label>
                  <input
                    type="text"
                    value={formData.usd_file_path}
                    onChange={(e) => handleChange('usd_file_path', e.target.value)}
                    placeholder="/home/user/robots/franka.usd"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-violet-500/30 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-400 transition"
                  />
                </div>

                {/* Sim-to-Real 타겟 (다중 선택) */}
                <div>
                  <label className="block text-violet-300 text-sm mb-1.5">
                    Sim-to-Real 타겟 로봇
                    {formData.target_device_ids.length > 0 && (
                      <span className="ml-2 text-[10px] text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">{formData.target_device_ids.length}개 선택</span>
                    )}
                  </label>
                  {physicalRobots.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">등록된 Physical Robot이 없습니다</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-violet-500/20 bg-slate-900 p-2">
                      {physicalRobots.map(r => {
                        const isChecked = formData.target_device_ids.includes(r.id)
                        return (
                          <label
                            key={r.id}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              isChecked ? 'bg-violet-500/10 border border-violet-500/30' : 'hover:bg-slate-800 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const newIds = isChecked
                                  ? formData.target_device_ids.filter(id => id !== r.id)
                                  : [...formData.target_device_ids, r.id]
                                handleChange('target_device_ids', newIds)
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-600 text-violet-500 focus:ring-violet-500 bg-slate-800"
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-700/60 text-slate-400">
                                {getRobotTypeIcon(r.type, 'w-3 h-3')}
                              </div>
                              <span className={`text-sm truncate ${isChecked ? 'text-violet-200' : 'text-slate-300'}`}>{r.name}</span>
                              <span className="text-[10px] text-slate-500">{r.type}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-slate-500 text-xs mt-1">시뮬레이션 결과를 배포할 물리 로봇을 선택하세요 (복수 선택 가능)</p>
                </div>
              </div>
            </div>
          )}

          {/* 연결 상태 (Physical만) */}
          {!isSimulation && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                연결 상태
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
                    <span className={`text-sm ${formData.status === status.value ? 'text-white' : 'text-slate-400'}`}>{status.label}</span>
                    <span className="text-[10px] text-slate-500">({status.desc})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 연결 정보 (Physical만) */}
          {!isSimulation && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                연결 정보
                <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">IP 주소</label>
                  <input type="text" value={formData.ip_address} onChange={(e) => handleChange('ip_address', e.target.value)}
                    placeholder="예: 192.168.1.100"
                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${errors.ip_address ? 'border-rose-500' : 'border-slate-600 focus:border-cyan-500'}`}
                  />
                  {errors.ip_address && <p className="text-rose-400 text-xs mt-1">{errors.ip_address}</p>}
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">포트</label>
                  <input type="text" value={formData.port} onChange={(e) => handleChange('port', e.target.value)}
                    placeholder="예: 502"
                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none transition ${errors.port ? 'border-rose-500' : 'border-slate-600 focus:border-cyan-500'}`}
                  />
                  {errors.port && <p className="text-rose-400 text-xs mt-1">{errors.port}</p>}
                </div>
              </div>
            </div>
          )}

          {/* 장치 상세 정보 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              {isSimulation ? '모델 상세 정보' : '장치 상세 정보'}
              <span className="text-slate-500 text-xs font-normal">(선택사항)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isSimulation && (
                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">시리얼 번호</label>
                  <input type="text" value={formData.serial_number} onChange={(e) => handleChange('serial_number', e.target.value)}
                    placeholder="예: SN-2024-001234"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">{isSimulation ? '시뮬레이터 버전' : '제조사'}</label>
                <input type="text" value={formData.manufacturer} onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder={isSimulation ? '예: Isaac Sim 4.2' : '예: Universal Robots'}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">모델명</label>
                <input type="text" value={formData.model} onChange={(e) => handleChange('model', e.target.value)}
                  placeholder={isSimulation ? '예: Franka Panda' : '예: UR5e'}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
              {!isSimulation && (
                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">펌웨어 버전</label>
                  <input type="text" value={formData.firmware_version} onChange={(e) => handleChange('firmware_version', e.target.value)}
                    placeholder="예: v5.12.0"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">메모</label>
              <textarea
                value={formData.description} onChange={(e) => handleChange('description', e.target.value)}
                placeholder={isSimulation ? '시뮬레이션 모델에 대한 메모' : '장치에 대한 간단한 메모'}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
              />
            </div>
          </div>
        </form>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3 bg-slate-800/50">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2.5 bg-gradient-to-r ${accentColor.btn} text-white rounded-lg transition text-sm font-medium shadow-lg ${accentColor.shadow} disabled:opacity-50 flex items-center gap-2`}
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
