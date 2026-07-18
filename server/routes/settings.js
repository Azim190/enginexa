const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions, logAction } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticateSession, requirePermissions(['settings:read', 'settings:write']), async (req, res) => {
    try {
        const db = await openDb();
        const rows = await db.all('SELECT * FROM global_settings');
        const settings = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                settings[row.key] = row.value; // Fallback to raw string
            }
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings
router.post('/', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const db = await openDb();
        const settings = req.body;

        for (const [key, val] of Object.entries(settings)) {
            const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
            await db.run(
                'INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)',
                [key, valStr]
            );
        }

        await logAction(req, 'UPDATE_SETTINGS', 'System Settings', `Updated settings: ${Object.keys(settings).join(', ')}`);

        // Fetch updated settings to return
        const rows = await db.all('SELECT * FROM global_settings');
        const updated = {};
        for (const row of rows) {
            try {
                updated[row.key] = JSON.parse(row.value);
            } catch (e) {
                updated[row.key] = row.value;
            }
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
