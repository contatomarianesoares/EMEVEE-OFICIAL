import { useState } from 'react'

const STATUS_COR = {
  aguardando: 'bg-yellow-400',
  bot: 'bg-[#E5E7EB]',
  em_atendimento: 'bg-green-500',
  encerrada: 'bg-[#E5E7EB]',
}

const STATUS_LABEL = {
  aguardando: 'Aguardando',
  bot: 'Bot',
  em_atendimento: 'Atendendo',
  encerrada: 'Encerrada',
}

function formatarTempo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ListaConversas({ conversas, selecionada, onSelecionar, onNovaConversa, usuario }) {
  const [aba, setAba] = useState('minhas')
  const [busca, setBusca] = useState('')

  const isGestora = usuario?.papel === 'gestora'

  const filtradas = conversas.filter((c) => {
    const matchBusca = !busca ||
      c.contato_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.contato_telefone?.includes(busca)

    if (aba === 'minhas') return matchBusca && c.agente_id === usuario?.id
    if (aba === 'fila') return matchBusca && c.status === 'aguardando'
    return matchBusca // todas
  })

  const abas = isGestora
    ? [{ id: 'minhas', label: 'Minhas' }, { id: 'fila', label: 'Fila' }, { id: 'todas', label: 'Todas' }]
    : [{ id: 'minhas', label: 'Minhas' }]

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#F3F4F6]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#F0F0F0]/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#111827] font-semibold text-base">Conversas</h2>
          <button
            onClick={() => onNovaConversa && onNovaConversa()}
            className="w-8 h-8 rounded-lg bg-[#00C6A2]/10 text-[#00C6A2] flex items-center justify-center hover:bg-[#00C6A2] hover:text-white transition-all duration-300"
            title="Nova Conversa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou número..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-white border border-[#F0F0F0] text-[#111827] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF]"
        />
        <div className="flex gap-1 mt-3">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                aba === a.id
                  ? 'bg-[#00C6A2] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              {a.label}
              {a.id === 'fila' && (
                <span className="ml-1 bg-yellow-500 text-yellow-900 text-xs rounded-full px-1.5 py-0.5">
                  {conversas.filter((c) => c.status === 'aguardando').length || ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 && (
          <p className="text-[#9CA3AF] text-sm text-center mt-10 px-4">
            {busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa aqui.'}
          </p>
        )}
        {filtradas.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelecionar(c)}
            className={`w-full text-left px-5 py-4 border-b border-[#F9FAFB] transition-all relative ${
              selecionada?.id === c.id ? 'bg-[#F9FAFB]' : 'hover:bg-[#F9FAFB]/50'
            }`}
          >
            {selecionada?.id === c.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00C6A2] rounded-r-full" />}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                {c.foto_url ? (
                  <img src={c.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#6B7280] font-semibold text-sm">
                    {(c.contato_nome || c.contato_telefone)?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${STATUS_COR[c.status]}`} />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#111827] text-sm font-medium truncate">
                    {c.contato_nome || c.contato_telefone}
                  </span>
                  <span className="text-[#9CA3AF] text-xs shrink-0">{formatarTempo(c.ultima_mensagem_em)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[#6B7280] text-xs truncate">{c.ultima_mensagem || STATUS_LABEL[c.status]}</span>
                  {c.nao_lidas > 0 && (
                    <span className="bg-[#00C6A2] text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 shrink-0">
                      {c.nao_lidas > 99 ? '99+' : c.nao_lidas}
                    </span>
                  )}
                </div>
                {c.agente_nome && aba === 'todas' && (
                  <span className="text-[#9CA3AF] text-xs">{c.agente_nome}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
