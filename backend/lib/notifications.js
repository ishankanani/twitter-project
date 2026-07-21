'use strict';
const { query } = require('./db');

async function createNotification({ userId, type, title, body, link }) {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5)`,
    [userId, type, title, body || '', link || '']
  );
}

async function notifyRole(role, payload) {
  const users = await query(`SELECT id FROM users WHERE role=$1 AND active=TRUE`, [role]);
  for (const u of users.rows) {
    await createNotification({ ...payload, userId: u.id });
  }
}

module.exports = { createNotification, notifyRole };
