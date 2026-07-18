/**
 * FR-013 / SC-003 gate: en-CA.json and fr-CA.json must have identical key
 * sets. Exit 1 on divergence — wired as a required CI job.
 */
const enCA = require('../src/en-CA.json');
const frCA = require('../src/fr-CA.json');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const en = new Set(flatten(enCA));
const fr = new Set(flatten(frCA));
const missingInFr = [...en].filter((k) => !fr.has(k));
const missingInEn = [...fr].filter((k) => !en.has(k));

if (missingInFr.length || missingInEn.length) {
  for (const k of missingInFr) console.error(`✗ missing in fr-CA: ${k}`);
  for (const k of missingInEn) console.error(`✗ missing in en-CA: ${k}`);
  process.exit(1);
}
console.log(`✓ i18n key parity: ${en.size} keys in both en-CA and fr-CA`);
