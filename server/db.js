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

  // 1. Create Organizations Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      theme_color TEXT DEFAULT '#0B3D4E',
      plan TEXT DEFAULT 'enterprise',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);

  // 2. Create Core Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      logo_url TEXT,
      theme_color TEXT,
      working_hours TEXT,
      holidays TEXT,
      createdAt TEXT,
      FOREIGN KEY(organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      branch_id TEXT,
      createdAt TEXT,
      FOREIGN KEY(organization_id) REFERENCES organizations(id),
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
      organization_id TEXT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS correspondence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id TEXT,
      type TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      dateSent TEXT NOT NULL,
      timeSent TEXT NOT NULL,
      refNumber TEXT,
      subject TEXT NOT NULL,
      description TEXT,
      fileLink TEXT,
      remarks TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      organization_id TEXT,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id TEXT,
      name TEXT NOT NULL,
      id_number TEXT NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL,
      branch_id TEXT,
      department_id TEXT,
      reporting_line_id INTEGER,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_pin TEXT DEFAULT '123456',
      status TEXT DEFAULT 'active',
      createdAt TEXT,
      FOREIGN KEY(organization_id) REFERENCES organizations(id),
      FOREIGN KEY(branch_id) REFERENCES branches(id),
      FOREIGN KEY(department_id) REFERENCES departments(id),
      FOREIGN KEY(reporting_line_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
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
      createdAt TEXT,
      FOREIGN KEY(organization_id) REFERENCES organizations(id)
    );
  `);

  // Dynamic schema migrations for users (remove global UNIQUE on id_number and add organization_id)
  const userTableInfo = await db.get("SELECT sql FROM sqlite_master WHERE name = 'users'");
  if (userTableInfo && userTableInfo.sql.includes('id_number TEXT NOT NULL UNIQUE')) {
    await db.exec(`
      CREATE TABLE users_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id TEXT,
        name TEXT NOT NULL,
        id_number TEXT NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL,
        branch_id TEXT,
        department_id TEXT,
        reporting_line_id INTEGER,
        mfa_enabled INTEGER DEFAULT 0,
        mfa_pin TEXT DEFAULT '123456',
        status TEXT DEFAULT 'active',
        createdAt TEXT,
        FOREIGN KEY(organization_id) REFERENCES organizations(id),
        FOREIGN KEY(branch_id) REFERENCES branches(id),
        FOREIGN KEY(department_id) REFERENCES departments(id),
        FOREIGN KEY(reporting_line_id) REFERENCES users(id)
      );

      INSERT INTO users_temp (id, organization_id, name, id_number, password_hash, role, branch_id, department_id, reporting_line_id, mfa_enabled, mfa_pin, status, createdAt)
      SELECT id, IFNULL(organization_id, 'org_default'), name, id_number, password_hash, role, branch_id, department_id, reporting_line_id, mfa_enabled, mfa_pin, status, createdAt FROM users;

      DROP TABLE users;
      ALTER TABLE users_temp RENAME TO users;
    `);
  }

  // Dynamic schema migration for correspondence (remove global UNIQUE on refNumber)
  const corrTableInfo = await db.get("SELECT sql FROM sqlite_master WHERE name = 'correspondence'");
  if (corrTableInfo && corrTableInfo.sql.includes('refNumber TEXT UNIQUE')) {
    await db.exec(`
      CREATE TABLE correspondence_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id TEXT,
        type TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        dateSent TEXT NOT NULL,
        timeSent TEXT NOT NULL,
        refNumber TEXT,
        subject TEXT NOT NULL,
        description TEXT,
        fileLink TEXT,
        remarks TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(organization_id) REFERENCES organizations(id)
      );

      INSERT INTO correspondence_temp (id, organization_id, type, sender, recipient, dateSent, timeSent, refNumber, subject, description, fileLink, remarks, createdAt)
      SELECT id, IFNULL(organization_id, 'org_default'), type, sender, recipient, dateSent, timeSent, refNumber, subject, description, fileLink, remarks, createdAt FROM correspondence;

      DROP TABLE correspondence;
      ALTER TABLE correspondence_temp RENAME TO correspondence;
    `);
  }

  // 3. Dynamic schema migrations for organization_id on all tables
  const userColumns = (await db.all("PRAGMA table_info(users)")).map(c => c.name);
  if (!userColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN organization_id TEXT`);
  }
  if (!userColumns.includes('password_hash')) {
    await db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  }
  if (!userColumns.includes('branch_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN branch_id TEXT`);
  }
  if (!userColumns.includes('department_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN department_id TEXT`);
  }
  if (!userColumns.includes('reporting_line_id')) {
    await db.exec(`ALTER TABLE users ADD COLUMN reporting_line_id INTEGER`);
  }
  if (!userColumns.includes('mfa_enabled')) {
    await db.exec(`ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0`);
  }
  if (!userColumns.includes('mfa_pin')) {
    await db.exec(`ALTER TABLE users ADD COLUMN mfa_pin TEXT DEFAULT '123456'`);
  }
  if (!userColumns.includes('status')) {
    await db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  }
  if (!userColumns.includes('createdAt')) {
    await db.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT`);
  }

  const projColumns = (await db.all("PRAGMA table_info(projects)")).map(c => c.name);
  if (!projColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE projects ADD COLUMN organization_id TEXT`);
  }
  if (!projColumns.includes('monthlyReportLink')) {
    await db.exec(`ALTER TABLE projects ADD COLUMN monthlyReportLink TEXT`);
  }

  const branchColumns = (await db.all("PRAGMA table_info(branches)")).map(c => c.name);
  if (!branchColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE branches ADD COLUMN organization_id TEXT`);
  }

  const deptColumns = (await db.all("PRAGMA table_info(departments)")).map(c => c.name);
  if (!deptColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE departments ADD COLUMN organization_id TEXT`);
  }

  const corrColumns = (await db.all("PRAGMA table_info(correspondence)")).map(c => c.name);
  if (!corrColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE correspondence ADD COLUMN organization_id TEXT`);
  }

  const auditColumns = (await db.all("PRAGMA table_info(audit_logs)")).map(c => c.name);
  if (!auditColumns.includes('organization_id')) {
    await db.exec(`ALTER TABLE audit_logs ADD COLUMN organization_id TEXT`);
  }

  // 4. Seed Default Initial Organization & Backfill Existing Data
  const defaultOrg = await db.get("SELECT id FROM organizations WHERE slug = 'default'");
  if (!defaultOrg) {
    await db.run(
      `INSERT INTO organizations (id, name, slug, logo_url, theme_color, plan, status, created_at)
       VALUES ('org_default', 'EngiNexa', 'default', '/logo.png', '#0B3D4E', 'enterprise', 'active', ?)`,
      [new Date().toISOString()]
    );
  }

  // Backfill existing rows with 'org_default'
  await db.run("UPDATE users SET organization_id = 'org_default' WHERE organization_id IS NULL");
  await db.run("UPDATE projects SET organization_id = 'org_default' WHERE organization_id IS NULL");
  await db.run("UPDATE branches SET organization_id = 'org_default' WHERE organization_id IS NULL");
  await db.run("UPDATE departments SET organization_id = 'org_default' WHERE organization_id IS NULL");
  await db.run("UPDATE correspondence SET organization_id = 'org_default' WHERE organization_id IS NULL");
  await db.run("UPDATE audit_logs SET organization_id = 'org_default' WHERE organization_id IS NULL");

  // 5. Seed Default Settings
  const defaultSettings = [
    { key: 'language_default', value: 'ar' },
    { key: 'working_hours', value: JSON.stringify({ start: '08:00', end: '16:00', weekend: [5, 6] }) },
    { key: 'holidays', value: JSON.stringify([{ name_en: 'National Day', name_ar: 'اليوم الوطني', date: '09-23', hijri: false }]) }
  ];
  for (const s of defaultSettings) {
    await db.run('INSERT OR IGNORE INTO global_settings (key, value) VALUES (?, ?)', [s.key, s.value]);
  }

  // 6. Seed Branches for Default Org
  const initialBranches = [
    { id: 'jeddah', name_en: 'Jeddah Branch', name_ar: 'فرع جدة', theme_color: '#0B3D4E', working_hours: '08:00-16:00' },
    { id: 'mecca', name_en: 'Mecca Branch', name_ar: 'فرع مكة', theme_color: '#C8963E', working_hours: '08:00-16:00' },
    { id: 'medina', name_en: 'Medina Branch', name_ar: 'فرع المدينة', theme_color: '#1a5f3a', working_hours: '08:00-16:00' },
    { id: 'al-baha', name_en: 'Al Baha Branch', name_ar: 'فرع الباحة', theme_color: '#5b2c80', working_hours: '08:00-16:00' },
    { id: 'balgarshi', name_en: 'Balgarshi Branch', name_ar: 'فرع بلجرشي', theme_color: '#b03a2e', working_hours: '08:00-16:00' }
  ];
  for (const b of initialBranches) {
    const existing = await db.get('SELECT id FROM branches WHERE id = ? AND organization_id = "org_default"', [b.id]);
    if (!existing) {
      await db.run(
        'INSERT INTO branches (id, organization_id, name_en, name_ar, theme_color, working_hours, createdAt) VALUES (?, "org_default", ?, ?, ?, ?, ?)',
        [b.id, b.name_en, b.name_ar, b.theme_color, b.working_hours, new Date().toISOString()]
      );
    }
  }

  // 7. Seed Departments for Default Org
  const initialDepts = [
    { id: 'architectural', name_en: 'Architectural Department', name_ar: 'القسم المعماري' },
    { id: 'structural', name_en: 'Structural Department', name_ar: 'القسم الإنشائي' },
    { id: 'surveying', name_en: 'Surveying Department', name_ar: 'قسم المساحة' },
    { id: 'electrical', name_en: 'Electrical Department', name_ar: 'القسم الكهربائي' },
    { id: 'mechanical', name_en: 'Mechanical Department', name_ar: 'القسم الميكانيكي' },
    { id: 'executive', name_en: 'Executive Office', name_ar: 'المكتب التنفيذي' }
  ];
  for (const d of initialDepts) {
    for (const b of initialBranches) {
      const deptId = `${b.id}-${d.id}`;
      const existing = await db.get('SELECT id FROM departments WHERE id = ? AND organization_id = "org_default"', [deptId]);
      if (!existing) {
        await db.run(
          'INSERT INTO departments (id, organization_id, name_en, name_ar, branch_id, createdAt) VALUES (?, "org_default", ?, ?, ?, ?)',
          [deptId, d.name_en, d.name_ar, b.id, new Date().toISOString()]
        );
      }
    }
  }

  // 8. Seed Role Permissions
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

  // 9. Seed/Update Users for Default Org
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
    const existing = await db.get('SELECT id FROM users WHERE id_number = ? AND organization_id = "org_default"', [user.id_number]);
    if (!existing) {
      await db.run(
        `INSERT INTO users (organization_id, name, id_number, password_hash, role, branch_id, department_id, mfa_enabled, mfa_pin, status, createdAt)
         VALUES ('org_default', ?, ?, ?, ?, ?, ?, 1, '123456', 'active', ?)`,
        [user.name, user.id_number, user.id_number, user.role, user.branch_id, user.department_id, new Date().toISOString()]
      );
    } else {
      await db.run(
        `UPDATE users
         SET role = ?, branch_id = ?, department_id = ?, organization_id = 'org_default'
         WHERE id_number = ?`,
        [user.role, user.branch_id, user.department_id, user.id_number]
      );
    }
  }

  await db.run('UPDATE users SET mfa_enabled = 1 WHERE organization_id = "org_default"');

  const waleedUser = await db.get('SELECT id FROM users WHERE name = "Waleed" AND organization_id = "org_default"');
  if (waleedUser) {
    await db.run(
      'UPDATE users SET reporting_line_id = ? WHERE name = "Maher" AND organization_id = "org_default"',
      [waleedUser.id]
    );
  }

  return db;
}

// Helper to bootstrap a completely new organization with its own branches, departments, and admin user
async function bootstrapOrganization(db, { name, slug, adminName, idNumber, password, themeColor, logoUrl }) {
  const orgId = 'org_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  // 1. Create Organization
  await db.run(
    `INSERT INTO organizations (id, name, slug, logo_url, theme_color, plan, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'enterprise', 'active', ?)`,
    [orgId, name.trim(), slug.trim().toLowerCase(), logoUrl || '/logo.png', themeColor || '#0B3D4E', now]
  );

  // 2. Create Default Branch (Head Office)
  const branchId = `${slug}-main`;
  await db.run(
    `INSERT INTO branches (id, organization_id, name_en, name_ar, theme_color, working_hours, createdAt)
     VALUES (?, ?, 'Head Office', 'المقر الرئيسي', ?, '08:00-16:00', ?)`,
    [branchId, orgId, themeColor || '#0B3D4E', now]
  );

  // 3. Create Default Departments
  const depts = [
    { code: 'architectural', en: 'Architectural Department', ar: 'القسم المعماري' },
    { code: 'structural', en: 'Structural Department', ar: 'القسم الإنشائي' },
    { code: 'surveying', en: 'Surveying Department', ar: 'قسم المساحة' },
    { code: 'electrical', en: 'Electrical Department', ar: 'القسم الكهربائي' },
    { code: 'mechanical', en: 'Mechanical Department', ar: 'القسم الميكانيكي' },
    { code: 'executive', en: 'Executive Office', ar: 'المكتب التنفيذي' }
  ];

  for (const d of depts) {
    const deptId = `${branchId}-${d.code}`;
    await db.run(
      `INSERT INTO departments (id, organization_id, name_en, name_ar, branch_id, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [deptId, orgId, d.en, d.ar, branchId, now]
    );
  }

  // 4. Create Initial Admin User
  const execDeptId = `${branchId}-executive`;
  const result = await db.run(
    `INSERT INTO users (organization_id, name, id_number, password_hash, role, branch_id, department_id, mfa_enabled, mfa_pin, status, createdAt)
     VALUES (?, ?, ?, ?, 'Admin', ?, ?, 0, '123456', 'active', ?)`,
    [orgId, adminName.trim(), idNumber.trim(), password ? password.trim() : idNumber.trim(), branchId, execDeptId, now]
  );

  const adminUser = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
  const organization = await db.get('SELECT * FROM organizations WHERE id = ?', orgId);

  return { organization, adminUser };
}

module.exports = { openDb, initDb, bootstrapOrganization };
