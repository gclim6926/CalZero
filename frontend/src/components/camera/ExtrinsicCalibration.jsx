import { useState, useRef } from 'react'

function ExtrinsicCalibration({ device, intrinsicCalibrations, onCalibrationComplete }) {
  const [selectedCamera, setSelectedCamera] = useState('wrist')
  const [selectedIntrinsic, setSelectedIntrinsic] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef(null)

  const cameras = [
    { id: 'wrist', name: 'Wrist Cam', icon: '🤖', desc: '로봇 팔 끝 카메라' },
    { id: 'front', name: 'Front Cam', icon: '📷', desc: '전방 고정 카메라' },
  ]

  // 해당 카메라의 Intrinsic 캘리브레이션 목록
  const availableIntrinsics = intrinsicCalibrations?.[`${device?.id}_${selectedCamera}`] || []

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setCapturedImage(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCalibrate = async () => {
    if (!capturedImage || !selectedIntrinsic) return
    
    setIsProcessing(true)
    
    // 시뮬레이션 (실제로는 OpenCV로 solvePnP 호출)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 샘플 결과
    const sampleResult = {
      rotation_vector: [0.124, -0.087, 0.032],
      translation_vector: [125.3, -45.7, 312.8],
      rotation_matrix: [
        [0.992, -0.031, 0.122],
        [0.028, 0.999, 0.035],
        [-0.123, -0.031, 0.992]
      ],
      reprojection_error: 0.42,
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
      intrinsic_id: selectedIntrinsic.id,
      created_at: new Date().toISOString(),
      notes: notes,
      ...result,
    }
    
    onCalibrationComplete?.(calibData)
    
    // 초기화
    setResult(null)
    setCapturedImage(null)
    setNotes('')
  }

  const formatMatrix = (matrix) => {
    return matrix.map(row => 
      row.map(val => val.toFixed(4).padStart(8)).join('  ')
    ).join('\n')
  }

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">🌍</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 Extrinsic 캘리브레이션을 진행할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 목적 및 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-5 rounded-xl">
        <h3 className="text-violet-400 font-semibold text-base mb-3">🌍 Extrinsic 캘리브레이션이란?</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          카메라가 <span className="text-violet-400 font-medium">세상에서 어디에, 어떤 방향으로</span> 있는지 계산합니다.
          체커보드를 기준으로 카메라의 <span className="text-amber-400 font-medium">위치(Translation)</span>와 
          <span className="text-cyan-400 font-medium"> 회전(Rotation)</span>을 구합니다.
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-gray-300 text-xs font-medium">입력</p>
            <p className="text-gray-500 text-[10px]">체커보드 이미지 + Intrinsic</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <div className="text-2xl mb-1">⚙️</div>
            <p className="text-gray-300 text-xs font-medium">계산</p>
            <p className="text-gray-500 text-[10px]">solvePnP 알고리즘</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg text-center">
            <div className="text-2xl mb-1">📍</div>
            <p className="text-gray-300 text-xs font-medium">출력</p>
            <p className="text-gray-500 text-[10px]">R (회전), t (이동)</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-xs">
            💡 <span className="font-medium">활용:</span> 카메라 위치 변화 감지, Hand-Eye 캘리브레이션의 입력 데이터로 사용
          </p>
        </div>
      </div>

      {/* 캘리브레이션 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 설정 */}
        <div className="space-y-4">
          {/* 카메라 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">1. 카메라 선택</h4>
            <div className="grid grid-cols-2 gap-3">
              {cameras.map(cam => (
                <button
                  key={cam.id}
                  onClick={() => {
                    setSelectedCamera(cam.id)
                    setSelectedIntrinsic(null)
                  }}
                  className={`p-4 rounded-lg border text-left transition ${
                    selectedCamera === cam.id
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{cam.icon}</div>
                  <p className="text-white font-medium text-sm">{cam.name}</p>
                  <p className="text-gray-500 text-xs">{cam.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Intrinsic 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">2. Intrinsic 캘리브레이션 선택</h4>
            {availableIntrinsics.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <p className="text-amber-400 text-sm">⚠️ {cameras.find(c => c.id === selectedCamera)?.name}의 Intrinsic 캘리브레이션이 필요합니다</p>
                <p className="text-gray-500 text-xs mt-1">먼저 Intrinsic 캘리브레이션을 진행해주세요</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableIntrinsics.map((calib, idx) => (
                  <button
                    key={calib.id}
                    onClick={() => setSelectedIntrinsic(calib)}
                    className={`w-full p-3 rounded-lg border text-left transition ${
                      selectedIntrinsic?.id === calib.id
                        ? 'bg-violet-500/20 border-violet-500/50'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        {idx === 0 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">Latest</span>}
                        <p className="text-white text-xs mt-1">
                          {new Date(calib.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-[10px]">RMS: {calib.rms_error?.toFixed(3) || 'N/A'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 이미지 업로드 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">3. 체커보드 이미지</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-violet-500/50 transition text-center"
            >
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="max-h-32 mx-auto rounded" />
              ) : (
                <>
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-gray-400 text-sm">클릭하여 이미지 업로드</p>
                  <p className="text-gray-500 text-xs mt-1">체커보드가 보이는 이미지 1장</p>
                </>
              )}
            </button>
          </div>

          {/* 메모 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-semibold text-sm mb-3">4. 메모 (선택)</h4>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 로봇 초기 위치에서 촬영"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>

          {/* 캘리브레이션 버튼 */}
          <button
            onClick={handleCalibrate}
            disabled={!selectedIntrinsic || !capturedImage || isProcessing}
            className="w-full py-3 bg-violet-500 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                계산 중...
              </span>
            ) : (
              '🌍 Extrinsic 계산'
            )}
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h4 className="text-white font-semibold text-sm mb-4">📊 계산 결과</h4>
          
          {!result ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-3">📍</div>
                <p>캘리브레이션을 실행하면 결과가 표시됩니다</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Translation */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation (이동)</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">X</p>
                    <p className="text-amber-400 font-mono text-sm">{result.translation_vector[0].toFixed(1)} mm</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Y</p>
                    <p className="text-amber-400 font-mono text-sm">{result.translation_vector[1].toFixed(1)} mm</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Z</p>
                    <p className="text-amber-400 font-mono text-sm">{result.translation_vector[2].toFixed(1)} mm</p>
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation Vector (회전)</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Rx</p>
                    <p className="text-cyan-400 font-mono text-sm">{result.rotation_vector[0].toFixed(4)}</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Ry</p>
                    <p className="text-cyan-400 font-mono text-sm">{result.rotation_vector[1].toFixed(4)}</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Rz</p>
                    <p className="text-cyan-400 font-mono text-sm">{result.rotation_vector[2].toFixed(4)}</p>
                  </div>
                </div>
              </div>

              {/* Rotation Matrix */}
              <div className="p-3 bg-gray-900 rounded-lg">
                <h5 className="text-gray-400 font-medium text-sm mb-2">Rotation Matrix (3x3)</h5>
                <pre className="text-gray-300 font-mono text-xs overflow-x-auto">
                  {formatMatrix(result.rotation_matrix)}
                </pre>
              </div>

              {/* 재투영 오차 */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 text-sm">재투영 오차 (Reprojection Error)</span>
                  <span className="text-emerald-400 font-mono font-bold">{result.reprojection_error.toFixed(3)} px</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">낮을수록 정확 (보통 &lt; 1.0 px)</p>
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

export default ExtrinsicCalibration
