const { pool } = require('./database');

async function upsertUser(user) {
  if (!user?.id) return;
  const tag = user.tag || `${user.username ?? 'unknown'}#????`;
  await pool.query(
    `
    INSERT INTO users (user_id, last_known_tag, last_seen)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET last_known_tag = $2, last_seen = NOW()
    `,
    [user.id, tag]
  );
}

async function addWarn(userId, moderatorId, reason) {
  await pool.query(
    `INSERT INTO warns (user_id, moderator_id, reason) VALUES ($1, $2, $3)`,
    [userId, moderatorId, reason || null]
  );
}

async function addAction(userId, moderatorId, action, reason) {
  await pool.query(
    `INSERT INTO actions (user_id, moderator_id, action, reason) VALUES ($1, $2, $3, $4)`,
    [userId, moderatorId, action, reason || null]
  );
}

async function getUserProfile(userId) {
  const res = await pool.query(
    `SELECT user_id, last_known_tag, last_seen FROM users WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function getUserHistory(userId) {
  const warns = await pool.query(
    `SELECT reason, created_at FROM warns WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  const actions = await pool.query(
    `SELECT action, reason, created_at FROM actions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return { warns: warns.rows, actions: actions.rows };
}

/* ===== Tickets ===== */
async function ticketCreate(guildId, userId, channelId, type) {
  await pool.query(
    `
    INSERT INTO tickets (guild_id, user_id, channel_id, type, status)
    VALUES ($1, $2, $3, $4, 'open')
    `,
    [guildId, userId, channelId, type]
  );
}

async function ticketClose(channelId, note) {
  // close only open ticket in that channel
  await pool.query(
    `
    UPDATE tickets
    SET status = 'closed', closed_at = NOW()
    WHERE channel_id = $1 AND status = 'open'
    `,
    [channelId]
  );
}

async function ticketFindOpenByChannel(channelId) {
  const res = await pool.query(
    `SELECT * FROM tickets WHERE channel_id = $1 AND status = 'open' LIMIT 1`,
    [channelId]
  );
  return res.rows[0] || null;
}

module.exports = {
  upsertUser,
  addWarn,
  addAction,
  getUserProfile,
  getUserHistory,
  ticketCreate,
  ticketClose,
  ticketFindOpenByChannel
};
