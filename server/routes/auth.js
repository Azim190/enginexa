const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { openDb } = require('../db');
const { authenticateSession, logAction } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { name, idNumber } = req.body;
        if (!name || !idNumber) {
            return res.status(400).json({ error: 'Name and ID number are required' });
        }

        const db = await openDb();
        const user = await db.get(
            `SELECT u.*, b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                    d.name_en AS dept_name_en, d.name_ar AS dept_name_ar
             FROM users u
             LEFT JOIN branches b ON u.branch_id = b.id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(?)) AND u.id_number = ?`,
            [name, idNumber]
        );

        if (!user) {
            // Failed login attempts should be logged as anonymous audit events for security
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            await db.run(`
                INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                VALUES (NULL, ?, 'LOGIN_FAILED', 'Identity & Auth', ?, ?, ?, ?)
            `, [name, `Failed login attempt for ID: ${idNumber}`, ip, userAgent, new Date().toISOString()]);

            return res.status(401).json({ error: 'Invalid name or ID number' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Your account is currently inactive or suspended' });
        }

        // Generate a random secure session ID
        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = new Date().toISOString();

        // Create session
        await db.run(
            `INSERT INTO sessions (id, user_id, ip_address, user_agent, last_active, mfa_verified)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [sessionId, user.id, req.headers['x-forwarded-for'] || req.socket.remoteAddress || '', req.headers['user-agent'] || '', now]
        );

        // Fetch user permissions
        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [user.role]);
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : [];

        // Log successful login (audit log)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        await db.run(`
            INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, 'LOGIN_SUCCESS', 'Identity & Auth', ?, ?, ?, ?)
        `, [user.id, user.name, `Successfully logged in. MFA Required: ${user.mfa_enabled === 1}`, ip, userAgent, now]);

        // If user has MFA enabled, notify frontend that verification is needed
        if (user.mfa_enabled === 1) {
            return res.json({
                mfaRequired: true,
                sessionId,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    branch_id: user.branch_id,
                    department_id: user.department_id,
                }
            });
        }

        // Otherwise, mark session as verified (no MFA needed)
        await db.run('UPDATE sessions SET mfa_verified = 1 WHERE id = ?', [sessionId]);

        res.json({
            sessionId,
            user: {
                id: user.id,
                name: user.name,
                id_number: user.id_number,
                role: user.role,
                branch_id: user.branch_id,
                department_id: user.department_id,
                branch_name_en: user.branch_name_en,
                branch_name_ar: user.branch_name_ar,
                dept_name_en: user.dept_name_en,
                dept_name_ar: user.dept_name_ar,
                mfa_enabled: false,
                section: user.department_id ? user.department_id.split('-').pop() : undefined
            },
            permissions
        });
    } catch (error) {
        console.error('Login Route Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/auth/mfa-verify
router.post('/mfa-verify', async (req, res) => {
    try {
        const { sessionId, pin } = req.body;
        if (!sessionId || !pin) {
            return res.status(400).json({ error: 'Session ID and PIN are required' });
        }

        const db = await openDb();

        // Find session and user
        const sessionUser = await db.get(`
            SELECT s.id AS sessionId, u.id, u.name, u.role, u.id_number, u.mfa_pin, u.branch_id, u.department_id,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE s.id = ?
        `, [sessionId]);

        if (!sessionUser) {
            return res.status(401).json({ error: 'Invalid session context for MFA' });
        }

        if (sessionUser.mfa_pin !== pin) {
            // Log failed MFA
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            await db.run(`
                INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                VALUES (?, ?, 'MFA_FAILED', 'Identity & Auth', 'Failed MFA PIN entry', ?, ?, ?)
            `, [sessionUser.id, sessionUser.name, ip, userAgent, new Date().toISOString()]);

            return res.status(401).json({ error: 'Invalid MFA verification code' });
        }

        // Update session to verified
        await db.run('UPDATE sessions SET mfa_verified = 1 WHERE id = ?', [sessionId]);

        // Get permissions
        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [sessionUser.role]);
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : [];

        // Log successful MFA (audit log)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        await db.run(`
            INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, 'MFA_SUCCESS', 'Identity & Auth', 'Successfully passed MFA check', ?, ?, ?)
        `, [sessionUser.id, sessionUser.name, ip, userAgent, new Date().toISOString()]);

        res.json({
            sessionId,
            user: {
                id: sessionUser.id,
                name: sessionUser.name,
                id_number: sessionUser.id_number,
                role: sessionUser.role,
                branch_id: sessionUser.branch_id,
                department_id: sessionUser.department_id,
                branch_name_en: sessionUser.branch_name_en,
                branch_name_ar: sessionUser.branch_name_ar,
                dept_name_en: sessionUser.dept_name_en,
                dept_name_ar: sessionUser.dept_name_ar,
                mfa_enabled: true,
                section: sessionUser.department_id ? sessionUser.department_id.split('-').pop() : undefined
            },
            permissions
        });
    } catch (error) {
        console.error('MFA Route Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const sessionId = authHeader.split(' ')[1];
            const db = await openDb();

            // Find user details for logging before deleting
            const session = await db.get('SELECT user_id FROM sessions WHERE id = ?', [sessionId]);
            if (session) {
                const user = await db.get('SELECT id, name FROM users WHERE id = ?', [session.user_id]);
                if (user) {
                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
                    const userAgent = req.headers['user-agent'] || '';
                    await db.run(`
                        INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                        VALUES (?, ?, 'LOGOUT', 'Identity & Auth', 'User logged out', ?, ?, ?)
                    `, [user.id, user.name, ip, userAgent, new Date().toISOString()]);
                }
            }

            await db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout Route Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/auth/session
router.get('/session', authenticateSession, async (req, res) => {
    try {
        const db = await openDb();
        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [req.user.role]);
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : [];

        res.json({
            user: req.user,
            permissions
        });
    } catch (error) {
        console.error('Get Session Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
