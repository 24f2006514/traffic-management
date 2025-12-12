const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../../traffic_management.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize admin user if it doesn't exist
const adminEmail = 'admin@trafficmanagement.com';
const adminPassword = 'admin123';
const adminName = 'Administrator';

const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

if (!existingAdmin) {
  try {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (email, password, name, role)
      VALUES (?, ?, ?, 'admin')
    `).run(adminEmail, hashedPassword, adminName);
    console.log('Admin user created:', adminEmail);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

module.exports = db;

