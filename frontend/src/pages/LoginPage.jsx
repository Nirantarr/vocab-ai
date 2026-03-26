import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FormField({ label, type, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45 focus:bg-white/[0.06]"
      />
    </label>
  )
}

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, signup } = useAuth()
  const initialMode = useMemo(
    () => (new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'login'),
    [location.search]
  )

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await signup({ email, password })
      }

      const redirectPath = location.state?.from || '/'
      navigate(redirectPath, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center px-6 py-16 lg:px-10">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
            Seamless access
          </div>
          <div>
            <h1 className="max-w-xl font-serif text-5xl font-bold leading-tight text-white lg:text-6xl">
              {mode === 'login' ? 'Welcome back to VocabAI.' : 'Create your VocabAI account.'}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/45">
              Sign in to save vocabulary, track progress, and keep your learning dashboard in sync.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/55">
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">Why sign in</p>
            <ul className="mt-4 space-y-3 text-sm leading-7">
              <li>Save keywords directly from the analyzer</li>
              <li>Track new, learning, and mastered words</li>
              <li>Open your personal dashboard from anywhere</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#0d1020]/95 p-8 shadow-[0_40px_90px_rgba(0,0,0,0.45)]">
          <div className="mb-8 inline-flex rounded-2xl border border-white/8 bg-white/[0.03] p-1 text-sm font-semibold text-white/45">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl px-5 py-3 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-[0_8px_24px_rgba(45,212,191,0.25)]'
                  : ''
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-xl px-5 py-3 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-[0_8px_24px_rgba(45,212,191,0.25)]'
                  : ''
              }`}
            >
              Signup
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <FormField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
            />

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(45,212,191,0.2)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            >
              {loading
                ? mode === 'login'
                  ? 'Logging in...'
                  : 'Creating account...'
                : mode === 'login'
                  ? 'Log in'
                  : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/45">
            Want to go back?{' '}
            <Link to="/" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
              Return home
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
