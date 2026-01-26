import { useState, useRef } from 'react'
import api from '../../utils/api'

function SettingsGeneral() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  const handleBackup = async () => {
    setIsBackingUp(true)
    setMessage(null)

    try {
      const backupData = await api.backup.create()

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calzero_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setLastBackup({
        date: new Date().toLocaleString('ko-KR'),
        stats: backupData.stats
      })
      setMessage({ type: 'success', text: '백업이 완료되었습니다.' })
    } catch (err) {
      console.error('Backup error:', err)
      setMessage({ type: 'error', text: '백업 실패: ' + err.message })
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 확인 대화상자
    if (!confirm('⚠️ 기존 데이터가 백업 데이터로 덮어씌워집니다.\n정말 복원하시겠습니까?')) {
      e.target.value = ''
      return
    }

    setIsRestoring(true)
    setMessage(null)

    try {
      const content = await file.text()
      const backupData = JSON.parse(content)

      // 버전 확인
      if (!backupData.version) {
        throw new Error('유효하지 않은 백업 파일입니다.')
      }

      const result = await api.backup.restore(backupData)

      setMessage({
        type: 'success',
        text: `복원 완료! (장치 ${result.stats?.devices_count || 0}개, 캘리브레이션 ${result.stats?.calibrations_count || 0}개)`
      })

      // 페이지 새로고침 권장
      setTimeout(() => {
        if (confirm('데이터가 복원되었습니다. 페이지를 새로고침하시겠습니까?')) {
          window.location.reload()
        }
      }, 500)

    } catch (err) {
      console.error('Restore error:', err)
      setMessage({ type: 'error', text: '복원 실패: ' + err.message })
    } finally {
      setIsRestoring(false)
      e.target.value = ''
    }
  }

  const handleReset = async () => {
    // 2단계 확인
    if (!confirm('⚠️ 정말 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
      return
    }

    const confirmText = prompt('삭제를 확인하려면 "삭제"를 입력하세요:')
    if (confirmText !== '삭제') {
      setMessage({ type: 'info', text: '초기화가 취소되었습니다.' })
      return
    }

    setIsResetting(true)
    setMessage(null)

    try {
      await api.backup.reset()
      setMessage({ type: 'success', text: '모든 데이터가 초기화되었습니다.' })

      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (err) {
      console.error('Reset error:', err)
      setMessage({ type: 'error', text: '초기화 실패: ' + err.message })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-xl border border-gray-600/50 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-600/50 flex items-center justify-center">
            <span className="text-xl">⚙️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">일반 설정</h2>
            <p className="text-gray-400 text-sm">데이터 백업, 복원 및 시스템 설정</p>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          message.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
          'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* 백업/복원 섹션 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <span>💾</span> 데이터 백업 / 복원
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          장치, 캘리브레이션 데이터를 JSON 파일로 백업하거나 복원합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 백업 */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-cyan-400">📥</span>
              <span className="text-white font-medium">백업 다운로드</span>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              모든 데이터를 JSON 파일로 다운로드합니다.
            </p>
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  백업 중...
                </>
              ) : (
                <>📥 백업 다운로드</>
              )}
            </button>
          </div>

          {/* 복원 */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400">📤</span>
              <span className="text-white font-medium">백업 복원</span>
            </div>
            <p className="text-gray-500 text-xs mb-3">
              백업 파일을 선택하여 데이터를 복원합니다.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileSelect}
            />
            <button
              onClick={handleRestoreClick}
              disabled={isRestoring}
              className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {isRestoring ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  복원 중...
                </>
              ) : (
                <>📤 파일 선택</>
              )}
            </button>
          </div>
        </div>

        {/* 마지막 백업 정보 */}
        {lastBackup && (
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500">마지막 백업:</span> {lastBackup.date}
              <span className="mx-2">•</span>
              <span className="text-gray-500">장치:</span> {lastBackup.stats?.devices_count || 0}개
              <span className="mx-2">•</span>
              <span className="text-gray-500">캘리브레이션:</span> {lastBackup.stats?.calibrations_count || 0}개
            </p>
          </div>
        )}
      </div>

      {/* 데이터 초기화 섹션 */}
      <div className="bg-gray-800 rounded-xl border border-rose-500/30 p-5">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <span>🗑️</span> 데이터 초기화
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          모든 장치와 캘리브레이션 데이터를 삭제합니다. <span className="text-rose-400">이 작업은 되돌릴 수 없습니다!</span>
        </p>

        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg mb-4">
          <p className="text-rose-400 text-sm">
            ⚠️ <strong>주의:</strong> 초기화 전에 반드시 백업을 다운로드하세요.
            사용자 계정은 유지되지만, 모든 장치와 캘리브레이션 데이터가 삭제됩니다.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-400 rounded-lg font-medium transition flex items-center gap-2"
        >
          {isResetting ? (
            <>
              <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></span>
              초기화 중...
            </>
          ) : (
            <>🗑️ 전체 데이터 초기화</>
          )}
        </button>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span>ℹ️</span> 시스템 정보
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">버전</span>
            <span className="text-white font-mono">0.3.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">빌드</span>
            <span className="text-white font-mono">2025.01.24</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Backend</span>
            <span className="text-white">FastAPI + File-based JSON</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Frontend</span>
            <span className="text-white">React + Vite + Tailwind</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsGeneral
