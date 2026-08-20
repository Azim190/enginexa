const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions, logAction } = require('../middleware/auth');

// GET /api/correspondence - Fetch correspondence logs scoped by organization
router.get('/', authenticateSession, requirePermissions(['correspondence:read']), async (req, res) => {
    try {
        const { type, searchTerm } = req.query;
        const orgId = req.user.organization_id;
        const db = await openDb();

        let query = `SELECT * FROM correspondence WHERE organization_id = ?`;
        const params = [orgId];

        if (type) {
            query += ` AND type = ?`;
            params.push(type);
        }

        if (searchTerm) {
            query += ` AND (refNumber LIKE ? OR sender LIKE ? OR recipient LIKE ? OR dateSent LIKE ?)`;
            const likeTerm = `%${searchTerm}%`;
            params.push(likeTerm, likeTerm, likeTerm, likeTerm);
        }

        query += ` ORDER BY dateSent DESC, timeSent DESC`;
        const logs = await db.all(query, params);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/correspondence - Create new correspondence record in current organization
router.post('/', authenticateSession, requirePermissions(['correspondence:write']), async (req, res) => {
    try {
        const { type, sender, recipient, dateSent, timeSent, refNumber, subject, description, fileLink, remarks } = req.body;
        const orgId = req.user.organization_id;
        const db = await openDb();

        if (!type || !sender || !recipient || !dateSent || !timeSent || !subject) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate dynamic reference number if not provided
        let finalRefNumber = refNumber;
        if (!finalRefNumber) {
            const yearStr = new Date(dateSent).getFullYear() || new Date().getFullYear();
            const countResult = await db.get(`SELECT COUNT(*) AS cnt FROM correspondence WHERE organization_id = ? AND dateSent LIKE ?`, [orgId, `${yearStr}%`]);
            const seqNum = (countResult?.cnt || 0) + 1;
            finalRefNumber = `CORR-${yearStr}-${String(seqNum).padStart(4, '0')}`;
        }

        const createdAt = new Date().toISOString();

        const result = await db.run(`
            INSERT INTO correspondence (organization_id, type, sender, recipient, dateSent, timeSent, refNumber, subject, description, fileLink, remarks, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [orgId, type, sender, recipient, dateSent, timeSent, finalRefNumber, subject, description, fileLink, remarks, createdAt]);

        const newId = result.lastID;
        const newMail = await db.get(`SELECT * FROM correspondence WHERE id = ?`, [newId]);

        await logAction(req, `Created ${type} correspondence: ${finalRefNumber}`, 'Correspondence', `Subject: ${subject}`);

        res.status(201).json(newMail);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
