import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
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
    has_elevator_pickup INTEGER DEFAULT 0,
    floor_delivery INTEGER DEFAULT 1,
    has_elevator_delivery INTEGER DEFAULT 0,
    needs_packing INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id TEXT NOT NULL,
    line_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_user_links_line_user_id ON user_links(line_user_id);
  CREATE INDEX IF NOT EXISTS idx_user_links_estimate_id ON user_links(estimate_id);
`);

export function saveEstimate(estimate) {
  const stmt = db.prepare(`
    INSERT INTO estimates (id, pickup_prefecture, pickup_city, pickup_town, delivery_prefecture, delivery_city, delivery_town, pickup_date, delivery_date, total_fee, floor_pickup, has_elevator_pickup, floor_delivery, has_elevator_delivery, needs_packing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
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
    estimate.hasElevatorPickup ? 1 : 0,
    estimate.floorDelivery || 1,
    estimate.hasElevatorDelivery ? 1 : 0,
    estimate.needsPacking ? 1 : 0
  );
  return estimate;
}

export function getEstimateById(id) {
  const stmt = db.prepare('SELECT * FROM estimates WHERE id = ?');
  return stmt.get(id);
}

export function linkUserToEstimate(estimateId, lineUserId) {
  const stmt = db.prepare(`
    INSERT INTO user_links (estimate_id, line_user_id)
    VALUES (?, ?)
  `);
  stmt.run(estimateId, lineUserId);
}

export function getEstimateByLineUserId(lineUserId) {
  const stmt = db.prepare(`
    SELECT e.* FROM estimates e
    JOIN user_links ul ON e.id = ul.estimate_id
    WHERE ul.line_user_id = ?
    ORDER BY ul.created_at DESC
    LIMIT 1
  `);
  return stmt.get(lineUserId);
}

export default db;
