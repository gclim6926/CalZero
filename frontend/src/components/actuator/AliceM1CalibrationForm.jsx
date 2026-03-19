import { useState } from 'react'

// ===== 정적 데이터 =====
export const ALICE_M1_BODY_JOINTS = [
  { id: 'head_p',            label: 'head_p',            min: -40,  max: 40  },
  { id: 'head_y',            label: 'head_y',            min: -45,  max: 45  },
  { id: 'waist_y',           label: 'waist_y',           min: -45,  max: 45  },
  { id: 'waist_upper_pitch', label: 'waist_upper_pitch', min: 0,    max: 90  },
  { id: 'waist_lower_pitch', label: 'waist_lower_pitch', min: 0,    max: 90  },
  { id: 'l_sh_p',            label: 'l_sh_p',            min: -110, max: 50  },
  { id: 'l_sh_r',            label: 'l_sh_r',            min: -10,  max: 180 },
  { id: 'l_sh_y',            label: 'l_sh_y',            min: -70,  max: 70  },
  { id: 'l_el_p',            label: 'l_el_p',            min: -80,  max: 0   },
  { id: 'l_wr_y',            label: 'l_wr_y',            min: -75,  max: 75  },
  { id: 'l_wr_p',            label: 'l_wr_p',            min: -35,  max: 35  },
  { id: 'l_wr_r',            label: 'l_wr_r',            min: -45,  max: 15  },
  { id: 'r_sh_p',            label: 'r_sh_p',            min: -50,  max: 110 },
  { id: 'r_sh_r',            label: 'r_sh_r',            min: -180, max: 10  },
  { id: 'r_sh_y',            label: 'r_sh_y',            min: -70,  max: 70  },
  { id: 'r_el_p',            label: 'r_el_p',            min: 0,    max: 80  },
  { id: 'r_wr_y',            label: 'r_wr_y',            min: -75,  max: 75  },
  { id: 'r_wr_p',            label: 'r_wr_p',            min: -35,  max: 35  },
  { id: 'r_wr_r',            label: 'r_wr_r',            min: -15,  max: 45  },
]

export const ALICE_M1_HAND_JOINTS = [
  { id: 'Left_Pinky_Pitch',   min: 0, max: 1000 }, { id: 'Left_Ring_Pitch',    min: 0, max: 1000 },
  { id: 'Left_Middle_Pitch',  min: 0, max: 1000 }, { id: 'Left_Index_Pitch',   min: 0, max: 1000 },
  { id: 'Left_Thumb_Pitch',   min: 0, max: 1000 }, { id: 'Left_Thumb_Roll',    min: 0, max: 1000 },
  { id: 'Right_Pinky_Pitch',  min: 0, max: 1000 }, { id: 'Right_Ring_Pitch',   min: 0, max: 1000 },
  { id: 'Right_Middle_Pitch', min: 0, max: 1000 }, { id: 'Right_Index_Pitch',  min: 0, max: 1000 },
  { id: 'Right_Thumb_Pitch',  min: 0, max: 1000 }, { id: 'Right_Thumb_Roll',   min: 0, max: 1000 },
]

const MIN_COMMAND = `ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command "{command: 1, style: 1, value: [5.0, -40.0, -45.0, -45.0, 0.0, 0.0]}" & \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command "{command: 1, style: 2, value: [5.0, -110.0, -10.0, -70.0, -80.0, -75.0, -35.0, -45.0, -50.0, -180.0, -70.0, 0.0, -75.0, -35.0, -15.0]}" & \\
ros2 topic pub --once /aeirobot_hand/set_angle aeirobot_hand_msgs/msg/SetAngle "{status: 'set_angle', hand_id: 2, angle: }" & \\
ros2 topic pub --once /aeirobot_hand/set_angle aeirobot_hand_msgs/msg/SetAngle "{status: 'set_angle', hand_id: 1, angle: }"`

const MAX_COMMAND = `ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command "{command: 1, style: 1, value: [5.0, 40.0, 45.0, 45.0, 90.0, 90.0]}" & \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command "{command: 1, style: 2, value: [5.0, 50.0, 180.0, 70.0, 0.0, 75.0, 35.0, 15.0, 110.0, 10.0, 70.0, 80.0, 75.0, 35.0, 45.0]}" & \\
ros2 topic pub --once /aeirobot_hand/set_angle aeirobot_hand_msgs/msg/SetAngle "{status: 'set_angle', hand_id: 2, angle: }" & \\
ros2 topic pub --once /aeirobot_hand/set_angle aeirobot_hand_msgs/msg/SetAngle "{status: 'set_angle', hand_id: 1, angle: }"`

// ===== 초기 상태 생성 (default 값 포함) =====
const HAND_JOINT_IDS = new Set(ALICE_M1_HAND_JOINTS.map(j => j.id))

const initValues = () => {
  const v = {}
  ;[...ALICE_M1_BODY_JOINTS, ...ALICE_M1_HAND_JOINTS].forEach(j => {
    if (HAND_JOINT_IDS.has(j.id)) {
      // Hand Joints: Min 기본값 0, Max/Base 기본값 1000
      v[j.id] = { min: '0', max: '1000', base: '1000' }
    } else {
      // Body Joints: min/max는 범위값, base는 중간값
      const minVal = j.min !== undefined ? String(j.min) : ''
      const maxVal = j.max !== undefined ? String(j.max) : ''
      const baseVal = (j.min !== undefined && j.max !== undefined) ? String((j.min + j.max) / 2) : ''
      v[j.id] = { min: minVal, max: maxVal, base: baseVal }
    }
  })
  return v
}

// ===== 복사 버튼 컴포넌트 =====
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
    >
      {copied ? (
        <><span>✓</span><span>복사됨</span></>
      ) : (
        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg><span>{label}</span></>
      )}
    </button>
  )
}

// ===== 메인 컴포넌트 =====
function AliceM1CalibrationForm({ device, calibrations, onSave, setActiveSubMenu }) {
  const [jointValues, setJointValues] = useState(initValues)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const deviceCalibrations = calibrations.filter(c => c.device_id === device.id)

  const setJointField = (jointId, field, value) => {
    setJointValues(prev => ({
      ...prev,
      [jointId]: { ...prev[jointId], [field]: value }
    }))
  }

  const handleRegister = async () => {
    const calibration_data = {}
    ;[...ALICE_M1_BODY_JOINTS, ...ALICE_M1_HAND_JOINTS].forEach(j => {
      const minVal = parseFloat(jointValues[j.id].min)
      const maxVal = parseFloat(jointValues[j.id].max)
      const baseVal = parseFloat(jointValues[j.id].base)
      calibration_data[j.id] = {
        min: isNaN(minVal) ? null : minVal,
        max: isNaN(maxVal) ? null : maxVal,
        base: isNaN(baseVal) ? null : baseVal,
      }
    })
    setIsSaving(true)
    try {
      await onSave({
        device_id: device.id,
        notes: notes || 'Alice M1 캘리브레이션',
        calibration_data,
      })
      setJointValues(initValues())
      setNotes('')
      setShowRegister(false)
      setActiveSubMenu?.('history')
    } catch (err) {
      console.error('Failed to save Alice M1 calibration:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── 헤더 + Joint Diagram ── */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-cyan-900/30 rounded-xl border border-cyan-500/30 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* 좌측: 텍스트 정보 */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
                <h2 className="text-xl font-bold text-white">Actuator 캘리브레이션</h2>
              </div>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
                {deviceCalibrations.length}개 저장됨
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Alice M1의 Joint별 min/max 및 Base 자세에 대한 각도를 측정하여 캘리브레이션 데이터를 등록합니다.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-gray-400">Body Joints</span>
                <span className="text-cyan-400 font-mono font-medium">{ALICE_M1_BODY_JOINTS.length}개</span>
                <span className="text-gray-600 mx-1">|</span>
                <span className="text-gray-400">Hand Joints</span>
                <span className="text-violet-400 font-mono font-medium">{ALICE_M1_HAND_JOINTS.length}개</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-gray-400">측정 항목</span>
                <span className="text-gray-300 font-medium">Min / Max / Base 자세</span>
              </div>
            </div>
          </div>

          {/* 우측: Joint Diagram 이미지 */}
          <div className="relative w-full md:w-56 lg:w-64 flex-shrink-0 flex items-center justify-center p-4 md:p-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img
                src="/robots/alice_m1_joints.png"
                alt="Alice M1 Joint Diagram"
                className="w-full max-h-64 object-contain opacity-85 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(6,182,212,0.15)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 캘리브레이션 과정 ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <span>📖</span> 캘리브레이션 과정
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
              <span className="text-white font-medium text-sm">장치 연결</span>
            </div>
            <p className="text-gray-400 text-xs">캘리브레이션할 로봇/장치를 PC에 연결하고 전원을 켭니다.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-white font-medium text-sm">캘리브레이션 실행</span>
            </div>
            <p className="text-gray-400 text-xs">리모트 컨트롤러로 Go Base 버튼을 클릭하여 Base 자세를 만든 후, 터미널에서 Joint별 min/max 움직임 명령어를 입력합니다.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              <span className="text-white font-medium text-sm">데이터 등록</span>
            </div>
            <p className="text-gray-400 text-xs">Base 자세에 대한 모니터링 값을 입력하고, Joint별 min/max 모니터링 값을 등록합니다.</p>
          </div>
        </div>
      </div>

      {/* ── 데이터 등록 섹션 ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowRegister(!showRegister)}
        >
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span>📝</span> 캘리브레이션 데이터 등록
          </h3>
          <span className={`text-gray-400 transition-transform ${showRegister ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {showRegister && (
          <div className="mt-4 space-y-5">
            <p className="text-gray-500 text-xs">장치를 새롭게 캘리브레이션한 경우, 여기에 값을 등록하세요.</p>

            {/* ── 1. Min 명령어 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span className="text-white text-sm font-medium">모든 Joint을 min 각도로 이동</span>
              </div>
              <div className="flex items-start gap-2">
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {MIN_COMMAND}
                </pre>
                <CopyButton text={MIN_COMMAND} label="복사" />
              </div>
            </div>

            {/* ── 2. Max 명령어 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span className="text-white text-sm font-medium">모든 Joint을 max 각도로 이동</span>
              </div>
              <div className="flex items-start gap-2">
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {MAX_COMMAND}
                </pre>
                <CopyButton text={MAX_COMMAND} label="복사" />
              </div>
            </div>

            {/* ── 3. 측정값 입력 테이블 ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span className="text-white text-sm font-medium">측정 값 입력</span>
              </div>

              {/* Body Joints */}
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Body Joints</p>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-900 border-b border-gray-700">
                        <th className="text-center text-gray-400 py-2 px-2 font-medium w-10">No.</th>
                        <th className="text-left text-gray-400 py-2 px-3 font-medium">Joint Name</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">범위</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Min 측정값</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Max 측정값</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Base 자세 측정값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALICE_M1_BODY_JOINTS.map((joint, idx) => (
                        <tr key={joint.id} className={`border-b border-gray-700/50 ${idx % 2 === 0 ? 'bg-gray-900/30' : ''}`}>
                          <td className="py-1.5 px-2 text-gray-500 text-center text-xs">{idx + 1}</td>
                          <td className="py-1.5 px-3 text-cyan-400 font-mono">{joint.label}</td>
                          <td className="py-1.5 px-3 text-gray-500 text-center whitespace-nowrap">
                            {joint.min}° ~ {joint.max}°
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].min}
                              onChange={e => setJointField(joint.id, 'min', e.target.value)}
                              placeholder={String(joint.min)}
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].max}
                              onChange={e => setJointField(joint.id, 'max', e.target.value)}
                              placeholder={String(joint.max)}
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].base}
                              onChange={e => setJointField(joint.id, 'base', e.target.value)}
                              placeholder="base"
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-emerald-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hand Joints */}
              <div>
                <p className="text-gray-400 text-xs mb-2 font-medium">Hand Joints</p>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-900 border-b border-gray-700">
                        <th className="text-center text-gray-400 py-2 px-2 font-medium w-10">No.</th>
                        <th className="text-left text-gray-400 py-2 px-3 font-medium">Joint Name</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">범위</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Min 측정값</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Max 측정값</th>
                        <th className="text-center text-gray-400 py-2 px-3 font-medium whitespace-nowrap">Base 자세 측정값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALICE_M1_HAND_JOINTS.map((joint, idx) => (
                        <tr key={joint.id} className={`border-b border-gray-700/50 ${idx % 2 === 0 ? 'bg-gray-900/30' : ''}`}>
                          <td className="py-1.5 px-2 text-gray-500 text-center text-xs">{idx + 1}</td>
                          <td className="py-1.5 px-3 text-violet-400 font-mono">{joint.id.replace(/_/g, ' ')}</td>
                          <td className="py-1.5 px-3 text-gray-500 text-center whitespace-nowrap">
                            {joint.min} ~ {joint.max}
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].min}
                              onChange={e => setJointField(joint.id, 'min', e.target.value)}
                              placeholder="min"
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-violet-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].max}
                              onChange={e => setJointField(joint.id, 'max', e.target.value)}
                              placeholder="max"
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-violet-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].base}
                              onChange={e => setJointField(joint.id, 'base', e.target.value)}
                              placeholder="base"
                              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono focus:border-emerald-500 focus:outline-none focus:bg-gray-800 transition"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── 메모 ── */}
            <div>
              <label className="text-gray-400 text-xs block mb-1">메모 (선택)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="예: 모터 교체 후 재캘리브레이션"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* ── 등록 버튼 ── */}
            <button
              onClick={handleRegister}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                !isSaving
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  저장 중...
                </>
              ) : '등록하기'}
            </button>
          </div>
        )}
      </div>

      {/* ── 하단 안내 ── */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
        <p className="text-gray-400 text-sm text-center">
          📋 등록된 캘리브레이션 데이터는 <span className="text-cyan-400 font-medium">히스토리 분석</span> 탭에서 확인할 수 있습니다.
        </p>
      </div>

    </div>
  )
}

export default AliceM1CalibrationForm
