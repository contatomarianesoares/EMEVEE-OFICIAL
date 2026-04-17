import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatarHora(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NotasInternas({ conversaId }) {
  const [notas, setNotas] = useState([])
  const [nova, setNova] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!conversaId) return
    supabase
      .from('notas_wpp')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
      .then(({ data }) => setNotas(data || []))
  }, [conversaId])

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!nova.trim()) return
    setEnviando(true)
    try {
      const { data: nota } = await supabase
        .from('notas_wpp')
        .insert({ conversa_id: conversaId, conteudo: nova.trim() })
        .select()
        .single()
      if (nota) setNotas((p) => [...p, nota])
      setNova('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">Notas Internas</h4>

      {notas.length === 0 && (
        <p className="text-[#9CA3AF] text-xs italic">Nenhuma nota ainda.</p>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notas.map((n) => (
          <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-[#111827] text-xs leading-relaxed">{n.conteudo}</p>
            <p className="text-amber-500 text-xs mt-1.5">{formatarHora(n.criado_em)}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdicionar} className="flex gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Adicionar nota interna..."
          className="flex-1 bg-white border border-[#F0F0F0] text-[#111827] text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-[#9CA3AF]"
        />
        <button
          type="submit"
          disabled={!nova.trim() || enviando}
          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-xl disabled:opacity-40 transition text-sm font-bold"
        >
          +
        </button>
      </form>
    </div>
  )
}
