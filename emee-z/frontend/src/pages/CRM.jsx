import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import KanbanBoard from '../components/KanbanBoard'

export default function CRM() {
  const { usuario, logout } = useAuth()
  const [leads, setLeads] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroAgente, setFiltroAgente] = useState('')
  const [agentes, setAgentes] = useState([])

  async function carregar() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroAgente) params.set('agente_id', filtroAgente)
      params.set('limite', '100')
      const { data } = await api.get(`/leads?${params}`)
      setLeads(data.leads)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    if (usuario?.papel === 'gestora') {
      api.get('/agentes').then(({ data }) => setAgentes(data.agentes))
    }
  }, [filtroAgente])

  function handleLeadAtualizado(leadId, novoEstagio) {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estagio: novoEstagio } : l))
  }

  const navLinks = [
    { href: '/inbox', i: '💬' }, { href: '/dashboard', i: '📊' },
    { href: '/crm', i: '🎯' }, { href: '/relatorios', i: '📈' },
    { href: '/configuracoes', i: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden text-[#111827]">
      <nav className="w-20 bg-white border-r border-[#F3F4F6] flex flex-col items-center py-8 gap-6 shrink-0">
        <div className="w-10 h-10 flex items-center justify-center mb-4 shrink-0 bg-[#00C6A2]/10 rounded-2xl">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="9" stroke="#00C6A2" strokeWidth="1.5"/>
            <circle cx="13" cy="13" r="4" stroke="#00C6A2" strokeWidth="1" opacity="0.5"/>
            <circle cx="13" cy="13" r="2" fill="#00C6A2"/>
            <line x1="1" y1="13" x2="7" y2="13" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="13" x2="25" y2="13" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="1" x2="13" y2="7" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="19" x2="13" y2="25" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {navLinks.map((l) => (
          <Link key={l.href} to={l.href} className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl hover:bg-[#F9FAFB] transition">{l.i}</Link>
        ))}
        <div className="mt-auto">
          <button onClick={logout} className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-[#F9FAFB] transition">
            <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#F3F4F6] flex items-center justify-between bg-white shrink-0">
          <div>
            <h1 className="text-[#111827] text-xl font-bold">CRM — Funil de Vendas</h1>
            <p className="text-[#6B7280] text-sm">{leads.length} leads no total</p>
          </div>
          <div className="flex items-center gap-3">
            {usuario?.papel === 'gestora' && (
              <select value={filtroAgente} onChange={(e) => setFiltroAgente(e.target.value)}
                className="bg-white border border-[#F3F4F6] text-[#111827] text-sm rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00C6A2]">
                <option value="">Todos os agentes</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            )}
            <button onClick={carregar} className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white text-sm font-medium rounded-2xl transition">
              Atualizar
            </button>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-hidden p-5">
          {carregando ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[#9CA3AF] text-sm">Carregando leads...</div>
            </div>
          ) : (
            <KanbanBoard leads={leads} onLeadAtualizado={handleLeadAtualizado} />
          )}
        </div>
      </div>
    </div>
  )
}
