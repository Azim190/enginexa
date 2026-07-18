const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions } = require('../middleware/auth');

// GET /api/audit-logs - Read and filter system-wide audit logs
router.get('/', authenticateSession, requirePermissions(['audit:read']), async (req, res) => {
    try {
        const { user_id, action, module, start_date, end_date, limit = 100, offset = 0 } = req.query;
        const db = await openDb();

        let query = `SELECT * FROM audit_logs WHERE 1=1`;
        const params = [];

        if (user_id) {
            query += ` AND user_id = ?`;
            params.push(user_id);
        }

        if (action) {
            query += ` AND action LIKE ?`;
            params.push(`%${action}%`);
        }

        if (module) {
            query += ` AND module = ?`;
            params.push(module);
        }

        if (start_date) {
            query += ` AND timestamp >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND timestamp <= ?`;
            params.push(end_date);
        }

        // Get total count for pagination
        const countRow = await db.get(`SELECT COUNT(*) AS total FROM (${query})`, params);
        const total = countRow ? countRow.total : 0;

        // Apply sorting and limit
        query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const logs = await db.all(query, params);

        res.json({
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            logs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
