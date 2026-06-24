// Cross-platform agent activity logger — called by the PreToolUse/PostToolUse hooks.
// Appends one compact line to .claude/agent-log.txt per agent invocation.
const fs = require('fs');
let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  const d = JSON.parse(raw || '{}');
  const event = process.argv[2] || 'start';
  const agent = d.subagent_type || 'agent';
  const desc = d.description || '—';
  const hhmm = new Date().toTimeString().slice(0, 5);
  fs.appendFileSync('.claude/agent-log.txt', `${hhmm} [${event}] ${agent} | ${desc}\n`);
});
