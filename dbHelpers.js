const { pool } = require('./database');

async function upsertUser(user) {
  await pool.query(
    `
    INSERT INTO users (user_id, last_known_tag, last_seen)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET last_known_tag = $2, last_seen = NOW()
    `,
    [user.id, user.tag]
  );
}

async function addWarn(userId, modId, reason) {
  await pool.query(
    `INSERT INTO warns (user_id, moderator_id, reason)
     VALUES ($1, $2, $3)`,
    [userId, modId, reason]
  );
}

async function addAction(userId, modId, action, reason) {
  await pool.query(
    `INSERT INTO actions (user_id, moderator_id, action, reason)
     VALUES ($1, $2, $3, $4)`,
    [userId, modId, action, reason]
  );
}

async function getUserHistory(userId) {
  const warns = await pool.query(
    `SELECT reason, created_at FROM warns WHERE user_id = $1`,
    [userId]
  );

  const actions = await pool.query(
    `SELECT action, reason, created_at FROM actions WHERE user_id = $1`,
    [userId]
  );

  return {
    warns: warns.rows,
    actions: actions.rows
  };
}

module.exports = {
  upsertUser,
  addWarn,
  addAction,
  getUserHistory
};
