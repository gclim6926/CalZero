import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { checklistData, loadChecklistState, saveChecklistState } from '../../utils/checklistData'
import { getEffectiveRobotType } from '../../utils/menuConfig'

function OnboardingChecklist({ stage, device }) {
  const data = checklistData[stage]
  const robotType = device ? getEffectiveRobotType(device) : null
  const [itemStates, setItemStates] = useState({})
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [expandedItems, setExpandedItems] = useState({})
  const [showPromptGuide, setShowPromptGuide] = useState(false)
  const [copied, setCopied] = useState(false)
  const saveTimerRef = useRef(null)

  // 로봇 타입 변경 또는 stage 변경 시 Backend에서 상태 로드 (같은 타입 디바이스 간 공유)
  useEffect(() => {
    if (robotType) {
      setLoading(true)
      loadChecklistState(robotType, stage)
        .then(data => setItemStates(data))
        .finally(() => setLoading(false))
    } else {
      setItemStates({})
    }
  }, [robotType, stage])

  // 모든 섹션 기본 펼침
  useEffect(() => {
    if (data) {
      const expanded = {}
      data.sections.forEach(s => { expanded[s.id] = true })
      setExpandedSections(expanded)
    }
  }, [stage])

  // debounced save
  const debouncedSave = useCallback((nextState) => {
    if (!robotType) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveChecklistState(robotType, stage, nextState)
    }, 500)
  }, [robotType, stage])

  // 즉시 저장 (체크박스용)
  const immediateSave = useCallback((nextState) => {
    if (!robotType) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveChecklistState(robotType, stage, nextState)
  }, [robotType, stage])

  const progress = useMemo(() => {
    if (!data) return { checked: 0, total: 0, percent: 0 }
    let total = 0, checked = 0
    data.sections.forEach(section => {
      section.items.forEach(item => {
        total++
        if (itemStates[item.id]?.checked) checked++
      })
    })
    return { checked, total, percent: total > 0 ? Math.round((checked / total) * 100) : 0 }
  }, [data, itemStates])

  const handleCheck = (itemId) => {
    if (!robotType) return
    const current = itemStates[itemId] || { checked: false, note: '' }
    const next = { ...itemStates, [itemId]: { ...current, checked: !current.checked } }
    setItemStates(next)
    immediateSave(next)
  }

  const handleNoteChange = (itemId, note) => {
    if (!robotType) return
    const current = itemStates[itemId] || { checked: false, note: '' }
    const next = { ...itemStates, [itemId]: { ...current, note } }
    setItemStates(next)
    debouncedSave(next)
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  if (!data) return null

  const getSectionProgress = (section) => {
    const total = section.items.length
    const checked = section.items.filter(item => itemStates[item.id]?.checked).length
    return { checked, total, percent: total > 0 ? Math.round((checked / total) * 100) : 0 }
  }

  const getNoteCount = () => {
    return Object.values(itemStates).filter(s => s.note?.trim()).length
  }

  return (
    <div className="space-y-6">
      {/* 헤더 + 전체 진행률 */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{data.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{data.description}</p>
          </div>
          {robotType && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg shrink-0 ml-4">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-amber-300 text-sm font-medium">{robotType}</span>
              {device && <span className="text-amber-300/50 text-xs">({device.name})</span>}
            </div>
          )}
        </div>

        {/* AI 프롬프트 가이드 */}
        {data.promptGuide && (
          <div className="mt-3">
            <button
              onClick={() => { setShowPromptGuide(prev => !prev); setCopied(false) }}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-amber-400 transition-colors"
            >
              <span>🤖</span>
              <span>AI 프롬프트 가이드</span>
              <svg
                className={`w-3 h-3 transition-transform ${showPromptGuide ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPromptGuide && (
              <div className="mt-2 p-4 bg-gray-900/60 border border-gray-600/50 rounded-lg space-y-3">
                <p className="text-gray-400 text-xs">
                  💡 아래 프롬프트를 복사하여 AI(Claude, ChatGPT 등)에 붙여넣으면 각 항목의 검토 메모를 자동 생성할 수 있습니다.
                </p>
                <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap bg-gray-950/50 p-3 rounded-md border border-gray-700/50 max-h-64 overflow-y-auto">
                  {data.promptGuide}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(data.promptGuide).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      복사됨!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      프롬프트 복사
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 진행률 바 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">
              {robotType ? '진행률' : '장치를 선택하면 체크리스트를 관리할 수 있습니다'}
            </span>
            {robotType && (
              <div className="flex items-center gap-4">
                {getNoteCount() > 0 && (
                  <span className="text-gray-500 text-xs">
                    메모 {getNoteCount()}건
                  </span>
                )}
                <span className="text-amber-400 text-sm font-semibold">
                  {progress.checked} / {progress.total} ({progress.percent}%)
                </span>
              </div>
            )}
          </div>
          <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: robotType ? `${progress.percent}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* 섹션별 체크리스트 */}
      {data.sections.map(section => {
        const sp = getSectionProgress(section)
        const isExpanded = expandedSections[section.id]

        return (
          <div key={section.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* 섹션 헤더 */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h3 className="text-white font-semibold text-sm">{section.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                {robotType && (
                  <>
                    <span className="text-gray-500 text-xs">{sp.checked}/{sp.total}</span>
                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          sp.percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${sp.percent}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </button>

            {/* 섹션 설명 + 항목들 */}
            {isExpanded && (
              <div className="border-t border-gray-700">
                {section.description && (
                  <div className="px-5 py-3 bg-gray-800/50">
                    <p className="text-gray-500 text-xs">{section.description}</p>
                  </div>
                )}
                <div className="divide-y divide-gray-700/50">
                  {section.items.map(item => {
                    const state = itemStates[item.id] || { checked: false, note: '' }
                    const isChecked = state.checked
                    const note = state.note || ''
                    const isItemExpanded = !!expandedItems[item.id]
                    const hasNote = note.trim().length > 0

                    return (
                      <div key={item.id} className="group">
                        <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-750/50 transition-colors">
                          {/* 체크박스 */}
                          <button
                            onClick={() => handleCheck(item.id)}
                            disabled={!robotType}
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              !robotType
                                ? 'border-gray-600 cursor-not-allowed'
                                : isChecked
                                  ? 'border-amber-500 bg-amber-500'
                                  : 'border-gray-500 hover:border-amber-400'
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* 항목 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleItem(item.id)}
                                className={`text-sm font-medium text-left transition-colors ${
                                  isChecked ? 'text-gray-500 line-through' : 'text-gray-200'
                                }`}
                              >
                                {item.label}
                              </button>
                              {item.tag && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-semibold rounded">
                                  {item.tag}
                                </span>
                              )}
                              {item.provided && (
                                <span className="px-1.5 py-0.5 bg-violet-500/15 text-violet-400 text-[10px] font-medium rounded">
                                  {item.provided}
                                </span>
                              )}
                              {hasNote && !isItemExpanded && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400/70 text-[10px] rounded">
                                  memo
                                </span>
                              )}
                              <button
                                onClick={() => toggleItem(item.id)}
                                className="text-gray-600 hover:text-gray-400 transition-colors"
                              >
                                <svg
                                  className={`w-3.5 h-3.5 transition-transform ${isItemExpanded ? 'rotate-180' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* 설명 + 메모 (접기/펼치기) */}
                            {isItemExpanded && (
                              <div className="mt-2 space-y-2">
                                <p className="text-gray-500 text-xs leading-relaxed">
                                  {item.desc}
                                </p>
                                {/* 메모 영역 */}
                                {robotType ? (
                                  <textarea
                                    value={note}
                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                    placeholder="검토 결과, 코멘트, 참고사항 등을 입력하세요..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600/50 rounded-lg text-gray-300 text-xs placeholder-gray-600 resize-y focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-gray-900/30 border border-gray-700/30 rounded-lg">
                                    <p className="text-gray-600 text-xs">장치를 선택하면 메모를 입력할 수 있습니다</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default OnboardingChecklist
