const { openDb } = require('../db');

// Middleware to authenticate user sessions
async function authenticateSession(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const sessionId = authHeader.split(' ')[1];
        const db = await openDb();

        // Join session with user and their branch/department
        const sessionUser = await db.get(`
            SELECT s.id AS sessionId, s.mfa_verified, s.last_active, 
                   u.id, u.name, u.id_number, u.role, u.branch_id, u.department_id, u.mfa_enabled, u.status,
                   b.name_en AS branch_name_en, b.name_ar AS branch_name_ar,
                   d.name_en AS dept_name_en, d.name_ar AS dept_name_ar
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE s.id = ?
        `, [sessionId]);

        if (!sessionUser) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        if (sessionUser.status !== 'active') {
            return res.status(403).json({ error: 'User account is inactive or suspended' });
        }

        // Check if session has timed out (e.g. 2 hours inactivity)
        const lastActiveTime = new Date(sessionUser.last_active).getTime();
        const currentTime = new Date().getTime();
        const twoHours = 2 * 60 * 60 * 1000;

        if (currentTime - lastActiveTime > twoHours) {
            await db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
            return res.status(401).json({ error: 'Session expired due to inactivity' });
        }

        // If user has MFA enabled but session is not MFA verified
        if (sessionUser.mfa_enabled === 1 && sessionUser.mfa_verified === 0) {
            // Only allow hitting the MFA verification API itself
            if (req.path !== '/api/auth/mfa-verify' && req.path !== '/api/auth/logout') {
                return res.status(403).json({ error: 'MFA verification required', mfaRequired: true, sessionId });
            }
        }

        // Update session last active time
        const now = new Date().toISOString();
        await db.run('UPDATE sessions SET last_active = ? WHERE id = ?', [now, sessionId]);

        // Attach user info to request
        req.user = {
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
            mfa_enabled: sessionUser.mfa_enabled === 1,
            section: sessionUser.department_id ? sessionUser.department_id.split('-').pop() : undefined
        };
        req.sessionId = sessionId;
        req.mfaVerified = sessionUser.mfa_verified === 1;

        next();
    } catch (error) {
        console.error('Session Authentication Error:', error);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
}

// Middleware to enforce RBAC permissions
function requirePermissions(requiredPerms) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
            }

            const { role } = req.user;
            const db = await openDb();

            const roleRow = await db.get('SELECT permissions_json FROM role_permissions WHERE role = ?', [role]);
            if (!roleRow) {
                return res.status(403).json({ error: 'Forbidden: Role permissions not configured' });
            }

            const permissions = JSON.parse(roleRow.permissions_json);

            // Admin bypass ('*')
            if (permissions.includes('*')) {
                return next();
            }

            // Verify if user role has at least one of the required permissions
            const hasPermission = requiredPerms.some(p => permissions.includes(p));
            if (!hasPermission) {
                return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
            }

            next();
        } catch (error) {
            console.error('RBAC Authorization Error:', error);
            res.status(500).json({ error: 'Internal Server Error during authorization' });
        }
    };
}

// Centralized Audit Logging Helper
async function logAction(req, action, module, details = '') {
    try {
        const db = await openDb();
        const userId = req.user?.id || null;
        const userName = req.user?.name || 'Anonymous';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const timestamp = new Date().toISOString();

        await db.run(`
            INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address, user_agent, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, userName, action, module, details, ip, userAgent, timestamp]);
    } catch (error) {
        console.error('Audit Logging Failed:', error);
    }
}

module.exports = {
    authenticateSession,
    requirePermissions,
    logAction
};
