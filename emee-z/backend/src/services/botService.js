const { query } = require('../database/connection')
const evolution = require('./evolutionService')

// Busca config do bot para uma instância
async function obterConfig(instanciaId) {
  const { rows } = await query(
    'SELECT * FROM configuracoes_bot WHERE instancia_id = $1',
    [instanciaId]
  )
  return rows[0] || null
}

// Verifica se está dentro do horário de atendimento configurado
function dentroDoHorario(config) {
  const agora = new Date()
  const diaSemana = agora.getDay()
  const horaAtual = agora.getHours() * 60 + agora.getMinutes()
  const [hIni, mIni] = config.horario_inicio.split(':').map(Number)
  const [hFim, mFim] = config.horario_fim.split(':').map(Number)
  const inicioMin = hIni * 60 + mIni
  const fimMin = hFim * 60 + mFim
  return config.dias_semana.includes(diaSemana) && horaAtual >= inicioMin && horaAtual < fimMin
}

// Monta o texto do menu de opções
function montarMenuTexto(config) {
  const opcoes = Array.isArray(config.opcoes) ? config.opcoes : JSON.parse(config.opcoes)
  const linhas = opcoes.map((op) => `${op.numero}. ${op.texto}`).join('\n')
  return `${config.mensagem_boas_vindas}\n\n${linhas}`
}

// Salva mensagem de saída (bot) no banco
async function salvarMensagemBot(conversaId, conteudo) {
  await query(
    `INSERT INTO mensagens (conversa_id, direcao, tipo, conteudo)
     VALUES ($1, 'saida', 'texto', $2)`,
    [conversaId, conteudo]
  )
  await query(
    `UPDATE conversas SET ultima_mensagem = $1, ultima_mensagem_em = NOW(), atualizado_em = NOW()
     WHERE id = $2`,
    [conteudo, conversaId]
  )
}

// Processa uma mensagem recebida quando a conversa está em modo 'bot'
async function processar(conversaId, instanciaId, telefone, instanceName, conteudo, io) {
  const config = await obterConfig(instanciaId)

  // Sem bot configurado ou inativo — envia para fila
  if (!config || !config.ativo) {
    await query(
      "UPDATE conversas SET status = 'aguardando', atualizado_em = NOW() WHERE id = $1",
      [conversaId]
    )
    if (io) io.emit('conversa_atualizada', { conversa_id: conversaId, status: 'aguardando' })
    return
  }

  // Fora do horário
  if (!dentroDoHorario(config)) {
    if (config.mensagem_fora_horario) {
      await evolution.enviarTexto(instanceName, telefone, config.mensagem_fora_horario)
      await salvarMensagemBot(conversaId, config.mensagem_fora_horario)
    }
    await query(
      "UPDATE conversas SET status = 'encerrada', atualizado_em = NOW() WHERE id = $1",
      [conversaId]
    )
    return
  }

  // Verifica se já enviou boas-vindas (existe alguma mensagem de saída)
  const { rows: msgsSaida } = await query(
    "SELECT id FROM mensagens WHERE conversa_id = $1 AND direcao = 'saida' LIMIT 1",
    [conversaId]
  )

  if (!msgsSaida.length) {
    // Primeiro contato — envia menu
    const menuTexto = montarMenuTexto(config)
    await evolution.enviarTexto(instanceName, telefone, menuTexto)
    await salvarMensagemBot(conversaId, menuTexto)
    return
  }

  // Já enviou menu — processa a escolha
  const escolha = conteudo.trim()
  const opcoes = Array.isArray(config.opcoes) ? config.opcoes : JSON.parse(config.opcoes)
  const opcao = opcoes.find((op) => op.numero === escolha)

  if (!opcao) {
    const aviso = 'Opção inválida. Por favor, escolha um número do menu.'
    await evolution.enviarTexto(instanceName, telefone, aviso)
    await salvarMensagemBot(conversaId, aviso)
    return
  }

  // Opção válida — move para fila de atendimento humano
  await query(
    "UPDATE conversas SET status = 'aguardando', atualizado_em = NOW() WHERE id = $1",
    [conversaId]
  )

  if (io) {
    // Recarrega conversa completa para emitir
    const { rows } = await query(
      `SELECT c.*, co.nome as contato_nome, co.telefone as contato_telefone
       FROM conversas c JOIN contatos co ON co.id = c.contato_id
       WHERE c.id = $1`,
      [conversaId]
    )
    io.emit('nova_conversa', { conversa: rows[0] })
    io.emit('conversa_atualizada', { conversa_id: conversaId, status: 'aguardando' })
  }
}

// Envia menu de boas-vindas (para uso na rota de teste)
async function enviarMenuBoasVindas(instanciaId, instanceName, telefone) {
  const config = await obterConfig(instanciaId)
  if (!config) throw new Error('Bot não configurado para esta instância')
  const menuTexto = montarMenuTexto(config)
  await evolution.enviarTexto(instanceName, telefone, menuTexto)
  return menuTexto
}

module.exports = { processar, obterConfig, enviarMenuBoasVindas, montarMenuTexto, dentroDoHorario }
