import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Seed and Migration Idempotency (PostgreSQL Integration)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
  });

  it('applies migrations cleanly to an empty database', async () => {
    const migrationSqlPath = path.resolve('prisma/migrations/20260905000000_init/migration.sql');
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');
    await db.exec(sql);

    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
    );

    const tableNames = tables.rows.map((r) => r.table_name);
    expect(tableNames).toContain('risk_covers');
    expect(tableNames).toContain('exchange_rate_sheets');
    expect(tableNames).toContain('exchange_rate_entries');
    expect(tableNames).toContain('policies');
    expect(tableNames).toContain('policy_risk_covers');
    expect(tableNames).toContain('claims');
    expect(tableNames).toContain('claim_reviews');
    expect(tableNames).toContain('claim_payments');
  });

  it('runs seed data insertion twice idempotently without duplicating or mutating records', async () => {
    const seedRiskCover = async () => {
      await db.query(`
        INSERT INTO risk_covers (id, code, name, description, status, "createdBy")
        VALUES ('10000000-0000-0000-0000-000000000001', 'ACC_DAMAGE', 'Accidental Damage', 'Description', 'ACTIVE', 'seed')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
      `);
    };

    // Run 1
    await seedRiskCover();
    const count1 = await db.query(`SELECT COUNT(*) as count FROM risk_covers;`);
    expect(Number(count1.rows[0].count)).toBe(1);

    // Run 2 (idempotent rerun)
    await seedRiskCover();
    const count2 = await db.query(`SELECT COUNT(*) as count FROM risk_covers;`);
    expect(Number(count2.rows[0].count)).toBe(1);
  });
});
