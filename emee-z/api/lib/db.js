const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
async function query(text, params) {
  return await pool.query(text, params);
}
module.exports = { query };
