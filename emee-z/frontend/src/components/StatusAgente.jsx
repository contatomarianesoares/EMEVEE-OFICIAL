export default function StatusAgente({ nome, conversasAtivas = 0, conversasHoje = 0, ativo = true }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-[#F3F4F6] hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-[#00C6A2] flex items-center justify-center text-white font-semibold text-sm">
            {nome?.charAt(0)?.toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F0F0F0]/50 ${ativo ? 'bg-green-500' : 'bg-[#E5E7EB]'}`} />
        </div>
        <div>
          <p className="text-[#111827] text-sm font-medium">{nome}</p>
          <p className="text-[#9CA3AF] text-xs">{ativo ? 'Online' : 'Offline'}</p>
        </div>
      </div>
      <div className="flex gap-4 text-right">
        <div>
          <p className="text-[#111827] text-sm font-bold tabular-nums">{conversasAtivas}</p>
          <p className="text-[#9CA3AF] text-xs">ativas</p>
        </div>
        <div>
          <p className="text-[#111827] text-sm font-bold tabular-nums">{conversasHoje}</p>
          <p className="text-[#9CA3AF] text-xs">hoje</p>
        </div>
      </div>
    </div>
  )
}
