import Database from 'better-sqlite3';
import { onShutdown } from '../utils/shutdown.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || path.join(os.homedir(), '.openclaw/teamclaw/versions.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

onShutdown('SQLite', () => {
  closeDb();
});
