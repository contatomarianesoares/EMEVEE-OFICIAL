const axios = require('axios')

const BASE_URL = process.env.EVOLUTION_URL || 'http://localhost:8080'
const API_KEY = process.env.EVOLUTION_API_KEY || ''

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    apikey: API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.response?.data?.response?.message || err.message
    const status = err.response?.status
    console.error(`[Evolution] Erro ${status}: ${JSON.stringify(msg)}`)
    const error = new Error(Array.isArray(msg) ? msg.join(', ') : msg)
    error.statusCode = status || 500
    throw error
  }
)

// ── Cache em memória para QR Codes (chave: instanceName) ─────
// Populado pelo webhook qrcode.updated
const qrCache = new Map()

function salvarQR(instanceName, qrData) {
  // Normaliza base64: remove prefixo se a API já enviou (comum no v1.8.x)
  if (qrData.base64 && qrData.base64.includes(';base64,')) {
    qrData.base64 = qrData.base64.split(';base64,').pop()
  }
  qrCache.set(instanceName, { ...qrData, gerado_em: Date.now() })
}

function obterQRCache(instanceName) {
  const cached = qrCache.get(instanceName)
  if (!cached) return null
  // QR expira em 60 segundos (WhatsApp expira em ~20s, mas damos margem)
  if (Date.now() - cached.gerado_em > 60000) {
    qrCache.delete(instanceName)
    return null
  }
  return cached
}

function limparQR(instanceName) {
  qrCache.delete(instanceName)
}

// ── Instâncias ────────────────────────────────────────────────

async function criarInstancia(nome) {
  const { data } = await http.post('/instance/create', {
    instanceName: nome,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  })
  return data
}

async function listarInstancias() {
  const { data } = await http.get('/instance/fetchInstances')
  return Array.isArray(data) ? data : []
}

// Compatível com Evolution v1.8.x (QR direto na resposta) e v2.2.x (QR via webhook)
async function obterQRCode(instanceName) {
  // 1. Verifica cache primeiro (populado pelo webhook ou chamadas anteriores)
  const cached = obterQRCache(instanceName)
  if (cached) return cached

  // 2. Chama /instance/connect/:name diretamente.
  //    - v1.8.x: retorna { base64, code, pairingCode } imediatamente
  //    - v2.2.x: retorna { count: N } e dispara webhook qrcode.updated
  try {
    const { data } = await http.get(`/instance/connect/${instanceName}`)
    if (data?.base64 || data?.code) {
      // v1.8.x — QR veio direto na resposta
      salvarQR(instanceName, { base64: data.base64, code: data.code })
      return obterQRCache(instanceName)
    }
  } catch (e) {
    console.warn(`[Evolution] /connect aviso: ${e.message}`)
  }

  // 3. v2.2.x — aguarda o webhook qrcode.updated chegar (até 8s)
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const qr = obterQRCache(instanceName)
    if (qr) return qr
  }

  return null // será tratado pela rota como "aguardando"
}

async function obterStatus(instanceName) {
  const { data } = await http.get(`/instance/connectionState/${instanceName}`)
  return data?.instance?.state || 'unknown'
}

async function reconectarInstancia(instanceName) {
  // Desconecta e reconecta para forçar geração de novo QR
  try { await http.delete(`/instance/logout/${instanceName}`) } catch {}
  await new Promise((r) => setTimeout(r, 500))
  const { data } = await http.get(`/instance/connect/${instanceName}`)
  return data
}

async function deletarInstancia(instanceName) {
  limparQR(instanceName)
  const { data } = await http.delete(`/instance/delete/${instanceName}`)
  return data
}

async function desconectarInstancia(instanceName) {
  limparQR(instanceName)
  const { data } = await http.delete(`/instance/logout/${instanceName}`)
  return data
}

// ── Envio de mensagens ────────────────────────────────────────

async function enviarTexto(instanceName, telefone, texto) {
  console.log(`[Evolution] Enviando texto para ${telefone} via ${instanceName}: ${texto.substring(0, 20)}...`)
  const { data } = await http.post(`/message/sendText/${instanceName}`, {
    number: telefone,
    text: texto,
  })
  return data
}

async function enviarImagem(instanceName, telefone, urlOuBase64, legenda = '') {
  const { data } = await http.post(`/message/sendMedia/${instanceName}`, {
    number: telefone,
    mediatype: 'image',
    media: urlOuBase64,
    caption: legenda,
  })
  return data
}

async function enviarAudio(instanceName, telefone, urlOuBase64) {
  const { data } = await http.post(`/message/sendWhatsAppAudio/${instanceName}`, {
    number: telefone,
    audio: urlOuBase64,
  })
  return data
}

async function enviarDocumento(instanceName, telefone, urlOuBase64, nomeArquivo) {
  const { data } = await http.post(`/message/sendMedia/${instanceName}`, {
    number: telefone,
    mediatype: 'document',
    media: urlOuBase64,
    fileName: nomeArquivo,
  })
  return data
}

async function enviarMidia(instanceName, telefone, tipo, urlOuBase64, opcoes = {}) {
  switch (tipo) {
    case 'imagem':  return enviarImagem(instanceName, telefone, urlOuBase64, opcoes.legenda)
    case 'audio':   return enviarAudio(instanceName, telefone, urlOuBase64)
    case 'documento': return enviarDocumento(instanceName, telefone, urlOuBase64, opcoes.nomeArquivo)
    default: throw new Error(`Tipo de mídia não suportado: ${tipo}`)
  }
}

// ── Webhook — Evolution v2.2.x ────────────────────────────────
async function configurarWebhook(instanceName, url) {
  try {
    const { data } = await http.post(`/webhook/set/${instanceName}`, {
      url,
      enabled: true,
      webhookByEvents: false,
      base64: true,
      events: ['APPLICATION_STARTUP', 'QRCODE_UPDATED', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
    })
    return data
  } catch (err) {
    // Webhook global já configurado via env — não é fatal
    console.warn(`[Evolution] configurarWebhook aviso: ${err.message}`)
    return null
  }
}

module.exports = {
  criarInstancia,
  listarInstancias,
  obterQRCode,
  obterQRCache,
  salvarQR,
  limparQR,
  obterStatus,
  reconectarInstancia,
  deletarInstancia,
  desconectarInstancia,
  enviarTexto,
  enviarImagem,
  enviarAudio,
  enviarDocumento,
  enviarMidia,
  configurarWebhook,
}
