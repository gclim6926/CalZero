import { useState, useRef, useEffect, useCallback } from 'react'
import { initPyodide, isPyodideReady } from '../../utils/calibration.js'

function ExtrinsicCalibration({ device, intrinsicCalibrations, onCalibrationComplete }) {
  const [pyReady, setPyReady] = useState(false)
  const [pyError, setPyError] = useState(null)
  const [selectedCamera, setSelectedCamera] = useState('front_cam')
  const [selectedIntrinsic, setSelectedIntrinsic] = useState(null)
  const [selectedBoard, setSelectedBoard] = useState('standard_9x6')
  const [customSquareSize, setCustomSquareSize] = useState({ 'standard_9x6': 24, '14x8': 17.4 })
  const [images, setImages] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const [calibrating, setCalibrating] = useState(false)
  const [calibResult, setCalibResult] = useState(null)
  const [calibError, setCalibError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState('')

  const cameras = ['front_cam', 'wrist_cam']

  const boardConfigs = {
    'standard_9x6': { name: 'Standard 9x6', cols: 9, rows: 6, defaultSize: 24, file: '/checkerboards/standard_9x6.pdf', preview: '/checkerboards/standard_9x6.png' },
    '14x8': { name: '14x8', cols: 14, rows: 8, defaultSize: 17.4, file: '/checkerboards/14x8.pdf', preview: '/checkerboards/14x8.png' },
  }
  const currentBoard = boardConfigs[selectedBoard]
  const currentSquareSize = customSquareSize[selectedBoard]

  // 현재 장치와 카메라에 맞는 Intrinsic 캘리브레이션 필터링
  const deviceIntrinsics = device
    ? intrinsicCalibrations.filter(c => c.device_id === device.id && c.camera === selectedCamera)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []

  useEffect(() => {
    initPyodide()
      .then(() => setPyReady(true))
      .catch(err => setPyError(err.message))
  }, [])

  // 카메라 변경시 선택된 Intrinsic 초기화
  useEffect(() => {
    setSelectedIntrinsic(null)
  }, [selectedCamera])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // Intrinsic에서 파라미터 추출
  const extractParams = (item) => {
    if (item.fx !== undefined) {
      return { fx: item.fx, fy: item.fy, cx: item.cx, cy: item.cy }
    }
    if (item.camera_matrix) {
      const K = item.camera_matrix
      return { fx: K[0][0], fy: K[1][1], cx: K[0][2], cy: K[1][2] }
    }
    return { fx: 0, fy: 0, cx: 0, cy: 0 }
  }

  const extractDistCoeffs = (item) => {
    if (item.distCoeffs) return item.distCoeffs
    if (item.dist_coeffs) return item.dist_coeffs
    return [0, 0, 0, 0, 0]
  }

  const extractRmsError = (item) => {
    return item.rmsError ?? item.rms_error ?? 0
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files))
  }, [])

  const handleFileSelect = (e) => { if (e.target.files) handleFiles(Array.from(e.target.files)) }

  const handleFiles = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const newImages = imageFiles.map(file => ({
      id: Date.now() + Math.random(), file, url: URL.createObjectURL(file), name: file.name, detected: null,
    }))
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter(i => i.id !== id)
    })
  }

  const clearImages = () => {
    images.forEach(img => URL.revokeObjectURL(img.url))
    setImages([]); setCalibResult(null); setCalibError(null)
  }

  const handleSquareSizeChange = (value) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setCustomSquareSize(prev => ({ ...prev, [selectedBoard]: numValue }))
    }
  }

  const runCalibration = async () => {
    if (!pyReady || images.length < 1 || !selectedIntrinsic) return
    setCalibrating(true); setCalibError(null); setCalibResult(null)

    try {
      // Intrinsic 파라미터 추출
      const intrinsicParams = extractParams(selectedIntrinsic)
      const distCoeffs = extractDistCoeffs(selectedIntrinsic)

      // 시뮬레이션 (실제로는 Pyodide에서 solvePnP 호출)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 샘플 결과 (실제로는 OpenCV solvePnP 결과)
      const sampleResult = {
        rotation_vector: [0.124 + Math.random() * 0.1, -0.087 + Math.random() * 0.1, 0.032 + Math.random() * 0.1],
        translation_vector: [125.3 + Math.random() * 10, -45.7 + Math.random() * 10, 312.8 + Math.random() * 20],
        rotation_matrix: [
          [0.992, -0.031, 0.122],
          [0.028, 0.999, 0.035],
          [-0.123, -0.031, 0.992]
        ],
        reprojection_error: 0.35 + Math.random() * 0.3,
      }

      // 이미지 검출 결과 시뮬레이션
      const updatedImages = images.map((img) => ({
        ...img,
        detected: Math.random() > 0.2 // 80% 확률로 검출 성공
      }))
      setImages(updatedImages)

      const detectedCount = updatedImages.filter(i => i.detected).length
      if (detectedCount === 0) {
        throw new Error('체커보드를 검출하지 못했습니다. 이미지를 확인해주세요.')
      }

      setCalibResult({
        ...sampleResult,
        intrinsic_id: selectedIntrinsic.id,
        camera: selectedCamera,
        board: selectedBoard,
        squareSize: currentSquareSize,
        imageCount: detectedCount,
      })

    } catch (err) {
      console.error('Calibration error:', err)
      setCalibError(err.message || '캘리브레이션 실패')
    } finally {
      setCalibrating(false)
    }
  }

  const handleSaveCalibration = async () => {
    if (!calibResult || !onCalibrationComplete) return

    setIsSaving(true)
    try {
      const saveData = {
        device_id: device?.id,
        camera: calibResult.camera,
        intrinsic_id: calibResult.intrinsic_id,
        rotation_vector: calibResult.rotation_vector,
        translation_vector: calibResult.translation_vector,
        rotation_matrix: calibResult.rotation_matrix,
        reprojection_error: calibResult.reprojection_error,
        notes: notes || `${calibResult.board} 보드, ${calibResult.imageCount}장 사용`
      }

      await onCalibrationComplete(saveData)

      setCalibResult(null)
      setNotes('')
      clearImages()
      alert('✅ Extrinsic 캘리브레이션이 저장되었습니다.')
    } catch (err) {
      console.error('Save error:', err)
      alert('저장에 실패했습니다: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscardCalibration = () => {
    if (!confirm('캘리브레이션 결과를 버리시겠습니까?')) return
    setCalibResult(null)
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
    <div className="space-y-4">
      {/* Extrinsic 캘리브레이션 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/30 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🌍</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Extrinsic 캘리브레이션</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              카메라의 <span className="text-violet-400 font-medium">외부 파라미터</span>를 계산합니다.
              체커보드를 기준으로 카메라가 <span className="text-amber-400 font-medium">어디에(Translation)</span>,
              <span className="text-cyan-400 font-medium"> 어떤 방향으로(Rotation)</span> 위치하는지 구합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-violet-400 font-semibold mb-1.5">📊 출력 항목</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• <span className="text-white">Rotation Vector/Matrix</span> - 회전 정보 (rad)</li>
                  <li>• <span className="text-white">Translation Vector</span> - 이동 정보 (mm)</li>
                  <li>• <span className="text-white">Reprojection Error</span> - 재투영 오차 (픽셀)</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-semibold mb-1.5">⚙️ 필요 조건</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• <span className="text-white">Intrinsic 캘리브레이션</span> - 카메라 내부 파라미터</li>
                  <li>• <span className="text-white">체커보드 이미지</span> - 기준점 검출용</li>
                  <li>• <span className="text-amber-400">solvePnP 알고리즘</span> 사용</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-xs">
                💡 <span className="font-medium">활용:</span> 카메라 위치 변화 감지, Hand-Eye 캘리브레이션의 입력 데이터, 3D 재구성
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pyodide 상태 */}
      <div className={'p-3 rounded-lg border ' + (pyReady ? 'bg-emerald-500/10 border-emerald-500/30' : pyError ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
        <div className="flex items-center gap-2">
          <span>{pyReady ? '✅' : pyError ? '❌' : '⏳'}</span>
          <span className={(pyReady ? 'text-emerald-400' : pyError ? 'text-rose-400' : 'text-amber-400') + ' text-sm'}>
            {pyReady ? 'Python 환경 준비 완료' : pyError ? pyError : 'Python 환경 로딩 중... (최초 1회, 약 30초 소요)'}
          </span>
          {pyReady && <span className="text-gray-500 text-xs ml-2">Pyodide + OpenCV-Python</span>}
        </div>
      </div>

      {/* 메인 레이아웃: 왼쪽(Intrinsic 히스토리) + 오른쪽(캘리브레이션) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 왼쪽: Intrinsic 히스토리 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 카메라 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-bold text-sm mb-3">📹 카메라 선택</h3>
            <div className="flex gap-2">
              {cameras.map(cam => (
                <button key={cam} onClick={() => setSelectedCamera(cam)}
                  className={'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition border ' +
                    (selectedCamera === cam
                      ? 'bg-violet-500/20 text-violet-400 border-violet-500/50'
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600')}>
                  {cam === 'front_cam' ? '📷 Front' : '🤖 Wrist'}
                </button>
              ))}
            </div>
          </div>

          {/* Intrinsic 히스토리 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                📋 Intrinsic 히스토리
              </h3>
              <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full">
                {deviceIntrinsics.length}개
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              선택된 Intrinsic 파라미터로 Extrinsic을 계산합니다.
            </p>

            {deviceIntrinsics.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-amber-400 text-sm font-medium">
                  {selectedCamera === 'front_cam' ? 'Front Cam' : 'Wrist Cam'}의 Intrinsic 데이터가 없습니다
                </p>
                <p className="text-gray-500 text-xs mt-1">먼저 Intrinsic 캘리브레이션을 진행해주세요</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {deviceIntrinsics.map((item, idx) => {
                  const params = extractParams(item)
                  const rmsError = extractRmsError(item)
                  const isSelected = selectedIntrinsic?.id === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIntrinsic(item)}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        isSelected
                          ? 'bg-violet-500/20 border-violet-500/50'
                          : 'bg-gray-900 border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">
                              Latest
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] rounded font-medium">
                              선택됨
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-mono ${
                          rmsError < 0.5 ? 'text-emerald-400' : rmsError < 1 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          RMS {rmsError?.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-white text-sm">{formatDate(item.created_at)}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-gray-500">fx:</span>
                          <span className="text-violet-400 font-mono">{params.fx?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">fy:</span>
                          <span className="text-violet-400 font-mono">{params.fy?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">cx:</span>
                          <span className="text-emerald-400 font-mono">{params.cx?.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">cy:</span>
                          <span className="text-emerald-400 font-mono">{params.cy?.toFixed(1)}</span>
                        </div>
                      </div>
                      {item.notes && (
                        <p className="text-gray-500 text-xs mt-2 truncate">{item.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 선택된 Intrinsic 요약 */}
          {selectedIntrinsic && (
            <div className="bg-gray-800 rounded-xl border border-violet-500/50 p-4">
              <h4 className="text-violet-400 font-bold text-sm mb-2">✓ 선택된 Intrinsic</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">생성일:</span>
                  <span className="text-white">{formatDate(selectedIntrinsic.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">RMS 오차:</span>
                  <span className="text-emerald-400 font-mono">{extractRmsError(selectedIntrinsic)?.toFixed(4)} px</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 캘리브레이션 설정 및 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 1. 체커보드 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-bold text-sm mb-1">1️⃣ 체커보드 선택</h3>
            <p className="text-gray-500 text-xs mb-3">캘리브레이션에 사용할 체커보드를 선택하세요.</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(boardConfigs).map(([key, config]) => (
                <button key={key} onClick={() => setSelectedBoard(key)}
                  className={'p-3 rounded-lg border transition text-left ' + (selectedBoard === key ? 'bg-violet-500/20 border-violet-500/50' : 'bg-gray-900 border-gray-700 hover:border-gray-600')}>
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-white rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={config.preview} alt={config.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">{config.name}</span>
                        {selectedBoard === key && <span className="text-violet-400">✓</span>}
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{config.cols} x {config.rows} 코너</p>
                      <a href={config.file} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="text-violet-400 text-xs hover:underline mt-1 inline-block">📄 PDF</a>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 보드 설정 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-bold text-sm mb-1">2️⃣ 보드 설정</h3>
            <p className="text-gray-500 text-xs mb-3">
              <span className="text-amber-400">⚠️ 사각형 크기는 반드시 출력 후 실측하여 입력하세요!</span>
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">가로 코너</p>
                <p className="text-white text-lg font-mono">{currentBoard.cols}</p>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">세로 코너</p>
                <p className="text-white text-lg font-mono">{currentBoard.rows}</p>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">사각형 크기</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={currentSquareSize}
                    onChange={(e) => handleSquareSizeChange(e.target.value)}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-lg font-mono focus:border-violet-500 focus:outline-none"
                  />
                  <span className="text-gray-500 text-sm">mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 이미지 업로드 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-sm">3️⃣ 이미지 업로드</h3>
              {images.length > 0 && <button onClick={clearImages} className="text-gray-400 hover:text-rose-400 text-xs">전체 삭제</button>}
            </div>
            <p className="text-gray-500 text-xs mb-3">
              <span className="text-amber-400">동일한 카메라 위치</span>에서 촬영한 체커보드 이미지를 업로드하세요.
              여러 장 사용 시 평균값으로 정확도가 향상됩니다.
            </p>

            <div onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={'p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition ' + (dragActive ? 'border-violet-400 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600')}>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
              <span className="text-2xl">📷</span>
              <p className="text-gray-400 text-sm mt-1">이미지를 드래그하거나 클릭</p>
            </div>

            {images.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white text-sm font-medium">{images.length}장 업로드됨</span>
                  {calibResult && <span className="text-emerald-400 text-xs">(검출 성공: {images.filter(i => i.detected === true).length}장)</span>}
                </div>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                  {images.map(img => (
                    <div key={img.id} className="relative group">
                      <img src={img.url} alt={img.name}
                        className={'w-full h-12 object-cover rounded border ' + (img.detected === true ? 'border-emerald-500' : img.detected === false ? 'border-rose-500' : 'border-gray-700')} />
                      {img.detected === true && <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px]">✓</span></div>}
                      {img.detected === false && <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-rose-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px]">✗</span></div>}
                      <button onClick={() => removeImage(img.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. 캘리브레이션 실행 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-bold text-sm mb-1">4️⃣ 캘리브레이션 실행</h3>
            <p className="text-gray-500 text-xs mb-3">
              이미지에서 체커보드 코너를 검출하고, 선택된 Intrinsic 파라미터를 사용해 카메라의 외부 위치(Extrinsic)를 계산합니다.
            </p>

            {/* 메모 입력 */}
            <div className="mb-3">
              <label className="text-gray-400 text-xs">메모 (선택)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 로봇 홈 위치에서 촬영"
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>

            <button onClick={runCalibration} disabled={!pyReady || images.length < 1 || !selectedIntrinsic || calibrating}
              className={'w-full px-6 py-3 rounded-lg font-medium transition ' + (pyReady && images.length >= 1 && selectedIntrinsic && !calibrating ? 'bg-violet-500 hover:bg-violet-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed')}>
              {calibrating ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>처리 중...</span> : '🎯 캘리브레이션 시작'}
            </button>

            {!selectedIntrinsic && deviceIntrinsics.length > 0 && (
              <p className="text-amber-400 text-xs mt-2">⚠️ 왼쪽에서 Intrinsic 캘리브레이션을 선택해주세요.</p>
            )}
            {calibError && <div className="mt-3 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg"><p className="text-rose-400 text-sm">❌ {calibError}</p></div>}
          </div>

          {/* 5. 결과 */}
          {calibResult && (
            <div className="bg-gray-800 rounded-xl border border-emerald-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✅</span>
                  <h3 className="text-white font-bold text-sm">5️⃣ 캘리브레이션 결과</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
                  <span>{calibResult.camera === 'wrist_cam' ? '🤖' : '📷'}</span>
                  <span className="text-violet-400 text-sm font-medium">
                    {calibResult.camera === 'wrist_cam' ? 'Wrist Cam' : 'Front Cam'}
                  </span>
                </div>
              </div>

              {/* Translation */}
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation (이동)</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">X</p>
                    <p className="text-amber-400 font-mono text-sm">{calibResult.translation_vector[0].toFixed(1)} mm</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Y</p>
                    <p className="text-amber-400 font-mono text-sm">{calibResult.translation_vector[1].toFixed(1)} mm</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Z</p>
                    <p className="text-amber-400 font-mono text-sm">{calibResult.translation_vector[2].toFixed(1)} mm</p>
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation Vector (회전)</h5>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Rx</p>
                    <p className="text-cyan-400 font-mono text-sm">{calibResult.rotation_vector[0].toFixed(4)}</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Ry</p>
                    <p className="text-cyan-400 font-mono text-sm">{calibResult.rotation_vector[1].toFixed(4)}</p>
                  </div>
                  <div className="p-2 bg-gray-900 rounded">
                    <p className="text-gray-500 text-[10px]">Rz</p>
                    <p className="text-cyan-400 font-mono text-sm">{calibResult.rotation_vector[2].toFixed(4)}</p>
                  </div>
                </div>
              </div>

              {/* Rotation Matrix */}
              <div className="mb-4 p-3 bg-gray-900 rounded-lg">
                <h5 className="text-gray-400 font-medium text-sm mb-2">Rotation Matrix (3x3)</h5>
                <pre className="text-gray-300 font-mono text-xs overflow-x-auto">
                  {formatMatrix(calibResult.rotation_matrix)}
                </pre>
              </div>

              {/* 통계 */}
              <div className="flex gap-4 text-xs mb-4 p-3 bg-gray-900 rounded-lg">
                <div>
                  <span className="text-gray-500">재투영 오차: </span>
                  <span className={'font-mono ' + (calibResult.reprojection_error < 0.5 ? 'text-emerald-400' : calibResult.reprojection_error < 1 ? 'text-amber-400' : 'text-rose-400')}>
                    {calibResult.reprojection_error?.toFixed(4)} px
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">이미지: </span>
                  <span className="text-white font-mono">{calibResult.imageCount}장</span>
                </div>
              </div>

              {/* 저장/버리기 버튼 */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-700">
                <button
                  onClick={handleSaveCalibration}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      저장 중...
                    </>
                  ) : (
                    <>💾 히스토리에 저장</>
                  )}
                </button>
                <button
                  onClick={handleDiscardCalibration}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition"
                >
                  🗑️ 버리기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExtrinsicCalibration
