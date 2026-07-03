/**
 * Validates every file under data/knowledgebase/ against kb-schema and the
 * cross-entity invariants. Used by CI and by the API seed step (T011/T012).
 * Exit code 0 = valid.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CardSchema,
  RewardProgramSchema,
  SpendCategorySchema,
  SPEND_CATEGORY_IDS,
  findUnresolvedProgramRefs,
  type Card,
  type RewardProgram,
} from '../src';

const dataDir = join(__dirname, '..', '..', '..', 'data', 'knowledgebase');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error(`✗ ${msg}`);
};

const cards: Card[] = [];
const programs: RewardProgram[] = [];

for (const file of readdirSync(join(dataDir, 'cards')).sort()) {
  const parsed = CardSchema.safeParse(readJson(join(dataDir, 'cards', file)));
  if (!parsed.success) fail(`cards/${file}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
  else cards.push(parsed.data);
}

for (const file of readdirSync(join(dataDir, 'programs')).sort()) {
  const parsed = RewardProgramSchema.safeParse(readJson(join(dataDir, 'programs', file)));
  if (!parsed.success) fail(`programs/${file}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
  else programs.push(parsed.data);
}

const categoriesRaw = readJson(join(dataDir, 'categories.json'));
if (!Array.isArray(categoriesRaw) || categoriesRaw.length !== SPEND_CATEGORY_IDS.length) {
  fail(`categories.json must contain exactly the ${SPEND_CATEGORY_IDS.length} fixed categories`);
} else {
  for (const c of categoriesRaw) {
    const parsed = SpendCategorySchema.safeParse(c);
    if (!parsed.success) fail(`categories.json: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
  }
}

for (const ref of findUnresolvedProgramRefs(cards, programs)) {
  fail(`unresolved program reference: ${ref}`);
}

const dupCardIds = cards.map((c) => c.id).filter((id, i, all) => all.indexOf(id) !== i);
for (const id of new Set(dupCardIds)) fail(`duplicate card id: ${id}`);

if (failures > 0) {
  console.error(`\nKnowledgebase validation failed: ${failures} issue(s).`);
  process.exit(1);
}
console.log(
  `✓ knowledgebase valid: ${cards.length} cards, ${programs.length} programs, ${SPEND_CATEGORY_IDS.length} categories`,
);
