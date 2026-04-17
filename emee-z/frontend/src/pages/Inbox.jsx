import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConversas } from '../hooks/useConversas'
import ListaConversas from '../components/ListaConversas'
import JanelaChat from '../components/JanelaChat'
import InfoContato from '../components/InfoContato'
import TransferirModal from '../components/TransferirModal'
import NovaConversaModal from '../components/NovaConversaModal'
import { useState } from 'react'

function NavLateral({ usuario, logout }) {
  const navigate = useNavigate()
  const isGestora = usuario?.papel === 'gestora'

  const links = [
    { href: '/inbox', label: 'Inbox', icone: '💬' },
    ...(isGestora ? [{ href: '/dashboard', label: 'Dashboard', icone: '📊' }] : []),
    { href: '/crm', label: 'CRM', icone: '🎯' },
    ...(isGestora ? [
      { href: '/relatorios', label: 'Relatórios', icone: '📈' },
      { href: '/configuracoes', label: 'Config', icone: '⚙️' },
    ] : []),
  ]

  return (
    <nav className="w-16 bg-white border-r border-[#F3F4F6] flex flex-col items-center py-6 gap-3 shrink-0">
      {/* Logo */}
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

      {links.map((l) => (
        <Link key={l.href} to={l.href}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-white transition"
          title={l.label}
        >
          {l.icone}
        </Link>
      ))}

      <div className="mt-auto">
        <button
          onClick={logout}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition"
          title="Sair"
        >
          <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </nav>
  )
}

export default function Inbox() {
  const { usuario, logout } = useAuth()
  const {
    conversas, carregando, conversaSelecionada, setConversaSelecionada,
    mensagens, carregarMensagens, enviarMensagem,
    transferirConversa, encerrarConversa,
  } = useConversas(usuario)

  const [showTransferir, setShowTransferir] = useState(false)
  const [showNovaConversa, setShowNovaConversa] = useState(false)

  async function handleSelecionar(conversa) {
    setConversaSelecionada(conversa)
    await carregarMensagens(conversa.id)
  }

  async function handleEnviar(conteudo) {
    await enviarMensagem(conversaSelecionada.id, conteudo)
  }

  async function handleEncerrar() {
    if (!confirm('Encerrar esta conversa?')) return
    await encerrarConversa(conversaSelecionada.id)
  }

  async function handleNovaConversaSucesso(dados) {
    const res = await iniciarConversa(dados)
    // Busca a conversa completa na lista atualizada
    const nova = {
      id: res.conversa_id,
      contato_id: res.contato.id,
      contato_nome: res.contato.nome,
      contato_telefone: res.contato.telefone,
      status: 'em_atendimento',
      agente_id: usuario.id
    }
    setConversaSelecionada(nova)
    await carregarMensagens(res.conversa_id)
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden text-[#111827]">
      <NavLateral usuario={usuario} logout={logout} />

      {/* Lista */}
      <div className="w-80 shrink-0 flex flex-col">
        <ListaConversas
          conversas={conversas}
          selecionada={conversaSelecionada}
          onSelecionar={handleSelecionar}
          onNovaConversa={() => setShowNovaConversa(true)}
          usuario={usuario}
        />
      </div>

      {/* Chat */}
      <JanelaChat
        conversa={conversaSelecionada}
        mensagens={mensagens}
        onEnviar={handleEnviar}
        onTransferir={() => setShowTransferir(true)}
        onEncerrar={handleEncerrar}
        usuario={usuario}
      />

      {/* Info lateral */}
      <InfoContato conversa={conversaSelecionada} />

      {/* Modal transferir */}
      {showTransferir && conversaSelecionada && (
        <TransferirModal
          conversaId={conversaSelecionada.id}
          onFechar={() => setShowTransferir(false)}
          onTransferido={() => setConversaSelecionada((p) => ({ ...p, status: 'em_atendimento' }))}
        />
      )}

      {/* Modal Nova Conversa */}
      {showNovaConversa && (
        <NovaConversaModal
          onFechar={() => setShowNovaConversa(false)}
          onSucesso={handleNovaConversaSucesso}
        />
      )}
    </div>
  )
}
