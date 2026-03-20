import { useState } from 'react'
import { getActuatorConfig, getEffectiveRobotType } from '../../utils/menuConfig'

function CalibrationCompare({ device, calibrations }) {
  const [calib1Idx, setCalib1Idx] = useState(0)
  const [calib2Idx, setCalib2Idx] = useState(1)

  const config = getActuatorConfig(getEffectiveRobotType(device))
  const joints = config.joints
  const { value: valueField } = config.calibFields
  const colors = config.colors
  const isAlice = device?.type === 'alice_m1'

  const deviceCalibrations = device
    ? calibrations.filter(c => c.device_id === device.id)
    : calibrations

  const calib1 = deviceCalibrations[calib1Idx] || deviceCalibrations[0]
  const calib2 = deviceCalibrations[calib2Idx] || deviceCalibrations[1] || deviceCalibrations[0]

  if (!device) {
    return (
      <div className="text-center text-gray-400 py-20">
        <p className="text-xl">📱 로봇을 먼저 선택해주세요</p>
      </div>
    )
  }

  if (deviceCalibrations.length < 2) {
    return (
      <div className="text-center text-gray-400 py-20">
        <p className="text-xl mb-2">📊 비교할 캘리브레이션이 부족합니다</p>
        <p className="text-sm">최소 2개의 캘리브레이션 데이터가 필요합니다. (현재 {deviceCalibrations.length}개)</p>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  const getDiff = (joint) => {
    const val1 = calib1?.calibration_data?.[joint]?.[valueField] || 0
    const val2 = calib2?.calibration_data?.[joint]?.[valueField] || 0
    const diff = val2 - val1
    if (isAlice) {
      // 이미 각도값
      return { val1, val2, diff, degrees: Math.abs(diff).toFixed(2) }
    } else {
      // SO101: steps, 4096 per revolution
      const degrees = Math.abs(diff * 360 / 4096).toFixed(2)
      return { val1, val2, diff, degrees }
    }
  }

  // 유효한 조인트만 표시 (데이터가 있는 것만)
  const activeJoints = joints.filter(joint =>
    calib1?.calibration_data?.[joint] || calib2?.calibration_data?.[joint]
  )

  const bodyJoints = isAlice ? activeJoints.filter(j => config.bodyJoints.includes(j)) : activeJoints
  const handJoints = isAlice ? activeJoints.filter(j => config.handJoints.includes(j)) : []

  const CalibLabel = (calib) => calib?.notes || formatDate(calib?.created_at)

  const JointTable = ({ jointList, title, titleColor }) => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {title && <div className={`px-4 py-2 bg-gray-700/50 border-b border-gray-700`}><span className={`text-sm font-semibold ${titleColor}`}>{title}</span></div>}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Joint</th>
            <th className="px-4 py-3 text-right text-gray-300 text-sm truncate max-w-[120px]" title={CalibLabel(calib1)}>{CalibLabel(calib1)}</th>
            <th className="px-4 py-3 text-right text-gray-300 text-sm truncate max-w-[120px]" title={CalibLabel(calib2)}>{CalibLabel(calib2)}</th>
            <th className="px-4 py-3 text-right text-gray-300 text-sm">차이</th>
            <th className="px-4 py-3 text-right text-gray-300 text-sm">차이 (°)</th>
          </tr>
        </thead>
        <tbody>
          {jointList.map((joint) => {
            const { val1, val2, diff, degrees } = getDiff(joint)
            const threshold = isAlice ? 5 : 30
            const isLarge = Math.abs(diff) > threshold
            return (
              <tr key={joint} className="border-t border-gray-700">
                <td className="px-4 py-3 font-medium text-sm" style={{ color: colors[joint] || '#9ca3af' }}>{joint}</td>
                <td className="px-4 py-3 text-right text-white text-sm">{isAlice ? `${val1.toFixed(1)}°` : val1}</td>
                <td className="px-4 py-3 text-right text-white text-sm">{isAlice ? `${val2.toFixed(1)}°` : val2}</td>
                <td className={`px-4 py-3 text-right font-semibold text-sm ${isLarge ? 'text-red-400' : 'text-green-400'}`}>
                  {diff > 0 ? '+' : ''}{isAlice ? diff.toFixed(1) + '°' : diff}
                </td>
                <td className={`px-4 py-3 text-right text-sm ${isLarge ? 'text-red-400' : 'text-gray-400'}`}>
                  {degrees}°
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">캘리브레이션 비교</h2>

      {/* 선택 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-gray-300 mb-2">기준 캘리브레이션</label>
          <select
            value={calib1Idx}
            onChange={(e) => setCalib1Idx(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {deviceCalibrations.map((c, idx) => (
              <option key={c.id} value={idx}>{c.notes || formatDate(c.created_at)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-300 mb-2">비교 캘리브레이션</label>
          <select
            value={calib2Idx}
            onChange={(e) => setCalib2Idx(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {deviceCalibrations.map((c, idx) => (
              <option key={c.id} value={idx}>{c.notes || formatDate(c.created_at)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 비교 테이블 */}
      <div className="space-y-4">
        {isAlice ? (
          <>
            {bodyJoints.length > 0 && <JointTable jointList={bodyJoints} title="Body Joints" titleColor="text-cyan-400" />}
            {handJoints.length > 0 && <JointTable jointList={handJoints} title="Hand Joints" titleColor="text-violet-400" />}
          </>
        ) : (
          <JointTable jointList={activeJoints} />
        )}
      </div>

      {/* 경고 */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400">
          ⚠️ {isAlice ? '5°' : '30 steps'} 이상 차이나는 조인트는 빨간색으로 표시됩니다.
          큰 편차는 캘리브레이션 절차를 확인해주세요.
        </p>
      </div>
    </div>
  )
}

export default CalibrationCompare
