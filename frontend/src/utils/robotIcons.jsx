// 이미지 아이콘이 있는 로봇 타입
export const imageIconTypes = ['so101', 'alice_m1', 'unitree_g1', 'agibot_x2', 'agibot_g2']

// 로봇 타입별 아이콘
const robotIcons = {
  so101: (className = "w-5 h-5") => (
    <img src="/robots/SO101.png" alt="SO101" className={`${className} object-cover rounded`} />
  ),
  alice_m1: (className = "w-5 h-5") => (
    <img src="/robots/AliceM1.png" alt="Alice M1" className={`${className} object-cover rounded`} />
  ),
  unitree_g1: (className = "w-5 h-5") => (
    <img src="/robots/UnitreeG1.png" alt="Unitree G1" className={`${className} object-cover rounded`} />
  ),
  agibot_x2: (className = "w-5 h-5") => (
    <img src="/robots/AgibotX2.png" alt="Agibot X2" className={`${className} object-cover rounded`} />
  ),
  agibot_g2: (className = "w-5 h-5") => (
    <img src="/robots/AgibotG2.png" alt="Agibot G2" className={`${className} object-cover rounded`} />
  ),
  isaac_sim: (className = "w-5 h-5") => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
}

// 타입별 라벨
export const robotTypeLabels = {
  so101: 'SO101',
  alice_m1: 'Alice M1',
  unitree_g1: 'Unitree G1',
  agibot_x2: 'Agibot X2',
  agibot_g2: 'Agibot G2',
  isaac_sim: 'Isaac Sim',
}

// 기본 타입 목록
export const defaultDeviceTypes = [
  { value: 'so101', label: 'SO101' },
  { value: 'alice_m1', label: 'Alice M1' },
  { value: 'unitree_g1', label: 'Unitree G1' },
  { value: 'agibot_x2', label: 'Agibot X2' },
  { value: 'agibot_g2', label: 'Agibot G2' },
  { value: 'isaac_sim', label: 'Isaac Sim' },
]

// 아이콘 가져오기 (커스텀 타입은 기어 아이콘 fallback)
export const getRobotTypeIcon = (type, className = "w-5 h-5") => {
  if (robotIcons[type]) return robotIcons[type](className)
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default robotIcons
