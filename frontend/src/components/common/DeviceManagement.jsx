import { useState } from 'react'

function DeviceManagement({ devices, onDeviceAdd, onDeviceUpdate, onDeviceDelete }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', type: 'robot', status: 'offline' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setFormData({ name: '', type: 'robot', status: 'offline' })
    setIsAdding(false)
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('장치 이름을 입력하세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingId) {
        await onDeviceUpdate(editingId, formData)
      } else {
        await onDeviceAdd(formData)
      }
      resetForm()
    } catch (err) {
      setError(err.message || '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (device) => {
    setEditingId(device.id)
    setFormData({ name: device.name, type: device.type, status: device.status })
    setIsAdding(false)
  }

  const handleDelete = async (device) => {
    if (!confirm(`"${device.name}" 장치를 삭제하시겠습니까?\n관련된 모든 캘리브레이션 데이터도 삭제됩니다.`)) {
      return
    }

    setLoading(true)
    try {
      await onDeviceDelete(device.id)
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">장치 관리</h2>
          <p className="text-gray-400 text-sm mt-1">로봇 및 장치를 추가, 수정, 삭제합니다</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            장치 추가
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-lg">
          <p className="text-rose-400">{error}</p>
        </div>
      )}

      {/* 추가/수정 폼 */}
      {(isAdding || editingId) && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? '장치 수정' : '새 장치 추가'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 장치 이름 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">장치 이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition"
                  placeholder="Robot Arm #1"
                  autoFocus
                />
              </div>

              {/* 장치 타입 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">타입</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="robot">Robot</option>
                  <option value="camera">Camera</option>
                  <option value="sensor">Sensor</option>
                  <option value="gripper">Gripper</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* 상태 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? '저장 중...' : (editingId ? '수정' : '추가')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 장치 목록 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">등록된 장치</h3>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-gray-400">등록된 장치가 없습니다</p>
            <p className="text-gray-500 text-sm mt-1">위의 "장치 추가" 버튼을 클릭하세요</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {devices.map(device => (
              <div key={device.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition">
                <div className="flex items-center gap-4">
                  {/* 아이콘 */}
                  <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                    <span className="text-2xl">
                      {device.type === 'robot' ? '🤖' :
                       device.type === 'camera' ? '📷' :
                       device.type === 'sensor' ? '📡' :
                       device.type === 'gripper' ? '🦾' : '⚙️'}
                    </span>
                  </div>

                  {/* 정보 */}
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-white font-medium">{device.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        device.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : device.status === 'maintenance'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-600/50 text-gray-400'
                      }`}>
                        {device.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>Type: {device.type}</span>
                      <span>•</span>
                      <span>ID: {device.id}</span>
                      {device.created_at && (
                        <>
                          <span>•</span>
                          <span>생성: {new Date(device.created_at).toLocaleDateString('ko-KR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(device)}
                    className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition"
                    title="수정"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(device)}
                    className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">장치 관리 안내</p>
            <ul className="list-disc list-inside space-y-1">
              <li>장치를 삭제하면 관련된 모든 캘리브레이션 데이터도 함께 삭제됩니다</li>
              <li>장치 상태는 실제 연결 상태와 별개로 수동으로 관리됩니다</li>
              <li>왼쪽 사이드바에서 장치를 선택하여 캘리브레이션을 진행할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeviceManagement
