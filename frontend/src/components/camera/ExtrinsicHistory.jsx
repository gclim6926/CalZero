import { useState } from 'react'

function ExtrinsicHistory({ device, calibrations, setCalibrations }) {
  const [selectedCamera, setSelectedCamera] = useState('all')
  const [selectedCalib, setSelectedCalib] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareTarget, setCompareTarget] = useState(null)

  const cameras = [
    { id: 'all', name: '전체', icon: '📋' },
    { id: 'wrist', name: 'Wrist Cam', icon: '🤖' },
    { id: 'front', name: 'Front Cam', icon: '📷' },
  ]

  // 디바이스의 Extrinsic 캘리브레이션 필터링
  const getCalibrations = () => {
    if (!device || !calibrations) return []
    
    let result = []
    Object.keys(calibrations).forEach(key => {
      if (key.startsWith(`${device.id}_`) && key.includes('_extrinsic_')) {
        const cameraType = key.split('_')[1]
        calibrations[key].forEach(calib => {
          result.push({ ...calib, cameraType })
        })
      }
    })
    
    if (selectedCamera !== 'all') {
      result = result.filter(c => c.camera === selectedCamera)
    }
    
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  const filteredCalibs = getCalibrations()

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    const newCalibs = { ...calibrations }
    Object.keys(newCalibs).forEach(key => {
      if (Array.isArray(newCalibs[key])) {
        newCalibs[key] = newCalibs[key].filter(c => c.id !== id)
      }
    })
    setCalibrations(newCalibs)
    setSelectedCalib(null)
  }

  const calculateDiff = (a, b) => {
    if (!a || !b) return null
    return {
      translation: a.translation_vector.map((v, i) => v - b.translation_vector[i]),
      rotation: a.rotation_vector.map((v, i) => v - b.rotation_vector[i]),
    }
  }

  const diff = compareMode && selectedCalib && compareTarget 
    ? calculateDiff(selectedCalib, compareTarget) 
    : null

  // 샘플 데이터 (실제로는 calibrations에서 가져옴)
  const sampleData = [
    {
      id: 1,
      camera: 'wrist',
      created_at: '2025-01-20T10:30:00Z',
      notes: '초기 위치 캘리브레이션',
      translation_vector: [125.3, -45.7, 312.8],
      rotation_vector: [0.124, -0.087, 0.032],
      reprojection_error: 0.42,
    },
    {
      id: 2,
      camera: 'wrist',
      created_at: '2025-01-21T14:20:00Z',
      notes: '로봇 재시작 후',
      translation_vector: [126.1, -44.9, 313.2],
      rotation_vector: [0.126, -0.085, 0.031],
      reprojection_error: 0.38,
    },
    {
      id: 3,
      camera: 'front',
      created_at: '2025-01-22T09:15:00Z',
      notes: 'Front Cam 설치 후',
      translation_vector: [450.2, 120.5, 890.3],
      rotation_vector: [0.015, -0.210, 0.008],
      reprojection_error: 0.55,
    },
  ]

  const displayData = filteredCalibs.length > 0 ? filteredCalibs : sampleData.filter(d => selectedCamera === 'all' || d.camera === selectedCamera)

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 Extrinsic 히스토리를 확인할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-4 rounded-xl">
        <h3 className="text-violet-400 font-semibold text-sm mb-2">📋 Extrinsic 히스토리</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          Extrinsic 캘리브레이션 이력을 관리합니다. 
          <span className="text-amber-400"> 위치 변화를 비교</span>하여 카메라가 움직였는지 확인할 수 있습니다.
        </p>
      </div>

      {/* 필터 및 도구 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cameras.map(cam => (
            <button
              key={cam.id}
              onClick={() => setSelectedCamera(cam.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1.5 ${
                selectedCamera === cam.id
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <span>{cam.icon}</span>
              <span>{cam.name}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={() => {
            setCompareMode(!compareMode)
            setCompareTarget(null)
          }}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            compareMode
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
          }`}
        >
          🔀 비교 모드 {compareMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 메인 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 왼쪽: 목록 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h4 className="text-white font-semibold text-sm mb-3">캘리브레이션 목록</h4>
          
          {displayData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-500 text-sm">캘리브레이션 이력이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {displayData.map((calib, idx) => (
                <button
                  key={calib.id}
                  onClick={() => {
                    if (compareMode && selectedCalib && selectedCalib.id !== calib.id) {
                      setCompareTarget(calib)
                    } else {
                      setSelectedCalib(calib)
                      setCompareTarget(null)
                    }
                  }}
                  className={`w-full p-3 rounded-lg border text-left transition ${
                    selectedCalib?.id === calib.id
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : compareTarget?.id === calib.id
                      ? 'bg-amber-500/20 border-amber-500/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{calib.camera === 'wrist' ? '🤖' : '📷'}</span>
                      {idx === 0 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">Latest</span>}
                    </div>
                    <span className="text-gray-500 text-[10px]">{calib.reprojection_error?.toFixed(2)} px</span>
                  </div>
                  <p className="text-white text-xs">{formatDate(calib.created_at)}</p>
                  {calib.notes && <p className="text-gray-500 text-[10px] mt-1 truncate">{calib.notes}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 상세 / 비교 */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-4">
          {!selectedCalib ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-3">👈</div>
                <p>왼쪽에서 캘리브레이션을 선택하세요</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold">
                    {selectedCalib.camera === 'wrist' ? '🤖 Wrist Cam' : '📷 Front Cam'}
                  </h4>
                  <p className="text-gray-500 text-xs">{formatDate(selectedCalib.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDelete(selectedCalib.id)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition"
                >
                  🗑️ 삭제
                </button>
              </div>

              {compareMode && compareTarget && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-sm">
                    🔀 비교 대상: {formatDate(compareTarget.created_at)}
                  </p>
                </div>
              )}

              {/* Translation */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-3">📍 Translation (이동)</h5>
                <div className="grid grid-cols-3 gap-3">
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-gray-500 text-xs mb-1">{axis}</p>
                      <p className="text-amber-400 font-mono text-lg">
                        {selectedCalib.translation_vector[i].toFixed(1)}
                      </p>
                      <p className="text-gray-500 text-[10px]">mm</p>
                      {diff && (
                        <p className={`text-xs mt-1 ${diff.translation[i] > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {diff.translation[i] > 0 ? '+' : ''}{diff.translation[i].toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-3">🔄 Rotation Vector (회전)</h5>
                <div className="grid grid-cols-3 gap-3">
                  {['Rx', 'Ry', 'Rz'].map((axis, i) => (
                    <div key={axis} className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-gray-500 text-xs mb-1">{axis}</p>
                      <p className="text-cyan-400 font-mono text-lg">
                        {selectedCalib.rotation_vector[i].toFixed(4)}
                      </p>
                      <p className="text-gray-500 text-[10px]">rad</p>
                      {diff && (
                        <p className={`text-xs mt-1 ${Math.abs(diff.rotation[i]) > 0.01 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {diff.rotation[i] > 0 ? '+' : ''}{diff.rotation[i].toFixed(4)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 오차 */}
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <span className="text-gray-400 text-sm">재투영 오차</span>
                <span className="text-emerald-400 font-mono">{selectedCalib.reprojection_error?.toFixed(3)} px</span>
              </div>

              {/* 비교 결과 요약 */}
              {diff && (
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h5 className="text-white font-medium text-sm mb-2">📊 변화량 요약</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">이동 거리</p>
                      <p className="text-white font-mono">
                        {Math.sqrt(diff.translation.reduce((a, b) => a + b * b, 0)).toFixed(2)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">회전 변화</p>
                      <p className="text-white font-mono">
                        {(Math.sqrt(diff.rotation.reduce((a, b) => a + b * b, 0)) * 180 / Math.PI).toFixed(2)}°
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCalib.notes && (
                <div className="p-3 bg-gray-900 rounded-lg">
                  <p className="text-gray-500 text-xs">메모</p>
                  <p className="text-gray-300 text-sm">{selectedCalib.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExtrinsicHistory
