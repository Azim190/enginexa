const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function openDb() {
  return open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await openDb();

  // 1. Create Core Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      logo_url TEXT,
      theme_color TEXT,
      working_hours TEXT,
      holidays TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      branch_id TEXT,
      createdAt TEXT,
      FOREIGN KEY(branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT PRIMARY KEY,
      permissions_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      last_active TEXT,
      mfa_verified INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correspondence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      dateSent TEXT NOT NULL,
      timeSent TEXT NOT NULL,
      refNumber TEXT UNIQUE,
      subject TEXT NOT NULL,
      description TEXT,
      fileLink TEXT,
      remarks TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate or Re-create Users Table to support the extended EMS features
  // Since we want to add constraints and foreign keys safely, we'll create users if not exists,
  // or check if new columns exist.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_number TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL,
      branch_id TEXT,
      department_id TEXT,
      reporting_line_id INTEGER,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_pin TEXT DEFAULT '123456',
      status TEXT DEFAULT 'active',
      createdAt TEXT,
      FOREIGN KEY(branch_id) REFERENCES branches(id),
      FOREIGN KEY(department_id) REFERENCES departments(id),
      FOREIGN KEY(reporting_line_id) REFERENCES users(id)
    );
  `);

  // Run dynamic schema migrations on the users table (in case it existed with old fields)
  const columns = await db.all("PRAGMA table_info(users)");
  const colNames = columns.map(c => c.name);

  if (!colNames.includes('password_hash')) {
    await db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  }
  if (!colNames.includes('branch_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN branch_id TEXT`);
  }
  if (!colNames.includes('department_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN department_id TEXT`);
  }
  if (!colNames.includes('reporting_line_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN reporting_line_id INTEGER`);
  }
  if (!colNames.includes('mfa_enabled')) {
    await db.exec(`ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0`);
  }
  if (!colNames.includes('mfa_pin')) {
    await db.exec(`ALTER TABLE users ADD COLUMN mfa_pin TEXT DEFAULT '123456'`);
  }
  if (!colNames.includes('status')) {
    await db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  }
  if (!colNames.includes('createdAt')) {
    await db.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT`);
  }

  // Legacy projects table structure verification / update
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      client TEXT,
      clientPhone TEXT,
      location TEXT,
      year TEXT,
      type TEXT,
      status TEXT DEFAULT 'active',
      refNumber TEXT,
      progress INTEGER DEFAULT 0,
      oneDriveLink TEXT,
      imageUrl TEXT,
      monthlyReportLink TEXT,
      createdAt TEXT
    );
  `);

  const projectColumns = await db.all("PRAGMA table_info(projects)");
  const projColNames = projectColumns.map(c => c.name);
  if (!projColNames.includes('monthlyReportLink')) {
    await db.exec(`ALTER TABLE projects ADD COLUMN monthlyReportLink TEXT`);
  }

  // 2. Seed Default Settings
  const defaultSettings = [
    { key: 'language_default', value: 'ar' },
    { key: 'working_hours', value: JSON.stringify({ start: '08:00', end: '16:00', weekend: [5, 6] }) },
    { key: 'holidays', value: JSON.stringify([{ name_en: 'National Day', name_ar: 'اليوم الوطني', date: '09-23', hijri: false }]) }
  ];
  for (const s of defaultSettings) {
    await db.run('INSERT OR IGNORE INTO global_settings (key, value) VALUES (?, ?)', [s.key, s.value]);
  }

  // 3. Seed Branches
  const initialBranches = [
    { id: 'jeddah', name_en: 'Jeddah Branch', name_ar: 'فرع جدة', theme_color: '#0B3D4E', working_hours: '08:00-16:00' },
    { id: 'mecca', name_en: 'Mecca Branch', name_ar: 'فرع مكة', theme_color: '#C8963E', working_hours: '08:00-16:00' },
    { id: 'medina', name_en: 'Medina Branch', name_ar: 'فرع المدينة', theme_color: '#1a5f3a', working_hours: '08:00-16:00' },
    { id: 'al-baha', name_en: 'Al Baha Branch', name_ar: 'فرع الباحة', theme_color: '#5b2c80', working_hours: '08:00-16:00' },
    { id: 'balgarshi', name_en: 'Balgarshi Branch', name_ar: 'فرع بلجرشي', theme_color: '#b03a2e', working_hours: '08:00-16:00' }
  ];
  for (const b of initialBranches) {
    const existing = await db.get('SELECT id FROM branches WHERE id = ?', [b.id]);
    if (!existing) {
      await db.run(
        'INSERT INTO branches (id, name_en, name_ar, theme_color, working_hours, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [b.id, b.name_en, b.name_ar, b.theme_color, b.working_hours, new Date().toISOString()]
      );
    }
  }

  // 4. Seed Departments
  const initialDepts = [
    { id: 'architectural', name_en: 'Architectural Department', name_ar: 'القسم المعماري' },
    { id: 'structural', name_en: 'Structural Department', name_ar: 'القسم الإنشائي' },
    { id: 'surveying', name_en: 'Surveying Department', name_ar: 'قسم المساحة' },
    { id: 'electrical', name_en: 'Electrical Department', name_ar: 'القسم الكهربائي' },
    { id: 'mechanical', name_en: 'Mechanical Department', name_ar: 'القسم الميكانيكي' },
    { id: 'executive', name_en: 'Executive Office', name_ar: 'المكتب التنفيذي' }
  ];
  for (const d of initialDepts) {
    // We duplicate departments for each branch to reflect realistic multi-branch structure
    for (const b of initialBranches) {
      const deptId = `${b.id}-${d.id}`;
      const existing = await db.get('SELECT id FROM departments WHERE id = ?', [deptId]);
      if (!existing) {
        await db.run(
          'INSERT INTO departments (id, name_en, name_ar, branch_id, createdAt) VALUES (?, ?, ?, ?, ?)',
          [deptId, d.name_en, d.name_ar, b.id, new Date().toISOString()]
        );
      }
    }
  }

  // 5. Seed Role Permissions
  // Permissions mapping for roles: CEO, Branch Manager, Department Head, Engineer, Secretary, Client-facing staff, Admin
  const rolePerms = {
    'Admin': ['*'],
    'CEO': [
      'projects:read', 'projects:write', 'projects:delete',
      'meetings:read', 'meetings:write', 'meetings:approve',
      'correspondence:read', 'correspondence:write', 'correspondence:route',
      'tasks:read', 'tasks:write', 'tasks:oversight',
      'users:read', 'users:write',
      'settings:read', 'settings:write',
      'audit:read', 'reports:read'
    ],
    'Branch Manager': [
      'projects:read', 'projects:write',
      'meetings:read', 'meetings:write',
      'correspondence:read', 'correspondence:write',
      'tasks:read', 'tasks:write',
      'users:read', 'reports:read'
    ],
    'Department Head': [
      'projects:read', 'projects:write',
      'meetings:read', 'meetings:write',
      'correspondence:read',
      'tasks:read', 'tasks:write'
    ],
    'Engineer': [
      'projects:read',
      'meetings:read',
      'tasks:read', 'tasks:write'
    ],
    'Secretary': [
      'projects:read',
      'meetings:read', 'meetings:write',
      'correspondence:read', 'correspondence:write', 'correspondence:route',
      'tasks:read', 'tasks:write',
      'contacts:read', 'contacts:write'
    ],
    'Client-facing staff': [
      'projects:read',
      'contacts:read', 'contacts:write',
      'tasks:read'
    ]
  };

  for (const [role, perms] of Object.entries(rolePerms)) {
    await db.run(
      'INSERT OR REPLACE INTO role_permissions (role, permissions_json) VALUES (?, ?)',
      [role, JSON.stringify(perms)]
    );
  }

  // 6. Seed/Update Users with Multi-Branch Details & Default Passcode/MFA
  const users = [
    { name: 'Sayed',  id_number: '2194502437', role: 'CEO',            branch_id: 'mecca',    department_id: 'mecca-executive' },
    { name: 'Azim',   id_number: '2599925308', role: 'Admin',          branch_id: 'jeddah',   department_id: 'jeddah-executive' },
    { name: 'Ahmed',  id_number: '2412913655', role: 'Admin',          branch_id: 'mecca',    department_id: 'mecca-executive' },
    { name: 'Karim',  id_number: '2503283125', role: 'Engineer',       branch_id: 'medina',   department_id: 'medina-structural' },
    { name: 'Waleed', id_number: '2360692046', role: 'Department Head',branch_id: 'jeddah',   department_id: 'jeddah-architectural' },
    { name: 'Maher',  id_number: '2494066174', role: 'Engineer',       branch_id: 'jeddah',   department_id: 'jeddah-architectural' },
    { name: 'Othman', id_number: '2017930765', role: 'Engineer',       branch_id: 'mecca',    department_id: 'mecca-architectural' },
    { name: 'Fouad',  id_number: '2563937289', role: 'Engineer',       branch_id: 'al-baha',  department_id: 'al-baha-electrical' },
    { name: 'Bawadi', id_number: '2493732479', role: 'Engineer',       branch_id: 'balgarshi',department_id: 'balgarshi-mechanical' },
    { name: 'Fikri',  id_number: '2565169469', role: 'Engineer',       branch_id: 'mecca',    department_id: 'mecca-mechanical' },
    { name: 'Jaber',  id_number: '2432205512', role: 'Engineer',       branch_id: 'medina',   department_id: 'medina-surveying' }
  ];

  for (const user of users) {
    const existing = await db.get('SELECT id FROM users WHERE id_number = ?', [user.id_number]);
    if (!existing) {
      // Seed with default passcode same as id_number, and default pin 123456, MFA enabled by default but togglable
      await db.run(
        `INSERT INTO users (name, id_number, password_hash, role, branch_id, department_id, mfa_enabled, mfa_pin, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 1, '123456', 'active', ?)`,
        [user.name, user.id_number, user.id_number, user.role, user.branch_id, user.department_id, new Date().toISOString()]
      );
    } else {
      // Update existing legacy users to include branch and role mapping
      await db.run(
        `UPDATE users
         SET role = ?, branch_id = ?, department_id = ?
         WHERE id_number = ?`,
        [user.role, user.branch_id, user.department_id, user.id_number]
      );
    }
  }

  // Ensure all seeded users have MFA enabled by default
  await db.run('UPDATE users SET mfa_enabled = 1');

  // Update Sayed (CEO) reporting line to null, and other engineers reporting lines to department heads
  const waleedUser = await db.get('SELECT id FROM users WHERE name = "Waleed"');
  if (waleedUser) {
    await db.run(
      'UPDATE users SET reporting_line_id = ? WHERE name = "Maher"',
      [waleedUser.id]
    );
  }

  return db;
}

module.exports = { openDb, initDb };
