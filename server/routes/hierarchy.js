const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions, logAction } = require('../middleware/auth');

// GET /api/hierarchy/branches
router.get('/branches', authenticateSession, async (req, res) => {
    try {
        const db = await openDb();
        const branches = await db.all('SELECT * FROM branches ORDER BY name_en ASC');
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hierarchy/branches
router.post('/branches', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id, name_en, name_ar, logo_url, theme_color, working_hours, holidays } = req.body;
        if (!id || !name_en || !name_ar) {
            return res.status(400).json({ error: 'Branch ID, English Name, and Arabic Name are required' });
        }

        const db = await openDb();

        // Check duplicate
        const existing = await db.get('SELECT id FROM branches WHERE id = ?', [id.toLowerCase().trim()]);
        if (existing) {
            return res.status(409).json({ error: 'A branch with this ID already exists' });
        }

        const branchId = id.toLowerCase().trim();
        await db.run(
            `INSERT INTO branches (id, name_en, name_ar, logo_url, theme_color, working_hours, holidays, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                branchId,
                name_en.trim(),
                name_ar.trim(),
                logo_url || null,
                theme_color || '#0B3D4E',
                working_hours || '08:00-16:00',
                holidays ? JSON.stringify(holidays) : null,
                new Date().toISOString()
            ]
        );

        const newBranch = await db.get('SELECT * FROM branches WHERE id = ?', [branchId]);
        await logAction(req, 'CREATE_BRANCH', 'Organization Hierarchy', `Created branch: ${name_en} (${branchId})`);

        res.status(201).json(newBranch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hierarchy/branches/:id
router.put('/branches/:id', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_ar, logo_url, theme_color, working_hours, holidays } = req.body;

        const db = await openDb();
        const branch = await db.get('SELECT * FROM branches WHERE id = ?', [id]);
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        await db.run(
            `UPDATE branches
             SET name_en = ?, name_ar = ?, logo_url = ?, theme_color = ?, working_hours = ?, holidays = ?
             WHERE id = ?`,
            [
                name_en ? name_en.trim() : branch.name_en,
                name_ar ? name_ar.trim() : branch.name_ar,
                logo_url !== undefined ? logo_url : branch.logo_url,
                theme_color || branch.theme_color,
                working_hours || branch.working_hours,
                holidays ? JSON.stringify(holidays) : branch.holidays,
                id
            ]
        );

        const updatedBranch = await db.get('SELECT * FROM branches WHERE id = ?', [id]);
        await logAction(req, 'UPDATE_BRANCH', 'Organization Hierarchy', `Updated branch details for: ${updatedBranch.name_en}`);

        res.json(updatedBranch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/hierarchy/branches/:id
router.delete('/branches/:id', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const db = await openDb();

        const branch = await db.get('SELECT * FROM branches WHERE id = ?', [id]);
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Check if users are assigned to this branch
        const userCount = await db.get('SELECT COUNT(*) AS cnt FROM users WHERE branch_id = ?', [id]);
        if (userCount && userCount.cnt > 0) {
            return res.status(400).json({ error: 'Cannot delete branch because employees are assigned to it' });
        }

        // Delete associated departments first
        await db.run('DELETE FROM departments WHERE branch_id = ?', [id]);
        await db.run('DELETE FROM branches WHERE id = ?', [id]);

        await logAction(req, 'DELETE_BRANCH', 'Organization Hierarchy', `Deleted branch: ${branch.name_en} (${id})`);

        res.json({ message: 'Branch and its departments deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/hierarchy/departments
router.get('/departments', authenticateSession, async (req, res) => {
    try {
        const { branch_id } = req.query;
        const db = await openDb();
        let departments;

        if (branch_id) {
            departments = await db.all('SELECT * FROM departments WHERE branch_id = ? ORDER BY name_en ASC', [branch_id]);
        } else {
            departments = await db.all('SELECT * FROM departments ORDER BY branch_id ASC, name_en ASC');
        }

        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/hierarchy/departments
router.post('/departments', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id, name_en, name_ar, branch_id } = req.body;
        if (!id || !name_en || !name_ar || !branch_id) {
            return res.status(400).json({ error: 'Department ID, English Name, Arabic Name, and Branch ID are required' });
        }

        const db = await openDb();

        // Check if branch exists
        const branch = await db.get('SELECT id FROM branches WHERE id = ?', [branch_id]);
        if (!branch) {
            return res.status(404).json({ error: 'Assigned branch does not exist' });
        }

        const deptId = `${branch_id}-${id.toLowerCase().trim()}`;

        // Check duplicate
        const existing = await db.get('SELECT id FROM departments WHERE id = ?', [deptId]);
        if (existing) {
            return res.status(409).json({ error: 'A department with this ID already exists for this branch' });
        }

        await db.run(
            `INSERT INTO departments (id, name_en, name_ar, branch_id, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [
                deptId,
                name_en.trim(),
                name_ar.trim(),
                branch_id,
                new Date().toISOString()
            ]
        );

        const newDept = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
        await logAction(req, 'CREATE_DEPARTMENT', 'Organization Hierarchy', `Created department: ${name_en} (${deptId}) in branch ${branch_id}`);

        res.status(201).json(newDept);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/hierarchy/departments/:id
router.put('/departments/:id', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_ar } = req.body;

        const db = await openDb();
        const dept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        if (!dept) {
            return res.status(404).json({ error: 'Department not found' });
        }

        await db.run(
            `UPDATE departments
             SET name_en = ?, name_ar = ?
             WHERE id = ?`,
            [
                name_en ? name_en.trim() : dept.name_en,
                name_ar ? name_ar.trim() : dept.name_ar,
                id
            ]
        );

        const updatedDept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        await logAction(req, 'UPDATE_DEPARTMENT', 'Organization Hierarchy', `Updated department details for: ${updatedDept.name_en}`);

        res.json(updatedDept);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/hierarchy/departments/:id
router.delete('/departments/:id', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const db = await openDb();

        const dept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        if (!dept) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check if users are assigned to this department
        const userCount = await db.get('SELECT COUNT(*) AS cnt FROM users WHERE department_id = ?', [id]);
        if (userCount && userCount.cnt > 0) {
            return res.status(400).json({ error: 'Cannot delete department because employees are assigned to it' });
        }

        await db.run('DELETE FROM departments WHERE id = ?', [id]);
        await logAction(req, 'DELETE_DEPARTMENT', 'Organization Hierarchy', `Deleted department: ${dept.name_en} (${id})`);

        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
