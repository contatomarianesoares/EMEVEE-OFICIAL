import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(handlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    // Escuta novas mensagens (INSERT na tabela mensagens)
    const channelMensagens = supabase
      .channel('public:mensagens')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens' 
      }, (payload) => {
        if (handlersRef.current.nova_mensagem) {
          handlersRef.current.nova_mensagem({
            conversa_id: payload.new.conversa_id,
            mensagem: payload.new
          })
        }
      })
      .subscribe()

    // Escuta atualizações de conversa (UPDATE na tabela conversas)
    const channelConversas = supabase
      .channel('public:conversas')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversas' 
      }, (payload) => {
        if (handlersRef.current.conversa_atualizada) {
          handlersRef.current.conversa_atualizada({
            conversa_id: payload.new.id,
            status: payload.new.status,
            agente_id: payload.new.agente_id
          })
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'conversas' 
      }, (payload) => {
        if (handlersRef.current.nova_conversa) {
          handlersRef.current.nova_conversa({
            conversa: payload.new
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channelMensagens)
      supabase.removeChannel(channelConversas)
    }
  }, [])
}
