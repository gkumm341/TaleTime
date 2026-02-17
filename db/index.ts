import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createRequire } from 'node:module';
import * as schema from './schema';

const require = createRequire(import.meta.url);

function getContentMode(): 'local' | 'cloud' {
	const mode = (process.env.CONTENT_MODE || '').trim().toLowerCase();
	if (mode === 'cloud') return 'cloud';
	if (mode === 'local') return 'local';
	return process.env.VERCEL === '1' ? 'cloud' : 'local';
}

const shouldDisableDb =
	process.env.DISABLE_SQLITE === '1' ||
	process.env.DISABLE_SQLITE === 'true' ||
	getContentMode() === 'cloud' ||
	process.env.VERCEL === '1';

let disabledReason: string | null = null;

function disabledDbProxy<T extends object>(reason: string): T {
	return new Proxy(
		{},
		{
			get() {
				throw new Error(reason);
			},
		}
	) as T;
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): DrizzleDb {
	if (shouldDisableDb) {
		disabledReason = 'SQLite is disabled for cloud/Vercel runtime.';
		return disabledDbProxy<DrizzleDb>(disabledReason);
	}

	try {
		const BetterSqlite3 = require('better-sqlite3') as {
			new (path: string): { pragma: (sql: string) => void };
		};

		const sqlite = new BetterSqlite3(process.env.SQLITE_PATH || '.data/app.db');
		sqlite.pragma('journal_mode = WAL');
		return drizzle(sqlite as never, { schema });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		disabledReason = `SQLite initialization failed: ${message}`;
		return disabledDbProxy<DrizzleDb>(disabledReason);
	}
}

export const db = createDb();

export function isDatabaseEnabled(): boolean {
	return disabledReason == null;
}

export function getDatabaseDisabledReason(): string | null {
	return disabledReason;
}
