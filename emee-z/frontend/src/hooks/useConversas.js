import { useState, useCallback, useEffect } from 'react'
import api from '../services/api'
import { useRealtime } from './useRealtime'

export function useConversas(usuario) {
  const [conversas, setConversas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [conversaSelecionada, setConversaSelecionada] = useState(null)
  const [mensagens, setMensagens] = useState([])

  const carregarConversas = useCallback(async (filtros = {}) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams(filtros).toString()
      const { data } = await api.get(`/conversas${params ? '?' + params : ''}`)
      setConversas(data.conversas)
    } finally {
      setCarregando(false)
    }
  }, [])

  const carregarMensagens = useCallback(async (conversaId) => {
    const { data } = await api.get(`/mensagens/${conversaId}`)
    setMensagens(data.mensagens)
    return data.mensagens
  }, [])

  const enviarMensagem = useCallback(async (conversaId, conteudo, tipo = 'texto') => {
    const { data } = await api.post('/mensagens/enviar', { conversa_id: conversaId, tipo, conteudo })
    setMensagens((prev) => [...prev, data.mensagem])
    return data.mensagem
  }, [])

  const atribuirConversa = useCallback(async (conversaId, agenteId) => {
    await api.patch(`/conversas/${conversaId}/atribuir`, { agente_id: agenteId })
    await carregarConversas()
  }, [carregarConversas])

  const transferirConversa = useCallback(async (conversaId, agenteId) => {
    await api.patch(`/conversas/${conversaId}/transferir`, { agente_id: agenteId })
    await carregarConversas()
  }, [carregarConversas])

  const encerrarConversa = useCallback(async (conversaId) => {
    await api.patch(`/conversas/${conversaId}/encerrar`)
    setConversas((prev) => prev.map((c) =>
      c.id === conversaId ? { ...c, status: 'encerrada' } : c
    ))
    if (conversaSelecionada?.id === conversaId) {
      setConversaSelecionada((prev) => ({ ...prev, status: 'encerrada' }))
    }
  }, [conversaSelecionada])

  const iniciarConversa = useCallback(async ({ telefone, instancia_id, conteudo }) => {
    const { data } = await api.post('/conversas/iniciar', { telefone, instancia_id, conteudo })
    // Adiciona a conversa na lista se ela não existir
    setConversas((prev) => {
      const existe = prev.some((c) => c.id === data.conversa_id)
      if (existe) return prev
      // Precisamos dos dados completos para a lista, o backend retornou id, mensagem e contato
      const nova = {
        id: data.conversa_id,
        status: 'em_atendimento',
        agente_id: usuario.id,
        agente_nome: usuario.nome,
        contato_id: data.contato.id,
        contato_nome: data.contato.nome,
        contato_telefone: data.contato.telefone,
        ultima_mensagem: data.mensagem.conteudo,
        ultima_mensagem_em: data.mensagem.criado_em,
        nao_lidas: 0
      }
      return [nova, ...prev]
    })
    return data
  }, [usuario])

  // Supabase Realtime — atualiza estado em tempo real
  useRealtime({
    nova_mensagem: ({ conversa_id, mensagem }) => {
      if (conversaSelecionada?.id === conversa_id) {
        setMensagens((prev) => [...prev, mensagem])
      }
      setConversas((prev) => prev.map((c) =>
        c.id === conversa_id
          ? { ...c, ultima_mensagem: mensagem.conteudo, ultima_mensagem_em: mensagem.criado_em,
              nao_lidas: conversaSelecionada?.id === conversa_id ? 0 : (c.nao_lidas || 0) + 1 }
          : c
      ))
    },

    nova_conversa: ({ conversa }) => {
      // Agente só adiciona se for dele
      if (usuario.papel === 'agente' && conversa.agente_id !== usuario.id) return

      setConversas((prev) => {
        const existe = prev.some((c) => c.id === conversa.id)
        return existe ? prev : [conversa, ...prev]
      })
    },

    conversa_atualizada: ({ conversa_id, status, agente_id }) => {
      setConversas((prev) => {
        // Se eu sou agente e a conversa não é mais minha, removo da lista
        if (usuario.papel === 'agente' && agente_id !== usuario.id) {
          return prev.filter((c) => c.id !== conversa_id)
        }

        return prev.map((c) =>
          c.id === conversa_id ? { ...c, status, agente_id } : c
        )
      })

      if (conversaSelecionada?.id === conversa_id) {
        // Se a conversa selecionada não for mais minha, desseleciono
        if (usuario.papel === 'agente' && agente_id !== usuario.id) {
          setConversaSelecionada(null)
        } else {
          setConversaSelecionada((prev) => ({ ...prev, status, agente_id }))
        }
      }
    },

    mensagem_lida: ({ mensagem_id, status }) => {
      setMensagens((prev) => prev.map((m) =>
        m.evolution_message_id === mensagem_id ? { ...m, status_entrega: status } : m
      ))
    },
  })

  useEffect(() => {
    carregarConversas()
  }, [carregarConversas])

  return {
    conversas, carregando, conversaSelecionada, setConversaSelecionada,
    mensagens, setMensagens,
    carregarConversas, carregarMensagens, enviarMensagem,
    atribuirConversa, transferirConversa, encerrarConversa, iniciarConversa,
  }
}
