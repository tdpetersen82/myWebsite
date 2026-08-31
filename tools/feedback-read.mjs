#!/usr/bin/env node
// Read (and optionally clear) feedback + contact submissions from KV.
//
//   node tools/feedback-read.mjs           print all pending messages
//   node tools/feedback-read.mjs --count   just the counts (for report runs)
//   node tools/feedback-read.mjs --clear   print all, then delete what was printed
//
// Uses the wrangler CLI (already authed for deploys). Messages live under
// feedback:{ts}:{id} and contact:{ts}:{id} in LIMESTONE_KV.

import { execFileSync } from 'node:child_process';

const NAMESPACE = '1da1bd544eda433fa4d77d45db0a9b3b'; // LIMESTONE_KV (wrangler.jsonc)
const args = process.argv.slice(2);
const countOnly = args.includes('--count');
const clear = args.includes('--clear');

function kv(...cmd) {
  return execFileSync('npx', ['wrangler', 'kv', ...cmd, `--namespace-id=${NAMESPACE}`, '--remote'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function listKeys(prefix) {
  const out = kv('key', 'list', `--prefix=${prefix}`);
  const start = out.indexOf('[');
  return start === -1 ? [] : JSON.parse(out.slice(start)).map(k => k.name);
}

const feedback = listKeys('feedback:');
const contact = listKeys('contact:');

if (countOnly) {
  console.log(`feedback: ${feedback.length} pending · contact: ${contact.length} pending`);
  process.exit(0);
}

if (feedback.length + contact.length === 0) {
  console.log('No pending messages.');
  process.exit(0);
}

for (const [label, keys] of [['FEEDBACK', feedback], ['CONTACT', contact]]) {
  if (!keys.length) continue;
  console.log(`\n===== ${label} (${keys.length}) =====`);
  for (const key of keys.sort()) {
    let entry;
    try { entry = JSON.parse(kv('key', 'get', key)); }
    catch { console.log(`\n--- ${key}\n  (unreadable)`); continue; }
    console.log(`\n--- ${entry.ts || key}${entry.page ? `  ·  about: ${entry.page}` : ''}`);
    if (entry.name || entry.email) console.log(`  from: ${entry.name || ''} ${entry.email || ''}`.trimEnd());
    console.log('  ' + String(entry.message || '').replace(/\n/g, '\n  '));
  }
}

if (clear) {
  const all = [...feedback, ...contact];
  for (const key of all) kv('key', 'delete', key);
  console.log(`\nCleared ${all.length} message(s).`);
} else {
  console.log('\n(run with --clear to delete after reading)');
}
