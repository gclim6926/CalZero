import { useState, useEffect } from 'react'
import Login from './components/common/Login'
import DeviceList from './components/common/DeviceList'
import CalibrationHistory from './components/actuator/CalibrationHistory'
import ActuatorHistory from './components/actuator/ActuatorHistory'
import CalibrationStats from './components/actuator/CalibrationStats'
import DataAnalysis from './components/actuator/DataAnalysis'
import ReplayAnalysis from './components/actuator/ReplayAnalysis'
import IntrinsicCalculation from './components/camera/IntrinsicCalculation'
import IntrinsicHistory from './components/camera/IntrinsicHistory'
import ExtrinsicCalculation from './components/camera/ExtrinsicCalculation'
import ExtrinsicHistory from './components/camera/ExtrinsicHistory'
import HandEyeCalculation from './components/camera/HandEyeCalculation'
import HandEyeHistory from './components/camera/HandEyeHistory'
import SettingsGeneral from './components/settings/SettingsGeneral'
import api from './utils/api'

// 상단 메뉴 (Device 의존적인 기능들)
const menuConfig = {
  actuator: {
    id: 'actuator', label: 'Actuator',
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    bgActive: 'bg-cyan-500/20', textActive: 'text-cyan-400', borderActive: 'border-cyan-500/50', subMenuBorder: 'border-cyan-400',
  },
  camera: {
    id: 'camera', label: 'Camera',
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    bgActive: 'bg-violet-500/20', textActive: 'text-violet-400', borderActive: 'border-violet-500/50', subMenuBorder: 'border-violet-400',
  },
  sensors: {
    id: 'sensors', label: 'Sensors',
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>),
    bgActive: 'bg-emerald-500/20', textActive: 'text-emerald-400', borderActive: 'border-emerald-500/50', subMenuBorder: 'border-emerald-400',
  },
}

// Settings 서브메뉴 (상단 탭용)
const settingsSubMenus = [
  { id: 'general', label: '일반 설정', icon: '⚙️' },
  { id: 'about', label: '정보', icon: 'ℹ️' },
]

const subMenus = {
  actuator: [
    { id: 'calibration', label: '캘리브레이션', icon: '⚙️' },
    { id: 'history', label: '히스토리 분석', icon: '📋' },
    { id: 'replay-analysis', label: '리플레이 분석', icon: '🎯' },
    { id: 'data-analysis', label: '학습할 데이터 분석', icon: '📊' },
    { id: 'stats', label: '통계', icon: '📈' },
  ],
  camera: [
    { id: 'intrinsic', label: 'Intrinsic 계산', icon: '📷' },
    { id: 'intrinsic-history', label: 'Intrinsic 히스토리', icon: '📋' },
    { id: 'extrinsic', label: 'Extrinsic 계산', icon: '🌍' },
    { id: 'extrinsic-history', label: 'Extrinsic 히스토리', icon: '📋' },
    { id: 'hand-eye', label: 'Hand-Eye 계산', icon: '🤖' },
    { id: 'hand-eye-history', label: 'Hand-Eye 히스토리', icon: '📋' },
  ],
  sensors: [
    { id: 'force-torque', label: 'Force/Torque', icon: '💪' },
    { id: 'imu', label: 'IMU', icon: '🧭' },
  ],
}

function App() {
  const [user, setUser] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [devices, setDevices] = useState([])
  const [calibrations, setCalibrations] = useState([])
  const [intrinsicCalibrations, setIntrinsicCalibrations] = useState([])
  const [extrinsicCalibrations, setExtrinsicCalibrations] = useState([])
  const [handEyeCalibrations, setHandEyeCalibrations] = useState([])
  const [replayTests, setReplayTests] = useState([])
  const [activeTopMenu, setActiveTopMenu] = useState('actuator')
  const [activeSubMenu, setActiveSubMenu] = useState('calibration')
  const [activeSettingsMenu, setActiveSettingsMenu] = useState(null) // null이면 Settings 비활성
  const [activeSettingsSubMenu, setActiveSettingsSubMenu] = useState('general') // Settings 서브메뉴
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('calzero_user')
    const savedToken = localStorage.getItem('calzero_token')
    if (savedUser && savedToken) setUser(JSON.parse(savedUser))
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedDevice) loadCalibrations(selectedDevice.id)
  }, [selectedDevice])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const devicesData = await api.devices.list()
      setDevices(devicesData)
      setApiError(null)
    } catch (error) {
      console.error('Failed to load devices:', error)
      setApiError('서버 연결 실패. 백엔드 서버를 확인하세요.')
      setDevices([])
    }
    setIsLoading(false)
  }

  const loadCalibrations = async (deviceId) => {
    try {
      const [actuator, intrinsic, extrinsic, handeye, replay] = await Promise.all([
        api.actuator.list(deviceId), api.intrinsic.list(deviceId),
        api.extrinsic.list(deviceId), api.handeye.list(deviceId),
        api.replay.list(deviceId),
      ])
      setCalibrations(actuator)
      setIntrinsicCalibrations(intrinsic)
      setExtrinsicCalibrations(extrinsic)
      setHandEyeCalibrations(handeye)
      setReplayTests(replay)
    } catch (error) { console.error('Failed to load calibrations:', error) }
  }

  const handleLogin = (userData, token, remember) => {
    setUser(userData)
    if (remember) {
      localStorage.setItem('calzero_user', JSON.stringify(userData))
      localStorage.setItem('calzero_token', token)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('calzero_user')
    localStorage.removeItem('calzero_token')
  }

  const handleDeviceAdd = async (deviceData) => {
    const saved = await api.devices.create(deviceData)
    setDevices(prev => [...prev, saved])
    return saved
  }

  const handleDeviceUpdate = async (id, deviceData) => {
    const updated = await api.devices.update(id, deviceData)
    setDevices(prev => prev.map(d => d.id === id ? updated : d))
    if (selectedDevice?.id === id) setSelectedDevice(updated)
    return updated
  }

  const handleDeviceDelete = async (id) => {
    await api.devices.delete(id)
    setDevices(prev => prev.filter(d => d.id !== id))
    if (selectedDevice?.id === id) setSelectedDevice(null)
  }

  const handleActuatorCalibrationSave = async (calibData) => {
    const saved = await api.actuator.create(calibData)
    setCalibrations(prev => [saved, ...prev])
    return saved
  }

  const handleActuatorCalibrationDelete = async (id, deviceId) => {
    await api.actuator.delete(id, deviceId)
    setCalibrations(prev => prev.filter(c => c.id !== id))
  }

  const handleIntrinsicCalibrationSave = async (calibData) => {
    const saved = await api.intrinsic.create(calibData)
    setIntrinsicCalibrations(prev => [saved, ...prev])
    return saved
  }

  const handleIntrinsicCalibrationDelete = async (id, deviceId) => {
    await api.intrinsic.delete(id, deviceId)
    setIntrinsicCalibrations(prev => prev.filter(c => c.id !== id))
  }

  const handleExtrinsicCalibrationSave = async (calibData) => {
    const saved = await api.extrinsic.create(calibData)
    setExtrinsicCalibrations(prev => [saved, ...prev])
    return saved
  }

  const handleExtrinsicCalibrationDelete = async (id, deviceId) => {
    await api.extrinsic.delete(id, deviceId)
    setExtrinsicCalibrations(prev => prev.filter(c => c.id !== id))
  }

  const handleHandEyeCalibrationSave = async (calibData) => {
    const saved = await api.handeye.create(calibData)
    if (calibData.is_active) {
      setHandEyeCalibrations(prev => prev.map(c =>
        c.device_id === calibData.device_id && c.camera === calibData.camera ? { ...c, is_active: false } : c
      ))
    }
    setHandEyeCalibrations(prev => [saved, ...prev])
    return saved
  }

  const handleHandEyeCalibrationDelete = async (id, deviceId) => {
    await api.handeye.delete(id, deviceId)
    setHandEyeCalibrations(prev => prev.filter(c => c.id !== id))
  }

  const handleHandEyeActivate = async (id, deviceId) => {
    await api.handeye.activate(id, deviceId)
    const calib = handEyeCalibrations.find(c => c.id === id)
    setHandEyeCalibrations(prev => prev.map(c => ({
      ...c, is_active: c.id === id ? true : (c.device_id === calib.device_id && c.camera === calib.camera ? false : c.is_active)
    })))
  }

  const handleReplayTestSave = async (testData) => {
    const saved = await api.replay.create(testData)
    setReplayTests(prev => [saved, ...prev])
    return saved
  }

  const handleReplayTestDelete = async (id, deviceId) => {
    await api.replay.delete(id, deviceId)
    setReplayTests(prev => prev.filter(t => t.id !== id))
  }

  if (!user) return <Login onLogin={handleLogin} />

  const handleTopMenuChange = (menuId) => {
    setActiveTopMenu(menuId)
    setActiveSubMenu(subMenus[menuId]?.[0]?.id || '')
    setActiveSettingsMenu(null) // Settings 비활성화
  }

  const handleSettingsMenuClick = (menuId) => {
    setActiveSettingsMenu(menuId)
    setSelectedDevice(null) // 장치 선택 해제
  }

  const currentMenuConfig = menuConfig[activeTopMenu]

  const renderContent = () => {
    // Settings 메뉴가 활성화된 경우
    if (activeSettingsMenu) {
      switch (activeSettingsSubMenu) {
        case 'general': return <SettingsGeneral />
        case 'about': return (
          <div className="bg-gray-800 rounded-xl p-8 max-w-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-xl mx-auto mb-4"><span className="text-white font-black text-xl">C0</span></div>
              <h2 className="text-2xl font-bold text-white">CalZero</h2>
              <p className="text-gray-400">Robot Calibration Suite for R2D2</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">버전</span><span className="text-white">0.3.0</span></div>
              <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">빌드</span><span className="text-white">2025.01.24</span></div>
              <div className="flex justify-between py-2 border-b border-gray-700"><span className="text-gray-400">Backend</span><span className="text-white">FastAPI + File-based JSON</span></div>
              <div className="flex justify-between py-2"><span className="text-gray-400">Frontend</span><span className="text-white">React + Vite + Tailwind</span></div>
            </div>
          </div>
        )
        default: return null
      }
    }

    if (!selectedDevice) return <div className="bg-gray-800 rounded-xl p-8 text-center"><div className="text-4xl mb-3">👈</div><p className="text-gray-400">왼쪽 사이드바에서 장치를 선택하세요</p></div>

    if (activeTopMenu === 'actuator') {
      switch (activeSubMenu) {
        case 'calibration': return <CalibrationHistory device={selectedDevice} calibrations={calibrations} onSave={handleActuatorCalibrationSave} onDelete={handleActuatorCalibrationDelete} setActiveSubMenu={setActiveSubMenu} />
        case 'history': return <ActuatorHistory device={selectedDevice} calibrations={calibrations} onDelete={handleActuatorCalibrationDelete} />
        case 'replay-analysis': return <ReplayAnalysis device={selectedDevice} calibrations={calibrations} replayTests={replayTests} onSave={handleReplayTestSave} onDelete={handleReplayTestDelete} />
        case 'data-analysis': return <DataAnalysis device={selectedDevice} calibrations={calibrations} />
        case 'stats': return <CalibrationStats calibrations={calibrations} />
        default: return null
      }
    }

    if (activeTopMenu === 'camera') {
      switch (activeSubMenu) {
        case 'intrinsic': return <IntrinsicCalculation device={selectedDevice} onCalibrationComplete={handleIntrinsicCalibrationSave} />
        case 'intrinsic-history': return <IntrinsicHistory device={selectedDevice} calibrations={intrinsicCalibrations} onDelete={handleIntrinsicCalibrationDelete} />
        case 'extrinsic': return <ExtrinsicCalculation device={selectedDevice} intrinsicCalibrations={intrinsicCalibrations} onCalibrationComplete={handleExtrinsicCalibrationSave} />
        case 'extrinsic-history': return <ExtrinsicHistory device={selectedDevice} calibrations={extrinsicCalibrations} onDelete={handleExtrinsicCalibrationDelete} />
        case 'hand-eye': return <HandEyeCalculation device={selectedDevice} intrinsicCalibrations={intrinsicCalibrations} onCalibrationComplete={handleHandEyeCalibrationSave} />
        case 'hand-eye-history': return <HandEyeHistory device={selectedDevice} calibrations={handEyeCalibrations} onDelete={handleHandEyeCalibrationDelete} onActivate={handleHandEyeActivate} />
        default: return null
      }
    }

    if (activeTopMenu === 'sensors') return <div className="bg-gray-800 rounded-xl p-8 text-center"><div className="text-4xl mb-3">📡</div><p className="text-gray-400">센서 계산 기능 준비 중</p></div>
    return null
  }

  const renderWelcomeScreen = () => (
    <div className="flex-1 flex items-center justify-center bg-gray-900">
      <div className="text-center max-w-md px-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto mb-6"><span className="text-white font-black text-2xl tracking-tight">C0</span></div>
        <h1 className="text-3xl font-bold text-white mb-3">CalZero</h1>
        <p className="text-gray-400 mb-8">Robot Calibration Suite for R2D2 v0.3</p>
        {apiError && <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg"><p className="text-amber-400 text-sm">⚠️ {apiError}</p></div>}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><span className="text-xl">👈</span></div>
            <div><h3 className="text-white font-semibold">장치를 선택하세요</h3><p className="text-gray-500 text-sm">왼쪽 사이드바에서 시작</p></div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg"><span className="text-cyan-400">⚙️</span><span className="text-gray-300">Actuator - 모터/조인트 계산</span></div>
            <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg"><span className="text-violet-400">📷</span><span className="text-gray-300">Camera - 카메라 계산</span></div>
            <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg"><span className="text-emerald-400">📡</span><span className="text-gray-300">Sensors - 센서 계산</span></div>
          </div>
        </div>
        <p className="text-gray-600 text-xs mt-6">장치를 선택하면 계산 메뉴가 표시됩니다</p>
      </div>
    </div>
  )

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-400">로딩 중...</p></div></div>

  const showFullUI = selectedDevice || activeSettingsMenu

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 사이드바 - 강조, 입체감, 너비 확대 */}
      <aside className="w-72 bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-r border-slate-600/50 flex flex-col shadow-2xl shadow-black/50 relative z-20">
        {/* 로고 - 사이버틱 배경 효과 */}
        <div className="p-5 border-b border-cyan-500/30 relative overflow-hidden">
          {/* 기본 배경 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>

          {/* 사이버 그리드 패턴 */}
          <div className="absolute inset-0 cyber-grid animate-grid-flow opacity-60"></div>

          {/* 네온 글로우 배경 */}
          <div className="absolute inset-0 animate-neon-pulse bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-violet-500/20"></div>

          {/* 수평 스캔 라인 1 - 오렌지 (상단) */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[20%] w-full h-[2px] animate-scan-line">
              <div className="w-24 h-full bg-gradient-to-r from-transparent via-orange-400/80 to-transparent shadow-lg shadow-orange-500/50"></div>
            </div>
          </div>

          {/* 수평 스캔 라인 2 - 시안 (중앙) */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-[2px] animate-scan-line-delay-1">
              <div className="w-20 h-full bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent shadow-lg shadow-cyan-500/50"></div>
            </div>
          </div>

          {/* 수평 스캔 라인 3 - 옐로우 (하단) */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[75%] w-full h-[2px] animate-scan-line-delay-2">
              <div className="w-16 h-full bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent shadow-lg shadow-yellow-500/50"></div>
            </div>
          </div>

          {/* 상단 네온 테두리 */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/80 via-amber-400 to-yellow-500/80"></div>

          {/* 하단 네온 테두리 */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/80 via-blue-400 to-violet-500/80"></div>

          {/* 코너 악센트 */}
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-orange-400/80"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-yellow-400/80"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400/80"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-violet-400/80"></div>

          <div className="flex items-center gap-4 relative z-10">
            {/* 로고 아이콘 - 강화된 글로우 효과 */}
            <div className="relative group">
              <div className="absolute -inset-2 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 blur-xl opacity-50 animate-neon-pulse"></div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 blur-md opacity-60"></div>
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/50 ring-2 ring-white/20">
                <span className="text-white font-black text-lg tracking-tight drop-shadow-lg">C0</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-lg">CalZero</h1>
              <p className="text-[11px] text-cyan-400/80 font-medium">Calibration Suite for R2D2</p>
            </div>
          </div>
        </div>

        {/* Settings 메뉴 + 사용자 정보 - 사이버틱 카드 스타일 */}
        <div className="px-4 pt-4 pb-3">
          <div className="relative rounded-xl overflow-hidden">
            {/* 배경 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-700/50 to-slate-800/90"></div>
            <div className="absolute inset-0 cyber-grid opacity-30"></div>

            {/* 테두리 글로우 */}
            <div className="absolute inset-0 rounded-xl border border-cyan-500/20"></div>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>

            {/* 메뉴 컨텐츠 */}
            <div className="relative p-2 space-y-2">
              {/* 일반 설정 버튼 */}
              <button
                onClick={() => handleSettingsMenuClick('settings')}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 ${
                  activeSettingsMenu
                    ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <span className={activeSettingsMenu ? 'drop-shadow-lg' : ''}>⚙️</span>
                <span>일반 설정</span>
                {activeSettingsMenu && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                )}
              </button>

              {/* 사용자 정보 + 로그아웃 */}
              <div className="pt-2 border-t border-slate-600/30">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-cyan-500/20 ring-1 ring-white/10">
                      <span className="text-white text-xs font-bold">{(user.name || user.email)[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">{user.name || user.email}</p>
                      <p className="text-slate-500 text-[10px] truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="로그아웃"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Devices 영역 - 사이버틱 카드 스타일 */}
        <div className="px-4 pt-3 pb-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative rounded-xl overflow-hidden flex-1 flex flex-col">
            {/* 배경 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-700/50 to-slate-800/90"></div>
            <div className="absolute inset-0 cyber-grid opacity-20"></div>

            {/* 테두리 글로우 - 바이올렛 계열 */}
            <div className="absolute inset-0 rounded-xl border border-violet-500/20"></div>
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"></div>

            {/* 컨텐츠 */}
            <div className="relative flex flex-col flex-1 overflow-hidden">
              {/* Devices 헤더 */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-violet-400 to-purple-500"></div>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Devices</span>
                  </div>
                  <span className="text-[11px] text-violet-400 bg-violet-500/15 px-2.5 py-1 rounded-full font-semibold">{devices.length}</span>
                </div>
              </div>

              {/* 장치 목록 */}
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                <DeviceList
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={(device) => {
                    setSelectedDevice(device)
                    setActiveSettingsMenu(null) // Settings 해제
                  }}
                  onDeviceAdd={handleDeviceAdd}
                  onDeviceUpdate={handleDeviceUpdate}
                  onDeviceDelete={handleDeviceDelete}
                />
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* 메인 영역 */}
      {!showFullUI ? renderWelcomeScreen() : (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
          {activeSettingsMenu ? (
            /* Settings 헤더 + 서브메뉴 탭 */
            <>
              <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
                <div className="px-5">
                  <div className="flex items-center h-14">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">⚙️</span>
                      <h1 className="text-white font-semibold">Settings</h1>
                    </div>
                  </div>
                </div>
              </header>

              {/* Settings 서브메뉴 탭 */}
              <div className="bg-gray-800/50 border-b border-gray-700/50">
                <div className="px-5">
                  <nav className="flex items-center gap-1 h-12 overflow-x-auto">
                    {settingsSubMenus.map(menu => (
                      <button
                        key={menu.id}
                        onClick={() => setActiveSettingsSubMenu(menu.id)}
                        className={`px-4 py-2.5 text-sm transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
                          activeSettingsSubMenu === menu.id
                            ? 'border-cyan-400 text-cyan-400 font-medium'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <span className="text-base">{menu.icon}</span>
                        <span>{menu.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </>
          ) : (
            /* 기존 메뉴 헤더 */
            <>
              <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
                <div className="px-5">
                  <div className="flex items-center justify-between h-14">
                    <nav className="flex items-center gap-1">
                      {Object.values(menuConfig).map(menu => (
                        <button key={menu.id} onClick={() => handleTopMenuChange(menu.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 ${activeTopMenu === menu.id && !activeSettingsMenu ? `${menu.bgActive} ${menu.textActive} border ${menu.borderActive} shadow-sm` : 'text-gray-400 hover:text-white hover:bg-gray-700/50 border border-transparent'}`}>
                          {menu.icon}<span>{menu.label}</span>
                        </button>
                      ))}
                    </nav>
                    <div className="flex items-center gap-3">
                      {selectedDevice && (
                        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          <div className={`w-2 h-2 rounded-full ${selectedDevice.status === 'online' ? 'bg-emerald-400 shadow-emerald-400/50 animate-pulse' : 'bg-gray-500'} shadow-sm`}></div>
                          <span className="text-gray-200 text-sm font-medium">{selectedDevice.name}</span>
                          <button onClick={() => setSelectedDevice(null)} className="ml-1 text-gray-500 hover:text-gray-300 transition" title="장치 선택 해제">✕</button>
                        </div>
                      )}
                      <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all relative">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                      </button>
                    </div>
                  </div>
                </div>
              </header>

              <div className="bg-gray-800/50 border-b border-gray-700/50">
                <div className="px-5">
                  <nav className="flex items-center gap-1 h-12 overflow-x-auto">
                    {subMenus[activeTopMenu]?.map(menu => (
                      <button key={menu.id} onClick={() => setActiveSubMenu(menu.id)} className={`px-4 py-2.5 text-sm transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${activeSubMenu === menu.id ? `${currentMenuConfig.subMenuBorder} ${currentMenuConfig.textActive} font-medium` : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'}`}>
                        <span className="text-base">{menu.icon}</span><span>{menu.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </>
          )}

          <main className="flex-1 overflow-y-auto p-5">{renderContent()}</main>
        </div>
      )}
    </div>
  )
}

export default App
