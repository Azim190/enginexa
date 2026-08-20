const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { openDb, bootstrapOrganization } = require('../db');
const { authenticateSession, logAction } = require('../middleware/auth');

// POST /api/auth/register-org - Self-service organization signup
router.post('/register-org', async (req, res) => {
    try {
        const { orgName, orgSlug, adminName, idNumber, password, themeColor } = req.body;

        if (!orgName || !orgSlug || !adminName || !idNumber) {
            return res.status(400).json({ error: 'Organization name, organization code, admin name, and ID number are required' });
        }

        const cleanSlug = orgSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanSlug) {
            return res.status(400).json({ error: 'Invalid organization code. Use letters, numbers, or hyphens.' });
        }

        const db = await openDb();

        // Check if slug is already taken
        const existingOrg = await db.get('SELECT id FROM organizations WHERE slug = ?', [cleanSlug]);
        if (existingOrg) {
            return res.status(409).json({ error: 'An organization with this code already exists. Please choose a different code.' });
        }

        const { organization, adminUser } = await bootstrapOrganization(db, {
            name: orgName,
            slug: cleanSlug,
            adminName,
            idNumber,
            password: password || idNumber,
            themeColor: themeColor || '#0B3D4E',
            logoUrl: '/logo.png'
        });

        // Create initial session for the admin
        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO sessions (id, user_id, ip_address, user_agent, last_active, mfa_verified)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [sessionId, adminUser.id, req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '', req.headers['user-agent'] || '', now]
        );

        // Fetch permissions for Admin
        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = "Admin"');
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : ['*'];

        // Audit log
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        await db.run(`
            INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, 'ORG_REGISTERED', 'Identity & Auth', ?, ?, ?, ?)
        `, [organization.id, adminUser.id, adminUser.name, `New organization registered: ${organization.name} (${organization.slug})`, ip, userAgent, now]);

        res.status(201).json({
            sessionId,
            user: {
                id: adminUser.id,
                organization_id: organization.id,
                name: adminUser.name,
                id_number: adminUser.id_number,
                role: adminUser.role,
                branch_id: adminUser.branch_id,
                department_id: adminUser.department_id,
                branch_name_en: 'Head Office',
                branch_name_ar: 'المقر الرئيسي',
                dept_name_en: 'Executive Office',
                dept_name_ar: 'المكتب التنفيذي',
                mfa_enabled: false,
                section: 'executive'
            },
            organization: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                logo_url: organization.logo_url,
                theme_color: organization.theme_color,
                plan: organization.plan
            },
            permissions
        });
    } catch (error) {
        console.error('Organization Registration Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error during registration' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { name, idNumber, orgSlug } = req.body;
        if (!name || !idNumber) {
            return res.status(400).json({ error: 'Name and ID number are required' });
        }

        const db = await openDb();
        let targetOrgId = null;

        if (orgSlug && orgSlug.trim()) {
            const cleanSlug = orgSlug.trim().toLowerCase();
            const org = await db.get('SELECT id FROM organizations WHERE slug = ?', [cleanSlug]);
            if (!org) {
                return res.status(404).json({ error: `Organization with code '${orgSlug}' was not found` });
            }
            targetOrgId = org.id;
        }

        let userQuery = `
            SELECT u.*, 
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar,
                   o.name AS org_name, o.slug AS org_slug, o.logo_url AS org_logo_url, o.theme_color AS org_theme_color, o.plan AS org_plan, o.status AS org_status
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(?)) AND u.id_number = ?
        `;
        const queryParams = [name, idNumber];

        if (targetOrgId) {
            userQuery += ' AND u.organization_id = ?';
            queryParams.push(targetOrgId);
        }

        const user = await db.get(userQuery, queryParams);

        if (!user) {
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            await db.run(`
                INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                VALUES (?, NULL, ?, 'LOGIN_FAILED', 'Identity & Auth', ?, ?, ?, ?)
            `, [targetOrgId || 'org_default', name, `Failed login attempt for ID: ${idNumber}`, ip, userAgent, new Date().toISOString()]);

            return res.status(401).json({ error: 'Invalid name, ID number, or organization code' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Your account is currently inactive or suspended' });
        }

        if (user.org_status && user.org_status !== 'active') {
            return res.status(403).json({ error: 'Your organization account is currently inactive or suspended' });
        }

        const sessionId = crypto.randomBytes(32).toString('hex');
        const now = new Date().toISOString();

        await db.run(
            `INSERT INTO sessions (id, user_id, ip_address, user_agent, last_active, mfa_verified)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [sessionId, user.id, req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '', req.headers['user-agent'] || '', now]
        );

        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [user.role]);
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : [];

        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        await db.run(`
            INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, 'LOGIN_SUCCESS', 'Identity & Auth', ?, ?, ?, ?)
        `, [user.organization_id, user.id, user.name, `Successfully logged in. MFA Required: ${user.mfa_enabled === 1}`, ip, userAgent, now]);

        const organizationData = {
            id: user.organization_id || 'org_default',
            name: user.org_name || 'EngiNexa',
            slug: user.org_slug || 'default',
            logo_url: user.org_logo_url || '/logo.png',
            theme_color: user.org_theme_color || '#0B3D4E',
            plan: user.org_plan || 'enterprise'
        };

        if (user.mfa_enabled === 1) {
            return res.json({
                mfaRequired: true,
                sessionId,
                user: {
                    id: user.id,
                    organization_id: user.organization_id,
                    name: user.name,
                    role: user.role,
                    branch_id: user.branch_id,
                    department_id: user.department_id,
                },
                organization: organizationData
            });
        }

        await db.run('UPDATE sessions SET mfa_verified = 1 WHERE id = ?', [sessionId]);

        res.json({
            sessionId,
            user: {
                id: user.id,
                organization_id: user.organization_id,
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
            organization: organizationData,
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

        const sessionUser = await db.get(`
            SELECT s.id AS sessionId, u.id, u.organization_id, u.name, u.role, u.id_number, u.mfa_pin, u.branch_id, u.department_id,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar,
                   o.name AS org_name, o.slug AS org_slug, o.logo_url AS org_logo_url, o.theme_color AS org_theme_color, o.plan AS org_plan
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN organizations o ON u.organization_id = o.id
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE s.id = ?
        `, [sessionId]);

        if (!sessionUser) {
            return res.status(401).json({ error: 'Invalid session context for MFA' });
        }

        if (sessionUser.mfa_pin !== pin) {
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';
            await db.run(`
                INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                VALUES (?, ?, ?, 'MFA_FAILED', 'Identity & Auth', 'Failed MFA PIN entry', ?, ?, ?)
            `, [sessionUser.organization_id, sessionUser.id, sessionUser.name, ip, userAgent, new Date().toISOString()]);

            return res.status(401).json({ error: 'Invalid MFA verification code' });
        }

        await db.run('UPDATE sessions SET mfa_verified = 1 WHERE id = ?', [sessionId]);

        const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [sessionUser.role]);
        const permissions = roleRow ? JSON.parse(roleRow.permissions_json) : [];

        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        await db.run(`
            INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, 'MFA_SUCCESS', 'Identity & Auth', 'Successfully passed MFA check', ?, ?, ?)
        `, [sessionUser.organization_id, sessionUser.id, sessionUser.name, ip, userAgent, new Date().toISOString()]);

        res.json({
            sessionId,
            user: {
                id: sessionUser.id,
                organization_id: sessionUser.organization_id,
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
            organization: {
                id: sessionUser.organization_id || 'org_default',
                name: sessionUser.org_name || 'EngiNexa',
                slug: sessionUser.org_slug || 'default',
                logo_url: sessionUser.org_logo_url || '/logo.png',
                theme_color: sessionUser.org_theme_color || '#0B3D4E',
                plan: sessionUser.org_plan || 'enterprise'
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

            const session = await db.get('SELECT user_id FROM sessions WHERE id = ?', [sessionId]);
            if (session) {
                const user = await db.get('SELECT id, organization_id, name FROM users WHERE id = ?', [session.user_id]);
                if (user) {
                    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
                    const userAgent = req.headers['user-agent'] || '';
                    await db.run(`
                        INSERT INTO audit_logs (organization_id, user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
                        VALUES (?, ?, ?, 'LOGOUT', 'Identity & Auth', 'User logged out', ?, ?, ?)
                    `, [user.organization_id || 'org_default', user.id, user.name, ip, userAgent, new Date().toISOString()]);
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
            organization: req.organization,
            permissions
        });
    } catch (error) {
        console.error('Get Session Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
