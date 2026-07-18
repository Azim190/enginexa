const fs = require('fs');
const path = require('path');
const https = require('https');

const SHARING_URL = 'https://1drv.ms/f/c/0a257d75be9315f7/IgB95m23bO8eSrIzf3_zEylXAZ-aggtJ7epk9VViAtFJ9fM?e=Rv2K7x';

function getSharingToken(url) {
    const base64 = Buffer.from(url).toString('base64');
    return 'u!' + base64
        .replace(/=/g, '')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');
}

function getOneDriveCredentials() {
    const credPath = path.join(__dirname, 'onedrive-credentials.json');
    if (!fs.existsSync(credPath)) {
        console.warn("⚠️ OneDrive credentials not found at server/onedrive-credentials.json.");
        console.warn("⚠️ File uploads will fall back to local server storage simulation.");
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(credPath, 'utf8'));
    } catch (e) {
        console.error("❌ Failed to parse OneDrive credentials:", e.message);
        return null;
    }
}

// Helper to make HTTPS requests returning JSON
function makeRequest(options, requestBody = null, isBinary = false) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                const responseString = buffer.toString('utf8');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(responseString ? JSON.parse(responseString) : {});
                    } catch (e) {
                        resolve({ responseText: responseString });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseString}`));
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (requestBody !== null) {
            if (isBinary) {
                req.write(requestBody);
            } else {
                req.write(typeof requestBody === 'object' ? JSON.stringify(requestBody) : requestBody);
            }
        }
        req.end();
    });
}

async function getAccessToken(creds) {
    const { clientId, clientSecret, tenantId = 'common' } = creds;
    const postData = `client_id=${clientId}&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=${clientSecret}&grant_type=client_credentials`;
    
    const options = {
        hostname: 'login.microsoftonline.com',
        port: 443,
        path: `/${tenantId}/oauth2/v2.0/token`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const res = await makeRequest(options, postData);
    return res.access_token;
}

/**
 * Uploads a file to OneDrive under the shared folder link.
 * Automatically creates the folder named after the project if it doesn't exist.
 */
async function uploadToOneDrive(projectName, type, file) {
    const creds = getOneDriveCredentials();
    const safeProjectName = (projectName || 'General').replace(/[^a-zA-Z0-9_\-\u0600-\u06FF\s]/g, '').trim() || 'General';

    if (!creds) {
        // Fallback: Local upload path
        return {
            name: file.originalname,
            url: `/api/uploads/${encodeURIComponent(safeProjectName)}/${type}/${file.filename}`
        };
    }

    try {
        console.log(`☁️ OneDrive: Requesting Microsoft Graph Access Token...`);
        const token = await getAccessToken(creds);
        const sharingToken = getSharingToken(SHARING_URL);

        // 1. Resolve shared parent item to get driveId and itemId
        console.log(`☁️ OneDrive: Resolving shared folder link...`);
        const parentInfo = await makeRequest({
            hostname: 'graph.microsoft.com',
            path: `/v1.0/shares/${sharingToken}/driveItem`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const driveId = parentInfo.parentReference.driveId;
        const parentItemId = parentInfo.id;

        // 2. Search or create project folder under the shared parent
        console.log(`☁️ OneDrive: Finding/creating project folder "${safeProjectName}"`);
        const folderPayload = {
            name: safeProjectName,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail" // Fail if exists so we can catch it, or just use rename/replace
        };

        let projectFolderId;
        let projectFolderUrl;
        try {
            const folderRes = await makeRequest({
                hostname: 'graph.microsoft.com',
                path: `/v1.0/drives/${driveId}/items/${parentItemId}/children`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, folderPayload);
            projectFolderId = folderRes.id;
            projectFolderUrl = folderRes.webUrl;
        } catch (e) {
            // Folder already exists or error, search for it
            const children = await makeRequest({
                hostname: 'graph.microsoft.com',
                path: `/v1.0/drives/${driveId}/items/${parentItemId}/children?$filter=name eq '${encodeURIComponent(safeProjectName)}'`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (children.value && children.value.length > 0) {
                projectFolderId = children.value[0].id;
                projectFolderUrl = children.value[0].webUrl;
            } else {
                throw e; // Rethrow if it was a different error
            }
        }

        // 3. Upload file to OneDrive subfolder (files or reports)
        console.log(`☁️ OneDrive: Uploading file "${file.originalname}" to folder ID: ${projectFolderId}`);
        const fileContent = fs.readFileSync(file.path);
        
        const uploadUrlPath = `/v1.0/drives/${driveId}/items/${projectFolderId}:/${type}/${encodeURIComponent(file.originalname)}:/content`;
        const uploadRes = await makeRequest({
            hostname: 'graph.microsoft.com',
            path: uploadUrlPath,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Length': fileContent.length
            }
        }, fileContent, true);

        // Delete temporary file on local disk after successful upload
        try {
            fs.unlinkSync(file.path);
        } catch (e) {
            console.error("Local file cleanup failed:", e.message);
        }

        return {
            name: file.originalname,
            url: uploadRes.webUrl || projectFolderUrl
        };
    } catch (error) {
        console.error("❌ OneDrive Upload Error:", error.message);
        // Fallback to local URL if Microsoft Graph API call fails
        return {
            name: file.originalname,
            url: `/api/uploads/${encodeURIComponent(safeProjectName)}/${type}/${file.filename}`
        };
    }
}

module.exports = {
    uploadToOneDrive,
    SHARING_URL
};
