import { useState, useEffect } from 'react'
import { getEffectiveRobotType } from '../../utils/menuConfig'

function ReplayAnalysis({ device, calibrations, replayTests, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [selectedCalibrationId, setSelectedCalibrationId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 로봇 타입별 리플레이 설정
  const effectiveType = getEffectiveRobotType(device)
  const isAliceM1 = effectiveType === 'alice_m1'

  // 품질 판정 기준 (localStorage 저장, 로봇 타입별 기본값)
  const defaultNormal = isAliceM1 ? 5 : 3
  const defaultWarning = isAliceM1 ? 10 : 5
  const storageKeyNormal = `replay_threshold_normal_${effectiveType || 'default'}`
  const storageKeyWarning = `replay_threshold_warning_${effectiveType || 'default'}`

  const [thresholdNormal, setThresholdNormal] = useState(() => {
    return parseFloat(localStorage.getItem(storageKeyNormal) || String(defaultNormal))
  })
  const [thresholdWarning, setThresholdWarning] = useState(() => {
    return parseFloat(localStorage.getItem(storageKeyWarning) || String(defaultWarning))
  })

  // 로봇 타입 변경 시 임계값 재로드
  useEffect(() => {
    setThresholdNormal(parseFloat(localStorage.getItem(storageKeyNormal) || String(defaultNormal)))
    setThresholdWarning(parseFloat(localStorage.getItem(storageKeyWarning) || String(defaultWarning)))
  }, [effectiveType])
  const positionCount = isAliceM1 ? 12 : 6

  // 위치 오차 입력 (로봇 타입에 따라 6개 또는 12개)
  const [positions, setPositions] = useState(
    Array.from({ length: positionCount }, (_, i) => ({
      position: i + 1,
      error_x: '',
      error_y: '',
      error_z: ''
    }))
  )

  // 로봇 타입 변경 시 positions 재초기화
  useEffect(() => {
    setPositions(
      Array.from({ length: positionCount }, (_, i) => ({
        position: i + 1,
        error_x: '',
        error_y: '',
        error_z: ''
      }))
    )
  }, [positionCount])

  const deviceTests = device
    ? replayTests.filter(t => t.device_id === device.id)
    : replayTests

  const deviceCalibrations = device
    ? calibrations.filter(c => c.device_id === device.id)
    : calibrations

  // 최신 테스트 자동 선택
  useEffect(() => {
    if (deviceTests.length > 0) {
      if (!selectedTest || !deviceTests.find(t => t.id === selectedTest.id)) {
        setSelectedTest(deviceTests[0])
      }
    } else {
      setSelectedTest(null)
    }
  }, [deviceTests])

  // 임계값 저장 (로봇 타입별)
  useEffect(() => {
    localStorage.setItem(storageKeyNormal, thresholdNormal.toString())
    localStorage.setItem(storageKeyWarning, thresholdWarning.toString())
  }, [thresholdNormal, thresholdWarning, storageKeyNormal, storageKeyWarning])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const calculateDistance = (x, y, z) => {
    const ex = parseFloat(x) || 0
    const ey = parseFloat(y) || 0
    const ez = parseFloat(z) || 0
    return Math.sqrt(ex * ex + ey * ey + ez * ez)
  }

  const handlePositionChange = (index, field, value) => {
    setPositions(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ))
  }

  const handleSave = async () => {
    // 유효성 검사: 최소 1개 위치에 값이 있어야 함
    const hasData = positions.some(p =>
      p.error_x !== '' || p.error_y !== '' || p.error_z !== ''
    )
    if (!hasData) {
      alert('최소 1개 위치의 오차 값을 입력해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const testData = {
        device_id: device.id,
        calibration_id: selectedCalibrationId ? parseInt(selectedCalibrationId) : null,
        positions: positions.map(p => ({
          position: p.position,
          error_x: parseFloat(p.error_x) || 0,
          error_y: parseFloat(p.error_y) || 0,
          error_z: parseFloat(p.error_z) || 0
        })),
        notes: notes || '새 테스트'
      }

      await onSave(testData)

      // 폼 초기화
      setPositions(Array.from({ length: positionCount }, (_, i) => ({
        position: i + 1, error_x: '', error_y: '', error_z: ''
      })))
      setNotes('')
      setSelectedCalibrationId('')
      setShowForm(false)
    } catch (error) {
      console.error('Failed to save test:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (test, e) => {
    e.stopPropagation()
    if (!confirm('이 테스트를 삭제하시겠습니까?')) return

    setIsDeleting(true)
    try {
      await onDelete(test.id, test.device_id)
    } catch (error) {
      console.error('Failed to delete test:', error)
      alert('삭제 실패: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const getQualityStatus = (avgError) => {
    if (avgError <= thresholdNormal) {
      return { label: '정상', color: 'emerald', icon: '✓', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400' }
    } else if (avgError <= thresholdWarning) {
      return { label: '주의', color: 'amber', icon: '⚠️', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' }
    } else {
      return { label: '재캘리브레이션 필요', color: 'rose', icon: '🚨', bgClass: 'bg-rose-500/20', textClass: 'text-rose-400' }
    }
  }

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 리플레이 분석을 진행할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 상단 헤더: 분석 목적 */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white mb-2">리플레이 분석</h2>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
                {deviceTests.length}개 기록
              </span>
            </div>

            {isAliceM1 ? (
              /* ===== Alice M1: 12개 위치, 양손 L/R Zone ===== */
              <>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  캘리브레이션된 로봇의 <span className="text-orange-400 font-medium">왼손</span>과{' '}
                  <span className="text-emerald-400 font-medium">오른손</span>이 각각 지정된 타겟을 얼마나 정확하게
                  터치하는지 측정합니다. 왼손으로 <span className="text-orange-400">L-touch Zone(위치 1~9)</span>,
                  오른손으로 <span className="text-emerald-400">R-touch Zone(위치 4~12)</span>을 각각 터치하며,
                  <span className="text-cyan-400">위치 4~9는 양손이 공유</span>하는 중앙 영역입니다.
                  총 <span className="text-cyan-400 font-medium">12개 고유 위치</span>의 오차
                  <span className="text-gray-400">(mm)</span>를 기록하여 캘리브레이션 품질을 검증하고,
                  반복 측정을 통해 양팔의 정밀도를 추적합니다.
                </p>

                <div className="bg-gray-900/60 rounded-lg border border-gray-700/50 p-4">
                  <h4 className="text-cyan-400 font-semibold text-sm flex items-center gap-2 mb-3">
                    <span>📐</span> 측정 타겟 배치도
                  </h4>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-shrink-0">
                      <img
                        src="/robots/replay_alice_m1.png"
                        alt="Alice M1 리플레이 타겟 배치도 - L-touch Zone, R-touch Zone, 4×3 그리드"
                        className="max-w-[360px] w-full rounded-lg border border-gray-600 object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        로봇 정면에 <span className="text-cyan-400 font-medium">4×3 격자 형태</span>로
                        총 <span className="text-cyan-400 font-medium">12개의 원형 타겟</span>을 배치하고,
                        좌우 양손의 터치 영역을 나누어 측정합니다.
                      </p>
                      <ul className="text-gray-400 text-xs space-y-1.5 list-none">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">●</span>
                          <span><span className="text-orange-400 font-medium">L-touch Zone (위치 1~9)</span> — 왼손이 터치하는 9개 타겟 (좌측 3열)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">●</span>
                          <span><span className="text-emerald-400 font-medium">R-touch Zone (위치 4~12)</span> — 오른손이 터치하는 9개 타겟 (우측 3열)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-400 mt-0.5">●</span>
                          <span><span className="text-cyan-400 font-medium">공유 영역 (위치 4~9)</span> — 양손이 모두 터치하는 중앙 6개 타겟</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>타겟 간 <span className="text-white">가로 간격: 20cm</span>, <span className="text-white">세로 간격: 20cm</span></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>각 타겟 직경: <span className="text-white">1cm</span> (정밀 포인트)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>로봇이 각 타겟 중심을 순서대로 터치하며, 실제 도달 위치와 목표 위치 간의 편차를 mm 단위로 기록합니다.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>중앙 2열은 양손이 공유하는 영역으로, 좌·우 양쪽에서 각각 터치하여 교차 검증합니다.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===== SO101: 6개 위치, 단일 암 ===== */
              <>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  캘리브레이션된 로봇이 지정된 <span className="text-cyan-400">6개 위치</span>를 얼마나 정확하게 터치하는지 측정합니다.
                  각 위치별 오차<span className="text-gray-400">(mm)</span>를 기록하여 캘리브레이션 품질을 검증하고,
                  반복 측정을 통해 정밀도를 추적합니다.
                </p>

                <div className="bg-gray-900/60 rounded-lg border border-gray-700/50 p-4">
                  <h4 className="text-cyan-400 font-semibold text-sm flex items-center gap-2 mb-3">
                    <span>📐</span> 측정 타겟 배치도
                  </h4>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-shrink-0">
                      <img
                        src="/robots/replay_so101.jpg"
                        alt="리플레이 분석 타겟 배치도 - 3×2 그리드, 10cm 간격, 1cm 직경 타겟"
                        className="max-w-[280px] w-full rounded-lg border border-gray-600 object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        로봇 앞에 <span className="text-cyan-400 font-medium">3×2 격자 형태</span>로
                        총 <span className="text-cyan-400 font-medium">6개의 원형 타겟</span>을 배치합니다.
                      </p>
                      <ul className="text-gray-400 text-xs space-y-1.5 list-none">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>타겟 간 <span className="text-white">가로 간격: 10cm</span>, <span className="text-white">세로 간격: 10cm</span></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>각 타겟 직경: <span className="text-white">1cm</span> (정밀 포인트)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>로봇이 각 타겟 중심을 순서대로 터치하며, 실제 도달 위치와 목표 위치 간의 편차를 mm 단위로 기록합니다.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-500 mt-0.5">●</span>
                          <span>번호 순서: 좌상단(①) → 우하단(⑥), 좌→우 / 상→하 방향</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 품질 판정 기준 설정 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <span>⚙️</span> 품질 판정 기준 설정
        </h3>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓ 정상:</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={thresholdNormal}
              onChange={(e) => setThresholdNormal(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-center"
            />
            <span className="text-gray-400">mm 이하</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠️ 주의:</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={thresholdWarning}
              onChange={(e) => setThresholdWarning(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-center"
            />
            <span className="text-gray-400">mm 이하</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-rose-400">🚨 재캘리브레이션:</span>
            <span className="text-gray-400">{thresholdWarning}mm 초과</span>
          </div>
        </div>
      </div>

      {/* 새 테스트 입력 폼 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowForm(!showForm)}
        >
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span>📝</span> 새 리플레이 테스트 기록
          </h3>
          <span className={`text-gray-400 transition-transform ${showForm ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {showForm && (
          <div className="mt-4 space-y-4">
            {/* 캘리브레이션 선택 */}
            <div>
              <label className="text-gray-400 text-xs block mb-1">캘리브레이션 선택 (선택사항)</label>
              <select
                value={selectedCalibrationId}
                onChange={(e) => setSelectedCalibrationId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">선택 안 함</option>
                {deviceCalibrations.map(c => (
                  <option key={c.id} value={c.id}>
                    {formatDate(c.created_at)} - {c.notes || '캘리브레이션'}
                  </option>
                ))}
              </select>
            </div>

            {/* 위치 오차 입력 */}
            {isAliceM1 && (
              <div className="flex items-center gap-4 text-xs mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500/60"></span>
                  <span className="text-orange-400">L-touch Zone (위치 1~9)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/60"></span>
                  <span className="text-cyan-400">공유 영역 (위치 4~9)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></span>
                  <span className="text-emerald-400">R-touch Zone (위치 4~12)</span>
                </span>
              </div>
            )}
            <div className={`grid gap-4 ${isAliceM1 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
              {positions.map((pos, idx) => {
                const distance = calculateDistance(pos.error_x, pos.error_y, pos.error_z)
                const quality = getQualityStatus(distance)
                // Alice M1 zone 판정: L(1~9), R(4~12), 공유(4~9)
                const isLeftOnly = isAliceM1 && idx < 3           // 위치 1~3: L 전용
                const isShared = isAliceM1 && idx >= 3 && idx < 9 // 위치 4~9: L+R 공유
                const isRightOnly = isAliceM1 && idx >= 9         // 위치 10~12: R 전용
                const zoneBorder = isLeftOnly ? 'border-orange-500/30'
                  : isRightOnly ? 'border-emerald-500/30'
                  : isShared ? 'border-cyan-500/30'
                  : 'border-gray-700'
                const zoneLabel = isLeftOnly ? 'L' : isRightOnly ? 'R' : isShared ? 'L+R' : ''
                const zoneLabelColor = isLeftOnly ? 'text-orange-400'
                  : isRightOnly ? 'text-emerald-400'
                  : isShared ? 'text-cyan-400' : ''

                return (
                  <div key={idx} className={`bg-gray-900 rounded-lg p-3 border ${zoneBorder}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-400 text-sm font-medium flex items-center gap-1">
                        📍 {isAliceM1 && <span className={`${zoneLabelColor} text-xs font-bold`}>[{zoneLabel}]</span>} 위치 {pos.position}
                      </span>
                      {(pos.error_x || pos.error_y || pos.error_z) && (
                        <span className={`text-xs px-2 py-0.5 rounded ${quality.bgClass} ${quality.textClass}`}>
                          {distance.toFixed(2)}mm
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-6">X:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pos.error_x}
                          onChange={(e) => handlePositionChange(idx, 'error_x', e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <span className="text-gray-500 text-xs">mm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-6">Y:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pos.error_y}
                          onChange={(e) => handlePositionChange(idx, 'error_y', e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <span className="text-gray-500 text-xs">mm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-6">Z:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pos.error_z}
                          onChange={(e) => handlePositionChange(idx, 'error_z', e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        />
                        <span className="text-gray-500 text-xs">mm</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 메모 */}
            <div>
              <label className="text-gray-400 text-xs block mb-1">메모 (선택사항)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 모터 교체 후 테스트"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                isSaving
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  저장 중...
                </>
              ) : (
                '테스트 결과 저장'
              )}
            </button>
          </div>
        )}
      </div>

      {/* 테스트 이력 + 상세 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 왼쪽: 이력 목록 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold flex items-center gap-2">📋 테스트 이력</h3>
              <span className="text-gray-500 text-sm">{deviceTests.length}개</span>
            </div>
            {deviceTests.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-gray-500">테스트 기록이 없습니다</p>
                <p className="text-gray-600 text-xs mt-1">위에서 새 테스트를 등록하세요</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {deviceTests.map((test, idx) => {
                  const quality = getQualityStatus(test.avg_error)
                  return (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTest(test)}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        selectedTest?.id === test.id
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-gray-900 border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">
                              Latest
                            </span>
                          )}
                          <span className="text-white text-sm">{formatDate(test.created_at)}</span>
                        </div>
                        <button
                          onClick={(e) => handleDelete(test, e)}
                          disabled={isDeleting}
                          className="text-gray-500 hover:text-rose-400 text-xs px-2 py-1 hover:bg-rose-500/10 rounded transition"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-400 text-xs">{test.notes || '테스트'}</span>
                        <span className={`text-xs ${quality.textClass}`}>
                          {quality.icon} {test.avg_error.toFixed(2)}mm
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 선택된 테스트 상세 */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTest ? (
            <>
              {/* 테스트 상세 */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      📊 {formatDate(selectedTest.created_at)}
                    </h3>
                    {(() => {
                      const quality = getQualityStatus(selectedTest.avg_error)
                      return (
                        <span className={`px-3 py-1 rounded-full text-sm ${quality.bgClass} ${quality.textClass}`}>
                          {quality.icon} {quality.label}
                        </span>
                      )
                    })()}
                  </div>
                  {selectedTest.notes && (
                    <p className="text-gray-500 text-xs mt-1">📝 {selectedTest.notes}</p>
                  )}
                </div>

                {/* 위치별 오차 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-medium py-2 px-3">위치</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">X 오차</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">Y 오차</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">Z 오차</th>
                        <th className="text-right text-gray-400 font-medium py-2 px-3">거리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTest.positions.map((pos) => {
                        const quality = getQualityStatus(pos.distance)
                        return (
                          <tr key={pos.position} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-2 px-3 text-cyan-400 font-medium">📍 {pos.position}</td>
                            <td className={`py-2 px-3 text-right font-mono ${pos.error_x >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {pos.error_x >= 0 ? '+' : ''}{pos.error_x.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${pos.error_y >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {pos.error_y >= 0 ? '+' : ''}{pos.error_y.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${pos.error_z >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {pos.error_z >= 0 ? '+' : ''}{pos.error_z.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${quality.textClass}`}>
                              {pos.distance.toFixed(2)}mm
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 요약 */}
                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-end gap-6 text-sm">
                  <div>
                    <span className="text-gray-400">평균 오차: </span>
                    <span className="text-white font-mono font-bold">{selectedTest.avg_error.toFixed(2)}mm</span>
                  </div>
                  <div>
                    <span className="text-gray-400">최대 오차: </span>
                    <span className="text-rose-400 font-mono font-bold">{selectedTest.max_error.toFixed(2)}mm</span>
                  </div>
                </div>
              </div>

              {/* 오차 추이 분석 - 2개 이상이면 표시 */}
              {deviceTests.length >= 2 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <span className="text-lg">📈</span> 오차 추이 분석
                    </h3>
                    <div className="flex items-center gap-2">
                      {deviceTests.length < 5 && (
                        <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                          참고용 (5개 미만)
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">
                        {deviceTests.length}개 데이터
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-4">
                    <span>판정 기준:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        &lt;{thresholdNormal}mm
                      </span>
                      <span className="text-emerald-400">정상</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {thresholdNormal}~{thresholdWarning}mm
                      </span>
                      <span className="text-amber-400">주의</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                        &gt;{thresholdWarning}mm
                      </span>
                      <span className="text-rose-400">재캘리브레이션</span>
                    </div>
                  </div>

                  {/* Min-평균-Max 범위 막대 그래프 - 최근이 상단 */}
                  {(() => {
                    // 전체 범위 계산 (모든 테스트의 min/max 포함)
                    const allMinErrors = deviceTests.map(t => Math.min(...t.positions.map(p => p.distance)))
                    const allMaxErrors = deviceTests.map(t => t.max_error)
                    const globalMin = 0
                    const globalMax = Math.max(...allMaxErrors, thresholdWarning * 1.5)

                    return (
                      <div className="space-y-1">
                        {/* X축 스케일 표시 */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-600 text-[10px] w-24"></span>
                          <div className="flex-1 flex justify-between text-[10px] text-gray-500 px-1">
                            <span>0</span>
                            <span>{(globalMax / 2).toFixed(1)}mm</span>
                            <span>{globalMax.toFixed(1)}mm</span>
                          </div>
                          <span className="w-20"></span>
                        </div>

                        {deviceTests.slice(0, 10).map((test) => {
                          const minError = Math.min(...test.positions.map(p => p.distance))
                          const avgError = test.avg_error
                          const maxError = test.max_error
                          const quality = getQualityStatus(avgError)
                          const isSelected = selectedTest?.id === test.id

                          // 위치 계산 (백분율)
                          const minPos = (minError / globalMax) * 100
                          const avgPos = (avgError / globalMax) * 100
                          const maxPos = (maxError / globalMax) * 100
                          const rangeWidth = maxPos - minPos

                          // 색상 클래스
                          const barColorClass = quality.color === 'emerald'
                            ? 'bg-emerald-500'
                            : quality.color === 'amber'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'

                          const barBgClass = quality.color === 'emerald'
                            ? 'bg-emerald-500/30'
                            : quality.color === 'amber'
                            ? 'bg-amber-500/30'
                            : 'bg-rose-500/30'

                          return (
                            <div
                              key={test.id}
                              onClick={() => setSelectedTest(test)}
                              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition ${
                                isSelected
                                  ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50'
                                  : 'hover:bg-gray-700/30'
                              }`}
                            >
                              {/* 날짜 라벨 */}
                              <span className={`text-xs w-24 truncate ${isSelected ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
                                {new Date(test.created_at).toLocaleDateString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>

                              {/* 범위 막대 */}
                              <div className="flex-1 h-6 bg-gray-900 rounded relative">
                                {/* 임계값 라인 */}
                                <div
                                  className="absolute top-0 bottom-0 w-px bg-amber-500/40 z-10"
                                  style={{ left: `${(thresholdNormal / globalMax) * 100}%` }}
                                />
                                <div
                                  className="absolute top-0 bottom-0 w-px bg-rose-500/40 z-10"
                                  style={{ left: `${(thresholdWarning / globalMax) * 100}%` }}
                                />

                                {/* Min-Max 범위 막대 */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 h-3 ${barBgClass} rounded`}
                                  style={{
                                    left: `${minPos}%`,
                                    width: `${Math.max(rangeWidth, 1)}%`
                                  }}
                                />

                                {/* Min 마커 */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-4 ${barColorClass} rounded-sm`}
                                  style={{ left: `calc(${minPos}% - 3px)` }}
                                  title={`Min: ${minError.toFixed(2)}mm`}
                                />

                                {/* 평균 마커 (중앙 원) */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${barColorClass} rounded-full ring-2 ring-gray-900 z-20`}
                                  style={{ left: `calc(${avgPos}% - 6px)` }}
                                  title={`평균: ${avgError.toFixed(2)}mm`}
                                />

                                {/* Max 마커 */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-4 ${barColorClass} rounded-sm`}
                                  style={{ left: `calc(${maxPos}% - 3px)` }}
                                  title={`Max: ${maxError.toFixed(2)}mm`}
                                />
                              </div>

                              {/* 수치 표시 */}
                              <div className={`text-[10px] font-mono w-20 text-right ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                <span className="text-emerald-400">{minError.toFixed(1)}</span>
                                <span className="text-gray-600"> / </span>
                                <span className={quality.textClass}>{avgError.toFixed(1)}</span>
                                <span className="text-gray-600"> / </span>
                                <span className="text-rose-400">{maxError.toFixed(1)}</span>
                              </div>
                            </div>
                          )
                        })}

                        {/* 범례 */}
                        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-700/50 text-[10px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-gray-400 rounded-sm"></div>
                            <span>Min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                            <span>평균</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-3 bg-gray-400 rounded-sm"></div>
                            <span>Max</span>
                          </div>
                          <span className="text-gray-600">|</span>
                          <span>클릭하여 상세 보기</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* 통계 요약 */}
                  <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-gray-400 text-xs">전체 평균</div>
                      <div className="text-white font-mono font-bold">
                        {(deviceTests.reduce((sum, t) => sum + t.avg_error, 0) / deviceTests.length).toFixed(2)}mm
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">최저 평균</div>
                      <div className="text-emerald-400 font-mono font-bold">
                        {Math.min(...deviceTests.map(t => t.avg_error)).toFixed(2)}mm
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">최고 평균</div>
                      <div className="text-rose-400 font-mono font-bold">
                        {Math.max(...deviceTests.map(t => t.avg_error)).toFixed(2)}mm
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">테스트를 선택하세요</h3>
              <p className="text-gray-400 text-sm">왼쪽 목록에서 테스트를 선택하거나 새 테스트를 등록하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReplayAnalysis
