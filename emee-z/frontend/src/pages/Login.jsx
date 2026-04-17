import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', senha: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const usuario = await login(form.email, form.senha)
      navigate(usuario.papel === 'gestora' ? '/dashboard' : '/inbox')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao conectar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00C6A2] mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.853L.057 23.215a.75.75 0 00.916.928l5.487-1.437A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.99 0-3.853-.543-5.455-1.489l-.39-.23-4.054 1.062 1.087-3.955-.253-.406A9.959 9.959 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#111827] tracking-tight">Emee-z</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Gestão de WhatsApp</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#F0F0F0] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#F0F0F0] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#00C6A2] focus:border-transparent transition"
            />
          </div>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 px-4 bg-[#00C6A2] hover:bg-[#00957A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#00C6A2] focus:ring-offset-2 focus:ring-offset-white"
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[#9CA3AF] text-xs mt-8">
          Acesso restrito. Contate a gestora para criar sua conta.
        </p>
      </div>
    </div>
  )
}
