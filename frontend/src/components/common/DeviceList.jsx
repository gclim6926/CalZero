import { useState } from 'react'
import DeviceModal from './DeviceModal'
import { getRobotTypeIcon, robotTypeLabels } from '../../utils/robotIcons'

// 하위 Physical Robot 아이템 (Isaac Sim에 연결된 로봇)
function LinkedRobotItem({ device, isSelected, onSelect, onEdit, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return { dot: 'bg-emerald-400', text: 'text-emerald-400', glow: 'shadow-emerald-400/50' }
      case 'maintenance': return { dot: 'bg-amber-400', text: 'text-amber-400', glow: '' }
      case 'error': return { dot: 'bg-rose-400', text: 'text-rose-400', glow: '' }
      default: return { dot: 'bg-slate-500', text: 'text-slate-500', glow: '' }
    }
  }
  const statusStyle = getStatusColor(device.status)

  return (
    <div className="relative group ml-4 pl-3 border-l border-cyan-500/30">
      <button
        onClick={() => onSelect(device)}
        className={`w-full px-2.5 py-2 rounded-lg text-left transition-all duration-200 ${
          isSelected
            ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border-l-2 border-cyan-400'
            : 'hover:bg-slate-700/40 border-l-2 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
            isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700/60 text-slate-400'
          }`}>
            {getRobotTypeIcon(device.type, 'w-3.5 h-3.5')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-medium text-xs truncate ${isSelected ? 'text-cyan-100' : 'text-slate-300'}`}>
                {device.name}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${device.status === 'online' ? 'animate-pulse' : ''}`}></div>
            </div>
            <span className="text-[9px] text-slate-500">{robotTypeLabels[device.type] || device.type}</span>
          </div>
        </div>
      </button>
      {/* 액션 버튼 */}
      <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={(e) => { e.stopPropagation(); onEdit(device) }} className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all" title="수정">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(device) }} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all" title="삭제">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function DeviceList({ devices, selectedDevice, onSelectDevice, onDeviceAdd, onDeviceUpdate, onDeviceDelete }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async (data, deviceId) => {
    if (deviceId) {
      await onDeviceUpdate(deviceId, data)
    } else {
      await onDeviceAdd(data)
    }
  }

  const handleEdit = (device) => {
    setEditingDevice(device)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingDevice(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (device) => {
    setLoading(true)
    try {
      await onDeviceDelete(device.id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete device:', error)
      alert('장치 삭제에 실패했습니다')
    }
    setLoading(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return { dot: 'bg-emerald-400', text: 'text-emerald-400', glow: 'shadow-emerald-400/50' }
      case 'maintenance': return { dot: 'bg-amber-400', text: 'text-amber-400', glow: '' }
      case 'error': return { dot: 'bg-rose-400', text: 'text-rose-400', glow: '' }
      default: return { dot: 'bg-slate-500', text: 'text-slate-500', glow: '' }
    }
  }

  // Isaac Sim 모델들과 Physical 로봇 분류
  const simDevices = devices.filter(d => d.type === 'isaac_sim')
  const physicalDevices = devices.filter(d => d.type !== 'isaac_sim')

  // Isaac Sim에 연결된 Physical 로봇 ID 목록
  const linkedPhysicalIds = new Set()
  simDevices.forEach(sim => {
    if (sim.target_device_id) linkedPhysicalIds.add(sim.target_device_id)
  })

  // Isaac Sim에 연결된 Physical 로봇 찾기
  const getLinkedPhysicals = (simId) => {
    // 역방향: 이 sim의 target이 아니라, 이 sim을 가리키는 physical도 없음
    // 정방향: 이 sim의 target_device_id가 가리키는 physical robot
    const sim = simDevices.find(s => s.id === simId)
    if (sim?.target_device_id) {
      const target = physicalDevices.find(p => p.id === sim.target_device_id)
      return target ? [target] : []
    }
    return []
  }

  // Isaac Sim에 연결되지 않은 Physical 로봇
  const unlinkedPhysicals = physicalDevices.filter(p => !linkedPhysicalIds.has(p.id))

  return (
    <div className="space-y-1.5">
      {/* Isaac Sim 모델 + 하위 Physical Robot */}
      {simDevices.map(sim => {
        const statusStyle = getStatusColor(sim.status)
        const isSelected = selectedDevice?.id === sim.id
        const linkedPhysicals = getLinkedPhysicals(sim.id)

        return (
          <div key={sim.id} className="space-y-0.5">
            {/* Isaac Sim 아이템 */}
            <div className="relative group">
              <button
                onClick={() => onSelectDevice(sim)}
                className={`w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/10 border-l-2 border-violet-400'
                    : 'hover:bg-slate-700/50 border-l-2 border-transparent hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700/60 text-violet-400'
                  }`}>
                    {getRobotTypeIcon('isaac_sim', 'w-4 h-4')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm truncate ${isSelected ? 'text-violet-100' : 'text-slate-200'}`}>
                        {sim.name}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold">SIM</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {sim.usd_file_path && (
                        <span className="text-[9px] text-violet-400/60 font-mono truncate">{sim.usd_file_path}</span>
                      )}
                      {!sim.usd_file_path && sim.location && (
                        <span className="text-[10px] text-slate-500 truncate">{sim.location}</span>
                      )}
                      {linkedPhysicals.length > 0 && (
                        <span className="text-[9px] text-cyan-400/60">→ {linkedPhysicals.length} robot</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              {/* 액션 버튼 */}
              <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(sim) }} className="p-1 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-all" title="수정">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sim) }} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all" title="삭제">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 연결된 Physical Robot (하위) */}
            {linkedPhysicals.map(phys => (
              <LinkedRobotItem
                key={phys.id}
                device={phys}
                isSelected={selectedDevice?.id === phys.id}
                onSelect={onSelectDevice}
                onEdit={handleEdit}
                onDelete={(d) => setDeleteConfirm(d)}
              />
            ))}
          </div>
        )
      })}

      {/* 구분선 (Isaac Sim이 있고 연결 안 된 Physical도 있을 때) */}
      {simDevices.length > 0 && unlinkedPhysicals.length > 0 && (
        <div className="flex items-center gap-2 py-2 px-3">
          <div className="flex-1 border-t border-slate-700/50"></div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Physical Robots</span>
          <div className="flex-1 border-t border-slate-700/50"></div>
        </div>
      )}

      {/* 연결 안 된 Physical Robot */}
      {unlinkedPhysicals.map(device => {
        const statusStyle = getStatusColor(device.status)
        const isSelected = selectedDevice?.id === device.id

        return (
          <div key={device.id} className="relative group">
            <button
              onClick={() => onSelectDevice(device)}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-l-2 border-cyan-400'
                  : 'hover:bg-slate-700/50 border-l-2 border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700/60 text-slate-400'
                }`}>
                  {getRobotTypeIcon(device.type, 'w-4 h-4')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm truncate ${isSelected ? 'text-cyan-100' : 'text-slate-200'}`}>
                      {device.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${device.status === 'online' ? 'animate-pulse shadow-sm ' + statusStyle.glow : ''}`}></div>
                      <span className={`text-[9px] ${statusStyle.text}`}>
                        {device.status === 'online' ? 'online' : device.status === 'maintenance' ? 'maintenance' : device.status === 'error' ? 'error' : 'offline'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {device.location && <span className="text-[10px] text-slate-500 truncate">{device.location}</span>}
                    {device.location && device.manager && <span className="text-slate-600 text-[10px]">•</span>}
                    {device.manager && <span className="text-[10px] text-slate-500 truncate">{device.manager}</span>}
                  </div>
                </div>
              </div>
            </button>
            <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button onClick={(e) => { e.stopPropagation(); handleEdit(device) }} className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all" title="수정">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(device) }} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all" title="삭제">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}

      {/* 빈 목록 */}
      {devices.length === 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <p className="text-slate-400 text-xs font-medium">등록된 장치 없음</p>
          <p className="text-slate-500 text-[10px] mt-0.5">아래 버튼으로 추가</p>
        </div>
      )}

      {/* 장치 추가 버튼 */}
      <button
        onClick={handleAdd}
        className="w-full py-2 rounded-lg border border-dashed border-slate-600/50 hover:border-cyan-500/50 bg-slate-800/20 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 transition-all duration-200 flex items-center justify-center gap-1.5 text-xs"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium">장치 추가</span>
      </button>

      {/* 장치 추가/수정 모달 */}
      <DeviceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDevice(null) }}
        onSave={handleSave}
        device={editingDevice}
        robots={devices}
      />

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {deleteConfirm.type === 'isaac_sim' ? 'Sim 모델 삭제' : '장치 삭제'}
              </h3>
              <p className="text-slate-400 text-sm">
                <span className="text-white font-medium">"{deleteConfirm.name}"</span>
              </p>
              <p className="text-slate-500 text-sm mt-1">을(를) 삭제하시겠습니까?</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 mb-5">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-xs text-rose-300">
                  <p className="font-medium mb-1">주의!</p>
                  <p className="text-rose-400">관련된 모든 캘리브레이션 데이터도 함께 삭제됩니다.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm">취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={loading} className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition text-sm font-medium disabled:opacity-50">
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceList
