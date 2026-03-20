import { useState, useEffect } from 'react'
import ExportButton from '../common/ExportButton'
import { ALICE_M1_BODY_JOINTS, ALICE_M1_HAND_JOINTS } from './AliceM1CalibrationForm'
import { getEffectiveRobotType, getActuatorConfig } from '../../utils/menuConfig'

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

    const effectiveType = getEffectiveRobotType(device)
    const config = getActuatorConfig(effectiveType)
    const paramKeys = [config.calibFields.value, config.calibFields.min, config.calibFields.max]

    // 선택된 캘리브레이션을 제외한 나머지 데이터로 통계 계산
    const otherCalibrations = deviceCalibrations.filter(c => c.id !== selectedCalibration.id)

    const analysis = {}
    allJoints.forEach(joint => {
      const values = {}
      paramKeys.forEach(k => { values[k] = [] })

      otherCalibrations.forEach(c => {
        const data = c.calibration_data?.[joint]
        if (data) {
          paramKeys.forEach(k => {
            if (data[k] !== undefined && data[k] !== null) values[k].push(data[k])
          })
        }
      })

      // 선택된 캘리브레이션의 현재값
      const selectedData = selectedCalibration.calibration_data?.[joint]

      const calcStats = (arr, currentVal) => {
        if (arr.length === 0) return null
        const minVal = Math.min(...arr)
        const maxVal = Math.max(...arr)
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length
        const stdDev = arr.length > 1
          ? Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (arr.length - 1))
          : 0
        return { min: minVal, max: maxVal, avg, stdDev, current: currentVal ?? arr[0], count: arr.length }
      }

      analysis[joint] = {}
      paramKeys.forEach(k => {
        analysis[joint][k] = calcStats(values[k], selectedData?.[k])
      })
    })
    return analysis
  }

  const analysis = calculateAnalysis()

  // Joint 색상 매핑
  const getJointColor = (joint, index) => {
    const colors = [
      { bg: 'from-cyan-500/20 via-cyan-500/40 to-cyan-500/20', dot: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-500/50', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      { bg: 'from-violet-500/20 via-violet-500/40 to-violet-500/20', dot: 'from-violet-400 to-purple-500', shadow: 'shadow-violet-500/50', text: 'text-violet-400', border: 'border-violet-500/30' },
      { bg: 'from-emerald-500/20 via-emerald-500/40 to-emerald-500/20', dot: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/50', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      { bg: 'from-amber-500/20 via-amber-500/40 to-amber-500/20', dot: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/50', text: 'text-amber-400', border: 'border-amber-500/30' },
      { bg: 'from-rose-500/20 via-rose-500/40 to-rose-500/20', dot: 'from-rose-400 to-pink-500', shadow: 'shadow-rose-500/50', text: 'text-rose-400', border: 'border-rose-500/30' },
      { bg: 'from-sky-500/20 via-sky-500/40 to-sky-500/20', dot: 'from-sky-400 to-indigo-500', shadow: 'shadow-sky-500/50', text: 'text-sky-400', border: 'border-sky-500/30' },
    ]
    return colors[index % colors.length]
  }

  // 파라미터별 색상
  const effectiveType = getEffectiveRobotType(device)
  const config = getActuatorConfig(effectiveType)
  const isAliceM1 = effectiveType === 'alice_m1'
  const paramKeys = [config.calibFields.value, config.calibFields.min, config.calibFields.max]

  const getParamStyle = (param) => {
    const icons = { [config.calibFields.value]: '🏠', [config.calibFields.min]: '⬇️', [config.calibFields.max]: '⬆️' }
    const colors = { [config.calibFields.value]: 'cyan', [config.calibFields.min]: 'emerald', [config.calibFields.max]: 'amber' }
    return {
      label: config.paramLabels?.[Object.keys(config.calibFields).find(k => config.calibFields[k] === param)] || param,
      icon: icons[param] || '📊',
      color: colors[param] || 'gray',
    }
  }

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
    <div className="space-y-4">
      {/* 상단 헤더: 분석 목적 */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📊</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white mb-2">히스토리 분석</h2>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
                {deviceCalibrations.length}개 기록
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              캘리브레이션 이력을 관리하고, 새로 측정한 데이터가 과거 데이터 대비<span className="text-cyan-400">(최소 5개 이상)</span> 어느 수준인지 통계적으로 파악합니다.
              극단값<span className="text-amber-400">(2σ 이상)</span>이 감지되면 측정 오류 가능성이 있으므로 <span className="text-amber-400">재캘리브레이션</span>을 권장합니다.
            </p>
          </div>
        </div>
      </div>

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
              isAliceM1 ? (
                /* Alice M1: Body Joints / Hand Joints 분리 표시 */
                <div className="space-y-4">
                  {/* Body Joints */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">Body Joints</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900 border-b border-gray-700">
                            <th className="text-left text-gray-400 font-medium py-2 px-3">Joint</th>
                            <th className="text-center text-gray-400 font-medium py-2 px-3">범위</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Min</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Max</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Base 자세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ALICE_M1_BODY_JOINTS.map((joint, idx) => {
                            const data = selectedCalibration.calibration_data[joint.id]
                            if (!data) return null
                            return (
                              <tr key={joint.id} className={`border-b border-gray-700/50 ${idx % 2 === 0 ? 'bg-gray-900/30' : ''}`}>
                                <td className="py-2 px-3 text-cyan-400 font-mono text-xs">{joint.label}</td>
                                <td className="py-2 px-3 text-gray-500 text-center text-xs whitespace-nowrap">{joint.min}° ~ {joint.max}°</td>
                                <td className="py-2 px-3 text-right font-mono text-white">{data.min ?? '-'}</td>
                                <td className="py-2 px-3 text-right font-mono text-white">{data.max ?? '-'}</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-400">{data.base ?? '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Hand Joints */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">Hand Joints</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900 border-b border-gray-700">
                            <th className="text-left text-gray-400 font-medium py-2 px-3">Joint</th>
                            <th className="text-center text-gray-400 font-medium py-2 px-3">범위</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Min</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Max</th>
                            <th className="text-right text-gray-400 font-medium py-2 px-3">Base 자세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ALICE_M1_HAND_JOINTS.map((joint, idx) => {
                            const data = selectedCalibration.calibration_data[joint.id]
                            if (!data) return null
                            return (
                              <tr key={joint.id} className={`border-b border-gray-700/50 ${idx % 2 === 0 ? 'bg-gray-900/30' : ''}`}>
                                <td className="py-2 px-3 text-violet-400 font-mono text-xs">{joint.id.replace(/_/g, ' ')}</td>
                                <td className="py-2 px-3 text-gray-500 text-center text-xs whitespace-nowrap">{joint.min} ~ {joint.max}</td>
                                <td className="py-2 px-3 text-right font-mono text-white">{data.min ?? '-'}</td>
                                <td className="py-2 px-3 text-right font-mono text-white">{data.max ?? '-'}</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-400">{data.base ?? '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* 기본 로봇: config 기반 테이블 */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-medium py-2 px-3">Joint</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">{config.paramLabels.value}</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">{config.paramLabels.min}</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">{config.paramLabels.max}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedCalibration.calibration_data).map(([joint, data]) => (
                        <tr key={joint} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-cyan-400 font-medium">{joint}</td>
                          <td className="py-2 px-3 text-right font-mono text-white">{data[config.calibFields.value]}</td>
                          <td className="py-2 px-3 text-right font-mono text-white">{data[config.calibFields.min]}</td>
                          <td className="py-2 px-3 text-right font-mono text-white">{data[config.calibFields.max]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* 범위/편차 분석 - 선택된 캘리브레이션 기준 */}
        {analysis && Object.keys(analysis).length > 0 && deviceCalibrations.length > 1 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span className="text-lg">📈</span> 범위/편차 분석
              </h3>
              <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">
                {Object.keys(analysis).length} Joints
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{deviceCalibrations.length}개 측정 데이터 기준</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border border-white/30"></div>
                    <span className="text-gray-400">현재 선택 <span className="text-gray-500">({formatDate(selectedCalibration?.created_at)})</span></span>
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
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span>판정 기준:</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">&lt;2σ</span>
                  <span className="text-emerald-400">정상</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">2σ~3σ</span>
                  <span className="text-amber-400">경고</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">≥3σ</span>
                  <span className="text-rose-400">위험</span>
                </div>
              </div>
            </div>

            {/* 데이터 품질 분석 가이드 */}
            {(() => {
              const dataCount = deviceCalibrations.length
              const isLowData = dataCount < 5

              // 이상치 감지: 2σ(경고), 3σ(위험)
              const warnings = [] // 2σ 이상 3σ 미만
              const dangers = []  // 3σ 이상

              Object.entries(analysis).forEach(([joint, data]) => {
                paramKeys.forEach(param => {
                  const stats = data[param]
                  if (!stats || stats.stdDev === 0) return
                  const deviation = Math.abs(stats.current - stats.avg) / stats.stdDev

                  if (deviation >= 3) {
                    dangers.push({ joint, param, deviation: deviation.toFixed(1) })
                  } else if (deviation >= 2) {
                    warnings.push({ joint, param, deviation: deviation.toFixed(1) })
                  }
                })
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
                                  <span className="text-rose-300">{[...new Set(dangers.map(d => d.joint))].join(', ')}</span>
                                  {' '}조인트의 일부 파라미터가 평균에서 3σ 이상 벗어나 있습니다. <span className="text-rose-400/70">(정상 분포 기준 0.3% 확률)</span>
                                </p>
                                <p className="text-gray-500 mt-2">
                                  🔴 캘리브레이션 과정에서 심각한 오류가 있었을 가능성이 높습니다. 재측정을 강력히 권장합니다.
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
                                  <span className="text-amber-300">{[...new Set(warnings.map(w => w.joint))].join(', ')}</span>
                                  {' '}조인트의 일부 파라미터가 평균에서 2σ 이상 벗어나 있습니다. <span className="text-amber-400/70">(정상 분포 기준 4.6% 확률)</span>
                                </p>
                                <p className="text-gray-500 mt-2">
                                  💡 캘리브레이션 과정의 오류 여부를 확인하고, 필요시 재측정을 권장합니다.
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
                              <p className="text-xs text-gray-500">모든 조인트의 파라미터가 기존 측정값의 정상 범위 내에 있습니다. <span className="text-emerald-400/70">(2σ 이내)</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            <div className="space-y-4">
              {Object.entries(analysis).map(([joint, data], jointIdx) => {
                const jointColor = getJointColor(joint, jointIdx)

                return (
                  <div key={joint} className={`bg-gray-900/50 rounded-xl p-4 border ${jointColor.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`font-bold text-sm flex items-center gap-2 ${jointColor.text}`}>
                        <span className="text-lg">⚙️</span> {joint}
                      </h4>
                      <div className="flex items-center gap-2">
                        {data[paramKeys[0]] && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-800 rounded-full text-gray-400">
                            n={data[paramKeys[0]].count}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {paramKeys.map(param => {
                        const stats = data[param]
                        if (!stats) return null
                        const range = stats.max - stats.min || 1
                        const currentPos = Math.max(0, Math.min(100, ((stats.current - stats.min) / range) * 100))
                        const avgPos = Math.max(0, Math.min(100, ((stats.avg - stats.min) / range) * 100))
                        const paramStyle = getParamStyle(param)

                        // 색상 클래스
                        const colorClasses = {
                          cyan: { bg: 'from-cyan-500/20 via-cyan-500/40 to-cyan-500/20', dot: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-500/50', text: 'text-cyan-400', stroke: '#22d3ee' },
                          emerald: { bg: 'from-emerald-500/20 via-emerald-500/40 to-emerald-500/20', dot: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/50', text: 'text-emerald-400', stroke: '#34d399' },
                          amber: { bg: 'from-amber-500/20 via-amber-500/40 to-amber-500/20', dot: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/50', text: 'text-amber-400', stroke: '#fbbf24' },
                        }
                        const c = colorClasses[paramStyle.color]

                        return (
                          <div key={param} className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
                                <span>{paramStyle.icon}</span>
                                {paramStyle.label}
                              </span>
                              <span className={`font-mono text-sm font-bold ${c.text}`}>{stats.current}</span>
                            </div>

                            {/* 그래프 바 */}
                            <div className="h-4 bg-gray-900 rounded-full relative overflow-hidden mb-2">
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
                                  stroke={c.stroke} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                              </svg>
                            </div>

                            {/* 통계 정보 */}
                            <div className="flex justify-between text-[10px]">
                              <div>
                                <span className="text-gray-500">min: </span>
                                <span className="text-gray-400 font-mono">{stats.min}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">avg: </span>
                                <span className="text-gray-400 font-mono">{stats.avg.toFixed(1)}</span>
                                <span className="text-gray-600 ml-1">(σ {stats.stdDev.toFixed(1)})</span>
                              </div>
                              <div>
                                <span className="text-gray-500">max: </span>
                                <span className="text-gray-400 font-mono">{stats.max}</span>
                              </div>
                            </div>

                            {/* 현재값 vs 평균 비교 */}
                            {(() => {
                              const diff = stats.current - stats.avg
                              const sigmaDistance = stats.stdDev > 0 ? Math.abs(diff) / stats.stdDev : 0
                              const isWarning = sigmaDistance >= 2
                              const isDanger = sigmaDistance >= 3

                              return (
                                <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between">
                                  <span className="text-[10px] text-gray-500">평균 대비</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                      {diff < 0 ? '▼' : diff > 0 ? '▲' : '='} {Math.abs(diff).toFixed(1)}
                                    </span>
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                      isDanger ? 'bg-rose-500/20 text-rose-400' :
                                      isWarning ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-gray-700/50 text-gray-400'
                                    }`}>
                                      {sigmaDistance.toFixed(2)}σ
                                    </span>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
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
    </div>
  )
}

export default ActuatorHistory
