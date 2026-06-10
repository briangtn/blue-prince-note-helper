import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { Icons } from '../ui/Icons.jsx'
import { Input, Btn } from '../ui/primitives.jsx'

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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bp-bg-deep)',
    }}>
      <form onSubmit={submit} style={{
        background: 'var(--bp-surface)', border: '1px solid var(--bp-border)',
        borderRadius: 12, padding: 32, width: 'min(320px, 90vw)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--bp-accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.crown style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--bp-text)',
          }}>Blue Prince</span>
        </div>

        {error && (
          <div style={{
            textAlign: 'center', fontSize: 12, color: '#E87070',
            padding: '6px 10px', borderRadius: 6,
            background: '#C8545422', border: '1px solid #C8545444',
          }}>{error}</div>
        )}

        <Input
          type="text" placeholder="Utilisateur" value={user}
          onChange={(e) => setUser(e.target.value)} autoFocus
        />
        <Input
          type="password" placeholder="Mot de passe" value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <Btn variant="accent" disabled={loading || !user || !pass}
          style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14 }}
          onClick={submit}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </Btn>
      </form>
    </div>
  )
}
