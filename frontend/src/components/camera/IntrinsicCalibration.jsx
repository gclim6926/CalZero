import { useState, useRef, useEffect, useCallback } from 'react'
import { initPyodide, runCalibration as runPyCalibration, isPyodideReady } from '../../utils/calibration.js'

function IntrinsicCalibration({ device, onCalibrationComplete }) {
  const [pyReady, setPyReady] = useState(false)
  const [pyError, setPyError] = useState(null)
  const [selectedBoard, setSelectedBoard] = useState('standard_9x6')
  const [customSquareSize, setCustomSquareSize] = useState({ 'standard_9x6': 24, '14x8': 17.4 })
  const [selectedCamera, setSelectedCamera] = useState('front_cam')
  const cameras = ['front_cam', 'wrist_cam']
  const [images, setImages] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const [calibrating, setCalibrating] = useState(false)
  const [calibResult, setCalibResult] = useState(null)
  const [calibError, setCalibError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const boardConfigs = {
    'standard_9x6': { name: 'Standard 9x6', cols: 9, rows: 6, defaultSize: 24, file: '/checkerboards/standard_9x6.pdf', preview: '/checkerboards/standard_9x6.png' },
    '14x8': { name: '14x8', cols: 14, rows: 8, defaultSize: 17.4, file: '/checkerboards/14x8.pdf', preview: '/checkerboards/14x8.png' },
  }
  const currentBoard = boardConfigs[selectedBoard]
  const currentSquareSize = customSquareSize[selectedBoard]

  useEffect(() => {
    initPyodide()
      .then(() => setPyReady(true))
      .catch(err => setPyError(err.message))
  }, [])

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

  const runCalibration = async () => {
    if (!pyReady || images.length < 3) return
    setCalibrating(true); setCalibError(null); setCalibResult(null)

    try {
      const imageUrls = images.map(img => img.url)

      const result = await runPyCalibration(imageUrls, {
        cols: currentBoard.cols,
        rows: currentBoard.rows,
        squareSize: currentSquareSize
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      const updatedImages = images.map((img, idx) => {
        const detection = result.detection_results.find(d => d.index === idx)
        return { ...img, detected: detection?.detected || false }
      })
      setImages(updatedImages)

      const calibData = {
        id: Date.now(),
        created_at: new Date().toISOString(),
        camera: selectedCamera,
        device_id: device?.id,
        device_name: device?.name,
        fx: result.camera_matrix.fx,
        fy: result.camera_matrix.fy,
        cx: result.camera_matrix.cx,
        cy: result.camera_matrix.cy,
        distCoeffs: result.dist_coeffs,
        rmsError: result.rms_error,
        imageSize: result.image_size,
        imageCount: result.image_count,
        board: selectedBoard,
        squareSize: currentSquareSize,
      }

      setCalibResult(calibData)

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
      // API 형식에 맞게 데이터 변환
      const saveData = {
        device_id: device?.id,
        camera: calibResult.camera,
        camera_matrix: [
          [calibResult.fx, 0, calibResult.cx],
          [0, calibResult.fy, calibResult.cy],
          [0, 0, 1]
        ],
        dist_coeffs: calibResult.distCoeffs,
        image_size: [calibResult.imageSize?.width, calibResult.imageSize?.height],
        rms_error: calibResult.rmsError,
        notes: `${calibResult.board} 보드, ${calibResult.imageCount}장 사용`
      }

      await onCalibrationComplete(saveData)

      // 저장 성공 후 결과 초기화
      setCalibResult(null)
      alert('✅ 캘리브레이션이 저장되었습니다. 히스토리 탭에서 확인하세요.')
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

  const handleSquareSizeChange = (value) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setCustomSquareSize(prev => ({ ...prev, [selectedBoard]: numValue }))
    }
  }

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📷</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 카메라 캘리브레이션을 진행할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Intrinsic 캘리브레이션 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/30 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📷</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Intrinsic 캘리브레이션</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              카메라 <span className="text-violet-400 font-medium">내부 파라미터</span>를 계산합니다.
              체커보드 이미지에서 코너를 검출하고, Zhang's Method를 사용해 카메라 행렬과 왜곡 계수를 추정합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-violet-400 font-semibold mb-1.5">📊 출력 항목</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• <span className="text-white">Camera Matrix (K)</span> - fx, fy, cx, cy</li>
                  <li>• <span className="text-white">Distortion Coeffs</span> - k1, k2, p1, p2, k3</li>
                  <li>• <span className="text-white">RMS Error</span> - 재투영 오차 (픽셀)</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-semibold mb-1.5">⚙️ 실행 환경</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• <span className="text-white">Pyodide</span> - 브라우저 내 Python 런타임</li>
                  <li>• <span className="text-white">OpenCV</span> - cv2.calibrateCamera()</li>
                  <li>• <span className="text-amber-400">최초 로딩 약 30초</span> 소요</li>
                </ul>
              </div>
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

      {/* 카메라 선택 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm mb-3">📹 카메라 선택</h3>
        <div className="flex gap-2">
          {cameras.map(cam => (
            <button key={cam} onClick={() => setSelectedCamera(cam)}
              className={'flex-1 px-4 py-3 rounded-lg text-sm font-medium transition border ' +
                (selectedCamera === cam
                  ? 'bg-violet-500/20 text-violet-400 border-violet-500/50'
                  : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600')}>
              {cam === 'front_cam' ? '📷 Front Camera' : '📷 Wrist Camera'}
            </button>
          ))}
        </div>
      </div>

      {/* 1. 체커보드 선택 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm mb-1">1️⃣ 체커보드 선택</h3>
        <p className="text-gray-500 text-xs mb-3">캘리브레이션에 사용할 체커보드를 선택하세요. A4 용지에 인쇄하여 사용합니다.</p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(boardConfigs).map(([key, config]) => (
            <button key={key} onClick={() => setSelectedBoard(key)}
              className={'p-3 rounded-lg border transition text-left ' + (selectedBoard === key ? 'bg-violet-500/20 border-violet-500/50' : 'bg-gray-900 border-gray-700 hover:border-gray-600')}>
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-white rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <img src={config.preview} alt={config.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{config.name}</span>
                    {selectedBoard === key && <span className="text-violet-400">✓</span>}
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{config.cols} x {config.rows} 코너</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">기본 {config.defaultSize}mm</p>
                  <a href={config.file} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-violet-400 text-xs hover:underline mt-1 inline-block">📄 PDF 다운로드</a>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. 보드 설정 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm mb-1">2️⃣ 보드 설정</h3>
        <p className="text-gray-500 text-xs mb-3">내부 코너 수 기준입니다. <span className="text-amber-400">⚠️ 사각형 크기는 반드시 출력 후 실측하여 입력하세요!</span></p>

        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
          <p className="text-amber-400 text-xs">
            📏 <strong>중요:</strong> PDF를 A4 용지에 "실제 크기"로 인쇄한 후, 자로 사각형 한 변의 길이를 측정하세요.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 p-3 rounded-lg">
            <p className="text-gray-500 text-xs">가로 코너 수</p>
            <p className="text-white text-lg font-mono">{currentBoard.cols}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-lg">
            <p className="text-gray-500 text-xs">세로 코너 수</p>
            <p className="text-white text-lg font-mono">{currentBoard.rows}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">사각형 크기 <span className="text-amber-400">*실측값</span></p>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={currentSquareSize}
                onChange={(e) => handleSquareSizeChange(e.target.value)}
                className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-lg font-mono focus:border-violet-500 focus:outline-none"
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
        <p className="text-gray-500 text-xs mb-3">체커보드가 포함된 이미지를 업로드하세요. 최소 10장 이상, 다양한 각도와 위치에서 촬영하면 정확도가 높아집니다.</p>

        <div onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          className={'p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition ' + (dragActive ? 'border-violet-400 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600')}>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
          <span className="text-3xl">📷</span>
          <p className="text-gray-400 text-sm mt-2">이미지를 드래그하거나 클릭하여 선택</p>
          <p className="text-gray-500 text-xs mt-1">JPG, PNG 지원 | 여러 장 선택 가능</p>
        </div>

        {images.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-sm font-medium">{images.length}장 업로드됨</span>
              {calibResult && <span className="text-emerald-400 text-xs">(검출 성공: {images.filter(i => i.detected === true).length}장)</span>}
            </div>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {images.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt={img.name}
                    className={'w-full h-16 object-cover rounded border ' + (img.detected === true ? 'border-emerald-500' : img.detected === false ? 'border-rose-500' : 'border-gray-700')} />
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
        <p className="text-gray-500 text-xs mb-3">이미지에서 체커보드 코너를 검출하고 카메라 파라미터를 계산합니다.</p>
        <button onClick={runCalibration} disabled={!pyReady || images.length < 3 || calibrating}
          className={'px-6 py-3 rounded-lg font-medium transition ' + (pyReady && images.length >= 3 && !calibrating ? 'bg-violet-500 hover:bg-violet-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed')}>
          {calibrating ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>처리 중...</span> : '🎯 캘리브레이션 시작'}
        </button>
        {images.length > 0 && images.length < 3 && <p className="text-amber-400 text-xs mt-2">⚠️ 최소 3장 이상의 이미지가 필요합니다.</p>}
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
                {calibResult.camera === 'wrist_cam' ? 'Wrist Camera' : 'Front Camera'}
              </span>
            </div>
          </div>

          {/* Camera Matrix */}
          <div className="mb-4">
            <h4 className="text-gray-400 text-xs mb-2">Camera Matrix (K)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-900 p-3 rounded-lg"><p className="text-gray-500 text-xs">fx (초점거리 X)</p><p className="text-violet-400 text-lg font-mono">{calibResult.fx?.toFixed(2)}</p></div>
              <div className="bg-gray-900 p-3 rounded-lg"><p className="text-gray-500 text-xs">fy (초점거리 Y)</p><p className="text-violet-400 text-lg font-mono">{calibResult.fy?.toFixed(2)}</p></div>
              <div className="bg-gray-900 p-3 rounded-lg"><p className="text-gray-500 text-xs">cx (주점 X)</p><p className="text-emerald-400 text-lg font-mono">{calibResult.cx?.toFixed(2)}</p></div>
              <div className="bg-gray-900 p-3 rounded-lg"><p className="text-gray-500 text-xs">cy (주점 Y)</p><p className="text-emerald-400 text-lg font-mono">{calibResult.cy?.toFixed(2)}</p></div>
            </div>
          </div>

          {/* Distortion Coefficients */}
          <div className="mb-4">
            <h4 className="text-gray-400 text-xs mb-2">Distortion Coefficients</h4>
            <div className="grid grid-cols-5 gap-2">
              {['k1', 'k2', 'p1', 'p2', 'k3'].map((label, i) => (
                <div key={label} className="bg-gray-900 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-[10px]">{label}</p>
                  <p className="text-amber-400 text-xs font-mono">{calibResult.distCoeffs?.[i]?.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 통계 */}
          <div className="flex gap-4 text-xs mb-4 p-3 bg-gray-900 rounded-lg">
            <div><span className="text-gray-500">RMS 오차: </span><span className={'font-mono ' + (calibResult.rmsError < 0.5 ? 'text-emerald-400' : calibResult.rmsError < 1 ? 'text-amber-400' : 'text-rose-400')}>{calibResult.rmsError?.toFixed(4)} px</span></div>
            <div><span className="text-gray-500">이미지: </span><span className="text-white font-mono">{calibResult.imageCount}장</span></div>
            <div><span className="text-gray-500">해상도: </span><span className="text-white font-mono">{calibResult.imageSize?.width} × {calibResult.imageSize?.height}</span></div>
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
          <p className="text-gray-500 text-xs mt-2 text-center">저장하면 히스토리 탭에서 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}

export default IntrinsicCalibration
