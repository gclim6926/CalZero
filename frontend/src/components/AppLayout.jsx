import { useState } from 'react'

// Motion 컴포넌트
import CalibrationHistory from './motion/CalibrationHistory'
import CameraCalibration from './vision/CameraCalibration'
import CalibrationCompare from './motion/CalibrationCompare'
import DataAnalysis from './motion/DataAnalysis'

// 샘플 캘리브레이션 데이터
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
  { id: 'camera', name: 'Camera', icon: '📷' },
  { id: 'force_sensor', name: 'Force Sensor', icon: '🔧' },
]

function AppLayout() {
  const [activeTab, setActiveTab] = useState('motion')
  const [activeSubTab, setActiveSubTab] = useState('calibration')
  
  // 장치 및 캘리브레이션 상태
  const [devices, setDevices] = useState(defaultDevices)
  const [deviceTypes, setDeviceTypes] = useState(defaultDeviceTypes)
  const [selectedDevice, setSelectedDevice] = useState(defaultDevices[0])
  const [calibrations, setCalibrations] = useState(sharedCalibrations)
  const [expandedTypes, setExpandedTypes] = useState(['so101_follower'])
  
  // 모달 상태
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDevice, setNewDevice] = useState({ device_name: '', device_type: 'so101_follower', serial_number: '' })

  const topTabs = [
    { id: 'motion', label: '📊 Motion', description: '모션 데이터' },
    { id: 'vision', label: '📷 Vision', description: '영상 데이터' },
    { id: 'sensors', label: '🔧 Sensors', description: '센서 데이터' },
    { id: 'settings', label: '⚙️ Settings', description: '설정' },
  ]

  const subTabs = {
    motion: [
      { id: 'calibration', label: '🎯 캘리브레이션' },
      { id: 'analysis', label: '📈 데이터 분석' },
      { id: 'compare', label: '🔄 비교' },
    ],
    vision: [
      { id: 'calibration', label: '🎯 캘리브레이션' },
      { id: 'analysis', label: '📈 데이터 분석' },
    ],
    sensors: [
      { id: 'calibration', label: '🎯 캘리브레이션' },
      { id: 'analysis', label: '📈 데이터 분석' },
    ],
    settings: [
      { id: 'devices', label: '🤖 장치 관리' },
      { id: 'general', label: '⚙️ 일반 설정' },
    ],
  }

  const getDevicesByType = (typeId) => devices.filter(d => d.device_type === typeId)

  const toggleType = (typeId) => {
    setExpandedTypes(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    )
  }

  const handleAddDevice = () => {
    if (!newDevice.device_name.trim()) return
    const device = {
      id: Date.now(),
      ...newDevice,
      created_at: new Date().toISOString().split('T')[0]
    }
    setDevices(prev => [...prev, device])
    setNewDevice({ device_name: '', device_type: 'so101_follower', serial_number: '' })
    setShowAddDevice(false)
  }

  const handleAddCalibration = (calibData, notes) => {
    const newCalibration = {
      id: Date.now(),
      device_id: selectedDevice?.id,
      calibration_data: calibData,
      notes: notes || `Calibration ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
    }
    setCalibrations(prev => [newCalibration, ...prev])
  }

  const renderContent = () => {
    if (activeTab === 'motion') {
      switch (activeSubTab) {
        case 'calibration':
          return (
            <CalibrationHistory
              device={selectedDevice}
              calibrations={calibrations}
              setCalibrations={setCalibrations}
            />
          )
        case 'analysis':
          return <DataAnalysis calibrations={calibrations} />
        case 'compare':
          return <CalibrationCompare calibrations={calibrations} />
        default:
          return null
      }
    }

    if (activeTab === 'vision') {
      switch (activeSubTab) {
        case 'calibration':
          return <CameraCalibration />
        case 'analysis':
          return (
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-white mb-2">Vision 데이터 분석</h2>
              <p className="text-gray-500 text-sm mt-4">🚧 준비 중...</p>
            </div>
          )
        default:
          return null
      }
    }

    if (activeTab === 'sensors') {
      return (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-bold text-white mb-2">Sensors 캘리브레이션</h2>
          <p className="text-gray-400 mb-4">Force/Torque, IMU, Tactile 센서 캘리브레이션</p>
          <div className="text-left max-w-md mx-auto bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">예정 기능:</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Force/Torque 센서 Zero offset 캘리브레이션</li>
              <li>• IMU Bias/Scale 캘리브레이션</li>
              <li>• Tactile 센서 캘리브레이션</li>
            </ul>
          </div>
          <p className="text-gray-500 text-sm mt-4">🚧 준비 중...</p>
        </div>
      )
    }

    if (activeTab === 'settings') {
      return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">⚙️ 설정</h2>
          <div className="space-y-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">앱 정보</h3>
              <p className="text-sm text-gray-400">RoboCalib v0.1.0</p>
              <p className="text-sm text-gray-400">LeRobot Compatible</p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const getRelevantDeviceTypes = () => {
    if (activeTab === 'motion') {
      return deviceTypes.filter(t => ['so101_follower', 'so101_leader'].includes(t.id))
    }
    if (activeTab === 'vision') {
      return deviceTypes.filter(t => t.id === 'camera')
    }
    if (activeTab === 'sensors') {
      return deviceTypes.filter(t => t.id === 'force_sensor')
    }
    return deviceTypes
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar - 전체 높이 */}
      <aside className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 로고 */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div>
              <h1 className="text-lg font-bold text-white">RoboCalib</h1>
              <p className="text-[10px] text-gray-500">Robot Calibration Manager</p>
            </div>
          </div>
        </div>

        {/* 장치 목록 헤더 */}
        <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400">장치 목록</span>
          <button
            onClick={() => setShowAddDevice(true)}
            className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition"
          >
            + 추가
          </button>
        </div>

        {/* 장치 트리 */}
        <div className="flex-1 overflow-y-auto p-2">
          {getRelevantDeviceTypes().map(type => (
            <div key={type.id} className="mb-1">
              <button
                onClick={() => toggleType(type.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition"
              >
                <span className="text-[10px] text-gray-500">
                  {expandedTypes.includes(type.id) ? '▼' : '▶'}
                </span>
                <span>{type.icon}</span>
                <span className="flex-1 text-left text-xs">{type.name}</span>
                <span className="text-[10px] text-gray-500">
                  {getDevicesByType(type.id).length}
                </span>
              </button>

              {expandedTypes.includes(type.id) && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {getDevicesByType(type.id).map(device => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition ${
                        selectedDevice?.id === device.id
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {device.device_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 사이드바 푸터 */}
        <div className="p-2 border-t border-gray-700 text-[10px] text-gray-500">
          <p>v0.1.0 • LeRobot</p>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="px-4">
            {/* Top Tabs + 선택된 장치 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {topTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setActiveSubTab(subTabs[tab.id]?.[0]?.id || 'calibration')
                    }}
                    className={`px-4 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-white border-b-2 border-cyan-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* 현재 선택된 장치 */}
              {selectedDevice && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded text-xs">
                  <span className="text-gray-400">선택:</span>
                  <span className="text-cyan-400 font-medium">{selectedDevice.device_name}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sub Navigation */}
        <div className="bg-gray-800/50 border-b border-gray-700 px-4">
          <div className="flex gap-1 py-1.5">
            {subTabs[activeTab]?.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>

      {/* 장치 추가 모달 */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 w-96">
            <h3 className="text-lg font-bold text-white mb-4">새 장치 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">장치 이름</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={e => setNewDevice(prev => ({ ...prev, device_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  placeholder="예: SO101_Follower_03"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">장치 타입</label>
                <select
                  value={newDevice.device_type}
                  onChange={e => setNewDevice(prev => ({ ...prev, device_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  {deviceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">시리얼 번호</label>
                <input
                  type="text"
                  value={newDevice.serial_number}
                  onChange={e => setNewDevice(prev => ({ ...prev, serial_number: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  placeholder="예: SN004"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDevice(false)}
                className="flex-1 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
              >
                취소
              </button>
              <button
                onClick={handleAddDevice}
                className="flex-1 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppLayout
