/**
 * GeoTracker Database Layer
 * sqlite3 based persistence with auto-archiving for data older than 1 month
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'geotracker.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db;

/**
 * Initialize database connection and tables
 */
function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
    });

    db.serialize(() => {
      // Devices
      db.run(`CREATE TABLE IF NOT EXISTS devices (
        device_id   TEXT PRIMARY KEY,
        device_name TEXT    DEFAULT '',
        platform    TEXT    DEFAULT 'harmony',
        created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        last_seen   INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);

      // Locations
      db.run(`CREATE TABLE IF NOT EXISTS locations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id   TEXT    NOT NULL,
        latitude    REAL    NOT NULL,
        longitude   REAL    NOT NULL,
        altitude    REAL    DEFAULT 0,
        accuracy    REAL    DEFAULT 0,
        speed       REAL    DEFAULT 0,
        bearing     REAL    DEFAULT 0,
        address     TEXT    DEFAULT '',
        reported_at INTEGER NOT NULL,
        archived    INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);

      // Archives
      db.run(`CREATE TABLE IF NOT EXISTS location_archives (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id   TEXT    NOT NULL,
        latitude    REAL    NOT NULL,
        longitude   REAL    NOT NULL,
        altitude    REAL    DEFAULT 0,
        accuracy    REAL    DEFAULT 0,
        speed       REAL    DEFAULT 0,
        bearing     REAL    DEFAULT 0,
        address     TEXT    DEFAULT '',
        reported_at INTEGER NOT NULL,
        archived_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);

      // API Keys
      db.run(`CREATE TABLE IF NOT EXISTS api_keys (
        key       TEXT PRIMARY KEY,
        device_id TEXT    NOT NULL,
        name      TEXT    DEFAULT 'default',
        active    INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )`);

      console.log('[DB] Database initialized successfully');
      resolve();
    });
  });
}

// Helper: promisified run
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper: promisified get
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper: promisified all
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Upsert device record
 */
async function upsertDevice(deviceId, deviceName = '', platform = 'harmony') {
  const now = Date.now();
  await run(
    `INSERT INTO devices (device_id, device_name, platform, last_seen, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
       device_name = excluded.device_name,
       platform = excluded.platform,
       last_seen = excluded.last_seen,
       updated_at = excluded.updated_at`,
    [deviceId, deviceName, platform, now, now]
  );
}

/**
 * Register or get an API key
 */
async function getOrRegisterKey(deviceId, apiKey) {
  let row = await get('SELECT * FROM api_keys WHERE key = ? AND active = 1', [apiKey]);
  if (!row) {
    await run('INSERT INTO api_keys (key, device_id, name) VALUES (?, ?, ?)', [apiKey, deviceId, 'default']);
    return { key: apiKey, device_id: deviceId };
  }
  return row;
}

/**
 * Batch insert locations
 */
async function batchInsertLocations(locations) {
  if (!locations.length) return 0;

  const stmt = db.prepare(
    `INSERT INTO locations (device_id, latitude, longitude, altitude, accuracy, speed, bearing, address, reported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let count = 0;
  for (const loc of locations) {
    stmt.run([
      loc.deviceId, loc.latitude, loc.longitude,
      loc.altitude || 0, loc.accuracy || 0,
      loc.speed || 0, loc.bearing || 0,
      loc.address || '', loc.reportedAt || Date.now()
    ]);
    count++;
  }
  stmt.finalize();
  return count;
}

/**
 * Query locations within time window
 */
async function queryLocations(deviceId, hours) {
  const now = Date.now();
  const startMs = now - hours * 60 * 60 * 1000;
  return all(
    `SELECT id, latitude, longitude, altitude, accuracy, speed, bearing, address,
            reported_at, created_at
     FROM locations
     WHERE device_id = ? AND reported_at >= ? AND archived = 0
     ORDER BY reported_at ASC`,
    [deviceId, startMs]
  );
}

/**
 * Query archived locations within time window
 */
async function queryArchives(deviceId, hours) {
  const now = Date.now();
  const startMs = now - hours * 60 * 60 * 1000;
  return all(
    `SELECT id, latitude, longitude, altitude, accuracy, speed, bearing, address,
            reported_at, archived_at
     FROM location_archives
     WHERE device_id = ? AND reported_at >= ?
     ORDER BY reported_at ASC`,
    [deviceId, startMs]
  );
}

/**
 * Get all devices
 */
async function getAllDevices() {
  return all('SELECT device_id, device_name, platform, created_at, last_seen, updated_at FROM devices ORDER BY last_seen DESC');
}

/**
 * Get single device
 */
async function getDevice(deviceId) {
  return get('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
}

/**
 * Archive data older than 1 month
 */
async function archiveOldData(daysThreshold = 31) {
  const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

  const oldRecords = await all('SELECT * FROM locations WHERE reported_at < ? AND archived = 0', [cutoff]);
  if (!oldRecords.length) return { archived: 0, deleted: 0 };

  const now = Date.now();
  const insertStmt = db.prepare(
    `INSERT INTO location_archives (device_id, latitude, longitude, altitude, accuracy, speed, bearing, address, reported_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const rec of oldRecords) {
    insertStmt.run([
      rec.device_id, rec.latitude, rec.longitude, rec.altitude || 0,
      rec.accuracy || 0, rec.speed || 0, rec.bearing || 0,
      rec.address || '', rec.reported_at, now
    ]);
  }
  insertStmt.finalize();

  await run('UPDATE locations SET archived = 1 WHERE reported_at < ?', [cutoff]);
  const delResult = await run('DELETE FROM locations WHERE archived = 1');

  return { archived: oldRecords.length, deleted: delResult.changes };
}

/**
 * Get archive summary
 */
async function getArchiveSummary() {
  return all(
    `SELECT device_id, COUNT(*) as total_archived,
            MIN(reported_at) as earliest, MAX(reported_at) as latest
     FROM location_archives GROUP BY device_id`
  );
}

/**
 * Get counts
 */
async function getCounts() {
  const lc = await get('SELECT COUNT(*) as c FROM locations');
  const ac = await get('SELECT COUNT(*) as c FROM location_archives');
  const dc = await get('SELECT COUNT(*) as c FROM devices');
  return {
    locations: lc.c,
    archives: ac.c,
    devices: dc.c,
  };
}

module.exports = {
  initDB, upsertDevice, getOrRegisterKey, batchInsertLocations,
  queryLocations, queryArchives, getAllDevices, getDevice,
  archiveOldData, getArchiveSummary, getCounts,
};
