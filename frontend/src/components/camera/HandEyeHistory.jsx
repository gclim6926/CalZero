import { useState } from 'react'

function HandEyeHistory({ device, calibrations, setCalibrations }) {
  const [selectedCamera, setSelectedCamera] = useState('all')
  const [selectedCalib, setSelectedCalib] = useState(null)

  const cameras = [
    { id: 'all', name: '전체', icon: '📋' },
    { id: 'wrist', name: 'Wrist Cam', icon: '🤖', type: 'Eye-in-Hand' },
    { id: 'front', name: 'Front Cam', icon: '📷', type: 'Eye-to-Hand' },
  ]

  // 디바이스의 Hand-Eye 캘리브레이션 필터링
  const getCalibrations = () => {
    if (!device || !calibrations) return []
    
    let result = []
    Object.keys(calibrations).forEach(key => {
      if (key.startsWith(`${device.id}_`) && key.includes('_handeye_')) {
        calibrations[key].forEach(calib => {
          result.push(calib)
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

  const handleSetActive = (calib) => {
    // 활성 캘리브레이션으로 설정
    alert(`${calib.camera} 카메라의 Hand-Eye 캘리브레이션이 활성화되었습니다.`)
  }

  const formatMatrix = (matrix) => {
    if (!matrix) return ''
    return matrix.map(row => 
      row.map(val => val.toFixed(4).padStart(9)).join(' ')
    ).join('\n')
  }

  // 샘플 데이터
  const sampleData = [
    {
      id: 1,
      camera: 'wrist',
      type: 'eye-in-hand',
      created_at: '2025-01-20T10:30:00Z',
      notes: '초기 Hand-Eye 캘리브레이션',
      poses_count: 15,
      translation: [25.3, -12.1, 45.7],
      rotation_euler: [1.13, 2.58, -1.34],
      transformation_matrix: [
        [0.9987, -0.0234, 0.0456, 25.3],
        [0.0245, 0.9995, -0.0198, -12.1],
        [-0.0451, 0.0209, 0.9988, 45.7],
        [0, 0, 0, 1],
      ],
      reprojection_error: 0.85,
      is_active: true,
    },
    {
      id: 2,
      camera: 'wrist',
      type: 'eye-in-hand',
      created_at: '2025-01-18T14:20:00Z',
      notes: '테스트 캘리브레이션',
      poses_count: 12,
      translation: [24.8, -11.5, 46.2],
      rotation_euler: [1.08, 2.61, -1.29],
      transformation_matrix: [
        [0.9985, -0.0241, 0.0478, 24.8],
        [0.0252, 0.9994, -0.0215, -11.5],
        [-0.0472, 0.0227, 0.9986, 46.2],
        [0, 0, 0, 1],
      ],
      reprojection_error: 0.92,
      is_active: false,
    },
    {
      id: 3,
      camera: 'front',
      type: 'eye-to-hand',
      created_at: '2025-01-19T09:15:00Z',
      notes: 'Front Cam Hand-Eye',
      poses_count: 18,
      translation: [850.2, 120.5, 450.3],
      rotation_euler: [0.52, 178.3, -0.28],
      transformation_matrix: [
        [-0.9998, 0.0091, 0.0052, 850.2],
        [0.0089, 0.9997, -0.0231, 120.5],
        [-0.0054, -0.0230, -0.9997, 450.3],
        [0, 0, 0, 1],
      ],
      reprojection_error: 0.78,
      is_active: true,
    },
  ]

  const displayData = filteredCalibs.length > 0 ? filteredCalibs : sampleData.filter(d => selectedCamera === 'all' || d.camera === selectedCamera)

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 Hand-Eye 히스토리를 확인할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-4 rounded-xl">
        <h3 className="text-violet-400 font-semibold text-sm mb-2">📋 Hand-Eye 히스토리</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          Hand-Eye 캘리브레이션 이력을 관리합니다. 
          <span className="text-emerald-400"> 활성화된 캘리브레이션</span>이 실제 로봇 운영에 사용됩니다.
        </p>
      </div>

      {/* 필터 */}
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
            {cam.type && <span className="text-[10px] text-gray-500">({cam.type})</span>}
          </button>
        ))}
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
                  onClick={() => setSelectedCalib(calib)}
                  className={`w-full p-3 rounded-lg border text-left transition ${
                    selectedCalib?.id === calib.id
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{calib.camera === 'wrist' ? '🤖' : '📷'}</span>
                      {calib.is_active && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">Active</span>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      calib.type === 'eye-in-hand' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {calib.type}
                    </span>
                  </div>
                  <p className="text-white text-xs">{formatDate(calib.created_at)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-500 text-[10px]">{calib.poses_count}개 자세</span>
                    <span className="text-gray-500 text-[10px]">{calib.reprojection_error?.toFixed(2)} px</span>
                  </div>
                  {calib.notes && <p className="text-gray-500 text-[10px] mt-1 truncate">{calib.notes}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 상세 */}
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
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-semibold">
                      {selectedCalib.camera === 'wrist' ? '🤖 Wrist Cam' : '📷 Front Cam'}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      selectedCalib.type === 'eye-in-hand' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {selectedCalib.type}
                    </span>
                    {selectedCalib.is_active && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">Active</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{formatDate(selectedCalib.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedCalib.is_active && (
                    <button
                      onClick={() => handleSetActive(selectedCalib)}
                      className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                    >
                      ✓ 활성화
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedCalib.id)}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>

              {/* Translation */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation</h5>
                <p className="text-gray-400 text-[10px] mb-3">카메라와 로봇 팔 끝 사이의 거리</p>
                <div className="grid grid-cols-3 gap-3">
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-gray-500 text-xs mb-1">{axis}</p>
                      <p className="text-amber-400 font-mono text-xl">{selectedCalib.translation[i].toFixed(1)}</p>
                      <p className="text-gray-600 text-[10px]">mm</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation (Euler Angles)</h5>
                <div className="grid grid-cols-3 gap-3">
                  {['Roll', 'Pitch', 'Yaw'].map((axis, i) => (
                    <div key={axis} className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-gray-500 text-xs mb-1">{axis}</p>
                      <p className="text-cyan-400 font-mono text-xl">{selectedCalib.rotation_euler[i].toFixed(2)}°</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4x4 Matrix */}
              <div className="p-4 bg-gray-900 rounded-lg">
                <h5 className="text-gray-400 font-medium text-sm mb-2">Transformation Matrix (4x4)</h5>
                <p className="text-gray-500 text-[10px] mb-2">카메라 좌표 → 로봇 좌표 변환 행렬</p>
                <pre className="text-gray-300 font-mono text-xs overflow-x-auto bg-gray-800 p-3 rounded">
                  {formatMatrix(selectedCalib.transformation_matrix)}
                </pre>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-900 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">사용 자세 수</p>
                  <p className="text-white font-mono text-lg">{selectedCalib.poses_count}개</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">재투영 오차</p>
                  <p className="text-emerald-400 font-mono text-lg">{selectedCalib.reprojection_error?.toFixed(3)} px</p>
                </div>
                <div className="p-3 bg-gray-900 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">상태</p>
                  <p className={`font-medium text-lg ${selectedCalib.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {selectedCalib.is_active ? '✓ 활성' : '비활성'}
                  </p>
                </div>
              </div>

              {selectedCalib.notes && (
                <div className="p-3 bg-gray-900 rounded-lg">
                  <p className="text-gray-500 text-xs">메모</p>
                  <p className="text-gray-300 text-sm">{selectedCalib.notes}</p>
                </div>
              )}

              {/* 활용 가이드 */}
              <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <h5 className="text-violet-400 font-medium text-sm mb-2">💡 활용 방법</h5>
                <pre className="text-gray-300 text-xs font-mono bg-gray-900 p-3 rounded overflow-x-auto">
{`# Python 예시
object_in_camera = [x, y, z]  # 카메라가 본 물체 좌표
X = hand_eye_matrix           # 이 변환 행렬
object_in_robot = X @ object_in_camera  # 로봇 좌표로 변환
robot.move_to(object_in_robot)  # 로봇 이동!`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HandEyeHistory
