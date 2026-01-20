import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

function CalibrationStats({ calibrations }) {
  if (!calibrations || calibrations.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10">
        <p>통계를 표시할 캘리브레이션 데이터가 없습니다.</p>
      </div>
    )
  }

  const joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']

  // 조인트별 통계 계산
  const calcStats = (joint) => {
    const values = calibrations.map(c => c.calibration_data[joint]?.homing_offset || 0)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const stdDeg = (std * 360 / 4096).toFixed(2)
    const rangeDeg = (range * 360 / 4096).toFixed(2)
    const error330mm = (330 * std * Math.PI / 180 * 360 / 4096).toFixed(1)
    return { mean: mean.toFixed(1), std: std.toFixed(1), min, max, range, stdDeg, rangeDeg, error330mm }
  }

  const statsData = joints.map(joint => ({
    joint,
    ...calcStats(joint)
  }))

  // 시간별 변화 데이터 (라인 차트용)
  const timeData = calibrations.slice().reverse().map((c, idx) => {
    const row = { name: c.notes || `Cal${idx + 1}` }
    joints.forEach(joint => {
      row[joint] = c.calibration_data[joint]?.homing_offset || 0
    })
    return row
  })

  // 바 차트용 데이터
  const barData = statsData.map(s => ({
    joint: s.joint.replace('_', '\n'),
    range: s.range,
    std: parseFloat(s.std)
  }))

  const colors = {
    shoulder_pan: '#00d4ff',
    shoulder_lift: '#ff6b6b',
    elbow_flex: '#4ecdc4',
    wrist_flex: '#ffd93d',
    wrist_roll: '#a855f7',
    gripper: '#ff8c00'
  }

  return (
    <div className="space-y-6">
      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsData.map(stat => (
          <div key={stat.joint} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h4 className="text-sm font-semibold mb-2" style={{ color: colors[stat.joint] }}>
              {stat.joint}
            </h4>
            <div className="text-xs space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>Range:</span>
                <span className="text-red-400 font-semibold">{stat.range}</span>
              </div>
              <div className="flex justify-between">
                <span>Std:</span>
                <span className="text-yellow-400">{stat.std}</span>
              </div>
              <div className="flex justify-between">
                <span>Std(°):</span>
                <span className="text-yellow-400">{stat.stdDeg}°</span>
              </div>
              <div className="flex justify-between">
                <span>오차:</span>
                <span className="text-red-400">±{stat.error330mm}mm</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 라인 차트 - 시간별 변화 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📈 Homing Offset 변화 추이</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            {joints.map(joint => (
              <Line 
                key={joint}
                type="monotone" 
                dataKey={joint} 
                stroke={colors[joint]} 
                strokeWidth={2}
                dot={{ fill: colors[joint] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 바 차트 - Range 비교 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📊 조인트별 변동폭 (Range)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="joint" stroke="#9ca3af" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="range" fill="#ff6b6b" name="Range (steps)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 통계 테이블 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📋 상세 통계</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 px-2">Joint</th>
                <th className="text-right py-2 px-2">Min</th>
                <th className="text-right py-2 px-2">Max</th>
                <th className="text-right py-2 px-2">Range</th>
                <th className="text-right py-2 px-2">Mean</th>
                <th className="text-right py-2 px-2">Std</th>
                <th className="text-right py-2 px-2">Std(°)</th>
                <th className="text-right py-2 px-2">330mm 오차</th>
              </tr>
            </thead>
            <tbody>
              {statsData.map(stat => (
                <tr key={stat.joint} className="border-b border-gray-700/50">
                  <td className="py-2 px-2 font-medium" style={{ color: colors[stat.joint] }}>{stat.joint}</td>
                  <td className="py-2 px-2 text-right text-gray-300">{stat.min}</td>
                  <td className="py-2 px-2 text-right text-gray-300">{stat.max}</td>
                  <td className="py-2 px-2 text-right text-red-400 font-semibold">{stat.range}</td>
                  <td className="py-2 px-2 text-right text-white">{stat.mean}</td>
                  <td className="py-2 px-2 text-right text-yellow-400">{stat.std}</td>
                  <td className="py-2 px-2 text-right text-yellow-400">{stat.stdDeg}°</td>
                  <td className="py-2 px-2 text-right text-red-400">±{stat.error330mm}mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CalibrationStats
