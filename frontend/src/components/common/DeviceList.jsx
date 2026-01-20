import { useState } from 'react'

const fakeDevices = [
  { id: 1, device_name: 'SO101_Follower_01', device_type: 'so101_follower', serial_number: 'SN001', created_at: '2024-01-15' },
  { id: 2, device_name: 'SO101_Follower_02', device_type: 'so101_follower', serial_number: 'SN002', created_at: '2024-01-16' },
]

function DeviceList({ selectedDevice, onSelectDevice }) {
  const [devices, setDevices] = useState(fakeDevices)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDevice, setNewDevice] = useState({ device_name: '', device_type: 'so101_follower', serial_number: '' })

  const handleAdd = () => {
    const device = {
      id: devices.length + 1,
      ...newDevice,
      created_at: new Date().toISOString().split('T')[0]
    }
    setDevices([...devices, device])
    setShowAddModal(false)
    setNewDevice({ device_name: '', device_type: 'so101_follower', serial_number: '' })
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-white">🤖 장치</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          + 추가
        </button>
      </div>

      {/* 장치 목록 */}
      <div className="space-y-1">
        {devices.map((device) => (
          <div
            key={device.id}
            onClick={() => onSelectDevice(device)}
            className={'p-2 rounded-lg cursor-pointer transition text-sm ' +
              (selectedDevice?.id === device.id
                ? 'bg-cyan-500/20 border border-cyan-500/50'
                : 'hover:bg-gray-700 border border-transparent')}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🦾</span>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{device.device_name}</p>
                <p className="text-gray-500 text-[10px]">{device.device_type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-5 rounded-xl w-full max-w-sm border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">🤖 장치 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-xs mb-1">장치 이름</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({...newDevice, device_name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  placeholder="SO101_Follower_03"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">장치 타입</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="so101_follower">SO101 Follower</option>
                  <option value="so101_leader">SO101 Leader</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">시리얼 번호</label>
                <input
                  type="text"
                  value={newDevice.serial_number}
                  onChange={(e) => setNewDevice({...newDevice, serial_number: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                  placeholder="SN003"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceList
