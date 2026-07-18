/**
 * T012 — Seed step: validate data/knowledgebase/* via kb-schema, load into
 * PostgreSQL, and bump kb_version (monotonic, drives client cache refresh).
 * Usage: DATABASE_URL=postgres://... pnpm --filter @perfiapp/api seed
 */
import { Pool } from 'pg';
import { loadKbFromFiles } from '../kb/kb-source';

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('DATABASE_URL is required (e.g. postgres://perfiapp:perfiapp_dev_only@localhost:5432/perfiapp_kb)');
    process.exit(1);
  }

  const kb = loadKbFromFiles(); // throws on any schema/reference violation
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS kb_meta (kb_version BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS kb_cards (id TEXT PRIMARY KEY, doc JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS kb_programs (id TEXT PRIMARY KEY, doc JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS kb_categories (position INT PRIMARY KEY, doc JSONB NOT NULL);
    `);
    await client.query('DELETE FROM kb_cards');
    await client.query('DELETE FROM kb_programs');
    await client.query('DELETE FROM kb_categories');
    for (const card of kb.cards) {
      await client.query('INSERT INTO kb_cards (id, doc) VALUES ($1, $2)', [card.id, card]);
    }
    for (const program of kb.programs) {
      await client.query('INSERT INTO kb_programs (id, doc) VALUES ($1, $2)', [program.id, program]);
    }
    for (const [i, category] of kb.categories.entries()) {
      await client.query('INSERT INTO kb_categories (position, doc) VALUES ($1, $2)', [i, category]);
    }
    const meta = await client.query('SELECT kb_version FROM kb_meta LIMIT 1');
    if (meta.rowCount === 0) {
      await client.query('INSERT INTO kb_meta (kb_version) VALUES (1)');
    } else {
      await client.query('UPDATE kb_meta SET kb_version = kb_version + 1');
    }
    await client.query('COMMIT');
    const after = await client.query('SELECT kb_version FROM kb_meta LIMIT 1');
    console.log(
      `✓ seeded ${kb.cards.length} cards, ${kb.programs.length} programs, ${kb.categories.length} categories (kb_version=${after.rows[0].kb_version})`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
