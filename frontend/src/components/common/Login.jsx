import { useState } from 'react'

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isRegister) {
      alert('회원가입 성공! 로그인해주세요.')
      setIsRegister(false)
    } else {
      if (email && password) {
        onLogin(
          { id: 1, email, name: name || email.split('@')[0] },
          'fake-token-12345',
          rememberMe
        )
      } else {
        setError('이메일과 비밀번호를 입력해주세요.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-4">
            <span className="text-white font-black text-2xl">C0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CalZero</h1>
          <p className="text-gray-400 text-sm mt-1">Robot Calibration Suite for R2D2</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-gray-300 text-sm mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
                placeholder="홍길동"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition"
              placeholder="••••••••"
            />
          </div>

          {!isRegister && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
              />
              <label htmlFor="rememberMe" className="ml-2 text-gray-300 text-sm">
                자동 로그인
              </label>
            </div>
          )}

          {error && (
            <p className="text-rose-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition shadow-lg shadow-cyan-500/20"
          >
            {isRegister ? '회원가입' : '로그인'}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          {isRegister ? '이미 계정이 있나요?' : '계정이 없나요?'}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-cyan-400 ml-2 hover:underline"
          >
            {isRegister ? '로그인' : '회원가입'}
          </button>
        </p>

        <p className="text-gray-600 text-center mt-4 text-xs">
          v0.3 • Robot Calibration Suite for R2D2
        </p>
      </div>
    </div>
  )
}

export default Login
