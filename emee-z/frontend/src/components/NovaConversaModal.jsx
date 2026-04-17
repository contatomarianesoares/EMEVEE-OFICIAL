import { useState, useEffect } from 'react'
import api from '../services/api'

export default function NovaConversaModal({ onFechar, onSucesso }) {
  const [instancias, setInstancias] = useState([])
  const [form, setForm] = useState({
    instancia_id: '',
    telefone: '',
    conteudo: ''
  })
  const [carregando, setCarregando] = useState(false)
  const [carregandoInstancias, setCarregandoInstancias] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarInstancias() {
      try {
        const { data } = await api.get('/instancias')
        const conectadas = data.instancias.filter(i => i.status === 'conectado')
        setInstancias(conectadas)
        if (conectadas.length > 0) {
          setForm(prev => ({ ...prev, instancia_id: conectadas[0].id }))
        }
      } catch (err) {
        setErro('Erro ao carregar instâncias.')
      } finally {
        setCarregandoInstancias(false)
      }
    }
    carregarInstancias()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.instancia_id || !form.telefone || !form.conteudo) {
      setErro('Preencha todos os campos.')
      return
    }

    setCarregando(true)
    setErro('')
    try {
      const data = await onSucesso(form)
      onFechar()
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao iniciar conversa.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md border border-[#F3F4F6] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[#111827] text-xl font-bold">Nova Conversa</h3>
            <button onClick={onFechar} className="text-[#9CA3AF] hover:text-[#111827] transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Escolher Instância */}
            <div>
              <label className="block text-[#6B7280] text-sm font-medium mb-1.5 ml-1">Usar WhatsApp</label>
              {carregandoInstancias ? (
                <div className="h-11 bg-[#F8F9FB] animate-pulse rounded-xl" />
              ) : instancias.length === 0 ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-red-500 text-xs">Nenhuma instância conectada encontrada. Vá em Configurações para conectar seu WhatsApp.</p>
                </div>
              ) : (
                <select
                  value={form.instancia_id}
                  onChange={(e) => setForm(p => ({ ...p, instancia_id: e.target.value }))}
                  className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] appearance-none cursor-pointer"
                >
                  {instancias.map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-[#6B7280] text-sm font-medium mb-1.5 ml-1">WhatsApp do Cliente</label>
              <input
                required
                type="text"
                placeholder="Ex: 5511999999999"
                value={form.telefone}
                onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF]"
              />
              <p className="text-[10px] text-[#9CA3AF] mt-1 ml-1">Inclua o DDI (55 para Brasil). Apenas números.</p>
            </div>

            {/* Mensagem Inicial */}
            <div>
              <label className="block text-[#6B7280] text-sm font-medium mb-1.5 ml-1">Mensagem de Abertura</label>
              <textarea
                required
                rows={3}
                placeholder="Olá, como posso te ajudar?"
                value={form.conteudo}
                onChange={(e) => setForm(p => ({ ...p, conteudo: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF] resize-none"
              />
            </div>

            {erro && (
              <div className="bg-red-50 text-red-500 text-xs p-3 rounded-xl border border-red-100">
                {erro}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onFechar}
                className="flex-1 py-3.5 rounded-2xl border border-[#F0F0F0] text-[#6B7280] font-semibold text-sm hover:bg-[#F9FAFB] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando || instancias.length === 0}
                className="flex-[2] py-3.5 rounded-2xl bg-[#00C6A2] hover:bg-[#00957A] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#00C6A2]/20 transition transform active:scale-95"
              >
                {carregando ? 'Iniciando...' : '🚀 Iniciar Conversa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
