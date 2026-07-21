'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'sosyalag'}`,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => console.error('[PG] pool error:', err.message));

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.LOG_QUERIES === 'true') {
      console.log(`[PG] ${Date.now() - start}ms · ${text.split('\n')[0].slice(0, 80)}`);
    }
    return res;
  } catch (err) {
    console.error('[PG] query error:', err.message);
    throw err;
  }
}

module.exports = { query, pool };
