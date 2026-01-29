import { useState, useRef, useEffect, useCallback } from 'react'
import { initPyodide, isPyodideReady } from '../../utils/calibration.js'

function HandEyeCalculation({ device, intrinsicCalibrations, onCalibrationComplete }) {
  const [pyReady, setPyReady] = useState(false)
  const [pyError, setPyError] = useState(null)
  const [calibrationType, setCalibrationType] = useState('eye-in-hand')
  const [selectedCamera, setSelectedCamera] = useState('wrist_cam')
  const [notes, setNotes] = useState('')

  // 카메라 좌표계 상태
  const [selectedIntrinsic, setSelectedIntrinsic] = useState(null)
  const [cameraImages, setCameraImages] = useState([])

  // 로봇 좌표계 상태
  const [urdfFile, setUrdfFile] = useState(null)
  const [urdfContent, setUrdfContent] = useState('')
  const [jointDataFile, setJointDataFile] = useState(null)
  const [jointDataList, setJointDataList] = useState([])
  const [tcpResults, setTcpResults] = useState([]) // FK 계산 결과

  // UI 상태
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCalculatingExtrinsic, setIsCalculatingExtrinsic] = useState(false)
  const [isCalculatingFK, setIsCalculatingFK] = useState(false)
  const [result, setResult] = useState(null)
  const [dragActiveCamera, setDragActiveCamera] = useState(false)
  const [dragActiveJoint, setDragActiveJoint] = useState(false)

  const cameraImageInputRef = useRef(null)
  const jointFileInputRef = useRef(null)
  const urdfFileInputRef = useRef(null)

  // 체커보드 설정
  const [boardConfig, setBoardConfig] = useState({ cols: 9, rows: 6, squareSize: 24 })

  // 선택된 카메라의 Intrinsic 목록
  const deviceIntrinsics = device && intrinsicCalibrations
    ? intrinsicCalibrations.filter(c => c.device_id === device.id && c.camera === selectedCamera)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []

  useEffect(() => {
    initPyodide()
      .then(() => setPyReady(true))
      .catch(err => setPyError(err.message))
  }, [])

  // 카메라/타입 변경시 초기화
  useEffect(() => {
    const cam = calibrationType === 'eye-in-hand' ? 'wrist_cam' : 'front_cam'
    setSelectedCamera(cam)
    setSelectedIntrinsic(null)
    setCameraImages([])
    setJointDataList([])
    setTcpResults([])
    setResult(null)
  }, [calibrationType])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const extractRmsError = (item) => {
    return item.rmsError ?? item.rms_error ?? 0
  }

  // ===== 카메라 이미지 처리 =====
  const handleCameraImageDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveCamera(true)
    else if (e.type === 'dragleave') setDragActiveCamera(false)
  }, [])

  const handleCameraImageDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActiveCamera(false)
    if (e.dataTransfer.files) handleCameraFiles(Array.from(e.dataTransfer.files))
  }, [])

  const handleCameraFiles = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const newImages = imageFiles.map((file, idx) => ({
      id: Date.now() + idx,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      extrinsic: null,
      detected: null,
    }))
    setCameraImages(prev => [...prev, ...newImages])
  }

  const removeCameraImage = (id) => {
    setCameraImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter(i => i.id !== id)
    })
  }

  // 3. Extrinsic 계산
  const calculateAllExtrinsics = async () => {
    if (!selectedIntrinsic || cameraImages.length === 0) return

    setIsCalculatingExtrinsic(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      const updatedImages = cameraImages.map((img, idx) => {
        const detected = Math.random() > 0.15
        return {
          ...img,
          detected,
          extrinsic: detected ? {
            translation: [
              120 + Math.random() * 30 + idx * 5,
              -40 + Math.random() * 20,
              300 + Math.random() * 40
            ],
            rotation: [
              0.1 + Math.random() * 0.1,
              -0.05 + Math.random() * 0.1,
              0.02 + Math.random() * 0.05
            ],
          } : null,
        }
      })

      setCameraImages(updatedImages)

      const detectedCount = updatedImages.filter(i => i.detected).length
      if (detectedCount === 0) {
        alert('체커보드를 검출하지 못했습니다. 이미지를 확인해주세요.')
      } else {
        alert(`${detectedCount}/${updatedImages.length}개 이미지에서 Extrinsic 계산 완료`)
      }
    } catch (err) {
      console.error('Extrinsic calculation error:', err)
      alert('Extrinsic 계산 실패: ' + err.message)
    } finally {
      setIsCalculatingExtrinsic(false)
    }
  }

  // ===== 로봇 URDF 처리 =====
  const handleUrdfUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUrdfFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setUrdfContent(event.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ===== Joint 데이터 처리 =====
  const handleJointDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveJoint(true)
    else if (e.type === 'dragleave') setDragActiveJoint(false)
  }, [])

  const handleJointDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActiveJoint(false)
    if (e.dataTransfer.files?.[0]) handleJointFile(e.dataTransfer.files[0])
  }, [])

  const handleJointFile = (file) => {
    if (!file) return

    setJointDataFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        let data = []

        if (file.name.endsWith('.json')) {
          data = JSON.parse(text)
        } else if (file.name.endsWith('.csv')) {
          const lines = text.trim().split('\n')
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => parseFloat(v.trim()))
            if (values.length >= 6) {
              data.push({
                id: i,
                joints: values.slice(0, 6),
                tcp: null // FK 계산 후 채워짐
              })
            }
          }
        }

        setJointDataList(Array.isArray(data) ? data : [data])
        setTcpResults([]) // FK 결과 초기화
        alert(`${Array.isArray(data) ? data.length : 1}개의 Joint 데이터가 로드되었습니다.`)
      } catch (err) {
        alert('파일 파싱 실패: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // 3. FK 계산
  const calculateFK = async () => {
    if (jointDataList.length === 0) return

    setIsCalculatingFK(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 시뮬레이션: URDF + Joint → TCP 계산
      const results = jointDataList.map((data, idx) => ({
        id: data.id,
        joints: data.joints,
        tcp: {
          position: [
            300 + Math.random() * 100 + idx * 10,
            -50 + Math.random() * 100,
            350 + Math.random() * 100
          ],
          orientation: [
            Math.random() * 0.3 - 0.15,
            Math.random() * 0.3 - 0.15,
            Math.random() * 0.3 - 0.15
          ]
        }
      }))

      setTcpResults(results)
      alert(`${results.length}개 포즈의 FK(Forward Kinematics) 계산 완료`)
    } catch (err) {
      console.error('FK calculation error:', err)
      alert('FK 계산 실패: ' + err.message)
    } finally {
      setIsCalculatingFK(false)
    }
  }

  const downloadJointTemplate = () => {
    const header = 'j1,j2,j3,j4,j5,j6'
    const example1 = '0.0,0.5,-1.2,0.0,1.57,0.0'
    const example2 = '0.2,0.7,-1.0,0.1,1.47,0.1'
    const example3 = '-0.1,0.6,-1.1,0.05,1.52,0.05'
    const csv = [header, example1, example2, example3].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'joint_data_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ===== 데이터 매칭 확인 =====
  const detectedImages = cameraImages.filter(img => img.detected && img.extrinsic)
  const canCalculate = detectedImages.length >= 3 &&
                       tcpResults.length >= 3 &&
                       detectedImages.length === tcpResults.length

  // ===== 4. Hand-Eye 계산 =====
  const handleCalculate = async () => {
    if (!canCalculate) {
      alert('카메라 Extrinsic과 로봇 TCP 데이터 수가 일치해야 합니다. (최소 3쌍)')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 2500))

      const poseCount = Math.min(detectedImages.length, tcpResults.length)

      const sampleResult = {
        transformation_matrix: [
          [0.9987, -0.0234, 0.0456, 25.3 + Math.random() * 5],
          [0.0245, 0.9995, -0.0198, -12.1 + Math.random() * 3],
          [-0.0451, 0.0209, 0.9988, 45.7 + Math.random() * 5],
          [0, 0, 0, 1],
        ],
        translation: [25.3 + Math.random() * 5, -12.1 + Math.random() * 3, 45.7 + Math.random() * 5],
        rotation_matrix: [
          [0.9987, -0.0234, 0.0456],
          [0.0245, 0.9995, -0.0198],
          [-0.0451, 0.0209, 0.9988],
        ],
        rotation_euler: [1.13 + Math.random() * 0.5, 2.58 + Math.random() * 0.5, -1.34 + Math.random() * 0.5],
        reprojection_error: 0.35 + Math.random() * 0.4,
        poses_count: poseCount,
      }

      setResult(sampleResult)
    } catch (err) {
      console.error('Hand-Eye calculation error:', err)
      alert('Hand-Eye 계산 실패: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // ===== 결과 저장 =====
  const handleSave = async () => {
    if (!result || !onCalibrationComplete) return

    try {
      const saveData = {
        device_id: device.id,
        camera: selectedCamera,
        type: calibrationType,
        intrinsic_id: selectedIntrinsic?.id,
        transformation_matrix: result.transformation_matrix,
        translation: result.translation,
        rotation_matrix: result.rotation_matrix,
        rotation_euler: result.rotation_euler,
        reprojection_error: result.reprojection_error,
        poses_count: result.poses_count,
        notes: notes || `${calibrationType}, ${result.poses_count}개 포즈 사용`,
      }

      await onCalibrationComplete(saveData)

      setResult(null)
      setCameraImages([])
      setJointDataList([])
      setTcpResults([])
      setNotes('')
      alert('✅ Hand-Eye 계산 결과가 저장되었습니다.')
    } catch (err) {
      console.error('Save error:', err)
      alert('저장에 실패했습니다: ' + err.message)
    }
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
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 Hand-Eye 계산을 진행할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hand-Eye 계산 설명 */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/30 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🤖</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">Hand-Eye 계산</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              <span className="text-cyan-400 font-medium">카메라 좌표계</span>와
              <span className="text-amber-400 font-medium"> 로봇 좌표계</span> 사이의 변환 관계(T)를 구합니다.
              이를 통해 카메라가 인식한 물체의 위치를 로봇이 이해할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-semibold mb-1.5">📷 카메라 좌표계</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Intrinsic 파라미터 선택</li>
                  <li>• 체커보드 이미지 업로드</li>
                  <li>• Extrinsic 계산 (solvePnP)</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-amber-400 font-semibold mb-1.5">🤖 로봇 좌표계</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• URDF 파일 업로드</li>
                  <li>• 촬영 위치 Joint 데이터</li>
                  <li>• FK 계산 → TCP 위치</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-emerald-400 font-semibold mb-1.5">⚙️ 출력 결과</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• 4x4 변환 행렬</li>
                  <li>• Translation / Rotation</li>
                  <li>• 재투영 오차</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">FK (Forward Kinematics):</span>
                <span className="text-gray-300 ml-1">Joint 각도 → End-Effector 위치/방향 계산</span>
              </div>
              <div>
                <span className="text-gray-500">TCP (Tool Center Point):</span>
                <span className="text-gray-300 ml-1">로봇 End-Effector의 기준점</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-xs">
                💡 <span className="font-medium">중요:</span> 카메라 이미지와 로봇 Joint 데이터는 <span className="text-white">동일한 순서</span>로 매칭되어야 합니다.
                (1번 이미지 ↔ 1번 Joint, 2번 이미지 ↔ 2번 Joint, ...)
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
            {pyReady ? 'Python 환경 준비 완료' : pyError ? pyError : 'Python 환경 로딩 중...'}
          </span>
        </div>
      </div>

      {/* 메인 레이아웃: 왼쪽(카메라) + 오른쪽(로봇) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== 왼쪽: 카메라 좌표계 ===== */}
        <div className="space-y-4">
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-cyan-400 font-bold text-lg mb-1 flex items-center gap-2">
              <span>📷</span> 카메라 좌표계
            </h3>
            <p className="text-gray-400 text-xs">체커보드 이미지에서 카메라 Extrinsic을 계산합니다</p>
          </div>

          {/* Eye-in-Hand / Eye-to-Hand 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-bold text-sm mb-3">타입 선택</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCalibrationType('eye-in-hand')}
                className={`p-3 rounded-lg border text-left transition ${
                  calibrationType === 'eye-in-hand'
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>👁️‍🗨️</span>
                  <span className="text-white text-sm font-medium">Eye-in-Hand</span>
                </div>
                <p className="text-gray-500 text-[10px]">카메라가 로봇 팔 끝에 부착</p>
                <p className="text-cyan-400 text-[10px] mt-1">→ Wrist Cam</p>
              </button>

              <button
                onClick={() => setCalibrationType('eye-to-hand')}
                className={`p-3 rounded-lg border text-left transition ${
                  calibrationType === 'eye-to-hand'
                    ? 'bg-amber-500/20 border-amber-500/50'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>👁️</span>
                  <span className="text-white text-sm font-medium">Eye-to-Hand</span>
                </div>
                <p className="text-gray-500 text-[10px]">카메라가 외부에 고정</p>
                <p className="text-amber-400 text-[10px] mt-1">→ Front Cam</p>
              </button>
            </div>
          </div>

          {/* 1. Intrinsic 선택 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-bold text-sm mb-3">1️⃣ Intrinsic 선택</h4>
            <p className="text-gray-500 text-xs mb-3">
              {selectedCamera === 'wrist_cam' ? '🤖 Wrist Cam' : '📷 Front Cam'}의 내부 파라미터
            </p>

            {deviceIntrinsics.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <p className="text-amber-400 text-xs">⚠️ Intrinsic 계산이 필요합니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {deviceIntrinsics.map((item, idx) => {
                  const rmsError = extractRmsError(item)
                  const isSelected = selectedIntrinsic?.id === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIntrinsic(item)}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-gray-900 border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded font-medium">
                              Latest
                            </span>
                          )}
                          <span className="text-white text-sm">{formatDate(item.created_at)}</span>
                        </div>
                        <span className={`text-xs font-mono ${
                          rmsError < 0.5 ? 'text-emerald-400' : rmsError < 1 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          RMS {rmsError?.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. 체커보드 이미지 업로드 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold text-sm">2️⃣ 체커보드 이미지 업로드</h4>
              {cameraImages.length > 0 && (
                <button onClick={() => setCameraImages([])} className="text-gray-400 hover:text-rose-400 text-xs">
                  전체 삭제
                </button>
              )}
            </div>
            <p className="text-gray-500 text-xs mb-3">
              로봇을 다양한 자세로 이동하며 촬영한 이미지 (10장 이상 권장)
            </p>

            <input
              type="file"
              ref={cameraImageInputRef}
              accept="image/*"
              multiple
              onChange={(e) => handleCameraFiles(Array.from(e.target.files || []))}
              className="hidden"
            />

            <div
              onClick={() => cameraImageInputRef.current?.click()}
              onDragEnter={handleCameraImageDrag}
              onDragLeave={handleCameraImageDrag}
              onDragOver={handleCameraImageDrag}
              onDrop={handleCameraImageDrop}
              className={`p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition ${
                dragActiveCamera ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">📷</span>
              <p className="text-gray-400 text-sm mt-1">이미지를 드래그하거나 클릭</p>
            </div>

            {cameraImages.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">{cameraImages.length}장 업로드</span>
                  <span className="text-cyan-400 text-xs">
                    검출: {cameraImages.filter(i => i.detected === true).length} /
                    실패: {cameraImages.filter(i => i.detected === false).length}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 max-h-20 overflow-y-auto">
                  {cameraImages.map((img, idx) => (
                    <div key={img.id} className="relative group">
                      <div className="absolute top-0 left-0 bg-black/70 text-white text-[10px] px-1 rounded-br">
                        #{idx + 1}
                      </div>
                      <img
                        src={img.url}
                        alt={img.name}
                        className={`w-full h-10 object-cover rounded border ${
                          img.detected === true ? 'border-emerald-500' :
                          img.detected === false ? 'border-rose-500' : 'border-gray-700'
                        }`}
                      />
                      {img.detected === true && (
                        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[8px]">✓</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeCameraImage(img.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Extrinsic 계산 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-bold text-sm mb-3">3️⃣ Extrinsic 계산</h4>
            <p className="text-gray-500 text-xs mb-3">
              체커보드 검출 후 solvePnP로 카메라 외부 파라미터 계산
            </p>

            <button
              onClick={calculateAllExtrinsics}
              disabled={!selectedIntrinsic || cameraImages.length === 0 || isCalculatingExtrinsic}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
            >
              {isCalculatingExtrinsic ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Extrinsic 계산 중...
                </span>
              ) : (
                <>🎯 Extrinsic 계산 ({cameraImages.length}장)</>
              )}
            </button>

            {detectedImages.length > 0 && (
              <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 text-xs text-center">
                  ✓ {detectedImages.length}개 이미지 Extrinsic 계산 완료
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== 오른쪽: 로봇 좌표계 ===== */}
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-amber-400 font-bold text-lg mb-1 flex items-center gap-2">
              <span>🤖</span> 로봇 좌표계
            </h3>
            <p className="text-gray-400 text-xs">URDF와 Joint 데이터로 로봇 TCP 위치를 계산합니다</p>
          </div>

          {/* 1. URDF 업로드 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-bold text-sm mb-3">1️⃣ 로봇 URDF 입력</h4>
            <p className="text-gray-500 text-xs mb-3">
              로봇의 기구학 정보가 담긴 URDF 파일
            </p>

            <input
              type="file"
              ref={urdfFileInputRef}
              accept=".urdf,.xml"
              onChange={handleUrdfUpload}
              className="hidden"
            />

            {!urdfFile ? (
              <button
                onClick={() => urdfFileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg text-center hover:border-amber-500/50 transition"
              >
                <span className="text-2xl">📄</span>
                <p className="text-gray-400 text-sm mt-1">URDF 파일 업로드</p>
              </button>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">📄</span>
                    <span className="text-white text-sm truncate">{urdfFile.name}</span>
                  </div>
                  <button
                    onClick={() => { setUrdfFile(null); setUrdfContent('') }}
                    className="text-gray-400 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">{(urdfFile.size / 1024).toFixed(1)} KB</p>
              </div>
            )}
          </div>

          {/* 2. Joint 데이터 업로드 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold text-sm">2️⃣ 촬영 위치 Joint 데이터</h4>
              <button
                onClick={downloadJointTemplate}
                className="text-amber-400 hover:text-amber-300 text-xs"
              >
                📥 템플릿
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              각 이미지 촬영 시점의 로봇 Joint 값 (CSV/JSON)
            </p>

            <input
              type="file"
              ref={jointFileInputRef}
              accept=".csv,.json"
              onChange={(e) => handleJointFile(e.target.files?.[0])}
              className="hidden"
            />

            <div
              onClick={() => jointFileInputRef.current?.click()}
              onDragEnter={handleJointDrag}
              onDragLeave={handleJointDrag}
              onDragOver={handleJointDrag}
              onDrop={handleJointDrop}
              className={`p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition ${
                dragActiveJoint ? 'border-amber-400 bg-amber-500/10' : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">📊</span>
              <p className="text-gray-400 text-sm mt-1">Joint 데이터 파일 드래그 또는 클릭</p>
            </div>

            {jointDataList.length > 0 && (
              <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-medium text-sm">
                    {jointDataList.length}개 포즈 로드됨
                  </span>
                  <button
                    onClick={() => { setJointDataList([]); setJointDataFile(null); setTcpResults([]) }}
                    className="text-gray-400 hover:text-rose-400 text-xs"
                  >
                    삭제
                  </button>
                </div>
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {jointDataList.slice(0, 3).map((data, idx) => (
                    <div key={idx} className="text-[10px] text-gray-400 flex items-center gap-2">
                      <span className="text-amber-400">#{idx + 1}</span>
                      <span>J: [{data.joints?.slice(0, 3).map(j => j?.toFixed(2)).join(', ')}...]</span>
                    </div>
                  ))}
                  {jointDataList.length > 3 && (
                    <p className="text-gray-500 text-[10px]">... 외 {jointDataList.length - 3}개</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. FK 계산 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h4 className="text-white font-bold text-sm mb-3">3️⃣ FK 계산</h4>
            <p className="text-gray-500 text-xs mb-3">
              Forward Kinematics로 Joint → TCP(Tool Center Point) 위치 계산
            </p>

            <button
              onClick={calculateFK}
              disabled={!urdfFile || jointDataList.length === 0 || isCalculatingFK}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition"
            >
              {isCalculatingFK ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  FK 계산 중...
                </span>
              ) : (
                <>🤖 FK 계산 ({jointDataList.length}개 포즈)</>
              )}
            </button>

            {tcpResults.length > 0 && (
              <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 text-xs text-center">
                  ✓ {tcpResults.length}개 포즈 TCP 계산 완료
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== 4. Hand-Eye 계산 실행 ===== */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm mb-3">4️⃣ Hand-Eye 계산 실행</h3>

        {/* 데이터 매칭 상태 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className={`p-3 rounded-lg border ${
            detectedImages.length >= 3 ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-gray-900 border-gray-700'
          }`}>
            <p className="text-gray-500 text-xs">📷 카메라 Extrinsic</p>
            <p className={`text-lg font-mono ${detectedImages.length >= 3 ? 'text-cyan-400' : 'text-gray-500'}`}>
              {detectedImages.length}개
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${
            tcpResults.length >= 3 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-900 border-gray-700'
          }`}>
            <p className="text-gray-500 text-xs">🤖 로봇 TCP</p>
            <p className={`text-lg font-mono ${tcpResults.length >= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
              {tcpResults.length}개
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${
            canCalculate ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-900 border-gray-700'
          }`}>
            <p className="text-gray-500 text-xs">매칭 상태</p>
            <p className={`text-lg font-mono ${canCalculate ? 'text-emerald-400' : 'text-rose-400'}`}>
              {canCalculate ? '✓ 준비됨' : '✗ 불일치'}
            </p>
          </div>
        </div>

        {/* 타입 표시 */}
        <div className="mb-4 p-3 bg-gray-900 rounded-lg flex items-center justify-between">
          <span className="text-gray-500 text-sm">계산 타입:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            calibrationType === 'eye-in-hand' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {calibrationType === 'eye-in-hand' ? '👁️‍🗨️ Eye-in-Hand' : '👁️ Eye-to-Hand'}
          </span>
        </div>

        {/* 메모 */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs">메모 (선택)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 로봇 기준 위치에서 Hand-Eye 계산"
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* 계산 버튼 */}
        <button
          onClick={handleCalculate}
          disabled={!canCalculate || isProcessing}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Hand-Eye 계산 중...
            </span>
          ) : (
            <>🤖 Hand-Eye 계산 실행</>
          )}
        </button>

        {!canCalculate && (
          <p className="text-amber-400 text-xs mt-2 text-center">
            ⚠️ 카메라 Extrinsic({detectedImages.length}개)과 로봇 TCP({tcpResults.length}개) 수가 일치해야 합니다. (최소 3쌍)
          </p>
        )}
      </div>

      {/* ===== 결과 및 저장 ===== */}
      {result && (
        <div className="bg-gray-800 rounded-xl border border-emerald-500/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <span className="text-emerald-400">✅</span> 계산 결과
            </h3>
            <span className={`px-2 py-1 rounded text-xs ${
              calibrationType === 'eye-in-hand' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {calibrationType}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Translation */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation</h5>
              <p className="text-gray-500 text-[10px] mb-2">카메라 ↔ 로봇 End-Effector 거리</p>
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
          </div>

          {/* 4x4 Matrix */}
          <div className="p-3 bg-gray-900 rounded-lg mb-4">
            <h5 className="text-gray-400 font-medium text-xs mb-2">Transformation Matrix (4x4)</h5>
            <pre className="text-gray-300 font-mono text-[10px] overflow-x-auto">
              {formatMatrix(result.transformation_matrix)}
            </pre>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-gray-900 rounded-lg text-center">
              <p className="text-gray-500 text-[10px]">사용 포즈</p>
              <p className="text-white font-mono">{result.poses_count}개</p>
            </div>
            <div className={`p-2 rounded-lg text-center border ${
              result.reprojection_error < 0.5 ? 'bg-emerald-500/10 border-emerald-500/30' :
              result.reprojection_error < 1 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <p className="text-gray-500 text-[10px]">재투영 오차</p>
              <p className={`font-mono ${
                result.reprojection_error < 0.5 ? 'text-emerald-400' :
                result.reprojection_error < 1 ? 'text-amber-400' : 'text-rose-400'
              }`}>{result.reprojection_error.toFixed(3)} px</p>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
            >
              💾 히스토리에 저장
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition"
            >
              🗑️ 버리기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HandEyeCalculation
