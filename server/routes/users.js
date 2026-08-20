const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions, logAction } = require('../middleware/auth');

// GET /api/users - Read employee profiles with branch/dept/reporting line within the user's organization
router.get('/', authenticateSession, requirePermissions(['users:read']), async (req, res) => {
    try {
        const db = await openDb();
        const orgId = req.user.organization_id;

        const users = await db.all(`
            SELECT u.id, u.organization_id, u.name, u.id_number, u.role, u.branch_id, u.department_id, u.reporting_line_id, u.mfa_enabled, u.status, u.mfa_pin, u.createdAt,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar,
                   mgr.name AS reporting_line_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users mgr ON u.reporting_line_id = mgr.id
            WHERE u.organization_id = ?
            ORDER BY u.role ASC, u.name ASC
        `, [orgId]);

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Create a new user/employee in the organization
router.post('/', authenticateSession, requirePermissions(['users:write']), async (req, res) => {
    try {
        const { name, id_number, role, branch_id, department_id, reporting_line_id, mfa_enabled, mfa_pin, status } = req.body;
        const orgId = req.user.organization_id;

        if (!name || !id_number || !role) {
            return res.status(400).json({ error: 'Name, ID number, and role are required' });
        }

        const db = await openDb();

        // Check for duplicate ID number within the same organization
        const duplicate = await db.get('SELECT id FROM users WHERE id_number = ? AND organization_id = ?', [id_number.trim(), orgId]);
        if (duplicate) {
            return res.status(409).json({ error: 'A user with this ID number already exists in your organization' });
        }

        const mfaVal = mfa_enabled ? 1 : 0;
        const defaultPin = mfa_pin ? mfa_pin.trim() : '123456';
        const userStatus = status || 'active';

        const result = await db.run(
            `INSERT INTO users (organization_id, name, id_number, password_hash, role, branch_id, department_id, reporting_line_id, mfa_enabled, mfa_pin, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orgId,
                name.trim(),
                id_number.trim(),
                id_number.trim(), // Default password is ID number
                role,
                branch_id || null,
                department_id || null,
                reporting_line_id || null,
                mfaVal,
                defaultPin,
                userStatus,
                new Date().toISOString()
            ]
        );

        const newUser = await db.get(`
            SELECT u.id, u.organization_id, u.name, u.id_number, u.role, u.branch_id, u.department_id, u.reporting_line_id, u.mfa_enabled, u.status, u.mfa_pin, u.createdAt,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar,
                   mgr.name AS reporting_line_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users mgr ON u.reporting_line_id = mgr.id
            WHERE u.id = ?
        `, [result.lastID]);

        await logAction(req, 'CREATE_USER', 'Identity & Auth', `Created user: ${name} (Role: ${role}, ID: ${id_number})`);

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id - Update user details
router.put('/:id', authenticateSession, requirePermissions(['users:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, id_number, role, branch_id, department_id, reporting_line_id, mfa_enabled, mfa_pin, status } = req.body;
        const orgId = req.user.organization_id;

        const db = await openDb();
        const user = await db.get('SELECT * FROM users WHERE id = ? AND organization_id = ?', [id, orgId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found in your organization' });
        }

        // Check for duplicate ID number within organization excluding current user
        if (id_number) {
            const duplicate = await db.get('SELECT id FROM users WHERE id_number = ? AND id != ? AND organization_id = ?', [id_number.trim(), id, orgId]);
            if (duplicate) {
                return res.status(409).json({ error: 'Another user with this ID number already exists in your organization' });
            }
        }

        const mfaVal = mfa_enabled !== undefined ? (mfa_enabled ? 1 : 0) : user.mfa_enabled;
        const finalPin = mfa_pin ? mfa_pin.trim() : user.mfa_pin;
        const finalStatus = status || user.status;

        // Prevent admin/CEO from disabling their own account or removing administrative privileges
        const targetRole = role || user.role;
        const isAdminOrCeo = targetRole === 'Admin' || targetRole === 'CEO';
        if (parseInt(id) === req.user.id && (finalStatus !== 'active' || !isAdminOrCeo)) {
            return res.status(400).json({ error: 'Cannot disable your own account or remove your administrative privileges' });
        }

        await db.run(
            `UPDATE users
             SET name = ?, id_number = ?, role = ?, branch_id = ?, department_id = ?, reporting_line_id = ?, mfa_enabled = ?, mfa_pin = ?, status = ?
             WHERE id = ? AND organization_id = ?`,
            [
                name ? name.trim() : user.name,
                id_number ? id_number.trim() : user.id_number,
                role || user.role,
                branch_id || null,
                department_id || null,
                reporting_line_id || null,
                mfaVal,
                finalPin,
                finalStatus,
                id,
                orgId
            ]
        );

        const updatedUser = await db.get(`
            SELECT u.id, u.organization_id, u.name, u.id_number, u.role, u.branch_id, u.department_id, u.reporting_line_id, u.mfa_enabled, u.status, u.mfa_pin, u.createdAt,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar,
                   mgr.name AS reporting_line_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users mgr ON u.reporting_line_id = mgr.id
            WHERE u.id = ?
        `, [id]);

        await logAction(req, 'UPDATE_USER', 'Identity & Auth', `Updated user details for: ${updatedUser.name} (Role: ${updatedUser.role}, Status: ${updatedUser.status})`);

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id - Delete employee profile
router.delete('/:id', authenticateSession, requirePermissions(['users:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own session user account' });
        }

        const db = await openDb();
        const user = await db.get('SELECT * FROM users WHERE id = ? AND organization_id = ?', [id, orgId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found in your organization' });
        }

        // Check if there are other users reporting to this user
        const reports = await db.get('SELECT id FROM users WHERE reporting_line_id = ? AND organization_id = ?', [id, orgId]);
        if (reports) {
            return res.status(400).json({ error: 'Cannot delete user because other employees report to them' });
        }

        await db.run('DELETE FROM users WHERE id = ? AND organization_id = ?', [id, orgId]);
        await db.run('DELETE FROM sessions WHERE user_id = ?', [id]);

        await logAction(req, 'DELETE_USER', 'Identity & Auth', `Deleted user account: ${user.name} (ID: ${user.id_number})`);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
