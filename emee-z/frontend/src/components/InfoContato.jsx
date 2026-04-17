import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarNegocioPorTelefone, criarNegocioDeConversa } from '../lib/supabase'
import NotasInternas from './NotasInternas'

const ESTAGIO_COR = {
  entrada:      'bg-blue-50 text-blue-600 border border-blue-100',
  qualificado:  'bg-purple-50 text-purple-600 border border-purple-100',
  proposta:     'bg-amber-50 text-amber-600 border border-amber-100',
  negociando:   'bg-orange-50 text-orange-600 border border-orange-100',
  fechado:      'bg-green-50 text-green-600 border border-green-100',
  perdido:      'bg-red-50 text-red-600 border border-red-100',
}

const LABEL_COR = {
  quente: 'bg-red-50 text-red-500',
  morno:  'bg-amber-50 text-amber-500',
  frio:   'bg-blue-50 text-blue-500',
}

function iniciais(nome) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

export default function InfoContato({ conversa }) {
  const [negocio, setNegocio] = useState(null)
  const [criando, setCriando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!conversa?.contato_telefone) return
    setNegocio(null)
    buscarNegocioPorTelefone(conversa.contato_telefone)
      .then((data) => setNegocio(data || null))
      .catch(() => {})
  }, [conversa?.id, conversa?.contato_telefone])

  if (!conversa) return (
    <div className="w-80 bg-white border-l border-[#F3F4F6] shrink-0" />
  )

  async function handleCriarNoCRM() {
    setCriando(true)
    try {
      const novo = await criarNegocioDeConversa(conversa)
      if (novo) setNegocio(novo)
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="w-80 bg-white border-l border-[#F3F4F6] flex flex-col overflow-y-auto shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
      {/* Cabeçalho */}
      <div className="p-6 border-b border-[#F3F4F6] text-center">
        <div className="w-14 h-14 rounded-full bg-[#E8FDF7] border-2 border-[#00C6A2]/30 flex items-center justify-center text-[#00957A] font-bold text-lg mx-auto mb-3">
          {iniciais(conversa.contato_nome || conversa.contato_telefone)}
        </div>
        <p className="text-[#111827] font-semibold text-sm">{conversa.contato_nome || 'Sem nome'}</p>
        <p className="text-[#6B7280] text-xs mt-0.5 font-mono">{conversa.contato_telefone}</p>
        {conversa.instancia_nome && (
          <p className="text-[#9CA3AF] text-xs mt-1">via {conversa.instancia_nome}</p>
        )}
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Vinculação CRM */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">CRM</h4>
            <button
              onClick={() => navigate('/crm')}
              className="text-[#00C6A2] text-xs hover:text-[#00957A] transition font-medium"
            >
              Abrir →
            </button>
          </div>

          {negocio ? (
            <div className="bg-white rounded-2xl p-4 border border-[#F3F4F6] shadow-sm space-y-3">
              {/* Nome do negócio */}
              <p className="text-[#111827] text-sm font-semibold leading-tight truncate">{negocio.nome}</p>

              <div className="space-y-1.5">
                {/* Estágio */}
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] text-xs">Estágio</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTAGIO_COR[negocio.estagio] || 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                    {negocio.estagio?.replace('_', ' ')}
                  </span>
                </div>

                {/* Label */}
                {negocio.label && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-xs">Temperatura</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LABEL_COR[negocio.label] || 'bg-gray-50 text-gray-500'}`}>
                      {negocio.label}
                    </span>
                  </div>
                )}

                {/* Valor */}
                {negocio.valor > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] text-xs">Valor</span>
                    <span className="text-[#00957A] text-xs font-semibold font-mono">
                      {Number(negocio.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}

                {/* Probabilidade */}
                {negocio.probabilidade != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#6B7280] text-xs">Probabilidade</span>
                      <span className="text-[#111827] text-xs font-mono">{negocio.probabilidade}%</span>
                    </div>
                    <div className="h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00C6A2] transition-all"
                        style={{ width: `${negocio.probabilidade}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[#9CA3AF] text-xs italic">Nenhum negócio vinculado</p>
              <button
                onClick={handleCriarNoCRM}
                disabled={criando}
                className="w-full py-2 text-xs font-medium rounded-xl bg-[#00C6A2] hover:bg-[#00957A] text-white transition disabled:opacity-50"
              >
                {criando ? 'Criando...' : '+ Criar no CRM'}
              </button>
            </div>
          )}
        </div>

        {/* Notas internas */}
        <NotasInternas conversaId={conversa.id} />
      </div>
    </div>
  )
}
