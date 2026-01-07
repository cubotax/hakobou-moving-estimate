import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        pickup_prefecture TEXT,
        pickup_city TEXT,
        pickup_town TEXT,
        delivery_prefecture TEXT,
        delivery_city TEXT,
        delivery_town TEXT,
        pickup_date TEXT,
        delivery_date TEXT,
        total_fee INTEGER,
        floor_pickup INTEGER DEFAULT 1,
        has_elevator_pickup BOOLEAN DEFAULT FALSE,
        floor_delivery INTEGER DEFAULT 1,
        has_elevator_delivery BOOLEAN DEFAULT FALSE,
        needs_packing BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_links (
        id SERIAL PRIMARY KEY,
        estimate_id TEXT NOT NULL REFERENCES estimates(id),
        line_user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_links_line_user_id ON user_links(line_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_links_estimate_id ON user_links(estimate_id);
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

initDb().catch(err => console.error('Failed to initialize database:', err));

export async function saveEstimate(estimate) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO estimates (id, pickup_prefecture, pickup_city, pickup_town, delivery_prefecture, delivery_city, delivery_town, pickup_date, delivery_date, total_fee, floor_pickup, has_elevator_pickup, floor_delivery, has_elevator_delivery, needs_packing)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      estimate.id,
      estimate.pickupPrefecture || '',
      estimate.pickupCity || '',
      estimate.pickupTown || '',
      estimate.deliveryPrefecture || '',
      estimate.deliveryCity || '',
      estimate.deliveryTown || '',
      estimate.pickupDate || '',
      estimate.deliveryDate || '',
      estimate.totalFee || 0,
      estimate.floorPickup || 1,
      estimate.hasElevatorPickup || false,
      estimate.floorDelivery || 1,
      estimate.hasElevatorDelivery || false,
      estimate.needsPacking || false
    ]);
    return estimate;
  } finally {
    client.release();
  }
}

export async function getEstimateById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM estimates WHERE id = $1', [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function linkUserToEstimate(estimateId, lineUserId) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO user_links (estimate_id, line_user_id)
      VALUES ($1, $2)
    `, [estimateId, lineUserId]);
  } finally {
    client.release();
  }
}

export async function getEstimateByLineUserId(lineUserId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT e.* FROM estimates e
      JOIN user_links ul ON e.id = ul.estimate_id
      WHERE ul.line_user_id = $1
      ORDER BY ul.created_at DESC
      LIMIT 1
    `, [lineUserId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export default pool;
