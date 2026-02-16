import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';

function resolveSqlitePath(): string {
	if (process.env.SQLITE_PATH && process.env.SQLITE_PATH.trim()) {
		return process.env.SQLITE_PATH.trim();
	}

	if (process.env.VERCEL === '1') {
		return '/tmp/app.db';
	}

	return '.data/app.db';
}

function ensureVercelSqliteSeed(targetPath: string): void {
	if (process.env.VERCEL !== '1') return;
	if (targetPath !== '/tmp/app.db') return;
	if (fs.existsSync(targetPath)) return;

	const sourcePath = path.resolve(process.cwd(), '.data', 'app.db');
	if (!fs.existsSync(sourcePath)) return;

	fs.mkdirSync(path.dirname(targetPath), { recursive: true });
	fs.copyFileSync(sourcePath, targetPath);
}

const sqlitePath = resolveSqlitePath();
ensureVercelSqliteSeed(sqlitePath);

const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
