import { useState, useRef, useMemo } from 'react'
import ExportButton from '../common/ExportButton'

function CalibrationHistory({ device, calibrations: propCalibs, setCalibrations: setPropCalibs }) {
  const [localCalibs, setLocalCalibs] = useState([])
  const calibrations = propCalibs || localCalibs
  const setCalibrations = setPropCalibs || setLocalCalibs
  
  const latestCalib = calibrations.length > 0 ? calibrations[0] : null
  const [selectedCalib, setSelectedCalib] = useState(null)
  const activeCalib = selectedCalib || latestCalib
  
  const [dragActive, setDragActive] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [notes, setNotes] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [error, setError] = useState('')
  const [hfDatasetId, setHfDatasetId] = useState('')
  const [hfLoading, setHfLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef(null)
  
  const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']

  // 오차 분석 데이터 (각 값별 범위)
  const errorAnalysis = useMemo(() => {
    if (calibrations.length === 0 || !activeCalib) return null
    return joints.map(joint => {
      const allData = calibrations.map(c => c.calibration_data[joint]).filter(Boolean)
      const localData = activeCalib.calibration_data[joint]
      if (!localData || allData.length === 0) return null

      const allMins = allData.map(d => d.range_min)
      const allMaxs = allData.map(d => d.range_max)
      const allHomings = allData.map(d => d.homing_offset)

      return {
        joint,
        min: {
          current: localData.range_min,
          min: Math.min(...allMins),
          max: Math.max(...allMins),
          avg: allMins.reduce((a, b) => a + b, 0) / allMins.length,
        },
        max: {
          current: localData.range_max,
          min: Math.min(...allMaxs),
          max: Math.max(...allMaxs),
          avg: allMaxs.reduce((a, b) => a + b, 0) / allMaxs.length,
        },
        homing: {
          current: localData.homing_offset,
          min: Math.min(...allHomings),
          max: Math.max(...allHomings),
          avg: allHomings.reduce((a, b) => a + b, 0) / allHomings.length,
        },
      }
    }).filter(Boolean)
  }, [calibrations, activeCalib])

  // JSON 파싱
  const parseJson = (text) => {
    try {
      const data = JSON.parse(text)
      if (data && typeof data === 'object') {
        const hasValid = joints.some(j => data[j] && typeof data[j].homing_offset === 'number')
        if (hasValid) {
          setPreviewData(data)
          setError('')
          return true
        }
      }
      setError('유효하지 않은 캘리브레이션 형식')
      return false
    } catch (e) {
      setError('JSON 파싱 오류: ' + e.message)
      return false
    }
  }

  // HuggingFace 로드
  const loadFromHuggingFace = async () => {
    if (!hfDatasetId.trim()) {
      setError('데이터셋 ID를 입력하세요')
      return
    }
    setHfLoading(true)
    setError('')
    try {
      const paths = [
        'https://huggingface.co/datasets/' + hfDatasetId + '/raw/main/meta/calibration/so101_follower_follower.json',
        'https://huggingface.co/datasets/' + hfDatasetId + '/raw/main/calibration/so101_follower_follower.json',
      ]
      let data = null
      for (const url of paths) {
        try {
          const res = await fetch(url)
          if (res.ok) { data = await res.json(); break }
        } catch (e) { /* continue */ }
      }
      if (data) {
        setPreviewData(data)
        setJsonText(JSON.stringify(data, null, 2))
        setNotes('HF: ' + hfDatasetId)
      } else {
        setError('캘리브레이션 파일을 찾을 수 없습니다')
      }
    } catch (err) {
      setError('로드 실패: ' + err.message)
    } finally {
      setHfLoading(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setJsonText(e.target.result)
      parseJson(e.target.result)
    }
    reader.readAsText(file)
  }

  const handleSave = () => {
    if (!previewData) return
    const newCalib = {
      id: Date.now(),
      device_id: device?.id,
      calibration_data: previewData,
      notes: notes || ('Calibration ' + new Date().toLocaleString()),
      created_at: new Date().toISOString(),
    }
    setCalibrations(prev => [newCalib, ...prev])
    setJsonText('')
    setNotes('')
    setPreviewData(null)
    setHfDatasetId('')
    setShowUpload(false)
  }

  const handleDelete = (id) => {
    if (confirm('삭제하시겠습니까?')) {
      setCalibrations(prev => prev.filter(c => c.id !== id))
      if (selectedCalib?.id === id) setSelectedCalib(null)
    }
  }

  // 값 위치 바 컴포넌트
  const ValueBar = ({ label, data, color }) => {
    const range = data.max - data.min
    const padding = range * 0.1 || 50
    const displayMin = data.min - padding
    const displayMax = data.max + padding
    const displayRange = displayMax - displayMin
    
    const currentPos = ((data.current - displayMin) / displayRange) * 100
    const minPos = ((data.min - displayMin) / displayRange) * 100
    const maxPos = ((data.max - displayMin) / displayRange) * 100
    const avgPos = ((data.avg - displayMin) / displayRange) * 100
    
    const colorClasses = {
      rose: { bg: 'bg-rose-500', text: 'text-rose-400', light: 'bg-rose-500/30' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/30' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-400', light: 'bg-amber-500/30' },
    }
    const c = colorClasses[color]
    
    return (
      <div className="flex items-center gap-2">
        <span className={'w-14 text-right text-xs font-medium ' + c.text}>{label}</span>
        <div className="flex-1 relative h-4">
          {/* 배경 */}
          <div className="absolute inset-0 bg-gray-700 rounded-full" />
          {/* 전체 범위 (min~max) */}
          <div
            className={'absolute inset-y-0 rounded-full ' + c.light}
            style={{ left: minPos + '%', width: (maxPos - minPos) + '%' }}
          />
          {/* 평균선 */}
          <div
            className="absolute inset-y-0 w-0.5 bg-gray-400"
            style={{ left: avgPos + '%' }}
          />
          {/* 현재 값 마커 */}
          <div
            className={'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white ' + c.bg}
            style={{ left: 'calc(' + currentPos + '% - 6px)' }}
          />
        </div>
        <span className="w-12 text-right text-xs text-white font-mono">{data.current}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 상단: 업로드 영역 (토글) */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/50 transition"
        >
          <span className="text-white font-medium">⬆️ 캘리브레이션 데이터 등록</span>
          <span className={'transition-transform ' + (showUpload ? 'rotate-180' : '')}>▼</span>
        </button>
        
        {showUpload && (
          <div className="p-4 border-t border-gray-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 파일 업로드 */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ' + 
                  (dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-600 hover:border-gray-500')}
              >
                <input ref={fileInputRef} type="file" accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
                <div className="text-2xl mb-1">📁</div>
                <p className="text-gray-400 text-xs">JSON 드래그/클릭</p>
              </div>

              {/* HuggingFace */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hfDatasetId}
                    onChange={(e) => setHfDatasetId(e.target.value)}
                    placeholder="🤗 user/dataset"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  />
                  <button
                    onClick={loadFromHuggingFace}
                    disabled={hfLoading}
                    className={'px-3 py-2 rounded text-sm font-medium ' +
                      (hfLoading ? 'bg-gray-600 text-gray-400' : 'bg-amber-500 hover:bg-amber-600 text-white')}
                  >
                    {hfLoading ? '...' : '로드'}
                  </button>
                </div>
              </div>

              {/* JSON 직접 입력 */}
              <div>
                <textarea
                  value={jsonText}
                  onChange={(e) => { setJsonText(e.target.value); if (e.target.value.trim()) parseJson(e.target.value) }}
                  placeholder="📝 JSON 붙여넣기"
                  className="w-full h-16 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-300 text-xs font-mono resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-2 bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 text-sm">
                ❌ {error}
              </div>
            )}

            {previewData && (
              <div className="bg-gray-900 p-3 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-emerald-400 text-sm">✅ 데이터 확인됨</span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="메모 (예: re-Cal5)"
                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  />
                  <button onClick={handleSave}
                    className="px-4 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm font-medium">
                    💾 저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메인: 좌우 분할 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 왼쪽: 히스토리 목록 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">📋 히스토리</h3>
            <span className="text-xs text-gray-500">{calibrations.length}개</span>
          </div>
          
          {calibrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>등록된 데이터가 없습니다</p>
              <button onClick={() => setShowUpload(true)} className="mt-2 text-cyan-400 text-xs">
                + 데이터 등록
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {calibrations.map((calib, idx) => (
                <div
                  key={calib.id}
                  onClick={() => setSelectedCalib(calib)}
                  className={'p-3 rounded-lg cursor-pointer transition border ' +
                    (activeCalib?.id === calib.id 
                      ? 'bg-cyan-500/20 border-cyan-500/50' 
                      : 'bg-gray-900 border-transparent hover:border-gray-700')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">
                          Latest
                        </span>
                      )}
                      <span className="text-white text-sm truncate max-w-32">
                        {calib.notes || ('#' + calib.id)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(calib.id) }}
                      className="text-rose-400 hover:text-rose-300 text-xs opacity-50 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(calib.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 상세 + 오차분석 */}
        <div className="lg:col-span-2 space-y-4">
          {activeCalib ? (
            <>
              {/* 선택된 캘리브레이션 상세 */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">{activeCalib.notes || ('#' + activeCalib.id)}</h3>
                  <ExportButton data={activeCalib.calibration_data} filename={'calibration_' + activeCalib.id} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {joints.map(joint => {
                    const data = activeCalib.calibration_data[joint]
                    if (!data) return null
                    return (
                      <div key={joint} className="bg-gray-900 p-3 rounded-lg">
                        <p className="text-cyan-400 text-sm font-medium truncate">{joint}</p>
                        <div className="mt-1 space-y-0.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">offset</span>
                            <span className="text-amber-400 font-mono">{data.homing_offset}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">min</span>
                            <span className="text-rose-400 font-mono">{data.range_min}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">max</span>
                            <span className="text-emerald-400 font-mono">{data.range_max}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 범위 편차 분석 (각 값별 개별 바) */}
              {errorAnalysis && errorAnalysis.length > 0 && calibrations.length > 1 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold">📊 범위 편차 분석</h3>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white"></div>
                        <span className="text-gray-400">현재 값</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 bg-gray-500/50 rounded"></div>
                        <span className="text-gray-400">전체 범위</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-0.5 h-3 bg-gray-400"></div>
                        <span className="text-gray-400">평균</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {errorAnalysis.map(data => (
                      <div key={data.joint} className="bg-gray-900 p-3 rounded-lg">
                        <p className="text-cyan-400 text-sm font-medium mb-2">{data.joint}</p>
                        <div className="space-y-2">
                          <ValueBar label="min" data={data.min} color="rose" />
                          <ValueBar label="max" data={data.max} color="emerald" />
                          <ValueBar label="homing" data={data.homing} color="amber" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    {calibrations.length}개 캘리브레이션 데이터 기반 비교
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-400">캘리브레이션을 선택하거나 등록하세요</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm"
              >
                + 데이터 등록
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CalibrationHistory
