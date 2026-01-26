// OpenCV 상태 체크 유틸
export const waitForOpenCV = () => {
  return new Promise((resolve, reject) => {
    // 이미 준비됨
    if (window.cvReady && window.cv && window.cv.Mat) {
      resolve(window.cv)
      return
    }
    
    let attempts = 0
    const check = setInterval(() => {
      attempts++
      if (window.cvReady && window.cv && window.cv.Mat) {
        clearInterval(check)
        console.log('[OpenCV] 준비 완료')
        resolve(window.cv)
      } else if (attempts > 300) { // 30초
        clearInterval(check)
        reject(new Error('OpenCV 로드 타임아웃'))
      }
    }, 100)
  })
}

export const getCV = () => window.cv
export const isCVReady = () => !!(window.cvReady && window.cv && window.cv.Mat)
