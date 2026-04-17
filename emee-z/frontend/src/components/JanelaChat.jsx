import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

function formatarHora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TickEntrega({ status }) {
  if (status === 'lido') return <span className="text-[#00C6A2] text-xs">✓✓</span>
  if (status === 'entregue') return <span className="text-[#6B7280] text-xs">✓✓</span>
  if (status === 'enviado') return <span className="text-[#9CA3AF] text-xs">✓</span>
  if (status === 'erro') return <span className="text-red-400 text-xs">✗</span>
  return null
}

function BolhaMensagem({ msg }) {
  const isEntrada = msg.direcao === 'entrada'

  return (
    <div className={`flex ${isEntrada ? 'justify-start' : 'justify-end'} mb-1`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
        isEntrada ? 'bg-white border border-[#F3F4F6] rounded-tl-sm' : 'bg-[#00C6A2] text-white rounded-tr-sm shadow-[#00C6A2]/20'
      }`}>
        {/* Mídia */}
        {msg.tipo === 'imagem' && msg.midia_url && (
          <a href={msg.midia_url} target="_blank" rel="noreferrer">
            <img src={msg.midia_url} alt="imagem" className="rounded-lg max-w-full mb-1 cursor-pointer" />
          </a>
        )}
        {msg.tipo === 'audio' && msg.midia_url && (
          <audio controls src={msg.midia_url} className="w-48 mb-1" />
        )}
        {msg.tipo === 'documento' && msg.midia_url && (
          <a href={msg.midia_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-[#111827] hover:underline mb-1">
            <span>📎</span><span className="text-sm truncate">{msg.conteudo}</span>
          </a>
        )}
        {/* Texto */}
        {msg.tipo === 'texto' && (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isEntrada ? 'text-[#111827]' : 'text-white'}`}>{msg.conteudo}</p>
        )}
        {/* Rodapé */}
        <div className={`flex items-center gap-1.5 mt-1 ${isEntrada ? 'justify-start' : 'justify-end'}`}>
          <span className="text-xs text-[#6B7280]">{formatarHora(msg.criado_em)}</span>
          {!isEntrada && <TickEntrega status={msg.status_entrega} />}
        </div>
      </div>
    </div>
  )
}

export default function JanelaChat({
  conversa, mensagens, onEnviar, onTransferir, onEncerrar, usuario,
}) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#9CA3AF]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>
            </svg>
          </div>
          <p className="text-[#9CA3AF] text-sm">Selecione uma conversa para começar</p>
        </div>
      </div>
    )
  }

  async function handleEnviar(e) {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    const conteudo = texto.trim()
    setTexto('')
    setEnviando(true)
    try {
      await onEnviar(conteudo)
    } finally {
      setEnviando(false)
    }
  }

  const encerrada = conversa.status === 'encerrada'
  const podeAtender = conversa.status === 'aguardando' && !encerrada

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#E8FDF7] flex items-center justify-center text-[#00957A] font-semibold text-sm shrink-0">
            {(conversa.contato_nome || conversa.contato_telefone)?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[#111827] font-medium text-sm truncate">
              {conversa.contato_nome || conversa.contato_telefone}
            </p>
            <p className="text-[#9CA3AF] text-xs">{conversa.contato_telefone}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {podeAtender && (
            <button
              onClick={() => api.patch(`/conversas/${conversa.id}/atribuir`, { agente_id: usuario.id })}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition"
            >
              Assumir
            </button>
          )}
          {!encerrada && conversa.status !== 'aguardando' && (
            <button
              onClick={onTransferir}
              className="px-3 py-1.5 bg-white hover:bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] text-xs font-medium rounded-lg transition"
            >
              Transferir
            </button>
          )}
          {!encerrada && (
            <button
              onClick={onEncerrar}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg transition"
            >
              Encerrar
            </button>
          )}
          {encerrada && (
            <span className="px-3 py-1.5 bg-white text-[#9CA3AF] text-xs rounded-lg border border-[#F0F0F0]">
              Encerrada
            </span>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {mensagens.map((m) => <BolhaMensagem key={m.id || m.criado_em} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!encerrada ? (
        <form onSubmit={handleEnviar} className="border-t border-[#F3F4F6] px-6 py-4 bg-white flex items-end gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(e) } }}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="flex-1 bg-white border border-[#F0F0F0] text-[#111827] text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF] resize-none max-h-36 leading-relaxed"
            style={{ height: 'auto' }}
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="w-10 h-10 rounded-xl bg-[#00C6A2] hover:bg-[#00C6A2] disabled:opacity-40 flex items-center justify-center transition shrink-0"
          >
            <svg className="w-4 h-4 text-white rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      ) : (
        <div className="border-t border-[#F0F0F0]/50 px-4 py-3 text-center text-[#9CA3AF] text-sm">
          Esta conversa foi encerrada
        </div>
      )}
    </div>
  )
}
