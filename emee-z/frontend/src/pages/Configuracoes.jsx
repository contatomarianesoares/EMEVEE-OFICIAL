import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtime } from '../hooks/useRealtime'
import api from '../services/api'

// ── Aba Agentes ──────────────────────────────────────────────
function AbaAgentes() {
  const [agentes, setAgentes] = useState([])
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'agente' })
  const [criando, setCriando] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { api.get('/agentes').then(({ data }) => setAgentes(data.agentes)) }, [])

  async function handleCriar(e) {
    e.preventDefault()
    setCriando(true)
    try {
      const { data } = await api.post('/agentes', form)
      setAgentes((p) => [...p, data.agente])
      setForm({ nome: '', email: '', senha: '', papel: 'agente' })
      setShowForm(false)
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao criar agente')
    } finally {
      setCriando(false)
    }
  }

  async function handleDesativar(id) {
    if (!confirm('Desativar este agente?')) return
    await api.delete(`/agentes/${id}`)
    setAgentes((p) => p.map((a) => a.id === id ? { ...a, ativo: false } : a))
  }

  async function handleReativar(id) {
    await api.patch(`/agentes/${id}`, { ativo: true })
    setAgentes((p) => p.map((a) => a.id === id ? { ...a, ativo: true } : a))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[#6B7280] text-sm">{agentes.length} agentes cadastrados</p>
        <button onClick={() => setShowForm((p) => !p)}
          className="px-4 py-2 bg-[#00C6A2] hover:bg-[#00C6A2] text-white text-sm font-medium rounded-xl transition">
          + Novo agente
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCriar} className="bg-white rounded-[2rem] p-8 border border-[#F3F4F6] shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <h4 className="text-[#111827] font-semibold text-sm">Criar novo agente</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#6B7280] text-xs mb-1 block">Nome</label>
              <input required value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
            </div>
            <div>
              <label className="text-[#6B7280] text-xs mb-1 block">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
            </div>
            <div>
              <label className="text-[#6B7280] text-xs mb-1 block">Senha temporária</label>
              <input required type="password" value={form.senha} onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
            </div>
            <div>
              <label className="text-[#6B7280] text-xs mb-1 block">Papel</label>
              <select value={form.papel} onChange={(e) => setForm((p) => ({ ...p, papel: e.target.value }))}
                className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]">
                <option value="agente">Agente</option>
                <option value="gestora">Gestora</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#F0F0F0] text-[#6B7280] text-sm">Cancelar</button>
            <button type="submit" disabled={criando} className="flex-1 py-2.5 rounded-xl bg-[#00C6A2] text-white text-sm disabled:opacity-50">
              {criando ? 'Criando...' : 'Criar agente'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {agentes.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-white border border-[#F3F4F6] rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="text-[#111827] font-semibold text-sm">
                {a.nome?.charAt(0)}
              </div>
              <div>
                <p className="text-[#111827] text-sm font-medium">{a.nome}</p>
                <p className="text-[#6B7280] text-xs">{a.email} · {a.papel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${a.ativo ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {a.ativo ? 'Ativo' : 'Inativo'}
              </span>
              {a.ativo
                ? <button onClick={() => handleDesativar(a.id)} className="text-[#6B7280] hover:text-red-400 transition text-xs">Desativar</button>
                : <button onClick={() => handleReativar(a.id)} className="text-[#6B7280] hover:text-green-400 transition text-xs">Reativar</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Aba Instâncias ───────────────────────────────────────────
function AbaInstancias() {
  const [instancias, setInstancias] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [qrModal, setQrModal] = useState(null) // { instancia, qr, aguardando }

  useEffect(() => { api.get('/instancias').then(({ data }) => setInstancias(data.instancias)) }, [])

  // Escuta QR Code chegando em tempo real via Supabase Realtime
  useRealtime({
    instancia_status: ({ instancia_id, status }) => {
      setInstancias((p) => p.map((i) => i.id === instancia_id ? { ...i, status } : i))
      // Se conectou, fecha o modal de QR
      if (status === 'conectado') {
        setQrModal((prev) => prev ? { ...prev, conectado: true } : null)
      }
    },
    qrcode_atualizado: ({ instance_name, qrcode }) => {
      // Atualiza o QR no modal se estiver aberto para esta instância
      setQrModal((prev) => {
        if (!prev) return null
        if (prev.instancia?.evolution_instance_id === instance_name || prev.aguardando) {
          return { ...prev, qr: qrcode, aguardando: false }
        }
        return prev
      })
    },
  })

  async function handleCriar(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      const { data } = await api.post('/instancias', { nome: novoNome.trim() })
      setInstancias((p) => [...p, data.instancia])
      setNovoNome('')
      // Abre QR automaticamente
      handleQRCode(data.instancia)
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao criar instância')
    } finally {
      setCriando(false)
    }
  }

  async function handleQRCode(instancia) {
    // Abre o modal imediatamente em estado "aguardando"
    setQrModal({ instancia, qr: null, aguardando: true })
    try {
      const { data } = await api.get(`/instancias/${instancia.id}/qrcode`)
      if (data.ja_conectado) {
        setQrModal(null)
        return
      }
      if (data.qrcode) {
        setQrModal({ instancia, qr: data.qrcode, aguardando: false })
      }
      // Se aguardando=true, o QR virá via Socket.io (qrcode_atualizado)
    } catch (err) {
      setQrModal(null)
      alert('Erro ao obter QR Code: ' + (err.response?.data?.erro || err.message))
    }
  }

  async function handleRemover(id) {
    if (!confirm('Remover esta instância?')) return
    await api.delete(`/instancias/${id}`)
    setInstancias((p) => p.filter((i) => i.id !== id))
  }

  const STATUS_COR = { conectado: 'text-green-400', desconectado: 'text-[#F59E0B]', banido: 'text-red-400' }

  return (
    <div className="space-y-5">
      <form onSubmit={handleCriar} className="flex gap-3">
        <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome da instância (ex: Suporte, Vendas...)"
          className="flex-1 bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF]" />
        <button type="submit" disabled={criando || !novoNome.trim()}
          className="px-5 py-2.5 bg-[#00C6A2] hover:bg-[#00C6A2] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
          {criando ? 'Criando...' : 'Adicionar'}
        </button>
      </form>

      <div className="space-y-3">
        {instancias.map((inst) => (
          <div key={inst.id} className="flex items-center justify-between bg-white border border-[#F3F4F6] rounded-2xl px-5 py-4 shadow-sm">
            <div>
              <p className="text-[#111827] font-medium text-sm">{inst.nome}</p>
              <p className="text-[#9CA3AF] text-xs">{inst.evolution_instance_id}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${STATUS_COR[inst.status] || 'text-[#6B7280]'}`}>
                {inst.status === 'conectado' ? '● Conectado' : inst.status === 'banido' ? '● Banido' : '● Desconectado'}
              </span>
              <button onClick={() => handleQRCode(inst)}
                className="text-xs px-3 py-1.5 bg-[#F8F9FB] hover:bg-[#F0F0F0] text-[#6B7280] rounded-lg transition">
                QR Code
              </button>
              <button onClick={() => handleRemover(inst.id)}
                className="text-xs text-[#9CA3AF] hover:text-red-400 transition">Remover</button>
            </div>
          </div>
        ))}
        {instancias.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-8">Nenhuma instância configurada.</p>}
      </div>

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-[#F0F0F0] shadow-2xl text-center">
            <h3 className="text-[#111827] font-semibold text-lg mb-1">{qrModal.instancia?.nome}</h3>

            {qrModal.conectado ? (
              // Conectado com sucesso!
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <p className="text-green-400 font-semibold">WhatsApp Conectado!</p>
                <p className="text-[#6B7280] text-sm mt-1">Número pronto para receber mensagens.</p>
              </div>
            ) : qrModal.aguardando ? (
              // Aguardando QR chegar via Socket.io
              <div className="py-8">
                <div className="w-14 h-14 rounded-full border-4 border-[#00C6A2] border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-[#6B7280] text-sm font-medium">Gerando QR Code...</p>
                <p className="text-[#9CA3AF] text-xs mt-1">Aguarde, isso leva alguns segundos</p>
              </div>
            ) : qrModal.qr ? (
              // QR Code — Lógica robusta para detectar prefixo
              (() => {
                const qr = qrModal.qr;
                const base64Raw = qr.base64 || qr.qrBase64 || (typeof qr === 'string' ? qr : null);
                
                if (base64Raw && typeof base64Raw === 'string') {
                  const hasPrefix = base64Raw.startsWith('data:');
                  const src = hasPrefix ? base64Raw : `data:image/png;base64,${base64Raw}`;
                  
                  return (
                    <>
                      <p className="text-[#6B7280] text-sm mb-4">Escaneie com o WhatsApp para conectar</p>
                      <img
                        src={src}
                        alt="QR Code"
                        className="mx-auto rounded-xl w-56 h-56 border border-[#F0F0F0] shadow-lg bg-white p-2"
                        onError={(e) => {
                          console.error('Falha ao carregar imagem do QR Code:', e);
                          // Se a imagem falhar, podemos tentar mostrar o código em texto como fallback
                          e.target.style.display = 'none';
                        }}
                      />
                      <p className="text-[#9CA3AF] text-xs mt-3">QR Code expira em ~20 segundos</p>
                    </>
                  );
                }

                if (qr.code || qr.qrCode) {
                  return (
                    <>
                      <p className="text-[#6B7280] text-sm mb-4">Copie e escaneie este código no WhatsApp</p>
                      <div className="bg-[#F8F9FB] rounded-xl p-3 font-mono text-xs text-[#6B7280] break-all text-left max-h-32 overflow-auto">
                        {qr.code || qr.qrCode}
                      </div>
                    </>
                  );
                }

                return <p className="text-[#9CA3AF] text-sm py-4">QR Code malformado ou indisponível.</p>;
              })()
            ) : (
              <div className="py-6">
                <p className="text-[#9CA3AF] text-sm">QR Code não disponível.</p>
                <button
                  onClick={() => handleQRCode(qrModal.instancia)}
                  className="mt-3 text-[#00C6A2] text-sm hover:text-[#00957A] underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <button
              onClick={() => setQrModal(null)}
              className="mt-5 w-full py-2.5 rounded-xl border border-[#F0F0F0] text-[#6B7280] hover:bg-[#F0F0F0] transition text-sm"
            >
              {qrModal.conectado ? 'Fechar' : 'Cancelar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Aba Bot ──────────────────────────────────────────────────
function AbaBot() {
  const [instancias, setInstancias] = useState([])
  const [instanciaSel, setInstanciaSel] = useState('')
  const [config, setConfig] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [telefoneTeste, setTelefoneTeste] = useState('')

  useEffect(() => {
    api.get('/instancias').then(({ data }) => {
      setInstancias(data.instancias)
      if (data.instancias[0]) setInstanciaSel(data.instancias[0].id)
    })
  }, [])

  useEffect(() => {
    if (!instanciaSel) return
    api.get(`/bot/${instanciaSel}`).then(({ data }) => setConfig(data.config))
  }, [instanciaSel])

  function setOpcao(idx, campo, valor) {
    setConfig((p) => {
      const novas = [...p.opcoes]
      novas[idx] = { ...novas[idx], [campo]: valor }
      return { ...p, opcoes: novas }
    })
  }

  function addOpcao() {
    setConfig((p) => ({
      ...p,
      opcoes: [...p.opcoes, { numero: String(p.opcoes.length + 1), texto: '', acao: 'atribuir_agente' }],
    }))
  }

  function removerOpcao(idx) {
    setConfig((p) => ({ ...p, opcoes: p.opcoes.filter((_, i) => i !== idx) }))
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await api.put(`/bot/${instanciaSel}`, config)
      alert('Bot salvo com sucesso!')
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao salvar bot')
    } finally {
      setSalvando(false)
    }
  }

  async function handleTestar() {
    if (!telefoneTeste.trim()) return
    try {
      const { data } = await api.post(`/bot/${instanciaSel}/teste`, { telefone: telefoneTeste.trim() })
      alert(`Menu enviado para ${telefoneTeste}!\n\n${data.texto}`)
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao testar bot')
    }
  }

  if (!config) return <p className="text-[#9CA3AF] text-sm">Selecione uma instância para configurar o bot.</p>

  return (
    <div className="space-y-6">
      {/* Selecionar instância */}
      <div className="flex items-center gap-4">
        <label className="text-[#6B7280] text-sm shrink-0">Instância</label>
        <select value={instanciaSel} onChange={(e) => setInstanciaSel(e.target.value)}
          className="bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]">
          {instancias.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
        {/* Toggle ativo */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-[#6B7280] text-sm">Bot ativo</span>
          <button onClick={() => setConfig((p) => ({ ...p, ativo: !p.ativo }))}
            className={`w-11 h-6 rounded-full transition relative ${config.ativo ? 'bg-[#00C6A2]' : 'bg-[#E5E7EB]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Mensagem de boas-vindas */}
      <div>
        <label className="text-[#6B7280] text-xs mb-1.5 block">Mensagem de boas-vindas</label>
        <textarea value={config.mensagem_boas_vindas} onChange={(e) => setConfig((p) => ({ ...p, mensagem_boas_vindas: e.target.value }))}
          rows={3} placeholder="Ex: Olá! Bem-vindo ao suporte. Como posso ajudar?"
          className="w-full bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] resize-none" />
      </div>

      {/* Opções do menu */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">Opções do menu</label>
          <button onClick={addOpcao} className="text-[#00C6A2] text-xs hover:text-[#00957A] transition">+ Adicionar opção</button>
        </div>
        <div className="space-y-2">
          {config.opcoes.map((op, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#F0F0F0] text-[#6B7280] text-xs flex items-center justify-center shrink-0">{op.numero}</span>
              <input value={op.texto} onChange={(e) => setOpcao(i, 'texto', e.target.value)}
                placeholder="Texto da opção"
                className="flex-1 bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
              <button onClick={() => removerOpcao(i)} className="text-[#9CA3AF] hover:text-red-400 transition text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Horário */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[#6B7280] text-xs mb-1.5 block">Horário início</label>
          <input type="time" value={config.horario_inicio} onChange={(e) => setConfig((p) => ({ ...p, horario_inicio: e.target.value }))}
            className="w-full bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
        </div>
        <div>
          <label className="text-[#6B7280] text-xs mb-1.5 block">Horário fim</label>
          <input type="time" value={config.horario_fim} onChange={(e) => setConfig((p) => ({ ...p, horario_fim: e.target.value }))}
            className="w-full bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
        </div>
      </div>

      {/* Mensagem fora do horário */}
      <div>
        <label className="text-[#6B7280] text-xs mb-1.5 block">Mensagem fora do horário</label>
        <textarea value={config.mensagem_fora_horario || ''} onChange={(e) => setConfig((p) => ({ ...p, mensagem_fora_horario: e.target.value }))}
          rows={2} placeholder="Ex: Nosso atendimento funciona de segunda a sexta, das 8h às 18h."
          className="w-full bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] resize-none" />
      </div>

      {/* Teste e Salvar */}
      <div className="flex gap-3">
        <input value={telefoneTeste} onChange={(e) => setTelefoneTeste(e.target.value)}
          placeholder="Telefone para teste (5531999...)"
          className="flex-1 bg-white border border-[#F0F0F0] text-[#111827] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2] placeholder-[#9CA3AF]" />
        <button onClick={handleTestar} disabled={!telefoneTeste.trim()}
          className="px-4 py-2.5 bg-white hover:bg-[#F8F9FB] border border-[#F0F0F0] disabled:opacity-50 text-[#111827] text-sm rounded-xl transition">
          Testar
        </button>
        <button onClick={handleSalvar} disabled={salvando}
          className="px-6 py-2.5 bg-[#00C6A2] hover:bg-[#00C6A2] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
          {salvando ? 'Salvando...' : 'Salvar bot'}
        </button>
      </div>
    </div>
  )
}

// ── Aba Integrações ──────────────────────────────────────────
function AbaIntegracoes() {
  const [webhooks, setWebhooks] = useState([])
  const [form, setForm] = useState({ nome: '', url: '', eventos: [] })
  const [showForm, setShowForm] = useState(false)

  const EVENTOS_DISP = ['mensagem_recebida', 'lead_atualizado', 'conversa_encerrada']

  useEffect(() => { api.get('/webhooks').then(({ data }) => setWebhooks(data.webhooks)) }, [])

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!form.url || !form.eventos.length) return
    try {
      const { data } = await api.post('/webhooks', form)
      setWebhooks((p) => [...p, data.webhook])
      setForm({ nome: '', url: '', eventos: [] })
      setShowForm(false)
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao adicionar webhook')
    }
  }

  async function handleRemover(id) {
    await api.delete(`/webhooks/${id}`)
    setWebhooks((p) => p.filter((w) => w.id !== id))
  }

  function toggleEvento(ev) {
    setForm((p) => ({
      ...p,
      eventos: p.eventos.includes(ev) ? p.eventos.filter((e) => e !== ev) : [...p.eventos, ev],
    }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[#6B7280] text-sm">Webhooks externos configurados</p>
        <button onClick={() => setShowForm((p) => !p)}
          className="px-4 py-2 bg-[#00C6A2] hover:bg-[#00C6A2] text-white text-sm font-medium rounded-xl transition">
          + Adicionar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdicionar} className="bg-white rounded-2xl p-5 border border-[#F0F0F0] space-y-4">
          <div>
            <label className="text-[#6B7280] text-xs mb-1 block">Nome (opcional)</label>
            <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
          </div>
          <div>
            <label className="text-[#6B7280] text-xs mb-1 block">URL de destino *</label>
            <input required type="url" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-[#F8F9FB] border border-[#F0F0F0] text-[#111827] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C6A2]" />
          </div>
          <div>
            <label className="text-[#6B7280] text-xs mb-2 block">Eventos *</label>
            <div className="flex flex-wrap gap-2">
              {EVENTOS_DISP.map((ev) => (
                <button type="button" key={ev} onClick={() => toggleEvento(ev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    form.eventos.includes(ev)
                      ? 'bg-[#00C6A2] border-[#00C6A2] text-white'
                      : 'border-[#F0F0F0] text-[#6B7280] hover:border-[#8A9BBF]'
                  }`}>{ev}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-[#F0F0F0] text-[#6B7280] text-sm">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#00C6A2] text-white text-sm">Adicionar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {webhooks.map((w) => (
          <div key={w.id} className="flex items-start justify-between bg-white border border-[#F0F0F0] rounded-xl px-4 py-3 gap-4">
            <div className="min-w-0">
              {w.nome && <p className="text-[#111827] text-sm font-medium">{w.nome}</p>}
              <p className="text-[#6B7280] text-xs truncate">{w.url}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {w.eventos?.map((ev) => (
                  <span key={ev} className="bg-[#F0F0F0] text-[#6B7280] text-xs px-2 py-0.5 rounded-full">{ev}</span>
                ))}
              </div>
            </div>
            <button onClick={() => handleRemover(w.id)} className="text-[#9CA3AF] hover:text-red-400 transition text-sm shrink-0">Remover</button>
          </div>
        ))}
        {webhooks.length === 0 && !showForm && <p className="text-[#9CA3AF] text-sm text-center py-8">Nenhuma integração configurada.</p>}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
const ABAS = [
  { id: 'agentes', label: 'Agentes' },
  { id: 'instancias', label: 'Instâncias WhatsApp' },
  { id: 'bot', label: 'Bot' },
  { id: 'integracoes', label: 'Integrações' },
]

export default function Configuracoes() {
  const { logout } = useAuth()
  const [aba, setAba] = useState('agentes')

  const navLinks = [
    { href: '/inbox', i: '💬' }, { href: '/dashboard', i: '📊' },
    { href: '/crm', i: '🎯' }, { href: '/relatorios', i: '📈' },
    { href: '/configuracoes', i: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden text-[#111827]">
      <nav className="w-16 bg-white border-r border-[#F3F4F6] flex flex-col items-center py-6 gap-3 shrink-0">
        <div className="w-8 h-8 flex items-center justify-center mb-3 shrink-0">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="9" stroke="#00C6A2" strokeWidth="1.5"/>
            <circle cx="13" cy="13" r="4" stroke="#00C6A2" strokeWidth="1" opacity="0.5"/>
            <circle cx="13" cy="13" r="2" fill="#00C6A2"/>
            <line x1="1" y1="13" x2="7" y2="13" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="13" x2="25" y2="13" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="1" x2="13" y2="7" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="13" y1="19" x2="13" y2="25" stroke="#00C6A2" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {navLinks.map((l) => (
          <Link key={l.href} to={l.href} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-white transition">{l.i}</Link>
        ))}
        <div className="mt-auto">
          <button onClick={logout} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-[#111827] text-xl font-bold mb-6">Configurações</h1>

          {/* Abas */}
          <div className="flex gap-1 bg-white rounded-xl p-1 mb-8 w-fit">
            {ABAS.map((a) => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  aba === a.id ? 'bg-[#00C6A2] text-white' : 'text-[#6B7280] hover:text-white'
                }`}>{a.label}</button>
            ))}
          </div>

          {/* Conteúdo da aba */}
          {aba === 'agentes' && <AbaAgentes />}
          {aba === 'instancias' && <AbaInstancias />}
          {aba === 'bot' && <AbaBot />}
          {aba === 'integracoes' && <AbaIntegracoes />}
        </div>
      </div>
    </div>
  )
}
