import { useState, useCallback } from 'react'
import api from '../services/api'

export function useAuth() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const raw = localStorage.getItem('emeez_usuario')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha })
    localStorage.setItem('emeez_token', data.token)
    localStorage.setItem('emeez_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('emeez_token')
    localStorage.removeItem('emeez_usuario')
    setUsuario(null)
    window.location.href = '/login'
  }, [])

  return { usuario, login, logout, autenticado: !!usuario }
}
