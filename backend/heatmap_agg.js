require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'analytics',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password'
});

async function computeHeatmap(pagePath='/', gridW=50, gridH=30, viewportW=1024, viewportH=768) {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT x,y FROM events WHERE page_path = $1 AND event_type = $2 AND x IS NOT NULL AND y IS NOT NULL', [pagePath, 'click']);
    const counts = Array.from({length: gridW},()=>Array(gridH).fill(0));
    for (const r of res.rows) {
      const x = Math.max(0, Math.min(viewportW-1, r.x));
      const y = Math.max(0, Math.min(viewportH-1, r.y));
      const gx = Math.floor(x / viewportW * gridW);
      const gy = Math.floor(y / viewportH * gridH);
      counts[gx][gy] += 1;
    }
    // Upsert into heatmap_aggregates
    const now = new Date();
    for (let gx=0; gx<gridW; gx++){
      for (let gy=0; gy<gridH; gy++){
        const c = counts[gx][gy];
        if (c <= 0) continue;
        await client.query(`
          INSERT INTO heatmap_aggregates(page_path, grid_x, grid_y, count, last_updated)
          VALUES($1,$2,$3,$4,$5)
          ON CONFLICT (page_path, grid_x, grid_y)
          DO UPDATE SET count = heatmap_aggregates.count + EXCLUDED.count, last_updated = EXCLUDED.last_updated
        `, [pagePath, gx, gy, c, now]);
      }
    }
    console.log('Heatmap computed and stored for', pagePath);
  } catch (err) {
    console.error('Heatmap error', err);
  } finally {
    client.release();
    pool.end();
  }
}

const args = process.argv.slice(2);
const page = args[0] || '/';
computeHeatmap(page).catch(console.error);