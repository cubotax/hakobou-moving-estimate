import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data.db');
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
    distance_km REAL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    line_user_id TEXT
  )
`);

export function insertEstimate(estimate) {
  const stmt = db.prepare(`
    INSERT INTO estimates (
      id, 
      pickup_prefecture, pickup_city, pickup_town,
      delivery_prefecture, delivery_city, delivery_town,
      pickup_date, delivery_date,
      total_fee, distance_km
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    estimate.id,
    estimate.pickupAddress?.prefecture || '',
    estimate.pickupAddress?.city || '',
    estimate.pickupAddress?.town || '',
    estimate.deliveryAddress?.prefecture || '',
    estimate.deliveryAddress?.city || '',
    estimate.deliveryAddress?.town || '',
    estimate.dates?.pickupDate || '',
    estimate.dates?.deliveryDate || '',
    estimate.totalFee || 0,
    estimate.distanceKm || 0
  );
  
  return estimate.id;
}

export function linkEstimate(estimateId, lineUserId) {
  const stmt = db.prepare(`
    UPDATE estimates SET line_user_id = ? WHERE id = ?
  `);
  const result = stmt.run(lineUserId, estimateId);
  return result.changes > 0;
}

export function getEstimateByLineUserId(lineUserId) {
  const stmt = db.prepare(`
    SELECT * FROM estimates WHERE line_user_id = ? ORDER BY created_at DESC LIMIT 1
  `);
  return stmt.get(lineUserId);
}

export function getEstimateById(estimateId) {
  const stmt = db.prepare(`SELECT * FROM estimates WHERE id = ?`);
  return stmt.get(estimateId);
}

export default db;
