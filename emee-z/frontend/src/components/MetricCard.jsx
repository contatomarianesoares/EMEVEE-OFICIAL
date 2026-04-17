export default function MetricCard({ titulo, valor, sub, cor = 'teal', icone }) {
  const cores = {
    teal:   'bg-[#00C6A2]/10  text-[#00C6A2]  border-[#00C6A2]/20',
    green:  'bg-green-500/10  text-green-400   border-green-500/20',
    yellow: 'bg-[#F59E0B]/10  text-[#F59E0B]   border-[#F59E0B]/20',
    red:    'bg-red-500/10    text-red-400      border-red-500/20',
    slate:  'bg-[#F8F9FB]     text-[#6B7280]   border-[#F0F0F0]',
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#F3F4F6] shadow-sm flex items-start gap-4">
      {icone && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${cores[cor]}`}>
          {icone}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[#6B7280] text-sm font-medium truncate">{titulo}</p>
        <p className="text-[#111827] text-2xl font-bold mt-0.5 tabular-nums">{valor ?? '—'}</p>
        {sub && <p className="text-[#9CA3AF] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
