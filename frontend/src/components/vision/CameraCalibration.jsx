import { useState, useRef, useEffect } from 'react'

function CameraCalibration() {
  const [currentStep, setCurrentStep] = useState(0)
  const [images, setImages] = useState([])
  const [boardConfig, setBoardConfig] = useState({
    cornersX: 9,
    cornersY: 6,
    squareSize: 24.0,
  })
  const [calibrations, setCalibrations] = useState([])
  const [selectedCalib, setSelectedCalib] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [pyodideStatus, setPyodideStatus] = useState('loading')
  const [pyodideProgress, setPyodideProgress] = useState('')
  const pyodideRef = useRef(null)
  const fileInputRef = useRef(null)

  const latestCalib = calibrations.length > 0 ? calibrations[0] : null
  const activeCalib = selectedCalib || latestCalib

  const steps = [
    { id: 'intro', title: '소개', icon: '📖' },
    { id: 'prepare', title: '체커보드 준비', icon: '🖨️' },
    { id: 'capture', title: '이미지 촬영', icon: '📷' },
    { id: 'upload', title: '이미지 업로드', icon: '⬆️' },
    { id: 'history', title: '히스토리 & 분석', icon: '📊' },
  ]

  // Pyodide 초기화
  useEffect(() => {
    const initPyodide = async () => {
      try {
        setPyodideProgress('Pyodide 런타임 로딩 중...')
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        })
        setPyodideProgress('OpenCV 패키지 설치 중... (약 30초)')
        await pyodide.loadPackage(['numpy', 'opencv-python'])
        setPyodideProgress('준비 완료!')
        pyodideRef.current = pyodide
        setPyodideStatus('ready')
      } catch (err) {
        console.error('Pyodide init error:', err)
        setPyodideStatus('error')
        setPyodideProgress('로딩 실패: ' + err.message)
      }
    }
    initPyodide()
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    files.filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          src: e.target.result,
          status: 'pending',
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const base64ToBytes = (base64) => {
    const base64Data = base64.split(',')[1]
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  const runCalibration = async () => {
    if (!pyodideRef.current) return
    setAnalyzing(true)
    setProcessingStatus('캘리브레이션 실행 중...')

    try {
      const pyodide = pyodideRef.current
      const imageDataList = images.map(img => Array.from(base64ToBytes(img.src)))
      
      pyodide.globals.set('image_data_list', pyodide.toPy(imageDataList))
      pyodide.globals.set('corners_x', boardConfig.cornersX)
      pyodide.globals.set('corners_y', boardConfig.cornersY)
      pyodide.globals.set('square_size', boardConfig.squareSize)

      const result = await pyodide.runPythonAsync(`
import cv2
import numpy as np
import json

def calibrate_camera(image_data_list, corners_x, corners_y, square_size):
    objp = np.zeros((corners_x * corners_y, 3), np.float32)
    objp[:, :2] = np.mgrid[0:corners_x, 0:corners_y].T.reshape(-1, 2)
    objp *= square_size
    
    objpoints, imgpoints = [], []
    image_size = None
    image_results = []
    
    for idx, img_bytes in enumerate(image_data_list):
        nparr = np.array(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            image_results.append({"index": idx, "status": "failed"})
            continue
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if image_size is None:
            image_size = gray.shape[::-1]
        
        ret, corners = cv2.findChessboardCorners(gray, (corners_x, corners_y),
            cv2.CALIB_CB_ADAPTIVE_THRESH + cv2.CALIB_CB_NORMALIZE_IMAGE + cv2.CALIB_CB_FAST_CHECK)
        
        if ret:
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
            corners2 = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            objpoints.append(objp)
            imgpoints.append(corners2)
            image_results.append({"index": idx, "status": "success"})
        else:
            image_results.append({"index": idx, "status": "failed"})
    
    if len(objpoints) < 3:
        return json.dumps({"success": False, "error": f"최소 3장 필요 (현재: {len(objpoints)}장)", "image_results": image_results})
    
    ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, image_size, None, None)
    
    total_error = 0
    for i in range(len(objpoints)):
        imgpoints2, _ = cv2.projectPoints(objpoints[i], rvecs[i], tvecs[i], camera_matrix, dist_coeffs)
        total_error += cv2.norm(imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
    mean_error = total_error / len(objpoints)
    
    return json.dumps({
        "success": True,
        "camera_matrix": {"fx": float(camera_matrix[0,0]), "fy": float(camera_matrix[1,1]), 
                         "cx": float(camera_matrix[0,2]), "cy": float(camera_matrix[1,2]), "matrix": camera_matrix.tolist()},
        "distortion": {"k1": float(dist_coeffs[0,0]), "k2": float(dist_coeffs[0,1]), 
                      "p1": float(dist_coeffs[0,2]), "p2": float(dist_coeffs[0,3]),
                      "k3": float(dist_coeffs[0,4]) if dist_coeffs.shape[1] > 4 else 0.0, "coefficients": dist_coeffs.tolist()},
        "reprojection_error": float(mean_error),
        "image_size": {"width": int(image_size[0]), "height": int(image_size[1])},
        "used_images": len(objpoints), "total_images": len(image_data_list), "image_results": image_results
    })

result = calibrate_camera(list(image_data_list), int(corners_x), int(corners_y), float(square_size))
result
      `)

      const calibResult = JSON.parse(result)
      
      if (calibResult.success) {
        setImages(prev => prev.map((img, idx) => ({
          ...img,
          status: calibResult.image_results.find(r => r.index === idx)?.status === 'success' ? 'success' : 'failed'
        })))
        
        const newCalib = {
          id: Date.now(),
          created_at: new Date().toISOString(),
          notes: `Calibration ${new Date().toLocaleString()}`,
          boardConfig: { ...boardConfig },
          result: calibResult,
        }
        setCalibrations(prev => [newCalib, ...prev])
        setCurrentStep(4)
      } else {
        alert('캘리브레이션 실패: ' + calibResult.error)
      }
    } catch (err) {
      console.error('Calibration error:', err)
      alert('캘리브레이션 오류: ' + err.message)
    } finally {
      setAnalyzing(false)
      setProcessingStatus('')
    }
  }

  const exportResult = (calib) => {
    const exportData = {
      timestamp: calib.created_at,
      boardConfig: calib.boardConfig,
      cameraMatrix: calib.result.camera_matrix.matrix,
      distortionCoefficients: calib.result.distortion.coefficients,
      reprojectionError: calib.result.reprojection_error,
      imageSize: calib.result.image_size,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `camera_calibration_${calib.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = (id) => {
    if (confirm('삭제하시겠습니까?')) {
      setCalibrations(prev => prev.filter(c => c.id !== id))
      if (selectedCalib?.id === id) setSelectedCalib(null)
    }
  }

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className={`p-3 rounded-lg ${
              pyodideStatus === 'ready' ? 'bg-emerald-500/20 border border-emerald-500/30' : 
              pyodideStatus === 'error' ? 'bg-rose-500/20 border border-rose-500/30' :
              'bg-amber-500/20 border border-amber-500/30'
            }`}>
              {pyodideStatus === 'ready' ? (
                <span className="text-emerald-400 text-sm">✅ Python + OpenCV 준비 완료!</span>
              ) : pyodideStatus === 'error' ? (
                <span className="text-rose-400 text-sm">❌ {pyodideProgress}</span>
              ) : (
                <span className="text-amber-400 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></span>
                  {pyodideProgress}
                </span>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-6 rounded-xl border border-blue-500/30">
              <h3 className="text-xl font-bold text-white mb-3">🎯 Camera Calibration이란?</h3>
              <p className="text-gray-300">
                카메라 렌즈의 <span className="text-amber-400">왜곡(distortion)</span>을 측정하고 보정합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <h4 className="text-rose-400 font-semibold mb-3">❌ 캘리브레이션 없이</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 직선이 휘어져 보임</li>
                  <li>• 거리 측정 부정확</li>
                  <li>• 로봇 제어 오차</li>
                </ul>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                <h4 className="text-emerald-400 font-semibold mb-3">✅ 캘리브레이션 후</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 왜곡 제거</li>
                  <li>• 정확한 측정</li>
                  <li>• 비전 정확도 향상</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
              <h4 className="text-cyan-400 font-semibold mb-3">📐 구하는 파라미터</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-300 mb-1">Camera Matrix</p>
                  <p className="text-gray-500 text-xs">fx, fy (초점거리), cx, cy (주점)</p>
                </div>
                <div>
                  <p className="text-gray-300 mb-1">Distortion</p>
                  <p className="text-gray-500 text-xs">k1, k2, k3 (방사형), p1, p2 (접선)</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'prepare':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">🖨️ 체커보드 준비</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">📥 패턴 다운로드</h4>
                  <a href="https://docs.opencv.org/4.x/pattern.png" target="_blank" rel="noopener noreferrer"
                    className="block w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-center font-medium">
                    체커보드 이미지 열기
                  </a>
                  <p className="text-xs text-gray-500 mt-2 text-center">10×7 칸 = 9×6 코너</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">⚙️ 보드 설정</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400 w-20">가로 코너:</label>
                      <input type="number" value={boardConfig.cornersX}
                        onChange={e => setBoardConfig(prev => ({ ...prev, cornersX: parseInt(e.target.value) || 9 }))}
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400 w-20">세로 코너:</label>
                      <input type="number" value={boardConfig.cornersY}
                        onChange={e => setBoardConfig(prev => ({ ...prev, cornersY: parseInt(e.target.value) || 6 }))}
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400 w-20">칸 크기(mm):</label>
                      <input type="number" step="0.1" value={boardConfig.squareSize}
                        onChange={e => setBoardConfig(prev => ({ ...prev, squareSize: parseFloat(e.target.value) || 24 }))}
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                <p className="text-amber-400 text-sm">⚠️ 출력 후 자로 실측하여 칸 크기를 입력하세요!</p>
              </div>
            </div>
          </div>
        )

      case 'capture':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">📷 촬영 가이드</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-emerald-400 font-semibold mb-2">✅ 좋은 촬영</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 다양한 각도로 기울여서</li>
                    <li>• 이미지 전체 영역에 고루</li>
                    <li>• 10~20장 이상</li>
                    <li>• 초점이 맞은 선명한 이미지</li>
                  </ul>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-rose-400 font-semibold mb-2">❌ 피해야 할 것</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 같은 각도로만</li>
                    <li>• 흔들리거나 흐린 이미지</li>
                    <li>• 체커보드 잘린 이미지</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'upload':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">⬆️ 이미지 업로드</h3>
              
              <div className="mb-4 p-3 bg-gray-900 rounded-lg flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  보드: <span className="text-cyan-400">{boardConfig.cornersX}×{boardConfig.cornersY}</span> 코너, 
                  <span className="text-cyan-400"> {boardConfig.squareSize}mm</span>
                </span>
                <button onClick={() => setCurrentStep(1)} className="text-amber-400 text-xs">설정 변경 →</button>
              </div>

              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 hover:border-cyan-400 rounded-xl p-8 text-center cursor-pointer">
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                <div className="text-4xl mb-3">📁</div>
                <p className="text-gray-300">클릭하거나 이미지 드래그</p>
                <p className="text-gray-500 text-sm mt-1">10~20장 권장</p>
              </div>

              {images.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">{images.length}장</span>
                    <button onClick={() => setImages([])} className="text-xs text-rose-400">전체 삭제</button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.src} className={`w-full h-16 object-cover rounded border-2 ${
                          img.status === 'success' ? 'border-emerald-500' :
                          img.status === 'failed' ? 'border-rose-500' : 'border-gray-600'
                        }`} />
                        {img.status === 'success' && <span className="absolute bottom-0 left-0 text-emerald-400 text-xs">✓</span>}
                        {img.status === 'failed' && <span className="absolute bottom-0 left-0 text-rose-400 text-xs">✗</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {images.length >= 3 && (
                <button onClick={runCalibration} disabled={analyzing || pyodideStatus !== 'ready'}
                  className={`w-full mt-4 py-4 rounded-xl text-lg font-bold transition ${
                    analyzing || pyodideStatus !== 'ready'
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                  }`}>
                  {analyzing ? '분석 중...' : '🚀 캘리브레이션 실행'}
                </button>
              )}
            </div>
          </div>
        )

      case 'history':
        return (
          <div className="space-y-6">
            {/* 히스토리 */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="flex justify-between mb-3">
                <h3 className="text-lg font-bold text-white">📋 히스토리</h3>
                <span className="text-sm text-gray-400">{calibrations.length}개</span>
              </div>

              {calibrations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">캘리브레이션 기록이 없습니다.</p>
                  <button onClick={() => setCurrentStep(3)} className="mt-2 text-cyan-400 text-sm">이미지 업로드 →</button>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {calibrations.map((calib, idx) => (
                    <div key={calib.id} onClick={() => setSelectedCalib(calib)}
                      className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
                        activeCalib?.id === calib.id ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-gray-900'
                      }`}>
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">Latest</span>}
                        <span className="text-white text-sm">{calib.notes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">RMS: {calib.result.reprojection_error.toFixed(3)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(calib.id) }}
                          className="text-rose-400 text-xs">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 선택된 결과 상세 */}
            {activeCalib && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between mb-3">
                  <h4 className="text-white font-medium">{activeCalib.notes}</h4>
                  <button onClick={() => exportResult(activeCalib)}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded">📤 Export</button>
                </div>

                {/* 품질 표시 */}
                <div className={`p-3 rounded-lg mb-4 ${
                  activeCalib.result.reprojection_error < 0.5 ? 'bg-emerald-500/20' :
                  activeCalib.result.reprojection_error < 1.0 ? 'bg-amber-500/20' : 'bg-rose-500/20'
                }`}>
                  <div className="flex justify-between">
                    <span className={`font-semibold ${
                      activeCalib.result.reprojection_error < 0.5 ? 'text-emerald-400' :
                      activeCalib.result.reprojection_error < 1.0 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {activeCalib.result.reprojection_error < 0.5 ? '✅ 우수' :
                       activeCalib.result.reprojection_error < 1.0 ? '⚠️ 양호' : '❌ 재촬영 권장'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {activeCalib.result.used_images}/{activeCalib.result.total_images} 이미지 사용
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    재투영 오차: <span className="font-mono">{activeCalib.result.reprojection_error.toFixed(4)}</span> px
                  </p>
                </div>

                {/* Camera Matrix */}
                <div className="bg-gray-900 p-3 rounded-lg mb-3">
                  <h5 className="text-cyan-400 text-sm font-medium mb-2">Camera Matrix</h5>
                  <div className="grid grid-cols-4 gap-2">
                    {['fx', 'fy', 'cx', 'cy'].map(k => (
                      <div key={k} className="bg-gray-800 p-2 rounded text-center">
                        <span className="text-xs text-gray-500">{k}</span>
                        <p className="text-white font-mono text-xs">{activeCalib.result.camera_matrix[k].toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distortion */}
                <div className="bg-gray-900 p-3 rounded-lg">
                  <h5 className="text-amber-400 text-sm font-medium mb-2">Distortion</h5>
                  <div className="grid grid-cols-5 gap-2">
                    {['k1', 'k2', 'p1', 'p2', 'k3'].map(k => (
                      <div key={k} className="bg-gray-800 p-2 rounded text-center">
                        <span className="text-xs text-gray-500">{k}</span>
                        <p className="text-white font-mono text-[10px]">{activeCalib.result.distortion[k].toFixed(4)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 히스토리 비교 분석 */}
            {calibrations.length > 1 && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h4 className="text-lg font-bold text-white mb-3">📊 히스토리 비교</h4>
                
                <div className="space-y-3">
                  {/* RMS 비교 */}
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <h5 className="text-sm text-gray-300 mb-2">재투영 오차 (RMS)</h5>
                    <div className="flex items-end gap-1 h-20">
                      {calibrations.slice().reverse().map((c, i) => {
                        const maxRms = Math.max(...calibrations.map(x => x.result.reprojection_error))
                        const height = (c.result.reprojection_error / maxRms) * 100
                        return (
                          <div key={c.id} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-full rounded-t ${
                                c.result.reprojection_error < 0.5 ? 'bg-emerald-500' :
                                c.result.reprojection_error < 1.0 ? 'bg-amber-500' : 'bg-rose-500'
                              } ${activeCalib?.id === c.id ? 'ring-2 ring-cyan-400' : ''}`}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[8px] text-gray-500 mt-1">#{i + 1}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* fx 비교 */}
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <h5 className="text-sm text-gray-300 mb-2">초점거리 (fx) 변화</h5>
                    <div className="flex items-center gap-2">
                      {calibrations.slice().reverse().map((c, i) => (
                        <div key={c.id} className={`flex-1 text-center p-2 rounded ${
                          activeCalib?.id === c.id ? 'bg-cyan-500/20 border border-cyan-500' : 'bg-gray-800'
                        }`}>
                          <span className="text-[10px] text-gray-500">#{i + 1}</span>
                          <p className="text-white font-mono text-xs">{c.result.camera_matrix.fx.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* 스텝 인디케이터 */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <button key={step.id} onClick={() => setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
                currentStep === index ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <span className="text-lg">{step.icon}</span>
              <span className="text-[10px]">{step.title}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />
        </div>
      </div>

      {renderStepContent()}

      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0}
          className={`px-6 py-2 rounded-lg ${currentStep === 0 ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
          ← 이전
        </button>
        <button onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStep === steps.length - 1}
          className={`px-6 py-2 rounded-lg ${currentStep === steps.length - 1 ? 'bg-gray-700 text-gray-500' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`}>
          다음 →
        </button>
      </div>
    </div>
  )
}

export default CameraCalibration
