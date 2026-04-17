import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import MetricCard from '../components/MetricCard'

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes', label: '30 dias' },
]

const ESTAGIO_COR = {
  novo: '#64748b', em_contato: '#3b82f6',
  proposta: '#00C6A2', fechado: '#22c55e', perdido: '#ef4444',
}

function formatBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function Relatorios() {
  const { logout } = useAuth()
  const [periodo, setPeriodo] = useState('mes')
  const [dados, setDados] = useState(null)
  const [agentes, setAgentes] = useState([])
  const [funil, setFunil] = useState([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const [resConv, resAgentes, resFunil] = await Promise.all([
        api.get(`/relatorios/conversoes?periodo=${periodo}&agrupamento=dia`),
        api.get(`/relatorios/agentes`),
        api.get('/relatorios/funil'),
      ])
      setDados(resConv.data)
      setAgentes(resAgentes.data.agentes)
      setFunil(resFunil.data.funil)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [periodo])

  const navLinks = [
    { href: '/inbox', i: '💬' }, { href: '/dashboard', i: '📊' },
    { href: '/crm', i: '🎯' }, { href: '/relatorios', i: '📈' },
    { href: '/configuracoes', i: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden text-[#111827]">
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
        {navLinks.map((l) => (
          <Link key={l.href} to={l.href} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-white transition">{l.i}</Link>
        ))}
        <div className="mt-auto">
          <button onClick={logout} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-[#111827] text-xl font-bold">Relatórios</h1>
            <div className="flex gap-1 bg-white rounded-xl p-1">
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    periodo === p.id ? 'bg-[#00C6A2] text-white' : 'text-[#6B7280] hover:text-white'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>

          {carregando ? (
            <div className="text-[#9CA3AF] text-sm text-center py-20">Carregando dados...</div>
          ) : (
            <>
              {/* Métricas rápidas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard titulo="Total de conversas" valor={dados?.totais?.total_conversas} cor="teal" />
                <MetricCard titulo="Leads criados" valor={dados?.totais?.total_leads} cor="blue" />
                <MetricCard titulo="Leads fechados" valor={dados?.totais?.leads_fechados} cor="green" />
                <MetricCard titulo="Taxa de conversão" valor={`${dados?.totais?.taxa_conversao_pct || 0}%`} cor="yellow" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de conversas */}
                <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm">
                  <h3 className="text-[#111827] font-semibold text-sm mb-4">Volume de mensagens por dia</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dados?.volume_conversas || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="data" tick={{ fill: '#6B7280', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 8, color: '#111827', fontSize: 12 }} />
                      <Line type="monotone" dataKey="total" stroke="#00C6A2" strokeWidth={2} dot={false} name="Conversas" />
                      <Line type="monotone" dataKey="encerradas" stroke="#22c55e" strokeWidth={2} dot={false} name="Encerradas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Funil CRM */}
                <div className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm">
                  <h3 className="text-[#111827] font-semibold text-sm mb-4">Funil de conversão</h3>
                  <div className="space-y-2">
                    {funil.map((f) => (
                      <div key={f.estagio} className="flex items-center gap-3">
                        <span className="text-[#6B7280] text-xs w-24 text-right capitalize">{f.estagio?.replace('_', ' ')}</span>
                        <div className="flex-1 bg-[#F0F0F0] rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium transition-all"
                            style={{ width: `${f.percentual || 2}%`, backgroundColor: ESTAGIO_COR[f.estagio] }}
                          >
                            {f.quantidade > 0 && f.percentual > 10 ? f.quantidade : ''}
                          </div>
                        </div>
                        <span className="text-[#6B7280] text-xs w-8 tabular-nums text-right">{f.quantidade}</span>
                      </div>
                    ))}
                    {funil.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-8">Sem leads ainda</p>}
                  </div>
                </div>
              </div>

              {/* Tabela de agentes */}
              <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm overflow-hidden text-sm">
                <div className="px-6 py-5 border-b border-[#F3F4F6]">
                  <h3 className="text-[#111827] font-semibold text-sm">Desempenho por agente</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#F0F0F0]">
                        {['Agente', 'Conversas', 'Encerradas', 'Leads fechados', 'Receita', 'T. médio'].map((h) => (
                          <th key={h} className="text-left text-[#6B7280] text-xs font-medium px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {agentes.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F0F0F0]/30 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#00C6A2] flex items-center justify-center text-white text-xs font-semibold">
                                {a.nome?.charAt(0)}
                              </div>
                              <span className="text-[#111827] text-sm">{a.nome}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[#6B7280] text-sm tabular-nums">{a.total_conversas}</td>
                          <td className="px-5 py-3 text-[#6B7280] text-sm tabular-nums">{a.conversas_encerradas}</td>
                          <td className="px-5 py-3 text-green-400 text-sm tabular-nums">{a.leads_fechados}</td>
                          <td className="px-5 py-3 text-green-400 text-sm tabular-nums">{formatBRL(a.valor_total_fechado)}</td>
                          <td className="px-5 py-3 text-[#6B7280] text-sm tabular-nums">
                            {a.tempo_medio_atendimento_min ? `${a.tempo_medio_atendimento_min}min` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {agentes.length === 0 && (
                    <p className="text-[#9CA3AF] text-sm text-center py-8">Nenhum dado de agente.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
