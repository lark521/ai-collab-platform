/**
 * GeoTracker API Routes
 * Unified endpoints for mobile clients and web dashboard
 */

const express = require('express');
const db = require('./database');

const router = express.Router();

// ========================
// Health & Stats
// ========================

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

router.get('/stats', (req, res) => {
  try {
    const counts = db.getCounts();
    const archives = db.getArchiveSummary();
    res.json({ success: true, data: { ...counts, archiveSummary: archives } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// Device Management
// ========================

// Register / update device
router.post('/device/register', (req, res) => {
  try {
    const { deviceId, deviceName, platform } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    db.upsertDevice(deviceId, deviceName || '', platform || 'harmony');
    res.json({ success: true, message: 'Device registered' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await db.getAllDevices();
    res.json({ success: true, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// Location Reporting (Unified Endpoint)
// ========================

/**
 * POST /api/location/report
 * 
 * Request body (single or batch):
 * {
 *   "deviceId": "unique-device-id",
 *   "apiKey": "optional-auth-key",
 *   "locations": [
 *     {
 *       "latitude": 39.54123,
 *       "longitude": 121.40234,
 *       "altitude": 10.5,
 *       "accuracy": 5.0,
 *       "speed": 0.0,
 *       "bearing": 0,
 *       "address": "辽宁省大连市长兴岛..."
 *     }
 *   ]
 * }
 * 
 * Or single location:
 * {
 *   "deviceId": "...",
 *   "latitude": 39.54123,
 *   "longitude": 121.40234,
 *   ...
 * }
 */

router.post('/location/report', async (req, res) => {
  try {
    const { deviceId, apiKey, locations } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    // Validate API key if provided
    if (apiKey) {
      const keyRow = db.getOrRegisterKey(deviceId, apiKey);
      if (keyRow.device_id !== deviceId) {
        return res.status(403).json({ success: false, error: 'Invalid API key' });
      }
    }

    // Normalize to batch format
    let batch;
    if (Array.isArray(locations)) {
      batch = locations.map(l => normalizeLocation(l, deviceId));
    } else {
      batch = [normalizeLocation({ ...req.body, deviceId }, deviceId)];
    }

    // Filter out invalid entries
    const valid = batch.filter(l =>
      l.latitude != null && l.longitude != null &&
      l.latitude >= -90 && l.latitude <= 90 &&
      l.longitude >= -180 && l.longitude <= 180
    );

    if (!valid.length) {
      return res.status(400).json({ success: false, error: 'No valid locations to report' });
    }

    const inserted = await db.batchInsertLocations(valid);
    res.json({ success: true, inserted });
  } catch (err) {
    console.error('[API] Location report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function normalizeLocation(loc, defaultDeviceId) {
  return {
    deviceId: loc.deviceId || defaultDeviceId,
    latitude: parseFloat(loc.latitude),
    longitude: parseFloat(loc.longitude),
    altitude: parseFloat(loc.altitude) || 0,
    accuracy: parseFloat(loc.accuracy) || 0,
    speed: parseFloat(loc.speed) || 0,
    bearing: parseFloat(loc.bearing) || 0,
    address: loc.address || loc.remark || '',
    reportedAt: loc.reportedAt || loc.timestamp || Date.now(),
  };
}

// ========================
// Trajectory Query
// ========================

/**
 * GET /api/trajectory?deviceId=xxx&hours=24
 * 
 * Time windows: 1, 6, 12, 24, 48, 168 (1 week), 720 (1 month)
 */

router.get('/trajectory', async (req, res) => {
  try {
    const { deviceId, hours } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const hoursNum = parseInt(hours, 10) || 24;

    // Combine live + archived data
    const live = await db.queryLocations(deviceId, hoursNum);
    const archives = await db.queryArchives(deviceId, hoursNum);

    // Merge and sort by time
    const combined = [
      ...live.map(r => ({ ...r, source: 'live', archived_at: null })),
      ...archives.map(r => ({ ...r, source: 'archive', archived_at: r.archived_at })),
    ].sort((a, b) => a.reported_at - b.reported_at);

    res.json({ success: true, data: combined, hours: hoursNum, total: combined.length });
  } catch (err) {
    console.error('[API] Trajectory query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// Archive Management
// ========================

// Trigger manual archive
router.post('/archive/run', async (req, res) => {
  try {
    const result = await db.archiveOldData(31);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get archive summary
router.get('/archive/summary', async (req, res) => {
  try {
    const summary = await db.getArchiveSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query archived data directly
router.get('/archive/query', async (req, res) => {
  try {
    const { deviceId, hours } = req.query;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    const result = await db.queryArchives(deviceId, parseInt(hours) || 720);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete old archives (cleanup)
router.delete('/archive/cleanup', (req, res) => {
  try {
    const { deviceId, beforeMs } = req.body;
    if (!deviceId || !beforeMs) {
      return res.status(400).json({ success: false, error: 'deviceId and beforeMs are required' });
    }
    const result = db.prepare('DELETE FROM location_archives WHERE device_id = ? AND reported_at < ?').run(deviceId, beforeMs);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// WebSocket-like realtime (optional SSE)
// ========================

let subscribers = [];

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const subscriber = { res, deviceId: req.query.deviceId };
  subscribers.push(subscriber);

  req.on('close', () => {
    subscribers = subscribers.filter(s => s !== subscriber);
  });
});

// Broadcast new locations
function broadcast(location) {
  const payload = JSON.stringify(`data: ${JSON.stringify(location)}\n\n`);
  subscribers.forEach(s => {
    try { s.res.write(payload); } catch (_) {}
  });
}

module.exports = { router, broadcast };
