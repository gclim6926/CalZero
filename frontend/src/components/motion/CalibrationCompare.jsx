import { useState } from 'react'

// 가짜 데이터
const fakeCalibrations = [
  { id: 1, notes: 're-Cal1', shoulder_pan: 240, shoulder_lift: 241, elbow_flex: -347, wrist_flex: -1659, wrist_roll: -1380, gripper: -1337 },
  { id: 2, notes: 're-Cal2', shoulder_pan: 230, shoulder_lift: 220, elbow_flex: -310, wrist_flex: -1628, wrist_roll: -1401, gripper: -1336 },
  { id: 3, notes: 're-Cal3', shoulder_pan: 221, shoulder_lift: 233, elbow_flex: -354, wrist_flex: -1634, wrist_roll: -1392, gripper: -1338 },
  { id: 4, notes: 're-Cal4', shoulder_pan: 247, shoulder_lift: 200, elbow_flex: -372, wrist_flex: -1622, wrist_roll: -1405, gripper: -1336 },
]

const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']

function CalibrationCompare({ device }) {
  const [calib1, setCalib1] = useState(fakeCalibrations[0])
  const [calib2, setCalib2] = useState(fakeCalibrations[1])

  const getDiff = (joint) => {
    const diff = calib2[joint] - calib1[joint]
    const degrees = Math.abs(diff * 360 / 4096).toFixed(2)
    return { diff, degrees }
  }

  if (!device) {
    return (
      <div className="text-center text-gray-400 py-20">
        <p className="text-xl">📱 장치를 먼저 선택해주세요</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">캘리브레이션 비교</h2>

      {/* 선택 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-gray-300 mb-2">기준 캘리브레이션</label>
          <select
            value={calib1.id}
            onChange={(e) => setCalib1(fakeCalibrations.find(c => c.id === Number(e.target.value)))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {fakeCalibrations.map(c => (
              <option key={c.id} value={c.id}>{c.notes}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-300 mb-2">비교 캘리브레이션</label>
          <select
            value={calib2.id}
            onChange={(e) => setCalib2(fakeCalibrations.find(c => c.id === Number(e.target.value)))}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {fakeCalibrations.map(c => (
              <option key={c.id} value={c.id}>{c.notes}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 비교 테이블 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-3 text-left text-gray-300">Joint</th>
              <th className="px-4 py-3 text-right text-gray-300">{calib1.notes}</th>
              <th className="px-4 py-3 text-right text-gray-300">{calib2.notes}</th>
              <th className="px-4 py-3 text-right text-gray-300">차이 (steps)</th>
              <th className="px-4 py-3 text-right text-gray-300">차이 (°)</th>
            </tr>
          </thead>
          <tbody>
            {joints.map((joint) => {
              const { diff, degrees } = getDiff(joint)
              const isLarge = Math.abs(diff) > 30
              return (
                <tr key={joint} className="border-t border-gray-700">
                  <td className="px-4 py-3 text-cyan-400 font-medium">{joint}</td>
                  <td className="px-4 py-3 text-right text-white">{calib1[joint]}</td>
                  <td className="px-4 py-3 text-right text-white">{calib2[joint]}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isLarge ? 'text-red-400' : 'text-green-400'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </td>
                  <td className={`px-4 py-3 text-right ${isLarge ? 'text-red-400' : 'text-gray-400'}`}>
                    {degrees}°
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 경고 */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400">
          ⚠️ 30 steps 이상 차이나는 조인트는 빨간색으로 표시됩니다.
          큰 편차는 캘리브레이션 절차를 확인해주세요.
        </p>
      </div>
    </div>
  )
}

export default CalibrationCompare
