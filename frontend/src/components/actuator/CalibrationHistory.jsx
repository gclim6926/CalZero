import { useState, useRef, useCallback } from 'react'

function CalibrationHistory({ device, calibrations, onSave, onDelete, setActiveSubMenu }) {
  const [showRegister, setShowRegister] = useState(false)
  const [newCalibData, setNewCalibData] = useState('')
  const [newCalibNotes, setNewCalibNotes] = useState('')
  const [parseError, setParseError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target.result
        JSON.parse(content)
        setNewCalibData(content)
        setParseError(null)
        const fileName = file.name.replace('.json', '')
        if (!newCalibNotes) setNewCalibNotes(fileName)
      } catch (err) {
        setParseError('JSON 파일 형식이 올바르지 않습니다.')
      }
    }
    reader.readAsText(file)
  }

  const handleRegister = async () => {
    setParseError(null)
    try {
      const parsed = JSON.parse(newCalibData)

      const calibData = {
        device_id: device?.id,
        notes: newCalibNotes || '새 캘리브레이션',
        calibration_data: parsed
      }

      setIsSaving(true)

      // API 호출하여 DB에 저장
      if (onSave) {
        await onSave(calibData)
      }

      setNewCalibData('')
      setNewCalibNotes('')
      setShowRegister(false)

      // 히스토리 탭으로 이동
      if (setActiveSubMenu) {
        setActiveSubMenu('history')
      }
    } catch (err) {
      console.error('Failed to save calibration:', err)
      setParseError(err.message || 'JSON 형식이 올바르지 않습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!device) {
    return (
      <div className="bg-gray-800 rounded-xl border border-amber-500/50 p-8 text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <h3 className="text-xl font-semibold text-amber-400 mb-2">장치를 선택해주세요</h3>
        <p className="text-gray-400 text-sm">왼쪽 사이드바에서 장치를 선택하면 캘리브레이션을 진행할 수 있습니다.</p>
      </div>
    )
  }

  // 현재 장치의 캘리브레이션 개수
  const deviceCalibrations = calibrations.filter(c => c.device_id === device.id)

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚙️</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white mb-2">Actuator 캘리브레이션</h2>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
                {deviceCalibrations.length}개 저장됨
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              장치별 고유의 캘리브레이션을 진행하여 데이터를 수집합니다.
            </p>
          </div>
        </div>
      </div>

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
            <p className="text-gray-400 text-xs">터미널에서 캘리브레이션 스크립트를 실행합니다.
              <code className="block mt-2 p-2 bg-gray-800 rounded text-cyan-400 text-[10px]">python lerobot/scripts/control_robot.py calibrate</code>
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              <span className="text-white font-medium text-sm">데이터 등록</span>
            </div>
            <p className="text-gray-400 text-xs">생성된 캘리브레이션 JSON 파일을 아래에서 등록합니다.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowRegister(!showRegister)}>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span>📝</span> 캘리브레이션 데이터 등록
          </h3>
          <span className={`text-gray-400 transition-transform ${showRegister ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {showRegister && (
          <div className="mt-4 space-y-3">
            <p className="text-gray-500 text-xs">장치를 새롭게 캘리브레이션한 경우, 여기에 값을 등록하세요.</p>

            <div>
              <label className="text-gray-400 text-xs block mb-1">메모 (선택)</label>
              <input type="text" value={newCalibNotes} onChange={(e) => setNewCalibNotes(e.target.value)}
                placeholder="예: 모터 교체 후 재캘리브레이션"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" />
            </div>

            <div>
              <label className="text-gray-400 text-xs block mb-1">캘리브레이션 데이터 (JSON)</label>
              <div onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className={`p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition mb-2 ${dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileSelect} />
                <span className="text-2xl">📄</span>
                <p className="text-gray-400 text-sm mt-2">JSON 파일을 드래그하거나 클릭하여 선택</p>
                <p className="text-gray-500 text-xs mt-1">.json 파일 지원</p>
              </div>

              {newCalibData && (
                <div className="mb-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs mb-2">📋 파싱된 데이터 미리보기</p>
                  <div className="max-h-48 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-500 py-1 px-2 sticky left-0 bg-gray-900">Joint</th>
                          {(() => {
                            try {
                              const parsed = JSON.parse(newCalibData)
                              const firstJoint = Object.values(parsed)[0]
                              return firstJoint ? Object.keys(firstJoint).map(key => (
                                <th key={key} className="text-right text-gray-500 py-1 px-2 whitespace-nowrap">{key}</th>
                              )) : null
                            } catch { return null }
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          try {
                            const parsed = JSON.parse(newCalibData)
                            return Object.entries(parsed).map(([joint, data]) => (
                              <tr key={joint} className="border-b border-gray-700/50">
                                <td className="py-1 px-2 text-cyan-400 sticky left-0 bg-gray-900">{joint}</td>
                                {Object.values(data).map((val, i) => (
                                  <td key={i} className="py-1 px-2 text-right text-white font-mono">{val}</td>
                                ))}
                              </tr>
                            ))
                          } catch { return null }
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <textarea value={newCalibData} onChange={(e) => setNewCalibData(e.target.value)}
                placeholder='{"shoulder_pan": {"id": 1, "drive_mode": 0, "homing_offset": 207, ...}, ...}'
                className="w-full h-32 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:border-cyan-500 focus:outline-none resize-none" />
            </div>

            {parseError && <p className="text-rose-400 text-xs">{parseError}</p>}

            <button
              onClick={handleRegister}
              disabled={!newCalibData.trim() || isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                newCalibData.trim() && !isSaving
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  저장 중...
                </>
              ) : (
                '등록하기'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
        <p className="text-gray-400 text-sm text-center">
          📋 등록된 캘리브레이션 데이터는 <span className="text-cyan-400 font-medium">히스토리 분석</span> 탭에서 확인할 수 있습니다.
        </p>
      </div>
    </div>
  )
}

export default CalibrationHistory
