import { useState, useRef, useMemo, useEffect } from 'react'

function DataAnalysis({ calibrations }) {
  const [parquetData, setParquetData] = useState(null)
  const [dataSource, setDataSource] = useState(null)
  const [hfUrl, setHfUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const fileInputRef = useRef(null)

  const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']
  
  const latestCalib = calibrations?.[0]?.calibration_data

  // 경고 구간 비율 (양쪽 10%)
  const DANGER_ZONE_PERCENT = 10

  useEffect(() => {
    if (parquetData && parquetData.length > 0) {
      const row0 = parquetData[0]
      setDebugInfo({
        action: row0[0],
        observationState: row0[1],
      })
    }
  }, [parquetData])

  // 히스토그램 데이터 계산
  const histogramData = useMemo(() => {
    if (!parquetData || !latestCalib || parquetData.length === 0) return null

    const binCount = 50
    const dangerBinCount = Math.floor(binCount * DANGER_ZONE_PERCENT / 100)

    return joints.map((joint, jIdx) => {
      const calibData = latestCalib[joint]
      if (!calibData) return null

      const calibMin = calibData.range_min
      const calibMax = calibData.range_max
      const calibRange = calibMax - calibMin
      const binSize = calibRange / binCount
      const normBinSize = 200 / binCount

      let actionData = []
      let observationStateData = []
      let actionNormData = []
      let observationStateNormData = []
      
      parquetData.forEach(row => {
        const action = row[0]
        const observationState = row[1]
        
        if (Array.isArray(action) && action[jIdx] !== undefined) {
          const normalized = Number(action[jIdx])
          if (!isNaN(normalized) && isFinite(normalized)) {
            actionNormData.push(normalized)
            const present = ((normalized + 100) / 200) * calibRange + calibMin
            actionData.push(present)
          }
        }
        
        if (Array.isArray(observationState) && observationState[jIdx] !== undefined) {
          const normalized = Number(observationState[jIdx])
          if (!isNaN(normalized) && isFinite(normalized)) {
            observationStateNormData.push(normalized)
            const present = ((normalized + 100) / 200) * calibRange + calibMin
            observationStateData.push(present)
          }
        }
      })

      if (actionData.length === 0 && observationStateData.length === 0) {
        return null
      }

      // Present Position 히스토그램
      const actionBins = Array(binCount).fill(0)
      actionData.forEach(val => {
        const binIdx = Math.floor((val - calibMin) / binSize)
        const clampedIdx = Math.max(0, Math.min(binCount - 1, binIdx))
        actionBins[clampedIdx]++
      })

      const observationStateBins = Array(binCount).fill(0)
      observationStateData.forEach(val => {
        const binIdx = Math.floor((val - calibMin) / binSize)
        const clampedIdx = Math.max(0, Math.min(binCount - 1, binIdx))
        observationStateBins[clampedIdx]++
      })

      // Normalized 히스토그램
      const actionNormBins = Array(binCount).fill(0)
      actionNormData.forEach(val => {
        const binIdx = Math.floor((val + 100) / normBinSize)
        const clampedIdx = Math.max(0, Math.min(binCount - 1, binIdx))
        actionNormBins[clampedIdx]++
      })

      const observationStateNormBins = Array(binCount).fill(0)
      observationStateNormData.forEach(val => {
        const binIdx = Math.floor((val + 100) / normBinSize)
        const clampedIdx = Math.max(0, Math.min(binCount - 1, binIdx))
        observationStateNormBins[clampedIdx]++
      })

      // 경고 구간 데이터 카운트
      const actionDangerLow = actionBins.slice(0, dangerBinCount).reduce((a, b) => a + b, 0)
      const actionDangerHigh = actionBins.slice(-dangerBinCount).reduce((a, b) => a + b, 0)
      const stateDangerLow = observationStateBins.slice(0, dangerBinCount).reduce((a, b) => a + b, 0)
      const stateDangerHigh = observationStateBins.slice(-dangerBinCount).reduce((a, b) => a + b, 0)

      return {
        joint,
        calibMin,
        calibMax,
        binSize,
        normBinSize,
        dangerBinCount,
        // Present Position
        actionBins,
        actionMax: Math.max(...actionBins),
        actionCount: actionData.length,
        actionMinVal: actionData.length > 0 ? Math.min(...actionData) : calibMin,
        actionMaxVal: actionData.length > 0 ? Math.max(...actionData) : calibMax,
        actionDangerLow,
        actionDangerHigh,
        observationStateBins,
        observationStateMax: Math.max(...observationStateBins),
        observationStateCount: observationStateData.length,
        observationStateMinVal: observationStateData.length > 0 ? Math.min(...observationStateData) : calibMin,
        observationStateMaxVal: observationStateData.length > 0 ? Math.max(...observationStateData) : calibMax,
        stateDangerLow,
        stateDangerHigh,
        // Normalized
        actionNormBins,
        actionNormMax: Math.max(...actionNormBins),
        actionNormMinVal: actionNormData.length > 0 ? Math.min(...actionNormData) : -100,
        actionNormMaxVal: actionNormData.length > 0 ? Math.max(...actionNormData) : 100,
        observationStateNormBins,
        observationStateNormMax: Math.max(...observationStateNormBins),
        observationStateNormMinVal: observationStateNormData.length > 0 ? Math.min(...observationStateNormData) : -100,
        observationStateNormMaxVal: observationStateNormData.length > 0 ? Math.max(...observationStateNormData) : 100,
      }
    }).filter(Boolean)
  }, [parquetData, latestCalib])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    if (!file.name.endsWith('.parquet')) {
      setError('Parquet 파일만 업로드 가능합니다 (.parquet)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const { parquetRead } = await import('hyparquet')
      
      let rows = []
      await parquetRead({
        file: arrayBuffer,
        onComplete: (data) => { rows = data }
      })

      if (rows.length === 0) throw new Error('데이터가 비어있습니다')

      setParquetData(rows)
      setDataSource('file')
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Parquet 파일 읽기 실패: ' + err.message)
      setLoading(false)
    }
  }

  const fetchFromHuggingFace = async () => {
    if (!hfUrl.trim()) {
      setError('HuggingFace URL을 입력해주세요')
      return
    }
    setLoading(true)
    setError('')

    try {
      const match = hfUrl.match(/huggingface\.co\/datasets\/([^\/]+\/[^\/\s]+)/)
      if (!match) throw new Error('유효한 HuggingFace 데이터셋 URL이 아닙니다')

      const datasetId = match[1]
      const response = await fetch(`https://huggingface.co/api/datasets/${datasetId}/parquet`)
      if (!response.ok) throw new Error('데이터셋을 찾을 수 없습니다')

      const parquetFiles = await response.json()
      
      const findParquetUrl = (obj) => {
        if (typeof obj === 'string' && obj.endsWith('.parquet')) return obj
        if (Array.isArray(obj)) for (const item of obj) { const f = findParquetUrl(item); if (f) return f }
        if (typeof obj === 'object' && obj !== null) for (const k of Object.keys(obj)) { const f = findParquetUrl(obj[k]); if (f) return f }
        return null
      }
      
      const fileUrl = findParquetUrl(parquetFiles)
      if (!fileUrl) throw new Error('Parquet 파일을 찾을 수 없습니다')

      const parquetResponse = await fetch(fileUrl)
      const arrayBuffer = await parquetResponse.arrayBuffer()
      
      const { parquetRead } = await import('hyparquet')
      let rows = []
      await parquetRead({ file: arrayBuffer, onComplete: (data) => { rows = data } })

      if (rows.length === 0) throw new Error('데이터가 비어있습니다')

      setParquetData(rows)
      setDataSource('huggingface')
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('HuggingFace 가져오기 실패: ' + err.message)
      setLoading(false)
    }
  }

  // Present Position 히스토그램
  const PresentHistogram = ({ bins, maxCount, calibMin, calibMax, binSize, color, dataMin, dataMax, count, dangerBinCount, dangerLow, dangerHigh }) => {
    const homing = 2047
    const totalDanger = dangerLow + dangerHigh
    const dangerPercent = count > 0 ? (totalDanger / count * 100).toFixed(1) : 0

    return (
      <div>
        <div className="relative h-14 flex items-end gap-px mb-1">
          {/* 경고 구간 배경 - 왼쪽 */}
          <div 
            className="absolute bottom-0 top-0 bg-red-500/10 border-l border-red-500/30"
            style={{ left: 0, width: `${dangerBinCount / bins.length * 100}%` }}
          />
          {/* 경고 구간 배경 - 오른쪽 */}
          <div 
            className="absolute bottom-0 top-0 bg-red-500/10 border-r border-red-500/30"
            style={{ right: 0, width: `${dangerBinCount / bins.length * 100}%` }}
          />
          
          {bins.map((binCount, idx) => {
            const height = maxCount > 0 ? (binCount / maxCount) * 100 : 0
            const binStart = calibMin + idx * binSize
            const binEnd = binStart + binSize
            const hasData = binCount > 0
            const containsHoming = binStart <= homing && homing < binEnd
            const isDanger = idx < dangerBinCount || idx >= bins.length - dangerBinCount
            
            return (
              <div key={idx} className="flex-1 relative group" style={{ height: '100%' }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    containsHoming ? 'bg-amber-500' : 
                    isDanger && hasData ? 'bg-red-500' : 
                    hasData ? color : 'bg-gray-700/30'
                  }`}
                  style={{ height: `${Math.max(height, hasData ? 3 : 0)}%` }}
                />
                {hasData && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-gray-600">
                    {binStart.toFixed(0)}~{binEnd.toFixed(0)}: {binCount}
                    {isDanger && <span className="text-red-400 ml-1">⚠️</span>}
                  </div>
                )}
              </div>
            )
          })}
          
          {homing >= calibMin && homing <= calibMax && (
            <div
              className="absolute bottom-0 top-0 w-0.5 bg-amber-400 z-10"
              style={{ left: `${((homing - calibMin) / (calibMax - calibMin)) * 100}%` }}
            />
          )}
        </div>
        
        <div className="relative h-3 mb-1">
          <div className="absolute left-0">
            <span className="text-[8px] text-rose-400">{calibMin}</span>
          </div>
          <div 
            className="absolute"
            style={{ left: `${((homing - calibMin) / (calibMax - calibMin)) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-[8px] text-amber-400">2047</span>
          </div>
          <div className="absolute right-0">
            <span className="text-[8px] text-emerald-400">{calibMax}</span>
          </div>
        </div>
        
        <div className="flex justify-between text-[8px]">
          <span className="text-gray-500">{count.toLocaleString()}</span>
          {totalDanger > 0 ? (
            <span className="text-red-400">⚠️ {totalDanger} ({dangerPercent}%)</span>
          ) : (
            <span className="text-gray-400">{dataMin.toFixed(0)}~{dataMax.toFixed(0)}</span>
          )}
        </div>
      </div>
    )
  }

  // Normalized 히스토그램
  const NormalizedHistogram = ({ bins, maxCount, binSize, color, dataMin, dataMax, dangerBinCount }) => {
    return (
      <div>
        <div className="relative h-14 flex items-end gap-px mb-1">
          {/* 경고 구간 배경 */}
          <div 
            className="absolute bottom-0 top-0 bg-red-500/10 border-l border-red-500/30"
            style={{ left: 0, width: `${dangerBinCount / bins.length * 100}%` }}
          />
          <div 
            className="absolute bottom-0 top-0 bg-red-500/10 border-r border-red-500/30"
            style={{ right: 0, width: `${dangerBinCount / bins.length * 100}%` }}
          />
          
          {bins.map((binCount, idx) => {
            const height = maxCount > 0 ? (binCount / maxCount) * 100 : 0
            const binStart = -100 + idx * binSize
            const binEnd = binStart + binSize
            const hasData = binCount > 0
            const containsZero = binStart <= 0 && 0 < binEnd
            const isDanger = idx < dangerBinCount || idx >= bins.length - dangerBinCount
            
            return (
              <div key={idx} className="flex-1 relative group" style={{ height: '100%' }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    containsZero ? 'bg-amber-500' : 
                    isDanger && hasData ? 'bg-red-500/70' : 
                    hasData ? color : 'bg-gray-700/30'
                  }`}
                  style={{ height: `${Math.max(height, hasData ? 3 : 0)}%` }}
                />
                {hasData && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-gray-600">
                    {binStart.toFixed(0)}~{binEnd.toFixed(0)}: {binCount}
                    {isDanger && <span className="text-red-400 ml-1">⚠️</span>}
                  </div>
                )}
              </div>
            )
          })}
          
          <div
            className="absolute bottom-0 top-0 w-0.5 bg-amber-400 z-10"
            style={{ left: '50%' }}
          />
        </div>
        
        <div className="relative h-3 mb-1">
          <div className="absolute left-0">
            <span className="text-[8px] text-rose-400">-100</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-[8px] text-amber-400">0</span>
          </div>
          <div className="absolute right-0">
            <span className="text-[8px] text-emerald-400">100</span>
          </div>
        </div>
        
        <div className="text-right text-[8px] text-gray-400">
          {dataMin.toFixed(1)}~{dataMax.toFixed(1)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2">📊 수집 데이터 로드</h2>
        <p className="text-gray-400 text-sm mb-6">Parquet 파일의 action / observation.state 데이터를 분석합니다</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📁 파일 업로드</h3>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".parquet" onChange={handleFileSelect} className="hidden" />
              <div className="text-3xl mb-2">📄</div>
              <p className="text-gray-300 text-sm">file-0000.parquet</p>
              <p className="text-gray-500 text-xs mt-1">드래그하거나 클릭</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🤗 HuggingFace 데이터셋</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={hfUrl}
                onChange={(e) => setHfUrl(e.target.value)}
                placeholder="https://huggingface.co/datasets/..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              />
              <button
                onClick={fetchFromHuggingFace}
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
              >
                {loading ? '가져오는 중...' : '데이터 가져오기'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-4 text-center py-4">
            <div className="inline-block w-6 h-6 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm mt-2">데이터 로딩 중...</p>
          </div>
        )}

        {parquetData && !loading && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-emerald-400 text-sm">
                데이터 로드 완료: {parquetData.length.toLocaleString()} rows
              </span>
              <span className="text-gray-500 text-sm">({dataSource === 'file' ? '파일' : 'HuggingFace'})</span>
            </div>
          </div>
        )}

        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg text-xs">
            <p className="text-cyan-400">action[0]: [{debugInfo.action?.map(v => v.toFixed(1)).join(', ')}]</p>
            <p className="text-emerald-400 mt-1">observation.state[0]: [{debugInfo.observationState?.map(v => v.toFixed(1)).join(', ')}]</p>
          </div>
        )}
      </div>

      {!latestCalib && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
          <p className="text-amber-400">⚠️ 캘리브레이션 데이터가 필요합니다.</p>
        </div>
      )}

      {/* 분석 목적 설명 */}
      {histogramData && histogramData.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
          <h3 className="text-blue-400 font-semibold mb-2">📋 분석 목적</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            수집된 trajectory 데이터가 <span className="text-rose-400 font-medium">Present Position의 Min/Max 근처</span>에 
            많이 분포하면, 나중에 <span className="text-amber-400 font-medium">Re-calibration</span> 시 
            Min이 커지거나 Max가 작아질 경우 <span className="text-red-400 font-medium">표현하지 못하는 데이터 구간</span>이 
            발생할 수 있습니다. 이는 <span className="text-orange-400 font-medium">동일 모델의 다른 로봇</span>에서 policy를 실행할 때도 문제가 될 수 있습니다.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500/30 border border-red-500/50 rounded"></div>
              <span className="text-gray-400">경고 구간 (양쪽 {DANGER_ZONE_PERCENT}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-400">경고 구간 내 데이터</span>
            </div>
          </div>
        </div>
      )}

      {/* Action (Present Position) */}
      {histogramData && histogramData.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
            <h2 className="text-lg font-bold text-white">Action</h2>
            <span className="text-xs text-gray-500">(Present Position)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {histogramData.map(data => (
              <div key={data.joint} className="bg-gray-900/50 p-3 rounded-lg">
                <h4 className="text-cyan-400 font-medium text-xs mb-2 truncate">{data.joint}</h4>
                <PresentHistogram
                  bins={data.actionBins}
                  maxCount={data.actionMax}
                  calibMin={data.calibMin}
                  calibMax={data.calibMax}
                  binSize={data.binSize}
                  color="bg-cyan-500"
                  dataMin={data.actionMinVal}
                  dataMax={data.actionMaxVal}
                  count={data.actionCount}
                  dangerBinCount={data.dangerBinCount}
                  dangerLow={data.actionDangerLow}
                  dangerHigh={data.actionDangerHigh}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action (Normalized) */}
      {histogramData && histogramData.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-cyan-500/50 rounded"></div>
            <h2 className="text-lg font-bold text-white">Action</h2>
            <span className="text-xs text-gray-500">(Normalized: -100 ~ 100)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {histogramData.map(data => (
              <div key={data.joint} className="bg-gray-900/50 p-3 rounded-lg">
                <h4 className="text-cyan-400/70 font-medium text-xs mb-2 truncate">{data.joint}</h4>
                <NormalizedHistogram
                  bins={data.actionNormBins}
                  maxCount={data.actionNormMax}
                  binSize={data.normBinSize}
                  color="bg-cyan-500/70"
                  dataMin={data.actionNormMinVal}
                  dataMax={data.actionNormMaxVal}
                  dangerBinCount={data.dangerBinCount}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* observation.state (Present Position) */}
      {histogramData && histogramData.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <h2 className="text-lg font-bold text-white">observation.state</h2>
            <span className="text-xs text-gray-500">(Present Position)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {histogramData.map(data => (
              <div key={data.joint} className="bg-gray-900/50 p-3 rounded-lg">
                <h4 className="text-emerald-400 font-medium text-xs mb-2 truncate">{data.joint}</h4>
                <PresentHistogram
                  bins={data.observationStateBins}
                  maxCount={data.observationStateMax}
                  calibMin={data.calibMin}
                  calibMax={data.calibMax}
                  binSize={data.binSize}
                  color="bg-emerald-500"
                  dataMin={data.observationStateMinVal}
                  dataMax={data.observationStateMaxVal}
                  count={data.observationStateCount}
                  dangerBinCount={data.dangerBinCount}
                  dangerLow={data.stateDangerLow}
                  dangerHigh={data.stateDangerHigh}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* observation.state (Normalized) */}
      {histogramData && histogramData.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-emerald-500/50 rounded"></div>
            <h2 className="text-lg font-bold text-white">observation.state</h2>
            <span className="text-xs text-gray-500">(Normalized: -100 ~ 100)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {histogramData.map(data => (
              <div key={data.joint} className="bg-gray-900/50 p-3 rounded-lg">
                <h4 className="text-emerald-400/70 font-medium text-xs mb-2 truncate">{data.joint}</h4>
                <NormalizedHistogram
                  bins={data.observationStateNormBins}
                  maxCount={data.observationStateNormMax}
                  binSize={data.normBinSize}
                  color="bg-emerald-500/70"
                  dataMin={data.observationStateNormMinVal}
                  dataMax={data.observationStateNormMaxVal}
                  dangerBinCount={data.dangerBinCount}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {parquetData && !loading && (!histogramData || histogramData.length === 0) && latestCalib && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
          <p className="text-amber-400">⚠️ 데이터 형식 문제. 콘솔(F12) 확인.</p>
        </div>
      )}
    </div>
  )
}

export default DataAnalysis
