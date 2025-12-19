const { Pool } = require('pg');

console.log('🟡 database.js loaded');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  console.log('🟡 initDB() starting');

  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // USERS (aj keď nie sú na serveri)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        last_known_tag TEXT,
        last_seen TIMESTAMP
      )
    `);

    // WARNS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warns (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        moderator_id TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ACTIONS (kick / ban)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS actions (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        moderator_id TEXT,
        action TEXT,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TICKETS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        guild_id TEXT,
        user_id TEXT,
        channel_id TEXT,
        type TEXT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      )
    `);

    console.log('✅ Tables ready');
  } catch (err) {
    console.error('❌ DB INIT ERROR:', err);
    process.exit(1);
  }
}

module.exports = { pool, initDB };
