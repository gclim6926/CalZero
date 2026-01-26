import { useState, useEffect } from 'react'

function IntrinsicHistory({ device, calibrations, onDelete }) {
  const [selectedCamera, setSelectedCamera] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const cameras = [
    { id: 'all', name: '전체', icon: '📋' },
    { id: 'front_cam', name: 'Front Cam', icon: '📷' },
    { id: 'wrist_cam', name: 'Wrist Cam', icon: '🤖' },
  ]

  // 현재 장치의 캘리브레이션 필터링
  const getFilteredCalibrations = () => {
    if (!device || !calibrations) return []

    let filtered = calibrations.filter(c => c.device_id === device.id)

    if (selectedCamera !== 'all') {
      filtered = filtered.filter(c => c.camera === selectedCamera)
    }

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
      {/* Intrinsic 히스토리 설명 */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/30 p-4">
        <h3 className="text-violet-400 font-semibold text-sm mb-2">📋 Intrinsic 히스토리</h3>
        <p className="text-gray-300 text-xs leading-relaxed">
          Intrinsic 캘리브레이션 이력을 관리합니다.
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
              <p className="text-gray-500 text-sm">캘리브레이션 기록이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">캘리브레이션 탭에서 새 캘리브레이션을 진행하세요</p>
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
                        {selectedCamera === 'all' && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                            item.camera === 'wrist_cam'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-violet-500/20 text-violet-400'
                          }`}>
                            {item.camera === 'wrist_cam' ? 'Wrist' : 'Front'}
                          </span>
                        )}
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
        <div className="lg:col-span-2">
          {compareMode && compareItems.length === 2 ? (
            // 비교 뷰
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-bold text-sm mb-4">🔀 캘리브레이션 비교</h3>
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
        </div>
      </div>
    </div>
  )
}

export default IntrinsicHistory
