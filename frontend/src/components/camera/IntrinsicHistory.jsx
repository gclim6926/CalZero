import { useState, useEffect } from 'react'

function IntrinsicHistory({ device, calibrations, onDelete }) {
  const [selectedCamera, setSelectedCamera] = useState('front_cam')
  const [selectedItem, setSelectedItem] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const cameras = [
    { id: 'front_cam', name: 'Front Cam', icon: '📷' },
    { id: 'wrist_cam', name: 'Wrist Cam', icon: '🤖' },
  ]

  // 현재 장치의 계산 필터링
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
    if (!confirm('이 계산 기록을 삭제하시겠습니까?')) return

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
    a.download = `intrinsic_calib_${item.camera}_${new Date(item.created_at).toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // API에서 받은 데이터에서 fx, fy, cx, cy 추출
  const extractParams = (item) => {
    if (item.fx !== undefined) {
      // 기존 형식
      return { fx: item.fx, fy: item.fy, cx: item.cx, cy: item.cy }
    }
    if (item.camera_matrix) {
      // 새 API 형식: [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]
      const K = item.camera_matrix
      return { fx: K[0][0], fy: K[1][1], cx: K[0][2], cy: K[1][2] }
    }
    return { fx: 0, fy: 0, cx: 0, cy: 0 }
  }

  // API에서 받은 데이터에서 distCoeffs 추출
  const extractDistCoeffs = (item) => {
    if (item.distCoeffs) return item.distCoeffs
    if (item.dist_coeffs) return item.dist_coeffs
    return [0, 0, 0, 0, 0]
  }

  // API에서 받은 데이터에서 rmsError 추출
  const extractRmsError = (item) => {
    return item.rmsError ?? item.rms_error ?? 0
  }

  // API에서 받은 데이터에서 imageSize 추출
  const extractImageSize = (item) => {
    if (item.imageSize) return item.imageSize
    if (item.image_size) return { width: item.image_size[0], height: item.image_size[1] }
    return { width: 0, height: 0 }
  }

  // 선택된 계산 기준으로 범위/편차 분석 계산
  const calculateAnalysis = () => {
    if (!selectedItem || currentHistory.length < 2) return null

    // 선택된 카메라 종류의 계산만 사용
    const sameCamera = currentHistory.filter(c => c.camera === selectedItem.camera)
    if (sameCamera.length < 2) return null

    const params = ['fx', 'fy', 'cx', 'cy', 'rms_error']
    const distLabels = ['k1', 'k2', 'p1', 'p2', 'k3']

    const analysis = {}

    // 기본 파라미터 분석
    params.forEach(param => {
      const values = sameCamera.map(item => {
        if (param === 'rms_error') return extractRmsError(item)
        const p = extractParams(item)
        return p[param]
      }).filter(v => v !== undefined && v !== null && !isNaN(v))

      if (values.length > 0) {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)

        let currentVal
        if (param === 'rms_error') {
          currentVal = extractRmsError(selectedItem)
        } else {
          const p = extractParams(selectedItem)
          currentVal = p[param]
        }

        analysis[param] = { min, max, avg, stdDev, current: currentVal, count: values.length }
      }
    })

    // 왜곡 계수 분석
    distLabels.forEach((label, idx) => {
      const values = sameCamera.map(item => {
        const dist = extractDistCoeffs(item)
        return dist?.[idx]
      }).filter(v => v !== undefined && v !== null && !isNaN(v))

      if (values.length > 0) {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)
        const currentVal = extractDistCoeffs(selectedItem)?.[idx]

        analysis[label] = { min, max, avg, stdDev, current: currentVal, count: values.length }
      }
    })

    return { data: analysis, cameraName: selectedItem.camera === 'wrist_cam' ? 'Wrist Cam' : 'Front Cam', totalCount: sameCamera.length }
  }

  const analysis = calculateAnalysis()

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 계산 히스토리를 볼 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Intrinsic 히스토리 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/30 p-4">
        <h3 className="text-violet-400 font-semibold text-sm mb-2">📋 Intrinsic 히스토리</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          Intrinsic 계산 이력을 관리합니다.
          <span className="text-amber-400"> 파라미터 변화를 비교</span>하여 카메라 상태를 확인할 수 있습니다.
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
              <div className="text-3xl mb-2">📷</div>
              <p className="text-gray-500 text-sm">계산 기록이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">계산 탭에서 새 계산을 진행하세요</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {currentHistory.map((item, idx) => {
                const isSelected = compareMode
                  ? compareItems.find(c => c.id === item.id)
                  : selectedItem?.id === item.id
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
                      <span className="text-gray-500">RMS: <span className={'font-mono ' + (extractRmsError(item) < 0.5 ? 'text-emerald-400' : extractRmsError(item) < 1 ? 'text-amber-400' : 'text-rose-400')}>{extractRmsError(item)?.toFixed(3)}</span></span>
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
              <h3 className="text-white font-bold text-sm mb-4">🔀 계산 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-500 font-medium py-2 px-3">항목</th>
                      <th className="text-right text-violet-400 font-medium py-2 px-3">{formatDate(compareItems[0].created_at)}</th>
                      <th className="text-right text-cyan-400 font-medium py-2 px-3">{formatDate(compareItems[1].created_at)}</th>
                      <th className="text-right text-gray-400 font-medium py-2 px-3">차이</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const p1 = extractParams(compareItems[0])
                      const p2 = extractParams(compareItems[1])
                      const rows = [
                        { key: 'fx', v1: p1.fx, v2: p2.fx },
                        { key: 'fy', v1: p1.fy, v2: p2.fy },
                        { key: 'cx', v1: p1.cx, v2: p2.cx },
                        { key: 'cy', v1: p1.cy, v2: p2.cy },
                        { key: 'RMS 오차', v1: extractRmsError(compareItems[0]), v2: extractRmsError(compareItems[1]) },
                      ]
                      return rows.map(({ key, v1, v2 }) => {
                        const diff = v2 - v1
                        return (
                          <tr key={key} className="border-b border-gray-700/50">
                            <td className="py-2 px-3 text-gray-400">{key}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">{v1?.toFixed(4)}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">{v2?.toFixed(4)}</td>
                            <td className={'py-2 px-3 text-right font-mono ' + (diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-gray-500')}>
                              {diff > 0 ? '+' : ''}{diff?.toFixed(4)}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 왜곡 계수 비교 */}
              <div className="mt-4">
                <h4 className="text-gray-400 text-xs mb-2">왜곡 계수 비교</h4>
                <div className="grid grid-cols-5 gap-2">
                  {['k1', 'k2', 'p1', 'p2', 'k3'].map((label, i) => (
                    <div key={label} className="bg-gray-900 p-2 rounded text-center">
                      <p className="text-gray-500 text-[10px] mb-1">{label}</p>
                      <p className="text-violet-400 text-xs font-mono">{extractDistCoeffs(compareItems[0])?.[i]?.toFixed(4)}</p>
                      <p className="text-cyan-400 text-xs font-mono">{extractDistCoeffs(compareItems[1])?.[i]?.toFixed(4)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedItem ? (
            // 상세 뷰
            (() => {
              const params = extractParams(selectedItem)
              const distCoeffs = extractDistCoeffs(selectedItem)
              const rmsError = extractRmsError(selectedItem)
              const imageSize = extractImageSize(selectedItem)

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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">fx (초점거리 X)</p>
                      <p className="text-violet-400 text-xl font-mono">{params.fx?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">fy (초점거리 Y)</p>
                      <p className="text-violet-400 text-xl font-mono">{params.fy?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">cx (주점 X)</p>
                      <p className="text-emerald-400 text-xl font-mono">{params.cx?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">cy (주점 Y)</p>
                      <p className="text-emerald-400 text-xl font-mono">{params.cy?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 rounded-lg mb-4">
                    <p className="text-gray-500 text-xs mb-2">왜곡 계수 (k1, k2, p1, p2, k3)</p>
                    <div className="flex gap-2 flex-wrap">
                      {distCoeffs?.map((coef, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 rounded text-amber-400 text-xs font-mono">{coef?.toFixed(6)}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">RMS 오차</p>
                      <p className={'text-lg font-mono ' + (rmsError < 0.5 ? 'text-emerald-400' : rmsError < 1 ? 'text-amber-400' : 'text-rose-400')}>
                        {rmsError?.toFixed(4)} px
                      </p>
                    </div>
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <p className="text-gray-500 text-xs">이미지 크기</p>
                      <p className="text-white text-lg font-mono">{imageSize.width} × {imageSize.height}</p>
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

          {/* 범위/편차 분석 - 선택된 계산 기준 */}
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

                // 이상치 감지: 2σ(경고), 3σ(위험)
                const warnings = [] // 2σ 이상 3σ 미만
                const dangers = []  // 3σ 이상

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
                              <p className="text-gray-500 mt-2">
                                📊 아래 분석 결과는 참고용으로만 활용하시고, 더 많은 데이터 수집 후 재확인하세요.
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
                                  <p className="text-gray-500 mt-2">
                                    🔴 측정 과정에서 심각한 오류가 있었을 가능성이 높습니다. 재측정을 강력히 권장합니다.
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
                                  <p className="text-gray-500 mt-2">
                                    💡 데이터 수집 과정의 오류 여부를 확인하고, 필요시 재측정을 권장합니다.
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
                                <p className="text-xs text-gray-500">모든 파라미터가 기존 측정값의 정상 범위 내에 있습니다. <span className="text-emerald-400/70">(2σ 이내)</span></p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* 카메라 매트릭스 파라미터 분석 */}
              <div className="mb-6">
                <h4 className="text-violet-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <span>📐</span> Camera Matrix 파라미터
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'fx', label: 'fx (초점거리 X)', color: 'violet' },
                    { key: 'fy', label: 'fy (초점거리 Y)', color: 'violet' },
                    { key: 'cx', label: 'cx (주점 X)', color: 'emerald' },
                    { key: 'cy', label: 'cy (주점 Y)', color: 'emerald' },
                  ].map(({ key, label, color }) => {
                    const stats = analysis.data[key]
                    if (!stats) return null
                    const range = stats.max - stats.min || 1
                    const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                    const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))
                    const colorClasses = {
                      violet: { bg: 'from-violet-500/20 via-violet-500/40 to-violet-500/20', dot: 'from-violet-400 to-purple-500', shadow: 'shadow-violet-500/50', text: 'text-violet-400' },
                      emerald: { bg: 'from-emerald-500/20 via-emerald-500/40 to-emerald-500/20', dot: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/50', text: 'text-emerald-400' },
                    }
                    const c = colorClasses[color]

                    return (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs font-medium">{label}</span>
                          <span className={`font-mono text-sm font-bold ${c.text}`}>{stats.current?.toFixed(2)}</span>
                        </div>
                        {/* 그래프 바 */}
                        <div className="h-4 bg-gray-800 rounded-full relative overflow-hidden mb-2">
                          {/* 그라데이션 배경 */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${c.bg} rounded-full`}></div>
                          {/* 범위 표시 바 */}
                          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                            <div className="h-1 w-full bg-gray-700/50 rounded-full"></div>
                          </div>
                          {/* 평균 라인 */}
                          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/80 z-10" style={{ left: `${avgPos}%` }}>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          </div>
                          {/* 현재값 포인트 */}
                          <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br ${c.dot} shadow-lg ${c.shadow} border-2 border-white/30 z-20`}
                            style={{ left: `calc(${currentPos}% - 8px)` }}>
                          </div>
                          {/* 연결선 (평균과 현재값 사이) */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                            <line x1={`${avgPos}%`} y1="50%" x2={`${currentPos}%`} y2="50%"
                              stroke={color === 'violet' ? '#a78bfa' : '#34d399'} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                          </svg>
                        </div>
                        {/* 통계 정보 */}
                        <div className="flex justify-between text-[10px]">
                          <div>
                            <span className="text-gray-500">min: </span>
                            <span className="text-gray-400 font-mono">{stats.min?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">avg: </span>
                            <span className="text-gray-400 font-mono">{stats.avg?.toFixed(2)}</span>
                            <span className="text-gray-600 ml-1">(σ {stats.stdDev?.toFixed(2)})</span>
                          </div>
                          <div>
                            <span className="text-gray-500">max: </span>
                            <span className="text-gray-400 font-mono">{stats.max?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RMS 오차 분석 */}
              {analysis.data.rms_error && (
                <div className="mb-6">
                  <h4 className="text-amber-400 font-medium text-sm mb-3 flex items-center gap-2">
                    <span>🎯</span> RMS 재투영 오차
                  </h4>
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    {(() => {
                      const stats = analysis.data.rms_error
                      const range = stats.max - stats.min || 0.1
                      const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                      const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))
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
                            <div className="text-right text-xs">
                              <p className="text-gray-500">평균 대비</p>
                              <p className={`font-mono ${stats.current < stats.avg ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stats.current < stats.avg ? '▼' : '▲'} {Math.abs(stats.current - stats.avg).toFixed(4)}
                              </p>
                            </div>
                          </div>
                          {/* RMS 그래프 바 */}
                          <div className="h-6 bg-gray-800 rounded-full relative overflow-hidden mb-2">
                            {/* 품질 구간 표시 */}
                            <div className="absolute inset-0 flex">
                              <div className="h-full bg-emerald-500/20" style={{ width: `${Math.min(100, ((0.5 - stats.min) / range) * 100)}%` }}></div>
                              <div className="h-full bg-amber-500/20" style={{ width: `${Math.min(100, ((1 - 0.5) / range) * 100)}%` }}></div>
                              <div className="h-full bg-rose-500/20 flex-1"></div>
                            </div>
                            {/* 평균 라인 */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10" style={{ left: `${avgPos}%` }}>
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 whitespace-nowrap">avg</div>
                            </div>
                            {/* 현재값 */}
                            <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br shadow-lg border-2 border-white/40 z-20 ${
                              currentColor === 'emerald' ? 'from-emerald-400 to-teal-500 shadow-emerald-500/50' :
                              currentColor === 'amber' ? 'from-amber-400 to-orange-500 shadow-amber-500/50' :
                              'from-rose-400 to-red-500 shadow-rose-500/50'
                            }`} style={{ left: `calc(${currentPos}% - 10px)` }}>
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] mt-3">
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

              {/* 왜곡 계수 분석 */}
              <div>
                <h4 className="text-cyan-400 font-medium text-sm mb-3 flex items-center gap-2">
                  <span>🔮</span> 왜곡 계수 (Distortion Coefficients)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {['k1', 'k2', 'p1', 'p2', 'k3'].map((key, idx) => {
                    const stats = analysis.data[key]
                    if (!stats) return null
                    const range = stats.max - stats.min || 0.0001
                    const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                    const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))
                    const isRadial = key.startsWith('k')

                    return (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold ${isRadial ? 'text-cyan-400' : 'text-pink-400'}`}>{key}</span>
                          <span className="text-[9px] text-gray-500">{isRadial ? 'radial' : 'tangent'}</span>
                        </div>
                        <p className="text-white font-mono text-sm mb-2 text-center">{stats.current?.toExponential(3)}</p>
                        {/* 미니 그래프 */}
                        <div className="h-2 bg-gray-800 rounded-full relative overflow-hidden">
                          <div className={`absolute inset-0 bg-gradient-to-r ${isRadial ? 'from-cyan-500/20 via-cyan-500/40 to-cyan-500/20' : 'from-pink-500/20 via-pink-500/40 to-pink-500/20'} rounded-full`}></div>
                          <div className="absolute top-0 bottom-0 w-px bg-gray-400/60" style={{ left: `${avgPos}%` }}></div>
                          <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-br ${isRadial ? 'from-cyan-400 to-blue-500' : 'from-pink-400 to-rose-500'} shadow-lg border border-white/30`}
                            style={{ left: `calc(${currentPos}% - 5px)` }}></div>
                        </div>
                        <div className="flex justify-between mt-1.5 text-[8px] text-gray-500">
                          <span>{stats.min?.toExponential(1)}</span>
                          <span>{stats.max?.toExponential(1)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IntrinsicHistory
