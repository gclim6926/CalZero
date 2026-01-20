import { useState } from 'react'
import CalibrationHistory from './CalibrationHistory'
import CalibrationCompare from './CalibrationCompare'
import DataAnalysis from './DataAnalysis'

const sharedCalibrations = [
  {
    id: 4,
    notes: 're-Cal4',
    created_at: '2024-01-19 18:30',
    calibration_data: {
      shoulder_pan: { homing_offset: 207, range_min: 853, range_max: 3471 },
      shoulder_lift: { homing_offset: 185, range_min: 855, range_max: 3213 },
      elbow_flex: { homing_offset: -294, range_min: 864, range_max: 3069 },
      wrist_flex: { homing_offset: -1639, range_min: 884, range_max: 3157 },
      wrist_roll: { homing_offset: -1323, range_min: 0, range_max: 4095 },
      gripper: { homing_offset: -1337, range_min: 2038, range_max: 3533 },
    }
  },
  {
    id: 3,
    notes: 're-Cal3',
    created_at: '2024-01-19 16:00',
    calibration_data: {
      shoulder_pan: { homing_offset: 263, range_min: 805, range_max: 3412 },
      shoulder_lift: { homing_offset: 146, range_min: 899, range_max: 3257 },
      elbow_flex: { homing_offset: -318, range_min: 876, range_max: 3090 },
      wrist_flex: { homing_offset: -1591, range_min: 837, range_max: 3115 },
      wrist_roll: { homing_offset: -1314, range_min: 0, range_max: 4095 },
      gripper: { homing_offset: -1337, range_min: 2038, range_max: 3533 },
    }
  },
  {
    id: 2,
    notes: 're-Cal2',
    created_at: '2024-01-19 14:20',
    calibration_data: {
      shoulder_pan: { homing_offset: 237, range_min: 1056, range_max: 3432 },
      shoulder_lift: { homing_offset: 142, range_min: 895, range_max: 3137 },
      elbow_flex: { homing_offset: -278, range_min: 921, range_max: 3047 },
      wrist_flex: { homing_offset: -1669, range_min: 1020, range_max: 3021 },
      wrist_roll: { homing_offset: -1370, range_min: 0, range_max: 4095 },
      gripper: { homing_offset: -1337, range_min: 2038, range_max: 3533 },
    }
  },
  {
    id: 1,
    notes: 're-Cal1',
    created_at: '2024-01-19 10:30',
    calibration_data: {
      shoulder_pan: { homing_offset: 270, range_min: 785, range_max: 3415 },
      shoulder_lift: { homing_offset: 130, range_min: 905, range_max: 3279 },
      elbow_flex: { homing_offset: -252, range_min: 819, range_max: 3027 },
      wrist_flex: { homing_offset: -1681, range_min: 933, range_max: 3200 },
      wrist_roll: { homing_offset: -1340, range_min: 0, range_max: 4095 },
      gripper: { homing_offset: -1337, range_min: 2038, range_max: 3533 },
    }
  },
]

const defaultDevices = [
  { id: 1, device_name: 'SO101_Follower_01', device_type: 'so101_follower', serial_number: 'SN001', created_at: '2024-01-15' },
  { id: 2, device_name: 'SO101_Follower_02', device_type: 'so101_follower', serial_number: 'SN002', created_at: '2024-01-16' },
  { id: 3, device_name: 'SO101_Leader_01', device_type: 'so101_leader', serial_number: 'SN003', created_at: '2024-01-17' },
]

const defaultDeviceTypes = [
  { id: 'so101_follower', name: 'SO101 Follower', icon: '🦾' },
  { id: 'so101_leader', name: 'SO101 Leader', icon: '🎮' },
  { id: 'ur5', name: 'UR5 Robot', icon: '🤖' },
]

const iconOptions = ['🦾', '🎮', '🤖', '⚙️', '🔧', '🦿', '🛠️', '📡', '🎯', '💪']

function Dashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('calibrations')
  const [selectedDevice, setSelectedDevice] = useState(defaultDevices[0])
  const [devices, setDevices] = useState(defaultDevices)
  const [deviceTypes, setDeviceTypes] = useState(defaultDeviceTypes)
  const [calibrations, setCalibrations] = useState(sharedCalibrations)
  const [expandedTypes, setExpandedTypes] = useState(['so101_follower'])
  
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [showDeleteDevice, setShowDeleteDevice] = useState(false)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [showAddType, setShowAddType] = useState(false)
  
  const [deviceToDelete, setDeviceToDelete] = useState(null)
  const [newDevice, setNewDevice] = useState({ device_name: '', device_type: 'so101_follower', serial_number: '' })
  const [newType, setNewType] = useState({ id: '', name: '', icon: '🤖' })

  const tabs = [
    { id: 'calibrations', label: '📊 캘리브레이션' },
    { id: 'analysis', label: '📈 수집 데이터 분석' },
    { id: 'compare', label: '🔍 비교 분석' },
  ]

  const getDevicesByType = (typeId) => devices.filter(d => d.device_type === typeId)

  const toggleType = (typeId) => {
    setExpandedTypes(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    )
  }

  const handleAddDevice = () => {
    if (!newDevice.device_name) return
    const device = {
      id: Math.max(...devices.map(d => d.id), 0) + 1,
      ...newDevice,
      created_at: new Date().toISOString().split('T')[0]
    }
    setDevices([...devices, device])
    setSelectedDevice(device)
    if (!expandedTypes.includes(device.device_type)) {
      setExpandedTypes([...expandedTypes, device.device_type])
    }
    setShowAddDevice(false)
    setNewDevice({ device_name: '', device_type: deviceTypes[0]?.id || '', serial_number: '' })
  }

  const openDeleteDevice = (device, e) => {
    e.stopPropagation()
    setDeviceToDelete(device)
    setShowDeleteDevice(true)
  }

  const handleDeleteDevice = () => {
    if (!deviceToDelete) return
    const newDevices = devices.filter(d => d.id !== deviceToDelete.id)
    setDevices(newDevices)
    if (selectedDevice?.id === deviceToDelete.id) {
      setSelectedDevice(newDevices[0] || null)
    }
    setShowDeleteDevice(false)
    setDeviceToDelete(null)
  }

  const handleAddType = () => {
    if (!newType.id || !newType.name) return
    if (deviceTypes.find(t => t.id === newType.id)) {
      alert('이미 존재하는 타입 ID입니다.')
      return
    }
    setDeviceTypes([...deviceTypes, { ...newType }])
    setShowAddType(false)
    setNewType({ id: '', name: '', icon: '🤖' })
  }

  const handleDeleteType = (typeId) => {
    const typeDevices = getDevicesByType(typeId)
    if (typeDevices.length > 0) {
      alert('이 타입에 연결된 장치가 있어 삭제할 수 없습니다.')
      return
    }
    setDeviceTypes(deviceTypes.filter(t => t.id !== typeId))
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 왼쪽 사이드바 */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RC</span>
            </div>
            <h1 className="text-xl font-bold text-white">RoboCalib</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">장치 목록</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAddDevice(true)}
                  className="w-6 h-6 bg-cyan-500 hover:bg-cyan-600 text-white rounded flex items-center justify-center text-sm transition"
                  title="장치 추가"
                >
                  +
                </button>
                <button
                  onClick={() => setShowTypeManager(true)}
                  className="w-6 h-6 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center justify-center text-sm transition"
                  title="타입 관리"
                >
                  ⚙️
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              {deviceTypes.map((type) => {
                const typeDevices = getDevicesByType(type.id)
                const isExpanded = expandedTypes.includes(type.id)
                const hasDevices = typeDevices.length > 0
                
                return (
                  <div key={type.id}>
                    <button
                      onClick={() => hasDevices && toggleType(type.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                        hasDevices ? 'hover:bg-gray-700/50 cursor-pointer' : 'opacity-50 cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-sm font-medium text-gray-300">{type.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                          {typeDevices.length}
                        </span>
                      </div>
                      {hasDevices && (
                        <svg 
                          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    
                    {isExpanded && hasDevices && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700 pl-2">
                        {typeDevices.map((device) => (
                          <div
                            key={device.id}
                            onClick={() => setSelectedDevice(device)}
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg transition cursor-pointer ${
                              selectedDevice?.id === device.id
                                ? 'bg-cyan-500/20 border-l-2 border-cyan-400 -ml-[2px] pl-[14px]'
                                : 'hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                selectedDevice?.id === device.id ? 'text-cyan-400' : 'text-gray-300'
                              }`}>
                                {device.device_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">S/N: {device.serial_number}</p>
                            </div>
                            <button
                              onClick={(e) => openDeleteDevice(device, e)}
                              className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="삭제"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-sm text-white font-medium">{(user.name || user.email)[0].toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-300 truncate">{user.name || user.email}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition"
              title="로그아웃"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 오른쪽 메인 영역 */}
      <div className="flex-1 flex flex-col">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="px-6">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition ${
                    activeTab === tab.id
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'calibrations' && (
            <CalibrationHistory 
              device={selectedDevice} 
              calibrations={calibrations}
              setCalibrations={setCalibrations}
            />
          )}
          {activeTab === 'analysis' && (
            <DataAnalysis calibrations={calibrations} />
          )}
          {activeTab === 'compare' && (
            <CalibrationCompare device={selectedDevice} calibrations={calibrations} />
          )}
        </main>
      </div>

      {/* 장치 추가 모달 */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">장치 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">장치 이름</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({...newDevice, device_name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="SO101_Follower_03"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">장치 타입</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {deviceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">시리얼 번호</label>
                <input
                  type="text"
                  value={newDevice.serial_number}
                  onChange={(e) => setNewDevice({...newDevice, serial_number: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="SN003"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddDevice(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
                취소
              </button>
              <button onClick={handleAddDevice} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장치 삭제 모달 */}
      {showDeleteDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">장치 삭제</h3>
            <p className="text-gray-300 mb-6">
              <span className="text-cyan-400 font-semibold">{deviceToDelete?.device_name}</span>을(를) 삭제하시겠습니까?
              <br /><span className="text-red-400 text-sm">이 장치의 모든 캘리브레이션 데이터도 삭제됩니다.</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteDevice(false); setDeviceToDelete(null); }} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
                취소
              </button>
              <button onClick={handleDeleteDevice} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 타입 관리 모달 */}
      {showTypeManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">⚙️ 장치 타입 관리</h3>
              <button
                onClick={() => setShowAddType(true)}
                className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition"
              >
                + 장치 타입 추가
              </button>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deviceTypes.map(type => {
                const count = getDevicesByType(type.id).length
                return (
                  <div key={type.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <p className="text-white font-medium">{type.name}</p>
                        <p className="text-xs text-gray-400">ID: {type.id} · 장치 {count}개</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      disabled={count > 0}
                      className={`p-2 rounded transition ${
                        count > 0 
                          ? 'text-gray-600 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-500/20'
                      }`}
                      title={count > 0 ? '연결된 장치가 있어 삭제 불가' : '삭제'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-6">
              <button onClick={() => setShowTypeManager(false)} className="w-full py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 타입 추가 모달 */}
      {showAddType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">장치 타입 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">타입 ID (영문)</label>
                <input
                  type="text"
                  value={newType.id}
                  onChange={(e) => setNewType({...newType, id: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="my_robot"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">타입 이름</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({...newType, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="My Robot Arm"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">아이콘 선택</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewType({...newType, icon})}
                      className={`w-10 h-10 text-xl rounded-lg transition ${
                        newType.icon === icon 
                          ? 'bg-cyan-500 ring-2 ring-cyan-400' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddType(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg">
                취소
              </button>
              <button onClick={handleAddType} className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
