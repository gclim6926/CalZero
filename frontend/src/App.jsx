import { useState } from 'react'
import DeviceList from './components/common/DeviceList'
import CalibrationHistory from './components/motion/CalibrationHistory'
import CalibrationCompare from './components/motion/CalibrationCompare'
import CalibrationStats from './components/motion/CalibrationStats'
import DataAnalysis from './components/motion/DataAnalysis'
import CameraCalibration from './components/vision/CameraCalibration'

// 샘플 캘리브레이션 데이터
const sampleCalibrations = [
  {
    id: 1,
    notes: 'Initial Calibration',
    created_at: '2025-01-15T10:30:00Z',
    calibration_data: {
      shoulder_pan: { homing_offset: 207, range_min: 853, range_max: 3171 },
      shoulder_lift: { homing_offset: 1117, range_min: 868, range_max: 2966 },
      elbow_flex: { homing_offset: -1270, range_min: 1067, range_max: 3121 },
      wrist_flex: { homing_offset: -44, range_min: 955, range_max: 3071 },
      wrist_roll: { homing_offset: -34, range_min: 955, range_max: 3096 },
      gripper: { homing_offset: -405, range_min: 1627, range_max: 2714 },
    }
  },
  {
    id: 2,
    notes: 're-Cal after motor replacement',
    created_at: '2025-01-16T14:20:00Z',
    calibration_data: {
      shoulder_pan: { homing_offset: 215, range_min: 860, range_max: 3180 },
      shoulder_lift: { homing_offset: 1125, range_min: 875, range_max: 2970 },
      elbow_flex: { homing_offset: -1265, range_min: 1070, range_max: 3125 },
      wrist_flex: { homing_offset: -40, range_min: 960, range_max: 3075 },
      wrist_roll: { homing_offset: -30, range_min: 960, range_max: 3100 },
      gripper: { homing_offset: -400, range_min: 1630, range_max: 2720 },
    }
  },
  {
    id: 3,
    notes: 're-Cal3',
    created_at: '2025-01-17T09:15:00Z',
    calibration_data: {
      shoulder_pan: { homing_offset: 210, range_min: 855, range_max: 3175 },
      shoulder_lift: { homing_offset: 1120, range_min: 870, range_max: 2968 },
      elbow_flex: { homing_offset: -1268, range_min: 1068, range_max: 3122 },
      wrist_flex: { homing_offset: -42, range_min: 957, range_max: 3073 },
      wrist_roll: { homing_offset: -32, range_min: 957, range_max: 3098 },
      gripper: { homing_offset: -403, range_min: 1628, range_max: 2716 },
    }
  },
  {
    id: 4,
    notes: 're-Cal4 (Latest)',
    created_at: '2025-01-18T16:45:00Z',
    calibration_data: {
      shoulder_pan: { homing_offset: 212, range_min: 858, range_max: 3178 },
      shoulder_lift: { homing_offset: 1122, range_min: 872, range_max: 2969 },
      elbow_flex: { homing_offset: -1267, range_min: 1069, range_max: 3123 },
      wrist_flex: { homing_offset: -41, range_min: 958, range_max: 3074 },
      wrist_roll: { homing_offset: -31, range_min: 958, range_max: 3099 },
      gripper: { homing_offset: -402, range_min: 1629, range_max: 2718 },
    }
  },
]

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [calibrations, setCalibrations] = useState(sampleCalibrations)
  const [activeTopMenu, setActiveTopMenu] = useState('motion')
  const [activeSubMenu, setActiveSubMenu] = useState('calibration')

  const topMenus = [
    { id: 'motion', label: 'Motion', icon: '⚙️' },
    { id: 'vision', label: 'Vision', icon: '👁️' },
    { id: 'sensors', label: 'Sensors', icon: '📡' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
  ]

  const subMenus = {
    motion: [
      { id: 'calibration', label: '캘리브레이션', icon: '🎯' },
      { id: 'data-analysis', label: '수집 데이터 분석', icon: '📊' },
      { id: 'compare', label: '비교', icon: '🔀' },
      { id: 'stats', label: '통계', icon: '📈' },
    ],
    vision: [
      { id: 'camera-calib', label: '카메라 캘리브레이션', icon: '📷' },
      { id: 'distortion', label: '왜곡 보정', icon: '🔲' },
    ],
    sensors: [
      { id: 'force-torque', label: 'Force/Torque', icon: '💪' },
      { id: 'imu', label: 'IMU', icon: '🧭' },
    ],
    settings: [
      { id: 'general', label: '일반', icon: '⚙️' },
      { id: 'devices', label: '장치 관리', icon: '🔌' },
      { id: 'about', label: '정보', icon: 'ℹ️' },
    ],
  }

  const handleTopMenuChange = (menuId) => {
    setActiveTopMenu(menuId)
    setActiveSubMenu(subMenus[menuId]?.[0]?.id || '')
  }

  const renderContent = () => {
    if (activeTopMenu === 'motion') {
      switch (activeSubMenu) {
        case 'calibration':
          return <CalibrationHistory device={selectedDevice} calibrations={calibrations} setCalibrations={setCalibrations} />
        case 'data-analysis':
          return <DataAnalysis />
        case 'compare':
          return <CalibrationCompare calibrations={calibrations} />
        case 'stats':
          return <CalibrationStats calibrations={calibrations} />
        default:
          return <div className="text-gray-400 text-center py-8">메뉴를 선택하세요</div>
      }
    }
    
    if (activeTopMenu === 'vision') {
      switch (activeSubMenu) {
        case 'camera-calib':
          return <CameraCalibration />
        case 'distortion':
          return (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🔲</div>
              <p className="text-gray-400">왜곡 보정 기능 준비 중</p>
            </div>
          )
        default:
          return null
      }
    }

    if (activeTopMenu === 'sensors') {
      return (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-gray-400">센서 캘리브레이션 기능 준비 중</p>
        </div>
      )
    }

    if (activeTopMenu === 'settings') {
      return (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-400">설정 기능 준비 중</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 왼쪽 사이드바 - 전체 높이 */}
      <aside className="w-48 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 로고 */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-black text-sm">C0</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">CalZero</h1>
              <p className="text-[9px] text-gray-500 -mt-0.5">Calibration Suite</p>
            </div>
          </div>
        </div>

        {/* 장치 목록 */}
        <div className="flex-1 overflow-y-auto p-3">
          <DeviceList
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
          />
        </div>
      </aside>

      {/* 오른쪽 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="px-4">
            <div className="flex items-center justify-between h-14">
              {/* 탑 메뉴 */}
              <nav className="flex items-center gap-1">
                {topMenus.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => handleTopMenuChange(menu.id)}
                    className={'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ' +
                      (activeTopMenu === menu.id
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700')}
                  >
                    <span>{menu.icon}</span>
                    <span>{menu.label}</span>
                  </button>
                ))}
              </nav>

              {/* 우측 아이콘 */}
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition">
                  🔔
                </button>
                <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition">
                  👤
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 서브 메뉴 탭 */}
        <div className="bg-gray-800/50 border-b border-gray-700">
          <div className="px-4">
            <nav className="flex items-center gap-1 h-11">
              {subMenus[activeTopMenu]?.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => setActiveSubMenu(menu.id)}
                  className={'px-4 py-2 text-sm transition flex items-center gap-2 border-b-2 -mb-px ' +
                    (activeSubMenu === menu.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-gray-400 hover:text-white')}
                >
                  <span>{menu.icon}</span>
                  <span>{menu.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default App
