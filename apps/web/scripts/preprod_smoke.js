#!/usr/bin/env node
/*
 * preprod_smoke.js
 * Runs 3 E2E blocks sequentially (API, critical UI, load) and prints a summary per block.
 * Exit code is non-zero if any block fails.
 */

const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { process.stdout.write(d); out += d.toString(); });
    child.stderr.on('data', (d) => { process.stderr.write(d); err += d.toString(); });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

function extractSummary(text) {
  // Look for lines like: "1 passed", "2 passed", "1 failed" or Playwright list reporter lines
  const summary = { passed: 0, failed: 0, total: 0 };
  // Count passed scenarios by regex on list reporter checkmarks and 'passed (' line
  const passedList = (text.match(/\n\s*✓\s/g) || []).length;
  const failedList = (text.match(/\n\s*✘\s/g) || []).length;
  const mPassed = text.match(/(\d+)\s+passed/);
  const mFailed = text.match(/(\d+)\s+failed/);
  const passed = mPassed ? parseInt(mPassed[1], 10) : passedList;
  const failed = mFailed ? parseInt(mFailed[1], 10) : failedList;
  summary.passed = passed || 0;
  summary.failed = failed || 0;
  summary.total = summary.passed + summary.failed;
  return summary;
}

(async () => {
  let exit = 0;
  const path = require('path');
  const webRoot = path.resolve(__dirname, '..');
  const blocks = [
    { name: 'API', cmd: 'npm', args: ['run', 'e2e:api'], cwd: webRoot },
    { name: 'UI Critical', cmd: 'npm', args: ['run', 'e2e:critical'], cwd: webRoot },
    { name: 'Load', cmd: 'npm', args: ['run', 'e2e:load'], cwd: webRoot },
  ];

  const results = [];
  for (const b of blocks) {
    console.log(`\n=== Running ${b.name} ===`);
    const r = await run('npm', ['run', '--silent', ...b.args.slice(1)], { cwd: b.cwd, env: process.env });
    const sum = extractSummary(r.out + '\n' + r.err);
    results.push({ name: b.name, code: r.code, summary: sum });
    if (r.code !== 0) exit = r.code;
    console.log(`--- ${b.name} summary: PASSED=${sum.passed} FAILED=${sum.failed} TOTAL=${sum.total} (exit=${r.code}) ---`);
  }

  console.log('\n================ Preprod Smoke Summary ================');
  for (const r of results) {
    console.log(`${r.name}: PASSED=${r.summary.passed} FAILED=${r.summary.failed} TOTAL=${r.summary.total} (exit=${r.code})`);
  }
  const totalPassed = results.reduce((a, r) => a + r.summary.passed, 0);
  const totalFailed = results.reduce((a, r) => a + r.summary.failed, 0);
  console.log(`Overall: PASSED=${totalPassed} FAILED=${totalFailed}`);

  process.exit(exit);
})();
