import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'

export default function LoginForm() {
  const { login } = useAuth()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(user, pass)
    } catch {
      setError('Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-slate-950">
      <form onSubmit={submit} className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-80 space-y-4">
        <h1 className="text-xl font-bold text-cyan-400 text-center">Blue Prince Helper</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="text"
          placeholder="Utilisateur"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          autoFocus
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={loading || !user || !pass}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium transition-colors"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
