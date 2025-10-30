// backend/server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const { Pool } = require('pg');

const app = express();

const cors = require('cors');

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:3000'], // frontend origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '2mb' }));

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'analytics',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password'
});

// POST
app.post('/api/v1/events', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  const client = await pool.connect();
  try {

    console.log('📩 Received events:', JSON.stringify(events, null, 2));

    await client.query('BEGIN');
    const insertText = `INSERT INTO events(id, client_id, session_id, user_id, ts, page_url, page_path, event_type, x, y, scroll_y, meta)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`;
    for (const ev of events) {
      const id = ev.id || require('crypto').randomUUID();
      const values = [
        id,
        ev.clientId || null,
        ev.sessionId || null,
        ev.userId || null,
        ev.ts ? new Date(ev.ts) : new Date(),
        ev.pageUrl || null,
        ev.pagePath || (ev.pageUrl ? new URL(ev.pageUrl).pathname : null),
        ev.eventType || null,
        Number.isInteger(ev.x) ? ev.x : null,
        Number.isInteger(ev.y) ? ev.y : null,
        Number.isInteger(ev.scrollY) ? ev.scrollY : null,
        ev.meta ? ev.meta : {}
      ];
      await client.query(insertText, values);
    }
    await client.query('COMMIT');
    res.json({ status: 'ok', inserted: events.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Insert error', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

//GET
app.get('/api/v1/events', async (req, res) => {
  const page = req.query.page || null;
  const limit = Math.min(parseInt(req.query.limit || '1000'), 5000);
  try {
    let q, params;
    if (page) {
      q = `SELECT * FROM events WHERE page_path = $1 ORDER BY ts DESC LIMIT $2`;
      params = [page, limit];
    } else {
      q = `SELECT * FROM events ORDER BY ts DESC LIMIT $1`;
      params = [limit];
    }
    const { rows } = await pool.query(q, params);
    res.json({ count: rows.length, rows });
  } catch (err) {
    console.error('Fetch error', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
