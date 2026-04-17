import { useState, useEffect } from 'react'
import api from '../services/api'

export default function TransferirModal({ conversaId, onFechar, onTransferido }) {
  const [agentes, setAgentes] = useState([])
  const [selecionado, setSelecionado] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    api.get('/agentes').then(({ data }) => setAgentes(data.agentes))
  }, [])

  async function handleTransferir() {
    if (!selecionado) return
    setCarregando(true)
    try {
      await api.patch(`/conversas/${conversaId}/transferir`, { agente_id: selecionado })
      onTransferido?.()
      onFechar()
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao transferir')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-[#F0F0F0] shadow-2xl">
        <h3 className="text-[#111827] font-semibold text-lg mb-4">Transferir conversa</h3>

        <label className="block text-[#6B7280] text-sm mb-2">Selecionar agente</label>
        <select
          value={selecionado}
          onChange={(e) => setSelecionado(e.target.value)}
          className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] mb-4"
        >
          <option value="">— escolha um agente —</option>
          {agentes.filter((a) => a.ativo).map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-[#F0F0F0] text-[#6B7280] hover:bg-[#F0F0F0] transition text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransferir}
            disabled={!selecionado || carregando}
            className="flex-1 py-2.5 rounded-xl bg-[#00C6A2] hover:bg-[#00C6A2] disabled:opacity-50 text-white transition text-sm font-medium"
          >
            {carregando ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </div>
  )
}
