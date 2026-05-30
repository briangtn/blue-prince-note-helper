import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: null, loading: true })

  const check = useCallback(async () => {
    const user = localStorage.getItem('bp_user')
    const pass = localStorage.getItem('bp_pass')
    if (!user || !pass) {
      setState({ user: null, role: null, loading: false })
      return
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Basic ' + btoa(user + ':' + pass) },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setState({ user: data.user, role: data.role, loading: false })
    } catch {
      localStorage.removeItem('bp_user')
      localStorage.removeItem('bp_pass')
      setState({ user: null, role: null, loading: false })
    }
  }, [])

  useEffect(() => { check() }, [check])

  const login = async (user, pass) => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: 'Basic ' + btoa(user + ':' + pass) },
    })
    if (!res.ok) throw new Error('Invalid credentials')
    const data = await res.json()
    localStorage.setItem('bp_user', user)
    localStorage.setItem('bp_pass', pass)
    setState({ user: data.user, role: data.role, loading: false })
  }

  const logout = () => {
    localStorage.removeItem('bp_user')
    localStorage.removeItem('bp_pass')
    setState({ user: null, role: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
