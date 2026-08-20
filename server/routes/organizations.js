const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateSession, requirePermissions, logAction } = require('../middleware/auth');

// GET /api/organizations/current - Get current organization profile
router.get('/current', authenticateSession, async (req, res) => {
    try {
        const db = await openDb();
        const orgId = req.user.organization_id;
        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Count users, projects, branches in this organization
        const userCount = (await db.get('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [orgId])).count;
        const projectCount = (await db.get('SELECT COUNT(*) as count FROM projects WHERE organization_id = ?', [orgId])).count;
        const branchCount = (await db.get('SELECT COUNT(*) as count FROM branches WHERE organization_id = ?', [orgId])).count;

        res.json({
            ...org,
            stats: {
                users: userCount,
                projects: projectCount,
                branches: branchCount
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/organizations/current - Update current organization branding/profile (Admin only)
router.put('/current', authenticateSession, requirePermissions(['settings:write']), async (req, res) => {
    try {
        const db = await openDb();
        const orgId = req.user.organization_id;
        const { name, logo_url, theme_color } = req.body;

        const currentOrg = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
        if (!currentOrg) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const newName = name ? name.trim() : currentOrg.name;
        const newLogo = logo_url !== undefined ? logo_url : currentOrg.logo_url;
        const newTheme = theme_color || currentOrg.theme_color;

        await db.run(
            `UPDATE organizations
             SET name = ?, logo_url = ?, theme_color = ?
             WHERE id = ?`,
            [newName, newLogo, newTheme, orgId]
        );

        const updatedOrg = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);

        await logAction(req, 'UPDATE_ORGANIZATION', 'Organization Management', `Updated organization profile: ${updatedOrg.name}`);

        res.json(updatedOrg);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
