const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool:', err.message)
})

async function conectar() {
  let tentativas = 0
  const maxTentativas = 10

  while (tentativas < maxTentativas) {
    try {
      const client = await pool.connect()
      client.release()
      console.log('[DB] PostgreSQL conectado com sucesso')
      return
    } catch (err) {
      tentativas++
      console.warn(`[DB] Tentativa ${tentativas}/${maxTentativas} falhou: ${err.message}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw new Error('[DB] Não foi possível conectar ao PostgreSQL após várias tentativas')
}

async function query(text, params) {
  const inicio = Date.now()
  try {
    const result = await pool.query(text, params)
    const duracao = Date.now() - inicio
    if (duracao > 1000) {
      console.warn(`[DB] Query lenta (${duracao}ms): ${text.substring(0, 80)}`)
    }
    return result
  } catch (err) {
    console.error('[DB] Erro na query:', err.message, '\nSQL:', text.substring(0, 200))
    throw err
  }
}

async function transaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const resultado = await callback(client)
    await client.query('COMMIT')
    return resultado
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { pool, query, transaction, conectar }
