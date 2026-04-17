import { useState } from 'react'
import {
  DndContext, closestCenter, DragOverlay,
  useSensor, useSensors, PointerSensor,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../services/api'

const ESTAGIOS = [
  { id: 'novo', label: 'Novo Lead', cor: 'border-[#8A9BBF]', corBg: 'bg-[#F8F9FB]' },
  { id: 'em_contato', label: 'Em Contato', cor: 'border-blue-500', corBg: 'bg-blue-500/10' },
  { id: 'proposta', label: 'Proposta', cor: 'border-[#00C6A2]', corBg: 'bg-[#00C6A2]/10' },
  { id: 'fechado', label: 'Fechado', cor: 'border-green-500', corBg: 'bg-green-500/10' },
  { id: 'perdido', label: 'Perdido', cor: 'border-red-500', corBg: 'bg-red-500/10' },
]

function CardLead({ lead, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => onClick(lead)}
      className="bg-white border border-[#F3F4F6] rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all shadow-sm group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[#111827] text-sm font-medium leading-tight">{lead.contato_nome || lead.contato_telefone}</p>
        {lead.valor_estimado && (
          <span className="text-green-400 text-xs font-semibold shrink-0 tabular-nums">
            {Number(lead.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
      {lead.empresa && (
        <p className="text-[#6B7280] text-xs mb-1.5">🏢 {lead.empresa}</p>
      )}
      {lead.agente_nome && (
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[#00C6A2] flex items-center justify-center text-white text-xs">
            {lead.agente_nome?.charAt(0)}
          </div>
          <span className="text-[#9CA3AF] text-xs">{lead.agente_nome}</span>
        </div>
      )}
    </div>
  )
}

function Coluna({ estagio, leads, onCardClick }) {
  return (
    <div className={`flex flex-col min-w-[300px] max-w-[320px] flex-1 rounded-[2.5rem] bg-[#F9FAFB]/50 border border-[#F3F4F6] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#111827] text-sm font-semibold">{estagio.label}</h3>
        <span className="bg-[#F0F0F0] text-[#6B7280] text-xs font-bold rounded-full px-2 py-0.5 tabular-nums">{leads.length}</span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[60px]">
          {leads.map((l) => <CardLead key={l.id} lead={l} onClick={onCardClick} />)}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({ leads, onLeadAtualizado }) {
  const [ativo, setAtivo] = useState(null)
  const [modalLead, setModalLead] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function leadsPorEstagio(estagioId) {
    return leads.filter((l) => l.estagio === estagioId)
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return

    const leadMovido = leads.find((l) => l.id === active.id)
    const novoEstagio = ESTAGIOS.find((e) =>
      leads.find((l) => l.id === over.id)?.estagio === e.id || over.id === e.id
    )?.id

    if (!novoEstagio || leadMovido?.estagio === novoEstagio) return

    try {
      await api.patch(`/leads/${active.id}`, { estagio: novoEstagio })
      onLeadAtualizado?.(active.id, novoEstagio)
    } catch {}
    setAtivo(null)
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={({ active }) => setAtivo(active.id)}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {ESTAGIOS.map((e) => (
            <Coluna key={e.id} estagio={e} leads={leadsPorEstagio(e.id)} onCardClick={setModalLead} />
          ))}
        </div>
        <DragOverlay>
          {ativo ? (
            <div className="bg-white border border-[#F0F0F0] rounded-xl p-3 shadow-2xl opacity-90">
              <p className="text-[#111827] text-sm">{leads.find((l) => l.id === ativo)?.contato_nome}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de detalhes do lead */}
      {modalLead && <ModalLead lead={modalLead} onFechar={() => setModalLead(null)} onAtualizado={(estagio) => {
        onLeadAtualizado?.(modalLead.id, estagio)
        setModalLead(null)
      }} />}
    </>
  )
}

function ModalLead({ lead, onFechar, onAtualizado }) {
  const [estagio, setEstagio] = useState(lead.estagio)
  const [anotacoes, setAnotacoes] = useState(lead.anotacoes || '')
  const [valor, setValor] = useState(lead.valor_estimado || '')
  const [salvando, setSalvando] = useState(false)

  async function handleSalvar() {
    setSalvando(true)
    try {
      await api.patch(`/leads/${lead.id}`, { estagio, anotacoes, valor_estimado: valor ? Number(valor) : null })
      onAtualizado(estagio)
    } catch {
      alert('Erro ao salvar lead')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-md border border-[#F3F4F6] shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[#111827] font-semibold text-lg">{lead.contato_nome || lead.contato_telefone}</h3>
            {lead.empresa && <p className="text-[#6B7280] text-sm">{lead.empresa}</p>}
          </div>
          <button onClick={onFechar} className="text-[#6B7280] hover:text-[#111827] transition">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[#6B7280] text-xs mb-1.5 block">Estágio</label>
            <select value={estagio} onChange={(e) => setEstagio(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] text-sm">
              {ESTAGIOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#6B7280] text-xs mb-1.5 block">Valor estimado (R$)</label>
            <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00"
              className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] text-sm" />
          </div>
          <div>
            <label className="text-[#6B7280] text-xs mb-1.5 block">Anotações</label>
            <textarea value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} rows={4}
              className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00C6A2] text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-[#F0F0F0] text-[#6B7280] hover:bg-[#F0F0F0] transition text-sm">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-[#00C6A2] hover:bg-[#00C6A2] disabled:opacity-50 text-white transition text-sm font-medium">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
