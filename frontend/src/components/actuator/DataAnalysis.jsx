import { useState, useRef, useMemo, useEffect } from 'react'
import { getActuatorConfig, getEffectiveRobotType } from '../../utils/menuConfig'

function DataAnalysis({ device, calibrations }) {
  const [parquetData, setParquetData] = useState(null)
  const [dataSource, setDataSource] = useState(null)
  const [hfUrl, setHfUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const [selectedCalibration, setSelectedCalibration] = useState(null)
  const fileInputRef = useRef(null)

  const config = getActuatorConfig(getEffectiveRobotType(device))
  const joints = config.joints
  const { min: minField, max: maxField } = config.calibFields
  const isAlice = device?.type === 'alice_m1'
  
  const deviceCalibrations = device 
    ? calibrations.filter(c => c.device_id === device.id)
    : calibrations

  const activeCalib = selectedCalibration?.calibration_data || deviceCalibrations?.[0]?.calibration_data
  const DANGER_ZONE_PERCENT = 5   // 위험 구간 (빨간색) 0~5%
  const WARNING_ZONE_PERCENT = 10 // 경고 구간 (주황색) 5~10%

  useEffect(() => {
    if (deviceCalibrations.length > 0 && !selectedCalibration) {
      setSelectedCalibration(deviceCalibrations[0])
    }
  }, [deviceCalibrations])

  useEffect(() => {
    if (parquetData && parquetData.length > 0) {
      const row0 = parquetData[0]
      setDebugInfo({ action: row0[0], observationState: row0[1] })
    }
  }, [parquetData])

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  const histogramData = useMemo(() => {
    if (!parquetData || !activeCalib || parquetData.length === 0) return null
    const binCount = 50
    const dangerBinCount = Math.floor(binCount * DANGER_ZONE_PERCENT / 100)  // 5% = 2~3 bins
    const warningBinCount = Math.floor(binCount * WARNING_ZONE_PERCENT / 100) // 10% = 5 bins

    return joints.map((joint, jIdx) => {
      const calibData = activeCalib[joint]
      if (!calibData) return null
      const calibMin = calibData[minField]
      const calibMax = calibData[maxField]
      const calibRange = calibMax - calibMin
      const binSize = calibRange / binCount
      const normBinSize = 200 / binCount

      let actionData = [], observationStateData = [], actionNormData = [], observationStateNormData = []

      parquetData.forEach(row => {
        const action = row[0], observationState = row[1]
        if (Array.isArray(action) && action[jIdx] !== undefined) {
          const normalized = Number(action[jIdx])
          if (!isNaN(normalized) && isFinite(normalized)) {
            actionNormData.push(normalized)
            actionData.push(((normalized + 100) / 200) * calibRange + calibMin)
          }
        }
        if (Array.isArray(observationState) && observationState[jIdx] !== undefined) {
          const normalized = Number(observationState[jIdx])
          if (!isNaN(normalized) && isFinite(normalized)) {
            observationStateNormData.push(normalized)
            observationStateData.push(((normalized + 100) / 200) * calibRange + calibMin)
          }
        }
      })

      if (actionData.length === 0 && observationStateData.length === 0) return null

      const actionBins = Array(binCount).fill(0)
      actionData.forEach(val => { actionBins[Math.max(0, Math.min(binCount - 1, Math.floor((val - calibMin) / binSize)))]++ })
      const observationStateBins = Array(binCount).fill(0)
      observationStateData.forEach(val => { observationStateBins[Math.max(0, Math.min(binCount - 1, Math.floor((val - calibMin) / binSize)))]++ })
      const actionNormBins = Array(binCount).fill(0)
      actionNormData.forEach(val => { actionNormBins[Math.max(0, Math.min(binCount - 1, Math.floor((val + 100) / normBinSize)))]++ })
      const observationStateNormBins = Array(binCount).fill(0)
      observationStateNormData.forEach(val => { observationStateNormBins[Math.max(0, Math.min(binCount - 1, Math.floor((val + 100) / normBinSize)))]++ })

      return {
        joint, calibMin, calibMax, binSize, normBinSize, dangerBinCount, warningBinCount,
        actionBins, actionMax: Math.max(...actionBins), actionCount: actionData.length,
        actionMinVal: actionData.length > 0 ? Math.min(...actionData) : calibMin,
        actionMaxVal: actionData.length > 0 ? Math.max(...actionData) : calibMax,
        // 위험 구간 (0~5%)
        actionDangerLow: actionBins.slice(0, dangerBinCount).reduce((a, b) => a + b, 0),
        actionDangerHigh: actionBins.slice(-dangerBinCount).reduce((a, b) => a + b, 0),
        // 경고 구간 (5~10%)
        actionWarningLow: actionBins.slice(dangerBinCount, warningBinCount).reduce((a, b) => a + b, 0),
        actionWarningHigh: actionBins.slice(-warningBinCount, -dangerBinCount || undefined).reduce((a, b) => a + b, 0),
        observationStateBins, observationStateMax: Math.max(...observationStateBins), observationStateCount: observationStateData.length,
        observationStateMinVal: observationStateData.length > 0 ? Math.min(...observationStateData) : calibMin,
        observationStateMaxVal: observationStateData.length > 0 ? Math.max(...observationStateData) : calibMax,
        stateDangerLow: observationStateBins.slice(0, dangerBinCount).reduce((a, b) => a + b, 0),
        stateDangerHigh: observationStateBins.slice(-dangerBinCount).reduce((a, b) => a + b, 0),
        stateWarningLow: observationStateBins.slice(dangerBinCount, warningBinCount).reduce((a, b) => a + b, 0),
        stateWarningHigh: observationStateBins.slice(-warningBinCount, -dangerBinCount || undefined).reduce((a, b) => a + b, 0),
        actionNormBins, actionNormMax: Math.max(...actionNormBins),
        actionNormMinVal: actionNormData.length > 0 ? Math.min(...actionNormData) : -100,
        actionNormMaxVal: actionNormData.length > 0 ? Math.max(...actionNormData) : 100,
        observationStateNormBins, observationStateNormMax: Math.max(...observationStateNormBins),
        observationStateNormMinVal: observationStateNormData.length > 0 ? Math.min(...observationStateNormData) : -100,
        observationStateNormMaxVal: observationStateNormData.length > 0 ? Math.max(...observationStateNormData) : 100,
      }
    }).filter(Boolean)
  }, [parquetData, activeCalib])

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover') }
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]) }
  const handleFileSelect = (e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }

  const handleFile = async (file) => {
    if (!file.name.endsWith('.parquet')) { setError('Parquet 파일만 업로드 가능합니다'); return }
    setLoading(true); setError('')
    try {
      const { parquetRead } = await import('hyparquet')
      let rows = []
      await parquetRead({ file: await file.arrayBuffer(), onComplete: (data) => { rows = data } })
      if (rows.length === 0) throw new Error('데이터가 비어있습니다')
      setParquetData(rows); setDataSource('file')
    } catch (err) { setError('Parquet 파일 읽기 실패: ' + err.message) }
    setLoading(false)
  }

  const fetchFromHuggingFace = async () => {
    if (!hfUrl.trim()) { setError('HuggingFace URL을 입력해주세요'); return }
    setLoading(true); setError('')
    try {
      const match = hfUrl.match(/huggingface\.co\/datasets\/([^\/]+\/[^\/\s]+)/)
      if (!match) throw new Error('유효한 HuggingFace 데이터셋 URL이 아닙니다')
      const response = await fetch(`https://huggingface.co/api/datasets/${match[1]}/parquet`)
      if (!response.ok) throw new Error('데이터셋을 찾을 수 없습니다')
      const parquetFiles = await response.json()
      const findUrl = (obj) => { if (typeof obj === 'string' && obj.endsWith('.parquet')) return obj; if (Array.isArray(obj)) for (const i of obj) { const f = findUrl(i); if (f) return f }; if (typeof obj === 'object' && obj) for (const k of Object.keys(obj)) { const f = findUrl(obj[k]); if (f) return f }; return null }
      const fileUrl = findUrl(parquetFiles)
      if (!fileUrl) throw new Error('Parquet 파일을 찾을 수 없습니다')
      const { parquetRead } = await import('hyparquet')
      let rows = []
      await parquetRead({ file: await (await fetch(fileUrl)).arrayBuffer(), onComplete: (data) => { rows = data } })
      if (rows.length === 0) throw new Error('데이터가 비어있습니다')
      setParquetData(rows); setDataSource('huggingface')
    } catch (err) { setError('HuggingFace 가져오기 실패: ' + err.message) }
    setLoading(false)
  }

  const fetchSampleData = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/samples/file-000.parquet')
      if (!response.ok) throw new Error('샘플 파일을 찾을 수 없습니다')
      const { parquetRead } = await import('hyparquet')
      let rows = []
      await parquetRead({ file: await response.arrayBuffer(), onComplete: (data) => { rows = data } })
      if (rows.length === 0) throw new Error('데이터가 비어있습니다')
      setParquetData(rows); setDataSource('sample')
    } catch (err) { setError('샘플 데이터 로드 실패: ' + err.message) }
    setLoading(false)
  }

  const PresentHistogram = ({ bins, maxCount, calibMin, calibMax, binSize, color, dataMin, dataMax, count, dangerBinCount, warningBinCount, dangerLow, dangerHigh, warningLow, warningHigh }) => {
    const homing = 2047
    const totalDanger = dangerLow + dangerHigh
    const totalWarning = warningLow + warningHigh
    const dangerPercent = count > 0 ? (totalDanger / count * 100).toFixed(1) : 0
    const warningPercent = count > 0 ? (totalWarning / count * 100).toFixed(1) : 0
    return (
      <div>
        <div className="relative h-14 flex items-end gap-px mb-1">
          {/* 위험 구간 배경 (5%) - 빨간색 */}
          <div className="absolute bottom-0 top-0 bg-red-500/20 border-l border-red-500/50" style={{ left: 0, width: `${dangerBinCount / bins.length * 100}%` }} />
          <div className="absolute bottom-0 top-0 bg-red-500/20 border-r border-red-500/50" style={{ right: 0, width: `${dangerBinCount / bins.length * 100}%` }} />
          {/* 경고 구간 배경 (5%~10%) - 주황색 */}
          <div className="absolute bottom-0 top-0 bg-orange-500/10 border-l border-orange-500/30" style={{ left: `${dangerBinCount / bins.length * 100}%`, width: `${(warningBinCount - dangerBinCount) / bins.length * 100}%` }} />
          <div className="absolute bottom-0 top-0 bg-orange-500/10 border-r border-orange-500/30" style={{ right: `${dangerBinCount / bins.length * 100}%`, width: `${(warningBinCount - dangerBinCount) / bins.length * 100}%` }} />
          {bins.map((binCount, idx) => {
            const height = maxCount > 0 ? (binCount / maxCount) * 100 : 0
            const binStart = calibMin + idx * binSize, binEnd = binStart + binSize, hasData = binCount > 0
            const containsHoming = binStart <= homing && homing < binEnd
            const isDanger = idx < dangerBinCount || idx >= bins.length - dangerBinCount
            const isWarning = !isDanger && (idx < warningBinCount || idx >= bins.length - warningBinCount)
            return (
              <div key={idx} className="flex-1 relative group" style={{ height: '100%' }}>
                <div className={`absolute bottom-0 w-full rounded-t transition-all ${
                  containsHoming ? 'bg-amber-500' :
                  isDanger && hasData ? 'bg-red-500' :
                  isWarning && hasData ? 'bg-orange-500' :
                  hasData ? color : 'bg-gray-700/30'
                }`} style={{ height: `${Math.max(height, hasData ? 3 : 0)}%` }} />
                {hasData && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-gray-600">{binStart.toFixed(0)}~{binEnd.toFixed(0)}: {binCount}{isDanger && <span className="text-red-400 ml-1">🔴</span>}{isWarning && <span className="text-orange-400 ml-1">🟠</span>}</div>}
              </div>
            )
          })}
          {homing >= calibMin && homing <= calibMax && <div className="absolute bottom-0 top-0 w-0.5 bg-amber-400 z-10" style={{ left: `${((homing - calibMin) / (calibMax - calibMin)) * 100}%` }} />}
        </div>
        <div className="relative h-3 mb-1">
          <span className="absolute left-0 text-[8px] text-rose-400">{calibMin}</span>
          <span className="absolute text-[8px] text-amber-400" style={{ left: `${((homing - calibMin) / (calibMax - calibMin)) * 100}%`, transform: 'translateX(-50%)' }}>2047</span>
          <span className="absolute right-0 text-[8px] text-emerald-400">{calibMax}</span>
        </div>
        <div className="flex justify-between text-[8px]">
          <span className="text-gray-500">{count.toLocaleString()}</span>
          <div className="flex gap-2">
            {totalDanger > 0 && <span className="text-red-400">🔴{totalDanger}({dangerPercent}%)</span>}
            {totalWarning > 0 && <span className="text-orange-400">🟠{totalWarning}({warningPercent}%)</span>}
            {totalDanger === 0 && totalWarning === 0 && <span className="text-gray-400">{dataMin.toFixed(0)}~{dataMax.toFixed(0)}</span>}
          </div>
        </div>
      </div>
    )
  }

  const NormalizedHistogram = ({ bins, maxCount, binSize, color, dataMin, dataMax, dangerBinCount, warningBinCount }) => (
    <div>
      <div className="relative h-14 flex items-end gap-px mb-1">
        {/* 위험 구간 배경 (5%) */}
        <div className="absolute bottom-0 top-0 bg-red-500/20 border-l border-red-500/50" style={{ left: 0, width: `${dangerBinCount / bins.length * 100}%` }} />
        <div className="absolute bottom-0 top-0 bg-red-500/20 border-r border-red-500/50" style={{ right: 0, width: `${dangerBinCount / bins.length * 100}%` }} />
        {/* 경고 구간 배경 (5%~10%) */}
        <div className="absolute bottom-0 top-0 bg-orange-500/10 border-l border-orange-500/30" style={{ left: `${dangerBinCount / bins.length * 100}%`, width: `${(warningBinCount - dangerBinCount) / bins.length * 100}%` }} />
        <div className="absolute bottom-0 top-0 bg-orange-500/10 border-r border-orange-500/30" style={{ right: `${dangerBinCount / bins.length * 100}%`, width: `${(warningBinCount - dangerBinCount) / bins.length * 100}%` }} />
        {bins.map((binCount, idx) => {
          const height = maxCount > 0 ? (binCount / maxCount) * 100 : 0
          const binStart = -100 + idx * binSize, binEnd = binStart + binSize, hasData = binCount > 0
          const containsZero = binStart <= 0 && 0 < binEnd
          const isDanger = idx < dangerBinCount || idx >= bins.length - dangerBinCount
          const isWarning = !isDanger && (idx < warningBinCount || idx >= bins.length - warningBinCount)
          return (
            <div key={idx} className="flex-1 relative group" style={{ height: '100%' }}>
              <div className={`absolute bottom-0 w-full rounded-t transition-all ${
                containsZero ? 'bg-amber-500' :
                isDanger && hasData ? 'bg-red-500/70' :
                isWarning && hasData ? 'bg-orange-500/70' :
                hasData ? color : 'bg-gray-700/30'
              }`} style={{ height: `${Math.max(height, hasData ? 3 : 0)}%` }} />
              {hasData && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-gray-600">{binStart.toFixed(0)}~{binEnd.toFixed(0)}: {binCount}{isDanger && <span className="text-red-400 ml-1">🔴</span>}{isWarning && <span className="text-orange-400 ml-1">🟠</span>}</div>}
            </div>
          )
        })}
        <div className="absolute bottom-0 top-0 w-0.5 bg-amber-400 z-10" style={{ left: '50%' }} />
      </div>
      <div className="relative h-3 mb-1">
        <span className="absolute left-0 text-[8px] text-rose-400">-100</span>
        <span className="absolute left-1/2 -translate-x-1/2 text-[8px] text-amber-400">0</span>
        <span className="absolute right-0 text-[8px] text-emerald-400">100</span>
      </div>
      <div className="text-right text-[8px] text-gray-400">{dataMin.toFixed(1)}~{dataMax.toFixed(1)}</div>
    </div>
  )

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 학습 데이터를 분석할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. 분석 목적 - 맨 위 */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 p-4 rounded-xl">
        <h3 className="text-blue-400 font-semibold text-sm mb-2">📋 분석 목적</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          학습을 위해 수집된 trajectory 데이터가 <span className="text-rose-400 font-medium">Present Position(Actuator 제어값)의 min/max 근처</span>에 많이 분포하면,
          사용하는 Calibration의 min/max 값에 따라 <span className="text-red-400 font-medium">표현하지 못하는 데이터 구간</span>이 발생할 수 있습니다.
          가급적 min/max 영역이 아닌 <span className="text-amber-400 font-medium">중앙에서 Job이 실행</span>되도록 데이터를 수집해야 합니다.
        </p>
      </div>

      {/* 수집 데이터 로드 */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-2">📊 수집 데이터 로드</h2>
        <p className="text-gray-400 text-xs mb-4">Parquet 파일의 action / observation.state 데이터를 분석합니다</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-2">📁 파일 업로드</h3>
            <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-600 hover:border-gray-500'}`}>
              <input ref={fileInputRef} type="file" accept=".parquet" onChange={handleFileSelect} className="hidden" />
              <div className="text-2xl mb-1">📄</div>
              <p className="text-gray-300 text-xs">file-0000.parquet</p>
              <p className="text-gray-500 text-[10px] mt-1">드래그하거나 클릭</p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-2">🤗 HuggingFace 데이터셋</h3>
            <div className="space-y-2">
              <input type="text" value={hfUrl} onChange={(e) => setHfUrl(e.target.value)} placeholder="https://huggingface.co/datasets/..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs" />
              <button onClick={fetchFromHuggingFace} disabled={loading} className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-white rounded-lg transition text-xs font-medium">{loading ? '가져오는 중...' : '데이터 가져오기'}</button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-2">📦 샘플 데이터셋</h3>
            <button onClick={fetchSampleData} disabled={loading} className="w-full h-[76px] border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center">
              <div className="text-2xl mb-1">📦</div>
              <p className="text-gray-300 text-xs">샘플 데이터셋 가져오기</p>
              <p className="text-gray-500 text-[10px]">file-000.parquet</p>
            </button>
          </div>
        </div>
        {error && <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded-lg"><p className="text-red-400 text-xs">❌ {error}</p></div>}
        {loading && <div className="mt-3 text-center py-2"><div className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-400 text-xs mt-1">데이터 로딩 중...</p></div>}
        {parquetData && !loading && (
          <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-emerald-400 text-xs">데이터 로드 완료: {parquetData.length.toLocaleString()} rows</span>
              <span className="text-gray-500 text-xs">({dataSource === 'file' ? '파일' : dataSource === 'huggingface' ? 'HuggingFace' : '샘플'})</span>
            </div>
          </div>
        )}
        {debugInfo && (
          <div className="mt-3 p-2 bg-gray-700 rounded-lg text-[10px]">
            <p className="text-cyan-400">action[0]: [{debugInfo.action?.map(v => v.toFixed(1)).join(', ')}]</p>
            <p className="text-emerald-400 mt-1">observation.state[0]: [{debugInfo.observationState?.map(v => v.toFixed(1)).join(', ')}]</p>
          </div>
        )}
      </div>

      {/* 데이터 로드 후 분석 영역 */}
      {parquetData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 왼쪽: Calibration List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><span>🎯</span> Calibration 선택</h3>
              {deviceCalibrations.length === 0 ? (
                <div className="text-center py-4"><p className="text-amber-400 text-xs">⚠️ 캘리브레이션 데이터가 필요합니다</p></div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {deviceCalibrations.map((calib, idx) => (
                    <button key={calib.id} onClick={() => setSelectedCalibration(calib)}
                      className={`w-full p-3 rounded-lg border text-left transition ${selectedCalibration?.id === calib.id ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}>
                      {idx === 0 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">Latest</span>}
                      <p className="text-white text-xs mt-1">{formatDate(calib.created_at)}</p>
                      {calib.notes && <p className="text-gray-500 text-[10px] mt-0.5 truncate">{calib.notes}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 분석 결과 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 2. 분석 방법 */}
            {histogramData && histogramData.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                <h3 className="text-emerald-400 font-semibold text-sm mb-2">🔍 분석 방법</h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  Calibration의 min/max 범위를 기준으로, 양쪽 끝 구간에 데이터가 몰려있으면 위험합니다.
                </p>

                {/* 구간 정의 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
                    <p className="text-red-400 font-bold text-sm">🔴 위험</p>
                    <p className="text-gray-300 text-[10px]">min~5% / 95%~max</p>
                  </div>
                  <div className="p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg text-center">
                    <p className="text-orange-400 font-bold text-sm">🟠 경고</p>
                    <p className="text-gray-300 text-[10px]">5%~10% / 90%~95%</p>
                  </div>
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-center">
                    <p className="text-emerald-400 font-bold text-sm">✅ 안전</p>
                    <p className="text-gray-300 text-[10px]">10%~90% (중앙)</p>
                  </div>
                </div>

                <div className="p-2 bg-gray-800/50 rounded-lg mb-3">
                  <p className="text-gray-400 text-[10px]">
                    💡 <span className="text-cyan-400">Tip:</span> 모든 Joint가 균등하게 사용되어 Job이 수행될 수 있도록, 헐거운 Joint는 손으로 잡아주면서 데이터를 수집하세요.
                  </p>
                </div>

                {/* 히스토그램 읽는 법 */}
                <div className="p-2 bg-gray-800/50 rounded-lg mb-3">
                  <p className="text-gray-300 text-[10px] font-medium mb-1">📊 히스토그램 읽는 법</p>
                  <p className="text-gray-400 text-[10px]">
                    • <span className="text-gray-300">좌측 숫자</span>: 전체 데이터 개수 &nbsp;
                    • <span className="text-gray-300">우측 숫자</span>: 실제 데이터 범위 또는 <span className="text-red-400">🔴위험</span>/<span className="text-orange-400">🟠경고</span> 개수(%)
                  </p>
                </div>

                {/* 색상 범례 */}
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded"></div><span className="text-gray-400">위험 데이터</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded"></div><span className="text-gray-400">경고 데이터</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded"></div><span className="text-gray-400">중앙값(homing)</span></div>
                </div>
              </div>
            )}

            {!activeCalib && <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg"><p className="text-amber-400 text-sm">⚠️ 왼쪽에서 캘리브레이션을 선택해주세요.</p></div>}

            {/* Action (Present Position) */}
            {histogramData && histogramData.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 bg-cyan-500 rounded"></div><h2 className="text-sm font-bold text-white">Action</h2><span className="text-[10px] text-gray-500">(Present Position)</span></div>
                <div className={`grid grid-cols-2 md:grid-cols-3 ${isAlice ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-2`}>
                  {histogramData.map(data => (
                    <div key={data.joint} className="bg-gray-900/50 p-2 rounded-lg">
                      <h4 className="text-cyan-400 font-medium text-[10px] mb-1 truncate" title={data.joint}>{data.joint}</h4>
                      <PresentHistogram bins={data.actionBins} maxCount={data.actionMax} calibMin={data.calibMin} calibMax={data.calibMax} binSize={data.binSize} color="bg-cyan-500" dataMin={data.actionMinVal} dataMax={data.actionMaxVal} count={data.actionCount} dangerBinCount={data.dangerBinCount} warningBinCount={data.warningBinCount} dangerLow={data.actionDangerLow} dangerHigh={data.actionDangerHigh} warningLow={data.actionWarningLow} warningHigh={data.actionWarningHigh} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action (Normalized) */}
            {histogramData && histogramData.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 bg-cyan-500/50 rounded"></div><h2 className="text-sm font-bold text-white">Action</h2><span className="text-[10px] text-gray-500">(Normalized: -100 ~ 100)</span></div>
                <div className={`grid grid-cols-2 md:grid-cols-3 ${isAlice ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-2`}>
                  {histogramData.map(data => (
                    <div key={data.joint} className="bg-gray-900/50 p-2 rounded-lg">
                      <h4 className="text-cyan-400/70 font-medium text-[10px] mb-1 truncate">{data.joint}</h4>
                      <NormalizedHistogram bins={data.actionNormBins} maxCount={data.actionNormMax} binSize={data.normBinSize} color="bg-cyan-500/70" dataMin={data.actionNormMinVal} dataMax={data.actionNormMaxVal} dangerBinCount={data.dangerBinCount} warningBinCount={data.warningBinCount} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* observation.state (Present Position) */}
            {histogramData && histogramData.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 bg-emerald-500 rounded"></div><h2 className="text-sm font-bold text-white">observation.state</h2><span className="text-[10px] text-gray-500">(Present Position)</span></div>
                <div className={`grid grid-cols-2 md:grid-cols-3 ${isAlice ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-2`}>
                  {histogramData.map(data => (
                    <div key={data.joint} className="bg-gray-900/50 p-2 rounded-lg">
                      <h4 className="text-emerald-400 font-medium text-[10px] mb-1 truncate">{data.joint}</h4>
                      <PresentHistogram bins={data.observationStateBins} maxCount={data.observationStateMax} calibMin={data.calibMin} calibMax={data.calibMax} binSize={data.binSize} color="bg-emerald-500" dataMin={data.observationStateMinVal} dataMax={data.observationStateMaxVal} count={data.observationStateCount} dangerBinCount={data.dangerBinCount} warningBinCount={data.warningBinCount} dangerLow={data.stateDangerLow} dangerHigh={data.stateDangerHigh} warningLow={data.stateWarningLow} warningHigh={data.stateWarningHigh} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* observation.state (Normalized) */}
            {histogramData && histogramData.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 bg-emerald-500/50 rounded"></div><h2 className="text-sm font-bold text-white">observation.state</h2><span className="text-[10px] text-gray-500">(Normalized: -100 ~ 100)</span></div>
                <div className={`grid grid-cols-2 md:grid-cols-3 ${isAlice ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-2`}>
                  {histogramData.map(data => (
                    <div key={data.joint} className="bg-gray-900/50 p-2 rounded-lg">
                      <h4 className="text-emerald-400/70 font-medium text-[10px] mb-1 truncate">{data.joint}</h4>
                      <NormalizedHistogram bins={data.observationStateNormBins} maxCount={data.observationStateNormMax} binSize={data.normBinSize} color="bg-emerald-500/70" dataMin={data.observationStateNormMinVal} dataMax={data.observationStateNormMaxVal} dangerBinCount={data.dangerBinCount} warningBinCount={data.warningBinCount} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parquetData && !loading && (!histogramData || histogramData.length === 0) && activeCalib && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg"><p className="text-amber-400 text-sm">⚠️ 데이터 형식 문제. 콘솔(F12) 확인.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataAnalysis
