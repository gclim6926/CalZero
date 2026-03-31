import { useState, useRef } from 'react'

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

// ===== 캘리브레이션 테스트 명령어 =====

const CMD_BASE = {
  title: '① 머리/허리 BASE 자세 이동 + 양팔 중립 + 로그 저장',
  desc: '머리/허리를 BASE 자세로, 양팔을 중립 자세로 이동 후 joint_states를 로그 파일로 저장합니다.',
  command: `echo "▶ 머리/허리 BASE자세로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 20.0, 0.0, 0.0, 50.0, 50.0]}" && \\
sleep 6 && \\
echo "▶ 양팔 BASE(중립) 자세로 ..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 10.0, 0.0, 0.0, -75.0, 0.0, -10.0, 0.0, -10.0, 0.0, 0.0, 75.0, 0.0, 10.0, 0.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_base.txt`,
}

const CMD_HEAD_WAIST_MINMAX = {
  title: '② 머리/허리 Min/Max 이동 + 로그 저장',
  desc: '머리/허리를 Min → Max 순서로 이동하며 각각의 joint_states를 저장하고, 완료 후 BASE로 복귀합니다.',
  command: `echo "▶ 머리/허리 Min 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, -40.0, -45.0, -45.0, 0.0, 0.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style1_min.txt && \\
sleep 1 && \\
echo "▶ 머리/허리 Max 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 40.0, 45.0, 45.0, 90.0, 80.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style1_max.txt && \\
sleep 1 && \\
echo "▶ 머리/허리 BASE자세로 복귀 중..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 20.0, 0.0, 0.0, 50.0, 50.0]}" && \\
sleep 6`,
}

const CMD_ARM_MINMAX = {
  title: '③ 양팔 Min/Max 이동 + 로그 저장',
  desc: '양팔을 Min → Max 순서로 이동하며 각각의 joint_states를 저장하고, 완료 후 중립으로 복귀합니다.',
  command: `echo "▶ 양팔 Min 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, -110.0, -10.0, -70.0, -75.0, -70.0, -30.0, -40.0, -50.0, -170.0, -70.0, 0.0, -70.0, -30.0, -10.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style2_min.txt && \\
sleep 1 && \\
echo "▶ 양팔 Max 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 50.0, 170.0, 70.0, 0.0, 70.0, 30.0, 10.0, 110.0, 10.0, 70.0, 75.0, 70.0, 30.0, 40.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style2_max.txt && \\
sleep 1 && \\
echo "▶ 양팔 BASE(중립) 자세로 복귀 중..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 10.0, 0.0, 0.0, -75.0, 0.0, -10.0, 0.0, -10.0, 0.0, 0.0, 75.0, 0.0, 10.0, 0.0]}" && \\
sleep 6 && \\
echo "✅ 모든 테스트 및 저장이 완료되었습니다!"`,
}

const CMD_SCP_LOGS = {
  title: '④ 로그 파일 로컬 PC로 복사',
  desc: '로봇(Orin)에 저장된 joint_status 로그 파일을 로컬 PC로 다운로드합니다. (PowerShell)',
  command: `$folder = "C:\\Users\\GL\\Desktop\\$(Get-Date -Format 'yyyyMMdd_HHmm')"
New-Item -ItemType Directory -Path $folder
scp orin@192.168.10.3:~/joint_status_*.txt "$folder"`,
}

const CALIB_COMMANDS = [CMD_BASE, CMD_HEAD_WAIST_MINMAX, CMD_ARM_MINMAX, CMD_SCP_LOGS]

// Base/Min/Max 명령어 (데이터 등록 섹션에서 사용)
const BASE_COMMAND = `echo "▶ 머리/허리 BASE자세로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 20.0, 0.0, 0.0, 50.0, 50.0]}" && \\
sleep 6 && \\
echo "▶ 양팔 BASE(중립) 자세로 ..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 10.0, 0.0, 0.0, -75.0, 0.0, -10.0, 0.0, -10.0, 0.0, 0.0, 75.0, 0.0, 10.0, 0.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_base.txt`

const MIN_COMMAND = `echo "▶ 머리/허리 Min 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, -40.0, -45.0, -45.0, 0.0, 0.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style1_min.txt && \\
sleep 1 && \\
echo "▶ 머리/허리 Max 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 40.0, 45.0, 45.0, 90.0, 80.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style1_max.txt && \\
sleep 1 && \\
echo "▶ 머리/허리 BASE자세로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 1, value: [5.0, 20.0, 0.0, 0.0, 50.0, 50.0]}" && \\
sleep 6`

const MAX_COMMAND = `echo "▶ 양팔 Min 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, -110.0, -10.0, -70.0, -75.0, -70.0, -30.0, -40.0, -50.0, -170.0, -70.0, 0.0, -70.0, -30.0, -10.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style2_min.txt && \\
sleep 1 && \\
echo "▶ 양팔 Max 각도로 이동 시작..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 50.0, 170.0, 70.0, 0.0, 70.0, 30.0, 10.0, 110.0, 10.0, 70.0, 75.0, 70.0, 30.0, 40.0]}" && \\
sleep 6 && \\
ros2 topic echo --once /joint_states > joint_status_style2_max.txt && \\
sleep 1 && \\
echo "▶ 양팔 BASE(중립) 자세로 복귀 중..." && \\
ros2 topic pub --once /aeirobot/alice_mobile/command \\
  aeirobot_msgs/msg/Command \\
  "{command: 1, style: 2, value: [5.0, 10.0, 0.0, 0.0, -75.0, 0.0, -10.0, 0.0, -10.0, 0.0, 0.0, 75.0, 0.0, 10.0, 0.0]}" && \\
sleep 6`

// ===== 초기 상태 생성 (default 값 포함) =====
const HAND_JOINT_IDS = new Set(ALICE_M1_HAND_JOINTS.map(j => j.id))

const initValues = () => {
  const v = {}
  ;[...ALICE_M1_BODY_JOINTS, ...ALICE_M1_HAND_JOINTS].forEach(j => {
    if (HAND_JOINT_IDS.has(j.id)) {
      // Hand Joints: Min 기본값 0, Max / Base 기본값 1000
      v[j.id] = { min: '0', max: '1000', base: '1000' }
    } else {
      // Body Joints: Min/Max는 범위값, Base는 중간값
      const minVal = j.min !== undefined ? String(j.min) : ''
      const maxVal = j.max !== undefined ? String(j.max) : ''
      const baseVal = (j.min !== undefined && j.max !== undefined) ? String((j.min + j.max) / 2) : ''
      v[j.id] = { min: minVal, max: maxVal, base: baseVal }
    }
  })
  return v
}

// ===== joint_states 파일 파싱 =====
// ROS2 `ros2 topic echo --once /joint_states` 출력 형식 파싱
// name: [joint1, joint2, ...] + position: [val1, val2, ...]
// Body Joints의 position 값은 radian이므로 degree로 변환하여 반환
const RAD_TO_DEG = 180 / Math.PI
// Body Joint ID Set (radian → degree 변환 대상)
const BODY_JOINT_IDS = new Set(ALICE_M1_BODY_JOINTS.map(j => j.id))

function parseJointStatesFile(text) {
  const result = {}
  try {
    // name 배열 추출
    const nameMatch = text.match(/name:\s*\n((?:\s*-\s*.+\n?)+)/)
    // position 배열 추출
    const posMatch = text.match(/position:\s*\n((?:\s*-\s*[\d.eE+\-]+\n?)+)/)
    if (!nameMatch || !posMatch) return null

    const names = nameMatch[1].match(/-\s*(.+)/g).map(s => s.replace(/^-\s*/, '').trim().replace(/['"]/g, ''))
    const positions = posMatch[1].match(/-\s*([\d.eE+\-]+)/g).map(s => parseFloat(s.replace(/^-\s*/, '')))

    names.forEach((name, i) => {
      if (i < positions.length) {
        const raw = positions[i]
        // Body Joints: radian → degree 변환, Hand Joints: 그대로 사용
        const value = BODY_JOINT_IDS.has(name)
          ? Math.round(raw * RAD_TO_DEG * 100) / 100   // degree, 소수점 2자리
          : Math.round(raw * 1000) / 1000               // 원본값, 소수점 3자리
        result[name] = value
      }
    })
  } catch (e) {
    console.error('Failed to parse joint_states file:', e)
    return null
  }
  return Object.keys(result).length > 0 ? result : null
}

// 파일 업로드 슬롯 정의
const FILE_SLOTS = [
  { key: 'base',       filename: 'joint_status_base.txt',       label: 'Base 자세',       field: 'base', color: 'emerald', desc: '모든 Joint의 Base 자세 측정값' },
  { key: 'style1_min', filename: 'joint_status_style1_min.txt', label: '머리/허리 Min',   field: 'min',  color: 'cyan',    desc: '머리/허리 Joint의 Min 측정값', jointGroup: 'head_waist' },
  { key: 'style1_max', filename: 'joint_status_style1_max.txt', label: '머리/허리 Max',   field: 'max',  color: 'cyan',    desc: '머리/허리 Joint의 Max 측정값', jointGroup: 'head_waist' },
  { key: 'style2_min', filename: 'joint_status_style2_min.txt', label: '팔 Min',          field: 'min',  color: 'violet',  desc: '양팔 Joint의 Min 측정값',      jointGroup: 'arm' },
  { key: 'style2_max', filename: 'joint_status_style2_max.txt', label: '팔 Max',          field: 'max',  color: 'violet',  desc: '양팔 Joint의 Max 측정값',      jointGroup: 'arm' },
]

// 머리/허리 Joint ID (style 1)
const HEAD_WAIST_IDS = new Set(['head_p', 'head_y', 'waist_y', 'waist_upper_pitch', 'waist_lower_pitch'])
// 팔 Joint ID (style 2)
const ARM_IDS = new Set([
  'l_sh_p', 'l_sh_r', 'l_sh_y', 'l_el_p', 'l_wr_y', 'l_wr_p', 'l_wr_r',
  'r_sh_p', 'r_sh_r', 'r_sh_y', 'r_el_p', 'r_wr_y', 'r_wr_p', 'r_wr_r',
])

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
  const [uploadedFiles, setUploadedFiles] = useState({})  // { key: { name, count, data } }
  const [inputMode, setInputMode] = useState('file')      // 'file' | 'manual'
  const fileInputRefs = useRef({})

  const deviceCalibrations = calibrations.filter(c => c.device_id === device.id)

  const setJointField = (jointId, field, value) => {
    setJointValues(prev => ({
      ...prev,
      [jointId]: { ...prev[jointId], [field]: value }
    }))
  }

  // 파일 업로드 처리
  const handleFileUpload = async (slotKey, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = parseJointStatesFile(text)

    if (!parsed) {
      alert('파일을 파싱할 수 없습니다. ROS2 joint_states 형식인지 확인하세요.')
      e.target.value = ''
      return
    }

    const slot = FILE_SLOTS.find(s => s.key === slotKey)
    if (!slot) return

    // 파싱된 데이터를 jointValues에 반영
    setJointValues(prev => {
      const next = { ...prev }
      const allJoints = [...ALICE_M1_BODY_JOINTS, ...ALICE_M1_HAND_JOINTS]

      allJoints.forEach(j => {
        if (parsed[j.id] === undefined) return

        // jointGroup 필터: style1은 머리/허리만, style2는 팔만, base는 전체
        if (slot.jointGroup === 'head_waist' && !HEAD_WAIST_IDS.has(j.id)) return
        if (slot.jointGroup === 'arm' && !ARM_IDS.has(j.id)) return

        next[j.id] = { ...next[j.id], [slot.field]: String(parsed[j.id]) }
      })
      return next
    })

    // 매칭된 Joint 수 계산
    const allJoints = [...ALICE_M1_BODY_JOINTS, ...ALICE_M1_HAND_JOINTS]
    let matchCount = 0
    allJoints.forEach(j => {
      if (parsed[j.id] === undefined) return
      if (slot.jointGroup === 'head_waist' && !HEAD_WAIST_IDS.has(j.id)) return
      if (slot.jointGroup === 'arm' && !ARM_IDS.has(j.id)) return
      matchCount++
    })

    setUploadedFiles(prev => ({
      ...prev,
      [slotKey]: { name: file.name, count: matchCount, data: parsed }
    }))

    e.target.value = ''
  }

  // 파일 업로드 초기화
  const handleClearFile = (slotKey) => {
    setUploadedFiles(prev => {
      const next = { ...prev }
      delete next[slotKey]
      return next
    })
  }

  // 전체 파일 초기화
  const handleClearAllFiles = () => {
    setUploadedFiles({})
    setJointValues(initValues())
  }

  const uploadedCount = Object.keys(uploadedFiles).length

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
              Alice M1의 Joint별 Min/Max 및 Base 자세에 대한 각도를 측정하여 캘리브레이션 데이터를 등록합니다.
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
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                <span className="text-gray-500">Mobile Platform</span>
                <span className="text-gray-500 font-mono font-medium">Wheel 2개</span>
                <span className="text-gray-600 text-[10px] ml-1">(l_wheel_link, r_wheel_link — 캘리브레이션 대상 아님)</span>
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
                src="/robots/alice_mobile_joint.png"
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
            <p className="text-gray-400 text-xs">리모트 컨트롤러로 Go Base 버튼을 클릭하여 Base 자세를 만든 후, 터미널에서 Joint별 Min/Max 움직임 명령어를 입력합니다.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              <span className="text-white font-medium text-sm">데이터 등록</span>
            </div>
            <p className="text-gray-400 text-xs">Base 자세에 대한 모니터링 값을 입력하고, Joint별 Min/Max 모니터링 값을 등록합니다.</p>
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

            {/* ── 1. Base 자세 명령어 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span className="text-white text-sm font-medium">Base 자세로 이동</span>
              </div>
              <div className="flex items-start gap-2">
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-emerald-400 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {BASE_COMMAND}
                </pre>
                <CopyButton text={BASE_COMMAND} label="복사" />
              </div>
            </div>

            {/* ── 2. 머리/허리 Min/Max 명령어 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span className="text-white text-sm font-medium">머리/허리 Min/Max 자세로 이동</span>
              </div>
              <div className="flex items-start gap-2">
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {MIN_COMMAND}
                </pre>
                <CopyButton text={MIN_COMMAND} label="복사" />
              </div>
            </div>

            {/* ── 3. Max 명령어 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span className="text-white text-sm font-medium">팔 Min/Max 자세로 이동</span>
              </div>
              <div className="flex items-start gap-2">
                <pre className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {MAX_COMMAND}
                </pre>
                <CopyButton text={MAX_COMMAND} label="복사" />
              </div>
            </div>

            {/* ── 4. 측정값 입력 ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <span className="text-white text-sm font-medium">측정 값 입력</span>
                </div>
                {/* 입력 모드 토글 */}
                <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 p-0.5">
                  <button
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      inputMode === 'file'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    📁 파일 입력
                  </button>
                  <button
                    onClick={() => setInputMode('manual')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      inputMode === 'manual'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    ✏️ 직접 입력
                  </button>
                </div>
              </div>

              {/* ── 파일 입력 모드 ── */}
              {inputMode === 'file' && (
                <div className="space-y-3">
                  <p className="text-gray-500 text-xs">
                    위 명령어 실행 후 생성된 로그 파일(joint_status_*.txt)을 업로드하면 측정값이 자동으로 채워집니다. (업로드 값은 radian이며, degree로 변환되어 저장됩니다)
                  </p>

                  {/* 파일 업로드 슬롯 */}
                  <div className="grid grid-cols-1 gap-2">
                    {FILE_SLOTS.map((slot) => {
                      const uploaded = uploadedFiles[slot.key]
                      const colorMap = {
                        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
                        cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    dot: 'bg-cyan-400' },
                        violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-400',  dot: 'bg-violet-400' },
                      }
                      const c = colorMap[slot.color]

                      return (
                        <div
                          key={slot.key}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            uploaded
                              ? `${c.bg} ${c.border}`
                              : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          {/* 상태 아이콘 */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${uploaded ? c.dot : 'bg-gray-600'}`} />

                          {/* 파일 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${uploaded ? c.text : 'text-gray-300'}`}>
                                {slot.label}
                              </span>
                              <span className="text-gray-600 text-[10px] font-mono">{slot.filename}</span>
                            </div>
                            {uploaded ? (
                              <p className="text-gray-400 text-[10px] mt-0.5">
                                ✅ {uploaded.name} — {uploaded.count}개 Joint 매칭됨
                              </p>
                            ) : (
                              <p className="text-gray-600 text-[10px] mt-0.5">{slot.desc}</p>
                            )}
                          </div>

                          {/* 업로드/삭제 버튼 */}
                          <input
                            type="file"
                            accept=".txt"
                            ref={el => fileInputRefs.current[slot.key] = el}
                            className="hidden"
                            onChange={e => handleFileUpload(slot.key, e)}
                          />
                          {uploaded ? (
                            <button
                              onClick={() => handleClearFile(slot.key)}
                              className="flex-shrink-0 px-2 py-1 rounded text-[10px] text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                              ✕ 제거
                            </button>
                          ) : (
                            <button
                              onClick={() => fileInputRefs.current[slot.key]?.click()}
                              className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all"
                            >
                              파일 선택
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 업로드 상태 요약 */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-900/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">
                        업로드: <span className={`font-semibold ${uploadedCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>{uploadedCount} / 5</span>
                      </span>
                      {uploadedCount === 5 && (
                        <span className="text-emerald-400 text-xs">✅ 모든 파일 준비 완료</span>
                      )}
                    </div>
                    {uploadedCount > 0 && (
                      <button
                        onClick={handleClearAllFiles}
                        className="text-xs text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        전체 초기화
                      </button>
                    )}
                  </div>

                  {/* 파일 입력 후 결과 확인 안내 */}
                  {uploadedCount > 0 && (
                    <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                      <p className="text-cyan-400/80 text-xs">
                        💡 업로드된 파일의 값이 아래 테이블에 자동 반영되었습니다. 값을 직접 수정하려면 <button onClick={() => setInputMode('manual')} className="underline font-medium hover:text-cyan-300">직접 입력</button> 모드로 전환하세요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 직접 입력 모드 안내 ── */}
              {inputMode === 'manual' && uploadedCount > 0 && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-400/80 text-xs">
                    💡 파일에서 불러온 값이 포함되어 있습니다. 필요한 셀만 수정하세요.
                  </p>
                </div>
              )}

              {/* ── 측정값 테이블 (항상 표시) ── */}
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
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-cyan-500 focus:outline-none focus:bg-gray-800'
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].max}
                              onChange={e => setJointField(joint.id, 'max', e.target.value)}
                              placeholder={String(joint.max)}
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-cyan-500 focus:outline-none focus:bg-gray-800'
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].base}
                              onChange={e => setJointField(joint.id, 'base', e.target.value)}
                              placeholder="Base"
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-emerald-500 focus:outline-none focus:bg-gray-800'
                              }`}
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
                              placeholder="Min"
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-violet-500 focus:outline-none focus:bg-gray-800'
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].max}
                              onChange={e => setJointField(joint.id, 'max', e.target.value)}
                              placeholder="Max"
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-violet-500 focus:outline-none focus:bg-gray-800'
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={jointValues[joint.id].base}
                              onChange={e => setJointField(joint.id, 'base', e.target.value)}
                              placeholder="Base"
                              readOnly={inputMode === 'file'}
                              className={`w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right font-mono transition ${
                                inputMode === 'file' ? 'opacity-70 cursor-default' : 'focus:border-emerald-500 focus:outline-none focus:bg-gray-800'
                              }`}
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
