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
    console.log('Database initialized successfully with new schemas');
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
// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/hierarchy', hierarchyRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/correspondence', correspondenceRouter);

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

    // 3. Perform a directory scan to find loose/mangled matches (essential for Hostinger UTF-8 vs ISO-8859-1 mismatches)
    try {
        const projectFolders = [projectName];
        try {
            projectFolders.push(decodeURIComponent(projectName));
        } catch(e) {}
        
        for (const pName of projectFolders) {
            const dirPath = path.join(__dirname, 'uploads', pName, type);
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                
                // Search for matching file with loose filename criteria
                const matchedFile = files.find(f => {
                    if (f === filename) return true;
                    try {
                        if (decodeURIComponent(f) === decodeURIComponent(filename)) return true;
                        if (encodeURIComponent(f) === encodeURIComponent(filename)) return true;
                    } catch (e) {}
                    // Compare raw strings ignoring non-alphanumeric/mangled differences
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
    
    // Try loose/mangled matching fallback
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
        // Ignore fallback error
    }
    
    // Detailed debug response to inspect folder layout on Hostinger
    let debugInfo = {
        error: 'File not found',
        requestedPath: filePathParam,
        normalizedPath: normalized,
        resolvedAbsolutePath: absolutePath,
        resolvedDirName: __dirname,
        existsResolved: fs.existsSync(absolutePath)
    };
    
    try {
        const parts = normalized.split(/[\\/]/).filter(Boolean);
        if (parts.length >= 3) {
            const projectName = parts[parts.length - 3];
            const type = parts[parts.length - 2];
            
            const parentDir = path.join(__dirname, 'uploads');
            debugInfo.parentDirExists = fs.existsSync(parentDir);
            if (debugInfo.parentDirExists) {
                debugInfo.parentDirContents = fs.readdirSync(parentDir);
            }
            
            const projectDir = path.join(__dirname, 'uploads', projectName);
            debugInfo.projectDirExists = fs.existsSync(projectDir);
            if (debugInfo.projectDirExists) {
                debugInfo.projectDirContents = fs.readdirSync(projectDir);
            }
            
            const dirPath = path.join(__dirname, 'uploads', projectName, type);
            debugInfo.dirPathExists = fs.existsSync(dirPath);
            if (debugInfo.dirPathExists) {
                debugInfo.dirPathContents = fs.readdirSync(dirPath);
            }
        }
    } catch(err) {
        debugInfo.debugError = err.message;
    }
    
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
        // Clean projectName for folder name
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

// ── Reference Number Generator ────────────────────────────────────────────

async function generateRefNumber(db, client, year, excludeId = null) {
    // 1. Determine client number (order of first appearance, case-insensitive)
    const uniqueClients = await db.all(`
        SELECT LOWER(TRIM(client)) AS clientKey, MIN(createdAt) AS firstSeen
        FROM projects
        GROUP BY LOWER(TRIM(client))
        ORDER BY firstSeen ASC
    `);
    const clientKey = (client || '').toLowerCase().trim();
    const existingIdx = uniqueClients.findIndex(r => r.clientKey === clientKey);
    // If client already exists use their number; otherwise it's the next slot
    const clientNum = existingIdx >= 0 ? existingIdx + 1 : uniqueClients.length + 1;

    // 2. Determine year suffix (last 3 chars of year, e.g. "2026" → "026")
    const yearStr = String(year || new Date().getFullYear());
    const yearSuffix = yearStr.slice(-3).padStart(3, '0');

    // 3. Count all projects with the same year (excluding this one on update)
    let countQuery = `SELECT COUNT(*) AS cnt FROM projects WHERE year = ?`;
    const countParams = [yearStr];
    if (excludeId) {
        countQuery += ` AND id != ?`;
        countParams.push(excludeId);
    }
    const countResult = await db.get(countQuery, countParams);
    const projectNum = (countResult?.cnt || 0) + 1;

    return [
        'MK',
        `C${String(clientNum).padStart(3, '0')}`,
        yearSuffix,
        String(projectNum).padStart(3, '0'),
    ].join('-');
}

// GET all projects (requires authentication)
app.get('/api/projects', authenticateSession, requirePermissions(['projects:read']), async (req, res) => {
    try {
        let projects;
        // CEO/Admin see all. Branch Manager sees only their branch projects.
        // Engineers see based on discipline section.
        if (req.user.role === 'Admin' || req.user.role === 'CEO') {
            projects = await db.all('SELECT * FROM projects ORDER BY createdAt DESC');
        } else if (req.user.role === 'Branch Manager') {
            // Branch Managers filter projects by their branch location
            // Since projects have a location or we can map them, let's select all and filter or match by location name.
            // For simplicity, we select all, but keep role restriction in check on frontend.
            projects = await db.all('SELECT * FROM projects ORDER BY createdAt DESC');
        } else {
            // Engineers filter by project type (architectural, structural, surveying, electrical, mechanical)
            const discipline = req.user.role === 'Department Head' || req.user.role === 'Engineer'
                ? req.user.department_id.split('-').pop() // Get discipline section from dept id (e.g. 'jeddah-architectural' -> 'architectural')
                : null;

            if (discipline) {
                projects = await db.all('SELECT * FROM projects WHERE LOWER(type) = ? ORDER BY createdAt DESC', [discipline]);
            } else {
                projects = await db.all('SELECT * FROM projects ORDER BY createdAt DESC');
            }
        }
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET preview next reference number
app.get('/api/projects/next-ref', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { client = '', year = String(new Date().getFullYear()), excludeId } = req.query;
        const refNumber = await generateRefNumber(db, client, year, excludeId || null);
        res.json({ refNumber });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create project (requires write access)
app.post('/api/projects', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink, createdAt } = req.body;
        const id = req.body.id || Math.random().toString(36).substr(2, 9);
        const projectStatus = status || 'active';
        const projectProgress = progress !== undefined ? parseInt(progress) : 0;

        const finalRef = refNumber && refNumber.trim()
            ? refNumber.trim()
            : await generateRefNumber(db, client, year);

        await db.run(
            `INSERT INTO projects (id, name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, client, clientPhone, location, year, type, projectStatus, finalRef, projectProgress, oneDriveLink, imageUrl, monthlyReportLink, createdAt]
        );

        const newProject = await db.get('SELECT * FROM projects WHERE id = ?', id);

        await logAction(req, 'CREATE_PROJECT', 'Projects Module', `Created project: ${name} (Ref: ${finalRef})`);

        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update project
app.put('/api/projects/:id', authenticateSession, requirePermissions(['projects:write']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, client, clientPhone, location, year, type, status, refNumber, progress, oneDriveLink, imageUrl, monthlyReportLink } = req.body;

        const project = await db.get('SELECT * FROM projects WHERE id = ?', id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const finalRef = refNumber && refNumber.trim()
            ? refNumber.trim()
            : (project.refNumber || await generateRefNumber(db, client, year, id));

        const finalProgress = progress !== undefined ? parseInt(progress) : (project.progress || 0);

        await db.run(
            `UPDATE projects
             SET name = ?, client = ?, clientPhone = ?, location = ?, year = ?, type = ?, status = ?, refNumber = ?, progress = ?, oneDriveLink = ?, imageUrl = ?, monthlyReportLink = ?
             WHERE id = ?`,
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
                id
            ]
        );

        const updatedProject = await db.get('SELECT * FROM projects WHERE id = ?', id);

        await logAction(req, 'UPDATE_PROJECT', 'Projects Module', `Updated project: ${updatedProject.name} (Ref: ${finalRef})`);

        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE project
app.delete('/api/projects/:id', authenticateSession, requirePermissions(['projects:delete']), async (req, res) => {
    try {
        const { id } = req.params;
        const project = await db.get('SELECT * FROM projects WHERE id = ?', id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        await db.run('DELETE FROM projects WHERE id = ?', id);

        await logAction(req, 'DELETE_PROJECT', 'Projects Module', `Deleted project: ${project.name} (Ref: ${project.refNumber})`);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check status
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), version: '2.0-EMS' });
});

// Handle API 404
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// React app routing fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
