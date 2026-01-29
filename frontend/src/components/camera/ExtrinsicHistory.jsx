import { useState, useEffect } from 'react'

function ExtrinsicHistory({ device, calibrations, onDelete }) {
  const [selectedCamera, setSelectedCamera] = useState('front_cam')
  const [selectedItem, setSelectedItem] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const cameras = [
    { id: 'front_cam', name: 'Front Cam', icon: '📷' },
    { id: 'wrist_cam', name: 'Wrist Cam', icon: '🤖' },
  ]

  // 현재 장치의 캘리브레이션 필터링
  const getFilteredCalibrations = () => {
    if (!device || !calibrations) return []

    let filtered = calibrations.filter(c => c.device_id === device.id)
    filtered = filtered.filter(c => c.camera === selectedCamera)

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  const currentHistory = getFilteredCalibrations()

  // 선택된 항목이 필터링으로 사라지면 초기화
  useEffect(() => {
    if (selectedItem && !currentHistory.find(c => c.id === selectedItem.id)) {
      setSelectedItem(currentHistory.length > 0 ? currentHistory[0] : null)
    }
  }, [currentHistory, selectedItem])

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  const handleSelectItem = (item) => {
    if (compareMode) {
      if (compareItems.find(c => c.id === item.id)) {
        setCompareItems(compareItems.filter(c => c.id !== item.id))
      } else if (compareItems.length < 2) {
        setCompareItems([...compareItems, item])
      }
    } else {
      setSelectedItem(item)
    }
  }

  const handleDelete = async (item, e) => {
    e.stopPropagation()
    if (!confirm('이 캘리브레이션 기록을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    try {
      if (onDelete) {
        await onDelete(item.id, item.device_id)
      }
      if (selectedItem?.id === item.id) setSelectedItem(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('삭제에 실패했습니다: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const exportJSON = (item) => {
    const data = JSON.stringify(item, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extrinsic_calib_${item.camera}_${new Date(item.created_at).toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 데이터 추출 함수
  const extractReprojectionError = (item) => {
    return item.reprojection_error ?? 0
  }

  const extractTranslation = (item) => {
    return item.translation_vector || [0, 0, 0]
  }

  const extractRotation = (item) => {
    return item.rotation_vector || [0, 0, 0]
  }

  // 범위/편차 분석 계산
  const calculateAnalysis = () => {
    if (!selectedItem || currentHistory.length < 2) return null

    const params = ['tx', 'ty', 'tz', 'rx', 'ry', 'rz', 'reprojection_error']
    const analysis = {}

    params.forEach(param => {
      const values = currentHistory.map(item => {
        if (param === 'reprojection_error') return extractReprojectionError(item)
        const t = extractTranslation(item)
        const r = extractRotation(item)
        if (param === 'tx') return t[0]
        if (param === 'ty') return t[1]
        if (param === 'tz') return t[2]
        if (param === 'rx') return r[0]
        if (param === 'ry') return r[1]
        if (param === 'rz') return r[2]
        return 0
      }).filter(v => v !== undefined && v !== null && !isNaN(v))

      if (values.length > 0) {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)

        let currentVal
        const t = extractTranslation(selectedItem)
        const r = extractRotation(selectedItem)
        if (param === 'reprojection_error') currentVal = extractReprojectionError(selectedItem)
        else if (param === 'tx') currentVal = t[0]
        else if (param === 'ty') currentVal = t[1]
        else if (param === 'tz') currentVal = t[2]
        else if (param === 'rx') currentVal = r[0]
        else if (param === 'ry') currentVal = r[1]
        else if (param === 'rz') currentVal = r[2]

        analysis[param] = { min, max, avg, stdDev, current: currentVal, count: values.length }
      }
    })

    return { data: analysis, cameraName: selectedItem.camera === 'wrist_cam' ? 'Wrist Cam' : 'Front Cam', totalCount: currentHistory.length }
  }

  const analysis = calculateAnalysis()

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 캘리브레이션 히스토리를 볼 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Extrinsic 히스토리 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/30 p-4">
        <h3 className="text-violet-400 font-semibold text-sm mb-2">📋 Extrinsic 히스토리</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          Extrinsic 캘리브레이션 이력을 관리합니다.
          <span className="text-amber-400"> 위치 변화를 비교</span>하여 카메라가 움직였는지 확인할 수 있습니다.
        </p>
      </div>

      {/* 카메라 선택 & 비교 모드 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {cameras.map(cam => (
            <button key={cam.id} onClick={() => { setSelectedCamera(cam.id); setSelectedItem(null); setCompareItems([]) }}
              className={'px-3 py-1.5 rounded-lg text-sm font-medium transition border flex items-center gap-1.5 ' +
                (selectedCamera === cam.id
                  ? 'bg-violet-500/20 text-violet-400 border-violet-500/50'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600')}>
              <span>{cam.icon}</span>
              <span>{cam.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setCompareMode(!compareMode); setCompareItems([]) }}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition border ' +
            (compareMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600')}
        >
          {compareMode ? '✓ 비교 모드' : '🔀 비교'}
        </button>
      </div>

      {compareMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-400 text-sm">
            비교할 항목을 2개 선택하세요. ({compareItems.length}/2 선택됨)
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 히스토리 목록 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">📋 히스토리</h3>
            <span className="text-gray-500 text-xs">{currentHistory.length}개</span>
          </div>

          {currentHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-gray-500 text-sm">캘리브레이션 기록이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">캘리브레이션 탭에서 새 캘리브레이션을 진행하세요</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {currentHistory.map((item, idx) => {
                const isSelected = compareMode
                  ? compareItems.find(c => c.id === item.id)
                  : selectedItem?.id === item.id
                const error = extractReprojectionError(item)
                return (
                  <div key={item.id} onClick={() => handleSelectItem(item)}
                    className={'p-3 rounded-lg cursor-pointer transition border ' +
                      (isSelected ? 'bg-violet-500/20 border-violet-500/50' : 'bg-gray-900 border-transparent hover:border-gray-700')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.camera === 'wrist_cam' ? '🤖' : '📷'}</span>
                        {idx === 0 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">Latest</span>}
                        {compareMode && isSelected && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-medium">선택됨</span>}
                      </div>
                      <button onClick={(e) => handleDelete(item, e)} disabled={isDeleting}
                        className="text-gray-500 hover:text-rose-400 text-xs disabled:opacity-50">삭제</button>
                    </div>
                    <p className="text-white text-sm">{formatDate(item.created_at)}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-gray-500">Error: <span className={'font-mono ' + (error < 0.5 ? 'text-emerald-400' : error < 1 ? 'text-amber-400' : 'text-rose-400')}>{error?.toFixed(3)}</span></span>
                      {item.notes && <span className="text-gray-500 truncate">{item.notes}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 상세 정보 or 비교 */}
        <div className="lg:col-span-2 space-y-4">
          {compareMode && compareItems.length === 2 ? (
            // 비교 뷰
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-bold text-sm mb-4">🔀 캘리브레이션 비교</h3>

              {/* Translation 비교 */}
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation 비교</h5>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="text-gray-500">축</div>
                  <div className="text-violet-400">{formatDate(compareItems[0].created_at).split(' ')[0]}</div>
                  <div className="text-cyan-400">{formatDate(compareItems[1].created_at).split(' ')[0]}</div>
                  <div className="text-gray-400">차이</div>
                  {['X', 'Y', 'Z'].map((axis, i) => {
                    const v1 = extractTranslation(compareItems[0])[i]
                    const v2 = extractTranslation(compareItems[1])[i]
                    const diff = v2 - v1
                    return (
                      <>
                        <div key={`${axis}-label`} className="text-gray-400 py-2">{axis}</div>
                        <div key={`${axis}-v1`} className="text-violet-400 font-mono py-2">{v1?.toFixed(1)}</div>
                        <div key={`${axis}-v2`} className="text-cyan-400 font-mono py-2">{v2?.toFixed(1)}</div>
                        <div key={`${axis}-diff`} className={`font-mono py-2 ${Math.abs(diff) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {diff > 0 ? '+' : ''}{diff?.toFixed(2)}
                        </div>
                      </>
                    )
                  })}
                </div>
              </div>

              {/* Rotation 비교 */}
              <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation 비교</h5>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="text-gray-500">축</div>
                  <div className="text-violet-400">{formatDate(compareItems[0].created_at).split(' ')[0]}</div>
                  <div className="text-cyan-400">{formatDate(compareItems[1].created_at).split(' ')[0]}</div>
                  <div className="text-gray-400">차이</div>
                  {['Rx', 'Ry', 'Rz'].map((axis, i) => {
                    const v1 = extractRotation(compareItems[0])[i]
                    const v2 = extractRotation(compareItems[1])[i]
                    const diff = v2 - v1
                    return (
                      <>
                        <div key={`${axis}-label`} className="text-gray-400 py-2">{axis}</div>
                        <div key={`${axis}-v1`} className="text-violet-400 font-mono py-2">{v1?.toFixed(4)}</div>
                        <div key={`${axis}-v2`} className="text-cyan-400 font-mono py-2">{v2?.toFixed(4)}</div>
                        <div key={`${axis}-diff`} className={`font-mono py-2 ${Math.abs(diff) > 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {diff > 0 ? '+' : ''}{diff?.toFixed(4)}
                        </div>
                      </>
                    )
                  })}
                </div>
              </div>

              {/* 변화량 요약 */}
              <div className="p-3 bg-gray-900 rounded-lg">
                <h5 className="text-white font-medium text-sm mb-2">📊 변화량 요약</h5>
                {(() => {
                  const t1 = extractTranslation(compareItems[0])
                  const t2 = extractTranslation(compareItems[1])
                  const r1 = extractRotation(compareItems[0])
                  const r2 = extractRotation(compareItems[1])
                  const tDiff = t1.map((v, i) => t2[i] - v)
                  const rDiff = r1.map((v, i) => r2[i] - v)
                  const distance = Math.sqrt(tDiff.reduce((a, b) => a + b * b, 0))
                  const rotAngle = Math.sqrt(rDiff.reduce((a, b) => a + b * b, 0)) * 180 / Math.PI
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">이동 거리</p>
                        <p className={`font-mono text-lg ${distance > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {distance.toFixed(2)} mm
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">회전 변화</p>
                        <p className={`font-mono text-lg ${rotAngle > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {rotAngle.toFixed(2)}°
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : selectedItem ? (
            // 상세 뷰
            (() => {
              const translation = extractTranslation(selectedItem)
              const rotation = extractRotation(selectedItem)
              const error = extractReprojectionError(selectedItem)
              const rotMatrix = selectedItem.rotation_matrix

              return (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-sm">📊 상세 정보</h3>
                      <p className="text-gray-500 text-xs">{selectedItem.camera === 'wrist_cam' ? '🤖 Wrist Cam' : '📷 Front Cam'} • {formatDate(selectedItem.created_at)}</p>
                    </div>
                    <button onClick={() => exportJSON(selectedItem)}
                      className="px-3 py-1.5 bg-violet-500/20 text-violet-400 border border-violet-500/50 rounded-lg text-xs hover:bg-violet-500/30 transition">
                      📥 JSON 내보내기
                    </button>
                  </div>

                  {/* Translation */}
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <h5 className="text-amber-400 font-medium text-sm mb-2">📍 Translation (이동)</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis} className="p-2 bg-gray-900 rounded">
                          <p className="text-gray-500 text-[10px]">{axis}</p>
                          <p className="text-amber-400 font-mono text-lg">{translation[i]?.toFixed(1)}</p>
                          <p className="text-gray-500 text-[10px]">mm</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rotation Vector */}
                  <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <h5 className="text-cyan-400 font-medium text-sm mb-2">🔄 Rotation Vector (회전)</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {['Rx', 'Ry', 'Rz'].map((axis, i) => (
                        <div key={axis} className="p-2 bg-gray-900 rounded">
                          <p className="text-gray-500 text-[10px]">{axis}</p>
                          <p className="text-cyan-400 font-mono text-sm">{rotation[i]?.toFixed(4)}</p>
                          <p className="text-gray-500 text-[10px]">rad</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rotation Matrix */}
                  {rotMatrix && (
                    <div className="mb-4 p-3 bg-gray-900 rounded-lg">
                      <h5 className="text-gray-400 font-medium text-sm mb-2">Rotation Matrix (3x3)</h5>
                      <pre className="text-gray-300 font-mono text-xs overflow-x-auto">
                        {rotMatrix.map(row =>
                          row.map(val => val?.toFixed(4).padStart(8)).join('  ')
                        ).join('\n')}
                      </pre>
                    </div>
                  )}

                  {/* 통계 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">재투영 오차</p>
                      <p className={'text-lg font-mono ' + (error < 0.5 ? 'text-emerald-400' : error < 1 ? 'text-amber-400' : 'text-rose-400')}>
                        {error?.toFixed(4)} px
                      </p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">메모</p>
                      <p className="text-white text-sm">{selectedItem.notes || '-'}</p>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <div className="text-4xl mb-3">👈</div>
              <p className="text-gray-400">왼쪽에서 항목을 선택하세요</p>
            </div>
          )}

          {/* 범위/편차 분석 */}
          {analysis && !compareMode && selectedItem && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="text-lg">📈</span> 범위/편차 분석
                </h3>
                <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded-full">
                  {analysis.cameraName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mb-4">
                <span className="text-gray-500">{analysis.totalCount}개 측정 데이터 기준</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border border-white/30"></div>
                    <span className="text-gray-400">현재 선택 <span className="text-gray-500">({formatDate(selectedItem?.created_at)})</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-gray-400"></div>
                    <span className="text-gray-400">평균</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-mono">σ</span>
                    <span className="text-gray-400">표준편차</span>
                  </div>
                </div>
              </div>

              {/* 데이터 품질 분석 가이드 */}
              {(() => {
                const dataCount = analysis.totalCount
                const isLowData = dataCount < 5

                const warnings = []
                const dangers = []

                Object.entries(analysis.data).forEach(([key, stats]) => {
                  if (!stats || stats.stdDev === 0) return
                  const deviation = Math.abs(stats.current - stats.avg) / stats.stdDev

                  if (deviation >= 3) {
                    dangers.push({ key, deviation: deviation.toFixed(1) })
                  } else if (deviation >= 2) {
                    warnings.push({ key, deviation: deviation.toFixed(1) })
                  }
                })

                const hasWarning = warnings.length > 0
                const hasDanger = dangers.length > 0

                return (
                  <div className="space-y-2 mb-4">
                    {isLowData ? (
                      <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-sky-400 text-lg">ℹ️</span>
                          <div className="flex-1">
                            <p className="text-sky-400 font-medium text-sm mb-1">데이터 부족 - 참고용</p>
                            <div className="text-xs text-gray-400 space-y-1">
                              <p>
                                현재 <span className="text-sky-300">{dataCount}개</span>의 측정 데이터가 있습니다.
                                통계적 신뢰도를 위해 <span className="text-sky-300">최소 5개</span> 이상의 데이터가 필요합니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {hasDanger && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className="text-rose-400 text-lg">🚨</span>
                              <div className="flex-1">
                                <p className="text-rose-400 font-medium text-sm mb-1">위험 - 심각한 이상치 감지</p>
                                <div className="text-xs text-gray-400 space-y-1">
                                  <p>
                                    <span className="text-rose-300">{dangers.map(d => d.key).join(', ')}</span>
                                    {' '}파라미터가 평균에서 3σ 이상 벗어나 있습니다. <span className="text-rose-400/70">(정상 분포 기준 0.3% 확률)</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {hasWarning && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className="text-amber-400 text-lg">⚠️</span>
                              <div className="flex-1">
                                <p className="text-amber-400 font-medium text-sm mb-1">경고 - 이상치 감지</p>
                                <div className="text-xs text-gray-400 space-y-1">
                                  <p>
                                    <span className="text-amber-300">{warnings.map(w => w.key).join(', ')}</span>
                                    {' '}파라미터가 평균에서 2σ 이상 벗어나 있습니다. <span className="text-amber-400/70">(정상 분포 기준 4.6% 확률)</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!hasWarning && !hasDanger && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 text-lg">✓</span>
                              <div>
                                <p className="text-emerald-400 font-medium text-sm">데이터 정상 범위</p>
                                <p className="text-xs text-gray-500">모든 파라미터가 정상 범위 내에 있습니다. <span className="text-emerald-400/70">(2σ 이내)</span></p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Translation 분석 */}
              <div className="mb-6">
                <h4 className="text-amber-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <span>📍</span> Translation 파라미터
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'tx', label: 'X (mm)', color: 'amber' },
                    { key: 'ty', label: 'Y (mm)', color: 'amber' },
                    { key: 'tz', label: 'Z (mm)', color: 'amber' },
                  ].map(({ key, label, color }) => {
                    const stats = analysis.data[key]
                    if (!stats) return null
                    const range = stats.max - stats.min || 1
                    const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                    const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))

                    return (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs font-medium">{label}</span>
                          <span className="font-mono text-sm font-bold text-amber-400">{stats.current?.toFixed(1)}</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full relative overflow-hidden mb-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-500/40 to-amber-500/20 rounded-full"></div>
                          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/80 z-10" style={{ left: `${avgPos}%` }}></div>
                          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/50 border-2 border-white/30 z-20"
                            style={{ left: `calc(${currentPos}% - 8px)` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-500">min: <span className="text-gray-400 font-mono">{stats.min?.toFixed(1)}</span></span>
                          <span className="text-gray-500">avg: <span className="text-gray-400 font-mono">{stats.avg?.toFixed(1)}</span></span>
                          <span className="text-gray-500">max: <span className="text-gray-400 font-mono">{stats.max?.toFixed(1)}</span></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rotation 분석 */}
              <div className="mb-6">
                <h4 className="text-cyan-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <span>🔄</span> Rotation 파라미터
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'rx', label: 'Rx (rad)', color: 'cyan' },
                    { key: 'ry', label: 'Ry (rad)', color: 'cyan' },
                    { key: 'rz', label: 'Rz (rad)', color: 'cyan' },
                  ].map(({ key, label, color }) => {
                    const stats = analysis.data[key]
                    if (!stats) return null
                    const range = stats.max - stats.min || 0.001
                    const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                    const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))

                    return (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs font-medium">{label}</span>
                          <span className="font-mono text-sm font-bold text-cyan-400">{stats.current?.toFixed(4)}</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full relative overflow-hidden mb-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/40 to-cyan-500/20 rounded-full"></div>
                          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/80 z-10" style={{ left: `${avgPos}%` }}></div>
                          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 border-2 border-white/30 z-20"
                            style={{ left: `calc(${currentPos}% - 8px)` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-gray-500">min: <span className="text-gray-400 font-mono">{stats.min?.toFixed(4)}</span></span>
                          <span className="text-gray-500">avg: <span className="text-gray-400 font-mono">{stats.avg?.toFixed(4)}</span></span>
                          <span className="text-gray-500">max: <span className="text-gray-400 font-mono">{stats.max?.toFixed(4)}</span></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Reprojection Error 분석 */}
              {analysis.data.reprojection_error && (
                <div>
                  <h4 className="text-emerald-400 font-medium text-sm mb-3 flex items-center gap-2">
                    <span>🎯</span> 재투영 오차
                  </h4>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    {(() => {
                      const stats = analysis.data.reprojection_error
                      const range = stats.max - stats.min || 0.1
                      const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                      const getColor = (val) => val < 0.5 ? 'emerald' : val < 1 ? 'amber' : 'rose'
                      const currentColor = getColor(stats.current)

                      return (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`text-2xl font-mono font-bold ${
                                currentColor === 'emerald' ? 'text-emerald-400' : currentColor === 'amber' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {stats.current?.toFixed(4)}
                              </span>
                              <span className="text-gray-500 text-sm">px</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                currentColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                currentColor === 'amber' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {currentColor === 'emerald' ? '우수' : currentColor === 'amber' ? '양호' : '주의'}
                              </span>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-800 rounded-full relative overflow-hidden mb-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-rose-500/30 rounded-full"></div>
                            <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br shadow-lg border-2 border-white/30 z-20 ${
                              currentColor === 'emerald' ? 'from-emerald-400 to-teal-500 shadow-emerald-500/50' :
                              currentColor === 'amber' ? 'from-amber-400 to-orange-500 shadow-amber-500/50' :
                              'from-rose-400 to-red-500 shadow-rose-500/50'
                            }`} style={{ left: `calc(${currentPos}% - 8px)` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">min: <span className="text-emerald-400 font-mono">{stats.min?.toFixed(4)}</span></span>
                            <span className="text-gray-500">σ: <span className="text-gray-400 font-mono">{stats.stdDev?.toFixed(4)}</span></span>
                            <span className="text-gray-500">max: <span className="text-rose-400 font-mono">{stats.max?.toFixed(4)}</span></span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExtrinsicHistory
