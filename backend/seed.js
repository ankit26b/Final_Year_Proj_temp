require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'analytics',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password'
});

async function seed({ pagePath='/', n=1000, clusters=3 } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < n; i++) {
      // make clustered clicks
      const cluster = Math.floor(Math.random()*clusters);
      const cx = Math.round((0.2 + cluster*(0.6/(clusters-1 || 1))) * 1024) + (Math.random()*80-40);
      const cy = Math.round((0.2 + 0.6*Math.random()) * 768);
      const ev = {
        id: require('crypto').randomUUID(),
        clientId: 'seed-client',
        sessionId: 'seed-s-'+Math.floor(Math.random()*200),
        userId: null,
        ts: new Date(Date.now() - Math.floor(Math.random()*1000*60*60*24)).toISOString(),
        pageUrl: `http://demo${pagePath}`,
        pagePath,
        eventType: 'click',
        x: Math.max(0, Math.min(1023, Math.round(cx))),
        y: Math.max(0, Math.min(767, Math.round(cy))),
        scrollY: null,
        meta: { seeded: true }
      };
      const q = `INSERT INTO events(id, client_id, session_id, user_id, ts, page_url, page_path, event_type, x, y, scroll_y, meta)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`;
      await client.query(q, [
        ev.id, ev.clientId, ev.sessionId, ev.userId, ev.ts, ev.pageUrl, ev.pagePath, ev.eventType, ev.x, ev.y, ev.scrollY, ev.meta
      ]);
    }
    await client.query('COMMIT');
    console.log('Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error', err);
  } finally {
    client.release();
    pool.end();
  }
}

const args = process.argv.slice(2);
const page = args[0] || '/';
const n = parseInt(args[1] || '800');
seed({ pagePath: page, n }).catch(console.error);