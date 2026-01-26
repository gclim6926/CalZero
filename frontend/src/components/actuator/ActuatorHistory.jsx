import { useState, useEffect } from 'react'
import ExportButton from '../common/ExportButton'

function ActuatorHistory({ device, calibrations, onDelete }) {
  const [selectedCalibration, setSelectedCalibration] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const deviceCalibrations = device
    ? calibrations.filter(c => c.device_id === device.id)
    : calibrations

  // Latest 기본 선택
  useEffect(() => {
    if (deviceCalibrations.length > 0) {
      // 선택된 게 없거나, 선택된 게 현재 목록에 없으면 첫 번째로
      if (!selectedCalibration || !deviceCalibrations.find(c => c.id === selectedCalibration.id)) {
        setSelectedCalibration(deviceCalibrations[0])
      }
    } else {
      setSelectedCalibration(null)
    }
  }, [deviceCalibrations])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const handleSelectCalibration = (calib) => {
    setSelectedCalibration(calib)
  }

  const handleDeleteCalibration = async (calib, e) => {
    e.stopPropagation()
    if (!confirm('이 캘리브레이션을 삭제하시겠습니까?')) return

    const deviceId = calib.device_id || device?.id
    if (!deviceId) {
      alert('장치 정보가 없습니다.')
      return
    }

    setIsDeleting(true)
    try {
      if (onDelete) {
        console.log('Deleting:', calib.id, 'deviceId:', deviceId)
        await onDelete(calib.id, deviceId)
      }
    } catch (error) {
      console.error('Failed to delete calibration:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // 선택된 캘리브레이션 기준으로 분석 계산
  const calculateAnalysis = () => {
    if (deviceCalibrations.length === 0 || !selectedCalibration) return null

    const allJoints = new Set()
    deviceCalibrations.forEach(c => {
      if (c.calibration_data) Object.keys(c.calibration_data).forEach(j => allJoints.add(j))
    })

    const analysis = {}
    allJoints.forEach(joint => {
      const values = { homing_offset: [], range_min: [], range_max: [] }

      deviceCalibrations.forEach(c => {
        const data = c.calibration_data?.[joint]
        if (data) {
          if (data.homing_offset !== undefined) values.homing_offset.push(data.homing_offset)
          if (data.range_min !== undefined) values.range_min.push(data.range_min)
          if (data.range_max !== undefined) values.range_max.push(data.range_max)
        }
      })

      // 선택된 캘리브레이션의 현재값
      const selectedData = selectedCalibration.calibration_data?.[joint]

      const calcStats = (arr, currentVal) => {
        if (arr.length === 0) return null
        const min = Math.min(...arr)
        const max = Math.max(...arr)
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length
        return { min, max, avg, current: currentVal ?? arr[0] }
      }

      analysis[joint] = {
        homing_offset: calcStats(values.homing_offset, selectedData?.homing_offset),
        range_min: calcStats(values.range_min, selectedData?.range_min),
        range_max: calcStats(values.range_max, selectedData?.range_max),
      }
    })
    return analysis
  }

  const analysis = calculateAnalysis()

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 히스토리를 확인할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* 왼쪽: 히스토리 목록 */}
      <div className="lg:col-span-1">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold flex items-center gap-2">📋 히스토리</h3>
            <span className="text-gray-500 text-sm">{deviceCalibrations.length}개</span>
          </div>
          {deviceCalibrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-500">캘리브레이션 기록이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">캘리브레이션 탭에서 데이터를 등록하세요</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {deviceCalibrations.map((calib, idx) => (
                <div key={calib.id} onClick={() => handleSelectCalibration(calib)}
                  className={`p-3 rounded-lg cursor-pointer transition border ${
                    selectedCalibration?.id === calib.id ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-gray-900 border-transparent hover:border-gray-700'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">Latest</span>}
                      <span className="text-white text-sm">{formatDate(calib.created_at)}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteCalibration(calib, e)}
                      disabled={isDeleting}
                      className="text-gray-500 hover:text-rose-400 text-xs px-2 py-1 disabled:opacity-50 hover:bg-rose-500/10 rounded transition"
                    >
                      삭제
                    </button>
                  </div>
                  {calib.notes && <p className="text-gray-400 text-xs mt-1">{calib.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 선택된 캘리브레이션 + 범위/편차 분석 */}
      <div className="lg:col-span-3 space-y-4">
        {/* 선택된 캘리브레이션 상세 */}
        {selectedCalibration && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                📊 {formatDate(selectedCalibration.created_at)}
                {selectedCalibration.notes && <span className="text-gray-500 font-normal text-sm ml-2">- {selectedCalibration.notes}</span>}
              </h3>
              <ExportButton data={selectedCalibration} filename={`calibration_${selectedCalibration.id}`} format="json" />
            </div>
            {selectedCalibration.calibration_data && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 font-medium py-2 px-3">Joint</th>
                      <th className="text-right text-gray-400 font-medium py-2 px-3">homing_offset</th>
                      <th className="text-right text-gray-400 font-medium py-2 px-3">range_min</th>
                      <th className="text-right text-gray-400 font-medium py-2 px-3">range_max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedCalibration.calibration_data).map(([joint, data]) => (
                      <tr key={joint} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 px-3 text-cyan-400 font-medium">{joint}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{data.homing_offset}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{data.range_min}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{data.range_max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 범위/편차 분석 - 선택된 캘리브레이션 기준 */}
        {analysis && Object.keys(analysis).length > 0 && deviceCalibrations.length > 1 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-white font-bold flex items-center gap-2 mb-2">📈 범위/편차 분석</h3>
            <p className="text-gray-500 text-xs mb-4">
              {deviceCalibrations.length}개 측정 데이터 기준 |
              <span className="text-cyan-400 ml-1">◉</span> 선택된 값 ({selectedCalibration?.notes || formatDate(selectedCalibration?.created_at)})
              <span className="text-gray-400 ml-1">|</span> 평균
            </p>

            <div className="space-y-4">
              {Object.entries(analysis).map(([joint, data]) => (
                <div key={joint} className="bg-gray-900/50 rounded-lg p-3">
                  <h4 className="text-cyan-400 font-medium text-sm mb-3">{joint}</h4>
                  <div className="space-y-3">
                    {['homing_offset', 'range_min', 'range_max'].map(param => {
                      const stats = data[param]
                      if (!stats) return null
                      const range = stats.max - stats.min || 1
                      const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                      const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))

                      return (
                        <div key={param}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400 text-xs">{param}</span>
                            <span className="text-white font-mono text-sm">{stats.current}</span>
                          </div>
                          {/* 그래프 바 */}
                          <div className="h-3 bg-gray-800 rounded-full relative overflow-hidden">
                            {/* 그라데이션 배경 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/40 to-cyan-500/20 rounded-full"></div>
                            {/* 평균 라인 */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60" style={{ left: `${avgPos}%` }}></div>
                            {/* 현재값 포인트 */}
                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 border border-white/30"
                              style={{ left: `calc(${currentPos}% - 6px)` }}></div>
                          </div>
                          {/* min/max/avg 숫자 */}
                          <div className="flex justify-between mt-1 text-[10px]">
                            <span className="text-gray-500">min: <span className="text-gray-400 font-mono">{stats.min}</span></span>
                            <span className="text-gray-500">avg: <span className="text-gray-400 font-mono">{stats.avg.toFixed(1)}</span></span>
                            <span className="text-gray-500">max: <span className="text-gray-400 font-mono">{stats.max}</span></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 데이터 없음 */}
        {deviceCalibrations.length === 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-semibold text-white mb-2">캘리브레이션 기록이 없습니다</h3>
            <p className="text-gray-400 text-sm">캘리브레이션 탭에서 새 데이터를 등록해주세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActuatorHistory
