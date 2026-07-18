/**
 * Bundles data/knowledgebase/* into src/store/bundled-kb.json — the app's
 * first-run knowledgebase (research.md R4: the seed data doubles as the
 * initial cache). The API still supersedes it whenever a newer kbVersion is
 * fetched. Run: node scripts/bundle-kb.js  (wired into the build via npm
 * script; CI validates the same files through kb-schema).
 */
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const dataDir = join(__dirname, '..', '..', '..', 'data', 'knowledgebase');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const snapshot = {
  schemaVersion: 1,
  kbVersion: 1,
  fetchedAt: '2026-07-03T00:00:00.000Z',
  cards: readdirSync(join(dataDir, 'cards')).sort().map((f) => read(join(dataDir, 'cards', f))),
  programs: readdirSync(join(dataDir, 'programs')).sort().map((f) => read(join(dataDir, 'programs', f))),
  categories: read(join(dataDir, 'categories.json')),
};

const out = join(__dirname, '..', 'src', 'store', 'bundled-kb.json');
writeFileSync(out, JSON.stringify(snapshot) + '\n');
console.log(`✓ bundled ${snapshot.cards.length} cards into src/store/bundled-kb.json`);
