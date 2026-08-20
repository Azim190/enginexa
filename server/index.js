const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let db;

initDb().then(database => {
    db = database;
    console.log('Database initialized successfully with multi-tenant schemas');
}).catch(err => {
    console.error('Failed to initialize database', err);
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Import authentication middleware
const { authenticateSession, requirePermissions, logAction } = require('./middleware/auth');

// Import routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const hierarchyRouter = require('./routes/hierarchy');
const auditRouter = require('./routes/audit');
const settingsRouter = require('./routes/settings');
const correspondenceRouter = require('./routes/correspondence');
const organizationsRouter = require('./routes/organizations');

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/hierarchy', hierarchyRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/correspondence', correspondenceRouter);
app.use('/api/organizations', organizationsRouter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Robust fallback route handler for serving files with potential encoding/mangling mismatches
app.get(['/uploads/:projectName/:type/:filename', '/api/uploads/:projectName/:type/:filename'], (req, res, next) => {
    const { projectName, type, filename } = req.params;
    
    // 1. Try direct path lookup
    const directPath = path.join(__dirname, 'uploads', projectName, type, filename);
    if (fs.existsSync(directPath)) {
        return res.sendFile(directPath);
    }
    
    // 2. Try decoding path parameters
    try {
        const decodedProject = decodeURIComponent(projectName);
        const decodedFile = decodeURIComponent(filename);
        const decodedPath = path.join(__dirname, 'uploads', decodedProject, type, decodedFile);
        if (fs.existsSync(decodedPath)) {
            return res.sendFile(decodedPath);
        }
    } catch (e) {
        // Ignore decode error
    }

    // 3. Perform a directory scan to find loose/mangled matches
    try {
        const projectFolders = [projectName];
        try {
            projectFolders.push(decodeURIComponent(projectName));
        } catch(e) {}
        
        for (const pName of projectFolders) {
            const dirPath = path.join(__dirname, 'uploads', pName, type);
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                
                const matchedFile = files.find(f => {
                    if (f === filename) return true;
                    try {
                        if (decodeURIComponent(f) === decodeURIComponent(filename)) return true;
                        if (encodeURIComponent(f) === encodeURIComponent(filename)) return true;
                    } catch (e) {}
                    const normF = f.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const normFilename = filename.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    return normF === normFilename;
                });
                
                if (matchedFile) {
                    return res.sendFile(path.join(dirPath, matchedFile));
                }
            }
        }
    } catch (e) {
        // Fallback
    }
    
    next();
});

// Endpoint to stream/download files directly bypassing static webserver proxy rules
app.get('/api/projects/download-file', (req, res) => {
    const filePathParam = req.query.path;
    if (!filePathParam) {
        return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    let decodedPath = '';
    try {
        decodedPath = decodeURIComponent(filePathParam);
    } catch (e) {
        decodedPath = filePathParam;
    }
    
    // Normalize path to prevent directory traversal
    const normalized = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    let absolutePath = '';
    if (normalized.includes('uploads')) {
        const relativePart = normalized.substring(normalized.indexOf('uploads'));
        absolutePath = path.join(__dirname, relativePart);
    } else {
        absolutePath = path.join(__dirname, 'uploads', normalized);
    }
    
    if (fs.existsSync(absolutePath)) {
        return res.download(absolutePath, path.basename(absolutePath));
    }
    
    try {
        const parts = normalized.split(/[\\/]/).filter(Boolean);
        if (parts.length >= 3) {
            const filename = parts[parts.length - 1];
            const type = parts[parts.length - 2];
            const projectName = parts[parts.length - 3];
            
            const dirPath = path.join(__dirname, 'uploads', projectName, type);
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                const matchedFile = files.find(f => {
                    if (f === filename) return true;
                    try {
                        if (decodeURIComponent(f) === decodeURIComponent(filename)) return true;
                        if (encodeURIComponent(f) === encodeURIComponent(filename)) return true;
                    } catch(e) {}
                    const normF = f.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const normFilename = filename.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    return normF === normFilename;
                });
                
                if (matchedFile) {
                    return res.download(path.join(dirPath, matchedFile), matchedFile);
                }
            }
        }
    } catch (e) {
        // Fallback
    }
    
    let debugInfo = {
        error: 'File not found',
        requestedPath: filePathParam,
        normalizedPath: normalized,
        resolvedAbsolutePath: absolutePath,
        resolvedDirName: __dirname,
        existsResolved: fs.existsSync(absolutePath)
    };
    
    res.status(404).json(debugInfo);
});

const multer = require('multer');
const { uploadToOneDrive } = require('./oneDrive');

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { projectName = 'General', type = 'files' } = req.body;
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF\s]/g, '').trim() || 'General';
        const projectDir = path.join(__dirname, 'uploads', safeProjectName, type);
        
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
        cb(null, projectDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, `${base}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage });

// POST upload files
app.post('/api/projects/upload', authenticateSession, upload.array('files'), async (req, res) => {
    try {
        const { projectName = 'General', type = 'files' } = req.body;
        const uploadedFiles = [];
        for (const file of req.files) {
            const driveFile = await uploadToOneDrive(projectName, type, file);
            uploadedFiles.push({
                name: driveFile.name,
                url: driveFile.url,
                size: file.size
            });
        }
        res.json({ success: true, files: uploadedFiles });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── Reference Number Generator (Scoped per Tenant) ─────────────────────────

async function generateRefNumber(db, client, year, excludeId = null, organizationId = 'org_default', orgSlug = 'EN') {
    // 1. Determine client number within this organization
    const uniqueClients = await db.all(`
        SELECT LOWER(TRIM(client)) AS clientKey, MIN(createdAt) AS firstSeen
        FROM projects
        WHERE organization_id = ?
        GROUP BY LOWER(TRIM(client))
        ORDER BY firstSeen ASC
    `, [organizationId]);

    const clientKey = (client || '').toLowerCase().trim();
    const existingIdx = uniqueClients.findIndex(r => r.clientKey === clientKey);
    const clientNum = existingIdx >= 0 ? existingIdx + 1 : uniqueClients.length + 1;

    // 2. Determine year suffix
    const yearStr = String(year || new Date().getFullYear());
    const yearSuffix = yearStr.slice(-3).padStart(3, '0');

    // 3. Count all projects within this organization for the same year
    let countQuery = `SELECT COUNT(*) AS cnt FROM projects WHERE organization_id = ? AND year = ?`;
    const countParams = [organizationId, yearStr];
    if (excludeId) {
        countQuery += ` AND id != ?`;
        countParams.push(excludeId);
    }
    const countResult = await db.get(countQuery, countParams);
    const projectNum = (countResult?.cnt || 0) + 1;

    const prefix = (orgSlug && orgSlug !== 'default' ? orgSlug.substring(0, 4) : 'EN').toUpperCase();

    return [
        prefix,
        `C${String(clientNum).padStart(3, '0')}`,
        yearSuffix,
        String(projectNum).padStart(3, '0'),
    ].join('-');
}

// GET all projects (scoped by organization)
app.get('/api/projects', authenticateSession, requirePermissions(['projects:read']), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        let projects;

        if (req.user.role === 'Admin' || req.user.role === 'CEO') {
            projects = await db.all('SELECT * FROM projects WHERE organization_id = ? ORDER BY createdAt DESC', [orgId]);
        } else if (req.user.role === 'Branch Manager') {
            projects = await db.all('SELECT * FROM projects WHERE organization_id = ? ORDER BY createdAt DESC', [orgId]);
        } else {
            const discipline = req.user.role === 'Department Head' || req.user.role === 'Engineer'
                ? req.user.department_id?.split('-').pop()
                : null;

            if (discipline) {
                projects = await db.all('SELECT * FROM projects WHERE organization_id = ? AND LOWER(type) = ? ORDER BY createdAt DESC', [orgId, discipline]);
            } else {
                projects = await db.all('SELECT * FROM projects WHERE organization_id = ? ORDER BY createdAt DESC', [orgId]);
            }
        }
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET preview next reference number (scoped by organization)
app.get('/api/projects/next-ref', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { client = '', year = String(new Date().getFullYear()), excludeId } = req.query;
        const orgId = req.user.organization_id;
        const orgSlug = req.organization?.slug || 'EN';
        const refNumber = await generateRefNumber(db, client, year, excludeId || null, orgId, orgSlug);
        res.json({ refNumber });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create project (scoped to current organization)
app.post('/api/projects', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink, createdAt } = req.body;
        const orgId = req.user.organization_id;
        const orgSlug = req.organization?.slug || 'EN';
        const id = req.body.id || Math.random().toString(36).substr(2, 9);
        const projectStatus = status || 'active';
        const projectProgress = progress !== undefined ? parseInt(progress) : 0;

        const finalRef = refNumber && refNumber.trim()
            ? refNumber.trim()
            : await generateRefNumber(db, client, year, null, orgId, orgSlug);

        await db.run(
            `INSERT INTO projects (id, organization_id, name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, orgId, name, client, clientPhone, location, year, type, projectStatus, finalRef, projectProgress, oneDriveLink, imageUrl, monthlyReportLink, createdAt || new Date().toISOString()]
        );

        const newProject = await db.get('SELECT * FROM projects WHERE id = ?', id);

        await logAction(req, 'CREATE_PROJECT', 'Projects Module', `Created project: ${name} (Ref: ${finalRef})`);

        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update project (scoped to current organization)
app.put('/api/projects/:id', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const orgSlug = req.organization?.slug || 'EN';
        const { name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink } = req.body;

        const project = await db.get('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [id, orgId]);
        if (!project) {
            return res.status(404).json({ error: 'Project not found in your organization' });
        }

        const finalRef = refNumber && refNumber.trim()
            ? refNumber.trim()
            : (project.refNumber || await generateRefNumber(db, client, year, id, orgId, orgSlug));

        const finalProgress = progress !== undefined ? parseInt(progress) : (project.progress || 0);

        await db.run(
            `UPDATE projects
             SET name = ?, client = ?, clientPhone = ?, location = ?, year = ?, type = ?, status = ?, refNumber = ?, progress = ?, oneDriveLink = ?, imageUrl = ?, monthlyReportLink = ?
             WHERE id = ? AND organization_id = ?`,
            [
                name || project.name,
                client || project.client,
                clientPhone || project.clientPhone,
                location || project.location,
                year || project.year,
                type || project.type,
                status || project.status || 'active',
                finalRef,
                finalProgress,
                oneDriveLink || project.oneDriveLink,
                imageUrl || project.imageUrl,
                monthlyReportLink !== undefined ? monthlyReportLink : project.monthlyReportLink,
                id,
                orgId
            ]
        );

        const updatedProject = await db.get('SELECT * FROM projects WHERE id = ?', id);

        await logAction(req, 'UPDATE_PROJECT', 'Projects Module', `Updated project: ${updatedProject.name} (Ref: ${finalRef})`);

        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE project (scoped to current organization)
app.delete('/api/projects/:id', authenticateSession, requirePermissions(['projects:delete']), async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const project = await db.get('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [id, orgId]);
        if (!project) {
            return res.status(404).json({ error: 'Project not found in your organization' });
        }

        await db.run('DELETE FROM projects WHERE id = ? AND organization_id = ?', [id, orgId]);

        await logAction(req, 'DELETE_PROJECT', 'Projects Module', `Deleted project: ${project.name} (Ref: ${project.refNumber})`);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check status
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), version: '2.0-MultiTenant' });
});

// Fallback for React Router (Single Page Application support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`EngiNexa Multi-Tenant Server running on port ${PORT}`);
});
