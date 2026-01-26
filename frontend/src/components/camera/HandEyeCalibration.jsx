import { useState, useRef } from 'react'

function HandEyeCalibration({ device, intrinsicCalibrations, onCalibrationComplete }) {
  const [selectedCamera, setSelectedCamera] = useState('wrist')
  const [selectedIntrinsic, setSelectedIntrinsic] = useState(null)
  const [calibrationType, setCalibrationType] = useState('eye-in-hand') // eye-in-hand or eye-to-hand
  const [poses, setPoses] = useState([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef(null)

  const cameras = [
    { id: 'wrist', name: 'Wrist Cam', icon: '🤖', type: 'eye-in-hand', desc: '로봇 팔 끝에 부착' },
    { id: 'front', name: 'Front Cam', icon: '📷', type: 'eye-to-hand', desc: '외부 고정 카메라' },
  ]

  // 해당 카메라의 Intrinsic 캘리브레이션 목록
  const availableIntrinsics = intrinsicCalibrations?.[`${device?.id}_${selectedCamera}`] || []

  const handleCameraSelect = (cam) => {
    setSelectedCamera(cam.id)
    setCalibrationType(cam.type)
    setSelectedIntrinsic(null)
    setPoses([])
    setResult(null)
  }

  const handleCapturePose = async () => {
    setIsCapturing(true)
    
    // 시뮬레이션: 로봇 위치 + 이미지 캡처
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newPose = {
      id: Date.now(),
      robot_pose: {
        position: [
          300 + Math.random() * 200,
          -100 + Math.random() * 200,
          400 + Math.random() * 100,
        ],
        orientation: [
          Math.random() * 0.5 - 0.25,
          Math.random() * 0.5 - 0.25,
          Math.random() * 0.5 - 0.25,
        ],
      },
      extrinsic: {
        translation: [
          100 + Math.random() * 50,
          -50 + Math.random() * 100,
          300 + Math.random() * 50,
        ],
        rotation: [
          Math.random() * 0.2 - 0.1,
          Math.random() * 0.2 - 0.1,
          Math.random() * 0.2 - 0.1,
        ],
      },
      captured_at: new Date().toISOString(),
    }
    
    setPoses(prev => [...prev, newPose])
    setIsCapturing(false)
  }

  const handleRemovePose = (id) => {
    setPoses(prev => prev.filter(p => p.id !== id))
  }

  const handleCalibrate = async () => {
    if (poses.length < 10) {
      alert('최소 10개 이상의 자세가 필요합니다')
      return
    }
    
    setIsProcessing(true)
    
    // 시뮬레이션 (실제로는 OpenCV calibrateHandEye 호출)
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 샘플 결과 (4x4 변환 행렬)
    const sampleResult = {
      transformation_matrix: [
        [0.9987, -0.0234, 0.0456, 25.3],
        [0.0245, 0.9995, -0.0198, -12.1],
        [-0.0451, 0.0209, 0.9988, 45.7],
        [0, 0, 0, 1],
      ],
      translation: [25.3, -12.1, 45.7],
      rotation_matrix: [
        [0.9987, -0.0234, 0.0456],
        [0.0245, 0.9995, -0.0198],
        [-0.0451, 0.0209, 0.9988],
      ],
      rotation_euler: [1.13, 2.58, -1.34], // degrees
      reprojection_error: 0.85,
      poses_used: poses.length,
    }
    
    setResult(sampleResult)
    setIsProcessing(false)
  }

  const handleSave = () => {
    if (!result) return
    
    const calibData = {
      id: Date.now(),
      device_id: device.id,
      camera: selectedCamera,
      type: calibrationType,
      intrinsic_id: selectedIntrinsic?.id,
      created_at: new Date().toISOString(),
      notes: notes,
      poses_count: poses.length,
      ...result,
    }
    
    onCalibrationComplete?.(calibData)
    
    // 초기화
    setResult(null)
    setPoses([])
    setNotes('')
  }

  const formatMatrix = (matrix) => {
    return matrix.map(row => 
      row.map(val => val.toFixed(4).padStart(9)).join(' ')
    ).join('\n')
  }

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 Hand-Eye 캘리브레이션을 진행할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 목적 및 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-5 rounded-xl">
        <h3 className="text-violet-400 font-semibold text-base mb-3">🤖 Hand-Eye 캘리브레이션이란?</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          <span className="text-cyan-400 font-medium">카메라 좌표계</span>와 
          <span className="text-amber-400 font-medium"> 로봇 좌표계</span> 사이의 변환 관계를 구합니다.
          이를 통해 카메라가 본 물체의 위치를 로봇이 이해할 수 있게 됩니다.
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-lg border cursor-pointer transition ${
            calibrationType === 'eye-in-hand' 
              ? 'bg-cyan-500/20 border-cyan-500/50' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}>
            <div className="text-2xl mb-2">👁️‍🗨️</div>
            <p className="text-white font-medium text-sm">Eye-in-Hand</p>
            <p className="text-gray-400 text-xs mt-1">카메라가 로봇 팔 끝에 부착</p>
            <p className="text-cyan-400 text-[10px] mt-2">→ Wrist Cam에 적합</p>
          </div>
          <div className={`p-4 rounded-lg border cursor-pointer transition ${
            calibrationType === 'eye-to-hand' 
              ? 'bg-amber-500/20 border-amber-500/50' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}>
            <div className="text-2xl mb-2">👁️</div>
            <p className="text-white font-medium text-sm">Eye-to-Hand</p>
            <p className="text-gray-400 text-xs mt-1">카메라가 외부에 고정</p>
            <p className="text-amber-400 text-[10px] mt-2">→ Front Cam에 적합</p>
          </div>
        </div>
        
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-gray-300 text-xs">
            <span className="text-violet-400 font-medium">방법:</span> 로봇을 여러 자세로 움직이며 체커보드를 촬영 (최소 10회 이상)
          </p>
        </div>
      </div>

      {/* 캘리브레이션 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 설정 */}
        <div className="space-y-4">
          {/* 카메라 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">1. 카메라 선택</h4>
            <div className="space-y-2">
              {cameras.map(cam => (
                <button
                  key={cam.id}
                  onClick={() => handleCameraSelect(cam)}
                  className={`w-full p-3 rounded-lg border text-left transition flex items-center gap-3 ${
                    selectedCamera === cam.id
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{cam.icon}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{cam.name}</p>
                    <p className="text-gray-500 text-xs">{cam.desc}</p>
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded text-[10px] ${
                    cam.type === 'eye-in-hand' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {cam.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Intrinsic 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">2. Intrinsic 선택</h4>
            {availableIntrinsics.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <p className="text-amber-400 text-xs">⚠️ Intrinsic 캘리브레이션 필요</p>
              </div>
            ) : (
              <select
                value={selectedIntrinsic?.id || ''}
                onChange={(e) => {
                  const calib = availableIntrinsics.find(c => c.id === Number(e.target.value))
                  setSelectedIntrinsic(calib)
                }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">선택하세요</option>
                {availableIntrinsics.map((calib, idx) => (
                  <option key={calib.id} value={calib.id}>
                    {idx === 0 ? '(Latest) ' : ''}{new Date(calib.created_at).toLocaleDateString('ko-KR')}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 메모 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">3. 메모 (선택)</h4>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 초기 Hand-Eye 캘리브레이션"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>
        </div>

        {/* 중앙: 자세 수집 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold text-sm">4. 자세 수집</h4>
            <span className={`px-2 py-1 rounded text-xs ${
              poses.length >= 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {poses.length} / 10+ 자세
            </span>
          </div>

          {/* 캡처 버튼 */}
          <button
            onClick={handleCapturePose}
            disabled={isCapturing || !selectedIntrinsic}
            className="w-full py-4 bg-violet-500 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition mb-4"
          >
            {isCapturing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                캡처 중...
              </span>
            ) : (
              <>📷 자세 캡처</>
            )}
          </button>

          <p className="text-gray-500 text-xs mb-3 text-center">
            로봇을 다른 자세로 이동 후 캡처하세요
          </p>

          {/* 자세 목록 */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {poses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm">캡처된 자세가 없습니다</p>
              </div>
            ) : (
              poses.map((pose, idx) => (
                <div
                  key={pose.id}
                  className="p-2 bg-gray-900 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 text-xs font-mono">#{idx + 1}</span>
                    <div className="text-[10px] text-gray-400">
                      X:{pose.robot_pose.position[0].toFixed(0)} 
                      Y:{pose.robot_pose.position[1].toFixed(0)} 
                      Z:{pose.robot_pose.position[2].toFixed(0)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePose(pose.id)}
                    className="text-gray-500 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 캘리브레이션 버튼 */}
          <button
            onClick={handleCalibrate}
            disabled={poses.length < 10 || isProcessing}
            className="w-full py-3 mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Hand-Eye 계산 중...
              </span>
            ) : (
              <>🤖 Hand-Eye 계산 ({poses.length}개 자세)</>
            )}
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h4 className="text-white font-semibold text-sm mb-4">📊 계산 결과</h4>
          
          {!result ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p>자세를 수집하고 계산하면</p>
                <p>결과가 표시됩니다</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Translation */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation</h5>
                <p className="text-gray-400 text-[10px] mb-2">카메라 ↔ 로봇 팔 끝 거리</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="p-2 bg-gray-900 rounded">
                      <p className="text-gray-500 text-[10px]">{axis}</p>
                      <p className="text-amber-400 font-mono text-sm">{result.translation[i].toFixed(1)}</p>
                      <p className="text-gray-600 text-[9px]">mm</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation (Euler)</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {['Roll', 'Pitch', 'Yaw'].map((axis, i) => (
                    <div key={axis} className="p-2 bg-gray-900 rounded">
                      <p className="text-gray-500 text-[10px]">{axis}</p>
                      <p className="text-cyan-400 font-mono text-sm">{result.rotation_euler[i].toFixed(2)}°</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4x4 Matrix */}
              <div className="p-3 bg-gray-900 rounded-lg">
                <h5 className="text-gray-400 font-medium text-xs mb-2">Transformation Matrix (4x4)</h5>
                <pre className="text-gray-300 font-mono text-[10px] overflow-x-auto">
                  {formatMatrix(result.transformation_matrix)}
                </pre>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-900 rounded-lg text-center">
                  <p className="text-gray-500 text-[10px]">사용 자세</p>
                  <p className="text-white font-mono">{result.poses_used}개</p>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                  <p className="text-gray-500 text-[10px]">오차</p>
                  <p className="text-emerald-400 font-mono">{result.reprojection_error.toFixed(3)} px</p>
                </div>
              </div>

              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
              >
                💾 결과 저장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HandEyeCalibration
