const { query } = require('../database/connection')
const { autenticarGestora } = require('../middleware/auth')

async function relatoriosRoutes(fastify) {
  fastify.addHook('preHandler', autenticarGestora)


  // GET /relatorios/resumo — números gerais (hoje / semana / mês)
  fastify.get('/relatorios/resumo', async (request, reply) => {
    const { rows: hoje } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(criado_em) = CURRENT_DATE)::int                AS conversas_hoje,
        COUNT(*) FILTER (WHERE status = 'em_atendimento')::int                     AS em_atendimento_agora,
        COUNT(*) FILTER (WHERE status = 'aguardando')::int                         AS na_fila_agora,
        COUNT(*) FILTER (WHERE status = 'encerrada' AND DATE(atualizado_em) = CURRENT_DATE)::int AS encerradas_hoje,
        COUNT(*) FILTER (WHERE DATE(criado_em) >= DATE_TRUNC('week', CURRENT_DATE))::int  AS conversas_semana,
        COUNT(*) FILTER (WHERE DATE(criado_em) >= DATE_TRUNC('month', CURRENT_DATE))::int AS conversas_mes
      FROM conversas
    `)

    const { rows: msgHoje } = await query(`
      SELECT COUNT(*)::int AS mensagens_hoje
      FROM mensagens
      WHERE DATE(criado_em) = CURRENT_DATE AND direcao = 'entrada'
    `)

    const { rows: leadsAtivos } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE estagio NOT IN ('fechado','perdido'))::int AS leads_ativos,
        COUNT(*) FILTER (WHERE estagio = 'fechado')::int                  AS leads_fechados,
        COALESCE(SUM(valor_estimado) FILTER (WHERE estagio = 'fechado'), 0)::numeric AS valor_fechado
      FROM leads
    `)

    return reply.send({
      resumo: {
        ...hoje[0],
        ...msgHoje[0],
        ...leadsAtivos[0],
      },
    })
  })

  // GET /relatorios/agentes — desempenho por agente
  fastify.get('/relatorios/agentes', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string' },
          data_fim: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const inicio = request.query.data_inicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const fim = request.query.data_fim || new Date().toISOString().split('T')[0]

    const { rows } = await query(`
      SELECT
        u.id,
        u.nome,
        u.ativo,
        COUNT(c.id)::int                                                                       AS total_conversas,
        COUNT(c.id) FILTER (WHERE c.status = 'encerrada')::int                                 AS conversas_encerradas,
        COUNT(c.id) FILTER (WHERE c.status = 'em_atendimento')::int                            AS conversas_ativas,
        COUNT(l.id) FILTER (WHERE l.estagio = 'fechado')::int                                  AS leads_fechados,
        COALESCE(SUM(l.valor_estimado) FILTER (WHERE l.estagio = 'fechado'), 0)::numeric       AS valor_total_fechado,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (c.atualizado_em - c.criado_em)) / 60)
          FILTER (WHERE c.status = 'encerrada')
        )::int AS tempo_medio_atendimento_min
      FROM usuarios u
      LEFT JOIN conversas c ON c.agente_id = u.id
        AND c.criado_em BETWEEN $1 AND ($2::date + INTERVAL '1 day')
      LEFT JOIN leads l ON l.agente_id = u.id
        AND l.criado_em BETWEEN $1 AND ($2::date + INTERVAL '1 day')
      WHERE u.papel = 'agente'
      GROUP BY u.id, u.nome, u.ativo
      ORDER BY total_conversas DESC
    `, [inicio, fim])

    return reply.send({ agentes: rows, periodo: { inicio, fim } })
  })

  // GET /relatorios/funil — dados do kanban CRM
  fastify.get('/relatorios/funil', async (request, reply) => {
    const { rows } = await query(`
      SELECT
        estagio,
        COUNT(*)::int                                  AS quantidade,
        COALESCE(SUM(valor_estimado), 0)::numeric      AS valor_total,
        ROUND(AVG(valor_estimado))::numeric            AS valor_medio
      FROM leads
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'novo' THEN 1 WHEN 'em_contato' THEN 2
          WHEN 'proposta' THEN 3 WHEN 'fechado' THEN 4 ELSE 5
        END
    `)

    const totalLeads = rows.reduce((s, r) => s + r.quantidade, 0)
    const resultado = rows.map((r) => ({
      ...r,
      percentual: totalLeads > 0 ? Math.round((r.quantidade / totalLeads) * 100) : 0,
    }))

    return reply.send({ funil: resultado, total_leads: totalLeads })
  })

  // GET /relatorios/conversoes — taxa de conversão por período
  fastify.get('/relatorios/conversoes', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          periodo: { type: 'string', enum: ['hoje', 'semana', 'mes', 'custom'], default: 'mes' },
          data_inicio: { type: 'string' },
          data_fim: { type: 'string' },
          agrupamento: { type: 'string', enum: ['dia', 'semana', 'mes'], default: 'dia' },
        },
      },
    },
  }, async (request, reply) => {
    const { periodo = 'mes', data_inicio, data_fim, agrupamento = 'dia' } = request.query

    let inicio, fim
    const agora = new Date()
    if (periodo === 'hoje') {
      inicio = agora.toISOString().split('T')[0]
      fim = inicio
    } else if (periodo === 'semana') {
      const d = new Date(agora)
      d.setDate(d.getDate() - 7)
      inicio = d.toISOString().split('T')[0]
      fim = agora.toISOString().split('T')[0]
    } else if (periodo === 'mes') {
      const d = new Date(agora)
      d.setDate(d.getDate() - 30)
      inicio = d.toISOString().split('T')[0]
      fim = agora.toISOString().split('T')[0]
    } else {
      inicio = data_inicio
      fim = data_fim
    }

    const truncMap = { dia: 'day', semana: 'week', mes: 'month' }
    const trunc = truncMap[agrupamento] || 'day'

    // Volume de conversas por período
    const { rows: volumeConversas } = await query(`
      SELECT
        DATE_TRUNC($1, criado_em)::date AS data,
        COUNT(*)::int                   AS total,
        COUNT(*) FILTER (WHERE status = 'encerrada')::int AS encerradas
      FROM conversas
      WHERE criado_em BETWEEN $2 AND ($3::date + INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1
    `, [trunc, inicio, fim])

    // Taxa de conversão leads
    const { rows: volumeLeads } = await query(`
      SELECT
        DATE_TRUNC($1, criado_em)::date AS data,
        COUNT(*)::int                                               AS leads_criados,
        COUNT(*) FILTER (WHERE estagio = 'fechado')::int            AS leads_fechados,
        COALESCE(SUM(valor_estimado) FILTER (WHERE estagio = 'fechado'), 0)::numeric AS valor_fechado
      FROM leads
      WHERE criado_em BETWEEN $2 AND ($3::date + INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1
    `, [trunc, inicio, fim])

    // Totais consolidados
    const { rows: totais } = await query(`
      SELECT
        COUNT(DISTINCT c.id)::int                                          AS total_conversas,
        COUNT(DISTINCT l.id)::int                                          AS total_leads,
        COUNT(DISTINCT l.id) FILTER (WHERE l.estagio = 'fechado')::int    AS leads_fechados,
        COALESCE(SUM(l.valor_estimado) FILTER (WHERE l.estagio = 'fechado'), 0)::numeric AS receita_total,
        CASE
          WHEN COUNT(DISTINCT l.id) > 0
          THEN ROUND(
            COUNT(DISTINCT l.id) FILTER (WHERE l.estagio = 'fechado')::numeric
            / COUNT(DISTINCT l.id) * 100, 1
          )
          ELSE 0
        END AS taxa_conversao_pct
      FROM conversas c
      LEFT JOIN leads l ON l.conversa_id = c.id
      WHERE c.criado_em BETWEEN $1 AND ($2::date + INTERVAL '1 day')
    `, [inicio, fim])

    return reply.send({
      periodo: { inicio, fim, agrupamento },
      totais: totais[0],
      volume_conversas: volumeConversas,
      volume_leads: volumeLeads,
    })
  })
}

module.exports = relatoriosRoutes
