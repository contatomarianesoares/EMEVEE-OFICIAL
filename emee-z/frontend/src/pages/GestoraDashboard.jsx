import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import api from '../services/api'
import MetricCard from '../components/MetricCard'
import StatusAgente from '../components/StatusAgente'

export default function GestoraDashboard() {
  const { usuario, logout } = useAuth()
  const [resumo, setResumo] = useState(null)
  const [agentes, setAgentes] = useState([])
  const [conversasRecentes, setConversasRecentes] = useState([])
  const [grafico, setGrafico] = useState([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    try {
      const [res, resAgentes, resConv, resGrafico] = await Promise.all([
        api.get('/relatorios/resumo'),
        api.get('/relatorios/agentes'),
        api.get('/conversas?limite=10&status=todas'),
        api.get('/relatorios/conversoes?periodo=hoje&agrupamento=dia'),
      ])
      setResumo(res.data.resumo)
      setAgentes(resAgentes.data.agentes)
      setConversasRecentes(resConv.data.conversas)
      setGrafico(resGrafico.data.volume_conversas)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // Atualiza métricas em tempo real
  useRealtime({
    nova_conversa: () => carregar(),
    conversa_atualizada: () => setResumo((p) => p ? { ...p } : p),
  })

  const STATUS_COR = { aguardando: 'text-[#F59E0B]', em_atendimento: 'text-green-400', encerrada: 'text-[#9CA3AF]', bot: 'text-[#6B7280]' }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden text-[#111827]">
      {/* Nav lateral */}
      <nav className="w-16 bg-white border-r border-[#F3F4F6] flex flex-col items-center py-6 gap-3 shrink-0">
        <div className="w-8 h-8 flex items-center justify-center mb-3 shrink-0">
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
        {[
          { href: '/inbox', label: 'Inbox', i: '💬' },
          { href: '/dashboard', label: 'Dashboard', i: '📊' },
          { href: '/crm', label: 'CRM', i: '🎯' },
          { href: '/relatorios', label: 'Relatórios', i: '📈' },
          { href: '/configuracoes', label: 'Config', i: '⚙️' },
        ].map((l) => (
          <Link key={l.href} to={l.href} title={l.label}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-white transition">
            {l.i}
          </Link>
        ))}
        <div className="mt-auto">
          <button onClick={logout} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition" title="Sair">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Título */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#111827] text-xl font-bold">Dashboard</h1>
              <p className="text-[#6B7280] text-sm mt-0.5">Olá, {usuario?.nome} 👋</p>
            </div>
            <button onClick={carregar} className="text-[#6B7280] hover:text-[#111827] transition text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Atualizar
            </button>
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard titulo="Conversas hoje" valor={resumo?.conversas_hoje} cor="teal"
              icone={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"/></svg>}
            />
            <MetricCard titulo="Em atendimento" valor={resumo?.em_atendimento_agora} cor="green"
              icone={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM7 10a5 5 0 00-5 5 1 1 0 001 1h8a1 1 0 001-1 5 5 0 00-5-5zm6 0a5 5 0 00-3.53 1.47A6.98 6.98 0 0117 16h1a1 1 0 001-1 5 5 0 00-5-5z"/></svg>}
            />
            <MetricCard titulo="Na fila" valor={resumo?.na_fila_agora} cor="yellow"
              icone={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9V9h2v4zm0-6H9V5h2v2z"/></svg>}
            />
            <MetricCard titulo="Encerradas hoje" valor={resumo?.encerradas_hoje} cor="slate"
              icone={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm">
              <h3 className="text-[#111827] font-semibold mb-4 text-sm">Volume de conversas — hoje</h3>
              {grafico.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="data" tick={{ fill: '#6B7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 8, color: '#111827' }} />
                    <Line type="monotone" dataKey="total" stroke="#00C6A2" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="encerradas" stroke="#22c55e" strokeWidth={2} dot={false} name="Encerradas" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[#9CA3AF] text-sm text-center mt-12">Sem dados para exibir</p>
              )}
            </div>

            {/* Agentes */}
            <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#111827] font-semibold text-sm">Agentes</h3>
                <Link to="/configuracoes" className="text-[#00C6A2] text-xs hover:text-[#00957A]">Gerenciar →</Link>
              </div>
              <div className="space-y-2">
                {agentes.slice(0, 5).map((a) => (
                  <StatusAgente key={a.id} nome={a.nome} ativo={a.ativo}
                    conversasAtivas={a.conversas_ativas} conversasHoje={a.total_conversas} />
                ))}
                {agentes.length === 0 && <p className="text-[#9CA3AF] text-sm">Nenhum agente cadastrado</p>}
              </div>
            </div>
          </div>

          {/* Conversas recentes */}
          <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#F3F4F6] flex items-center justify-between">
              <h3 className="text-[#111827] font-semibold text-sm">Últimas conversas</h3>
              <Link to="/inbox" className="text-[#00C6A2] text-xs hover:text-[#00957A]">Ver todas →</Link>
            </div>
            <div className="divide-y divide-[#F9FAFB]">
              {conversasRecentes.map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#6B7280] text-xs font-semibold shrink-0">
                    {(c.contato_nome || c.contato_telefone)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111827] text-sm font-medium truncate">{c.contato_nome || c.contato_telefone}</p>
                    <p className="text-[#6B7280] text-xs truncate">{c.ultima_mensagem}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${STATUS_COR[c.status]}`}>
                      {c.status?.replace('_', ' ')}
                    </p>
                    {c.agente_nome && <p className="text-[#9CA3AF] text-xs">{c.agente_nome}</p>}
                  </div>
                </div>
              ))}
              {conversasRecentes.length === 0 && (
                <p className="text-[#9CA3AF] text-sm text-center py-8">Nenhuma conversa ainda.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
