// ==================== Top Menu 메타 정보 ====================
export const allMenuConfigs = {
  actuator: {
    id: 'actuator',
    label: 'Actuator',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bgActive: 'bg-cyan-500/20',
    textActive: 'text-cyan-400',
    borderActive: 'border-cyan-500/50',
    subMenuBorder: 'border-cyan-400',
  },
  camera: {
    id: 'camera',
    label: 'Camera',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bgActive: 'bg-violet-500/20',
    textActive: 'text-violet-400',
    borderActive: 'border-violet-500/50',
    subMenuBorder: 'border-violet-400',
  },
  sensors: {
    id: 'sensors',
    label: 'Sensors',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    bgActive: 'bg-emerald-500/20',
    textActive: 'text-emerald-400',
    borderActive: 'border-emerald-500/50',
    subMenuBorder: 'border-emerald-400',
  },
}

// ==================== 서브 메뉴 항목 (단일 소스) ====================
export const allSubMenus = {
  actuator: [
    { id: 'calibration',     label: '캘리브레이션',       icon: '⚙️' },
    { id: 'history',         label: '히스토리 분석',      icon: '📋' },
    { id: 'replay-analysis', label: '리플레이 분석',      icon: '🎯' },
    { id: 'data-analysis',   label: '학습할 데이터 분석', icon: '📊' },
    { id: 'stats',           label: '통계',               icon: '📈' },
  ],
  camera: [
    { id: 'intrinsic',         label: 'Intrinsic 계산',    icon: '📷' },
    { id: 'intrinsic-history', label: 'Intrinsic 히스토리', icon: '📋' },
    { id: 'extrinsic',         label: 'Extrinsic 계산',    icon: '🌍' },
    { id: 'extrinsic-history', label: 'Extrinsic 히스토리', icon: '📋' },
    { id: 'hand-eye',          label: 'Hand-Eye 계산',     icon: '🤖' },
    { id: 'hand-eye-history',  label: 'Hand-Eye 히스토리', icon: '📋' },
  ],
  sensors: [
    { id: 'force-torque', label: 'Force/Torque', icon: '💪' },
    { id: 'imu',          label: 'IMU',          icon: '🧭' },
  ],
}

// ==================== 타입별 메뉴 설정 ====================
// ★ 나중에 타입별 커스터마이징은 여기서만 수정
const defaultConfig = {
  menus: ['actuator', 'camera', 'sensors'],
  subMenus: allSubMenus,
}

const robotTypeMenuConfig = {
  so101:     defaultConfig,
  alice_m1:  defaultConfig,
  unitree_g1: defaultConfig,
  agibot_x2:  defaultConfig,
  agibot_g2:  defaultConfig,
  isaac_sim: defaultConfig,
}

export function getMenuConfig(robotType) {
  return robotTypeMenuConfig[robotType] ?? defaultConfig
}

// ==================== 카메라 라벨 설정 (타입별) ====================
const defaultCameraConfig = {
  cameras: ['front_cam', 'wrist_cam'],
  labels: {
    front_cam: { name: 'Front Camera', short: 'Front', icon: '📷' },
    wrist_cam: { name: 'Wrist Camera', short: 'Wrist', icon: '🤖' },
  },
}

const aliceM1CameraConfig = {
  cameras: ['left_cam', 'right_cam'],
  labels: {
    left_cam:  { name: 'Left Camera',  short: 'Left',  icon: '📷' },
    right_cam: { name: 'Right Camera', short: 'Right', icon: '📷' },
  },
}

export function getCameraConfig(robotType) {
  if (robotType === 'alice_m1') return aliceM1CameraConfig
  return defaultCameraConfig
}

// ==================== Actuator 조인트 설정 (타입별) ====================
const so101Joints = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']

const so101ActuatorConfig = {
  joints: so101Joints,
  // calibration_data 내 필드명
  calibFields: { value: 'homing_offset', min: 'range_min', max: 'range_max' },
  // 단위 변환: SO101은 steps (4096 per revolution)
  stepsPerRev: 4096,
  colors: {
    shoulder_pan: '#00d4ff', shoulder_lift: '#ff6b6b', elbow_flex: '#4ecdc4',
    wrist_flex: '#ffd93d', wrist_roll: '#a855f7', gripper: '#ff8c00',
  },
}

const aliceM1BodyJoints = [
  'head_p', 'head_y', 'waist_y', 'waist_upper_pitch', 'waist_lower_pitch',
  'l_sh_p', 'l_sh_r', 'l_sh_y', 'l_el_p', 'l_wr_y', 'l_wr_p', 'l_wr_r',
  'r_sh_p', 'r_sh_r', 'r_sh_y', 'r_el_p', 'r_wr_y', 'r_wr_p', 'r_wr_r',
]

const aliceM1HandJoints = [
  'Left_Pinky_Pitch', 'Left_Ring_Pitch', 'Left_Middle_Pitch', 'Left_Index_Pitch',
  'Left_Thumb_Pitch', 'Left_Thumb_Roll',
  'Right_Pinky_Pitch', 'Right_Ring_Pitch', 'Right_Middle_Pitch', 'Right_Index_Pitch',
  'Right_Thumb_Pitch', 'Right_Thumb_Roll',
]

const aliceM1Colors = {}
const bodyColorPalette = ['#00d4ff', '#ff6b6b', '#4ecdc4', '#ffd93d', '#a855f7', '#ff8c00', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#818cf8', '#fb923c', '#2dd4bf', '#f87171', '#a78bfa', '#facc15', '#38bdf8', '#e879f9', '#4ade80']
const handColorPalette = ['#c084fc', '#d946ef', '#a78bfa', '#e879f9', '#818cf8', '#f0abfc', '#c084fc', '#d946ef', '#a78bfa', '#e879f9', '#818cf8', '#f0abfc']
aliceM1BodyJoints.forEach((j, i) => { aliceM1Colors[j] = bodyColorPalette[i % bodyColorPalette.length] })
aliceM1HandJoints.forEach((j, i) => { aliceM1Colors[j] = handColorPalette[i % handColorPalette.length] })

const aliceM1ActuatorConfig = {
  joints: [...aliceM1BodyJoints, ...aliceM1HandJoints],
  bodyJoints: aliceM1BodyJoints,
  handJoints: aliceM1HandJoints,
  // calibration_data 내 필드명
  calibFields: { value: 'base', min: 'min', max: 'max' },
  // 단위: 각도(degrees) 직접 사용
  stepsPerRev: null,
  colors: aliceM1Colors,
}

export function getActuatorConfig(robotType) {
  if (robotType === 'alice_m1') return aliceM1ActuatorConfig
  return so101ActuatorConfig
}
