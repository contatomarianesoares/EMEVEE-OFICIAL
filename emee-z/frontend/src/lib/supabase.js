import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const crmSupabase = createClient(
  import.meta.env.VITE_CRM_SUPABASE_URL,
  import.meta.env.VITE_CRM_SUPABASE_ANON_KEY
)

// ─── Helpers de integração CRM ────────────────────────────────────────────────

/** Vincula uma conversa WhatsApp a um negócio no CRM */
export async function vincularConversaNegocio(conversaId, negocioId) {
  return supabase.from('conversas_wpp')
    .upsert({ conversa_id: conversaId, negocio_id: negocioId }, { onConflict: 'conversa_id' })
}

/** Sincroniza conversa do EMEVEE-Z com o Supabase */
export async function sincronizarConversa(conversa) {
  return supabase.from('conversas_wpp').upsert({
    conversa_id:       conversa.id,
    contato_nome:      conversa.contato_nome,
    contato_telefone:  conversa.contato_telefone,
    status:            conversa.status,
    agente_nome:       conversa.agente_nome,
    ultima_mensagem:   conversa.ultima_mensagem,
    ultima_mensagem_em:conversa.ultima_mensagem_em,
  }, { onConflict: 'conversa_id' })
}

/** Busca negócio CRM vinculado a um telefone */
export async function buscarNegocioPorTelefone(telefone) {
  const { data } = await crmSupabase
    .from('negocios')
    .select('id, nome, estagio, valor, label, probabilidade')
    .ilike('telefone', `%${telefone?.replace(/\D/g, '').slice(-8)}%`)
    .limit(1)
    .single()
  return data
}

/** Cria negócio no CRM a partir de uma conversa WhatsApp */
export async function criarNegocioDeConversa(conversa) {
  const { data: negocio } = await crmSupabase.from('negocios').insert({
    nome:     conversa.contato_nome || 'Lead WhatsApp',
    contato:  conversa.contato_nome,
    telefone: conversa.contato_telefone,
    estagio:  'entrada',
    label:    'frio',
    valor:    0,
  }).select().single()

  if (negocio) {
    await vincularConversaNegocio(conversa.id, negocio.id)
  }
  return negocio
}
