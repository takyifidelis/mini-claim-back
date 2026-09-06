import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Immutability Triggers (PostgreSQL Integration)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    const migrationSqlPath = path.resolve('prisma/migrations/20260905000000_init/migration.sql');
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');
    await db.exec(sql);
  });

  it('rejects UPDATE operations on exchange_rate_sheets via PostgreSQL trigger', async () => {
    // Insert sheet
    await db.query(`
      INSERT INTO exchange_rate_sheets (id, reference, "effectiveAt", notes, "createdBy")
      VALUES ('20000000-0000-0000-0000-000000000001', 'FX-20260101-000001', '2026-01-01 00:00:00+00', 'Original Notes', 'tester');
    `);

    // Attempting UPDATE must fail due to trigger
    await expect(
      db.query(`
        UPDATE exchange_rate_sheets SET notes = 'Mutated Notes' WHERE id = '20000000-0000-0000-0000-000000000001';
      `)
    ).rejects.toThrow(/immutable and cannot be updated or deleted/);
  });

  it('rejects DELETE operations on exchange_rate_sheets via PostgreSQL trigger', async () => {
    // Attempting DELETE must fail due to trigger
    await expect(
      db.query(`
        DELETE FROM exchange_rate_sheets WHERE id = '20000000-0000-0000-0000-000000000001';
      `)
    ).rejects.toThrow(/immutable and cannot be updated or deleted/);
  });

  it('rejects UPDATE operations on exchange_rate_entries via PostgreSQL trigger', async () => {
    // Insert entry
    await db.query(`
      INSERT INTO exchange_rate_entries (id, "exchangeRateSheetId", "fromCurrency", "toCurrency", rate)
      VALUES ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'GHS', 'USD', 0.08000000);
    `);

    // Attempting UPDATE must fail due to trigger
    await expect(
      db.query(`
        UPDATE exchange_rate_entries SET rate = 0.09000000 WHERE id = '21000000-0000-0000-0000-000000000001';
      `)
    ).rejects.toThrow(/immutable and cannot be updated or deleted/);
  });

  it('rejects DELETE operations on exchange_rate_entries via PostgreSQL trigger', async () => {
    // Attempting DELETE must fail due to trigger
    await expect(
      db.query(`
        DELETE FROM exchange_rate_entries WHERE id = '21000000-0000-0000-0000-000000000001';
      `)
    ).rejects.toThrow(/immutable and cannot be updated or deleted/);
  });
});
