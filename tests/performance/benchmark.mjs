/**
 * benchmark.mjs — Autocannon-based HTTP latency benchmark for Connect.dev
 *
 * Measures p50, p90, p95, p99 request-response latency, throughput (req/s),
 * and error rates for every major API endpoint.
 *
 * Usage:
 *   node tests/performance/benchmark.mjs
 *
 * Environment variables (all optional):
 *   API_URL          — Server base URL (default: http://localhost:5000)
 *   BENCH_DURATION   — Seconds per endpoint (default: 10)
 *   BENCH_CONNECTIONS — Concurrent connections (default: 10)
 *   BENCH_EMAIL      — Login email (default: testuser0@example.test)
 *   BENCH_PASSWORD   — Login password (default: ConnectTestOnly!1)
 */

import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..', '..');
const outputDir = resolve(root, 'artifacts', 'performance');

const apiUrl = process.env.API_URL || 'http://localhost:5000';
const duration = Number(process.env.BENCH_DURATION || 10);
const connections = Number(process.env.BENCH_CONNECTIONS || 10);
const email = process.env.BENCH_EMAIL || 'testuser0@example.test';
const password = process.env.BENCH_PASSWORD || 'ConnectTestOnly!1';

// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (str, len) => String(str).padEnd(len);
const padR = (str, len) => String(str).padStart(len);

const fmtMs = (us) => {
  if (us == null || us === 0) return '-';
  return (us / 1000).toFixed(2);                 // autocannon reports in μs
};

// ─── Login ──────────────────────────────────────────────────────────────────

const login = async () => {
  console.log(`\n🔐 Logging in as ${email} …`);
  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  const token = json.data?.token || json.token;
  if (!token) throw new Error('Login response did not contain a token');
  console.log('✅ Authenticated\n');
  return token;
};

// ─── Endpoints to benchmark ─────────────────────────────────────────────────

const buildEndpoints = () => [
  // Public / health
  { name: 'GET /health',                  method: 'GET',  path: '/health',                    auth: false },
  { name: 'GET /readyz',                  method: 'GET',  path: '/readyz',                    auth: false },

  // Authenticated feed / list
  { name: 'GET /api/rooms/feed',          method: 'GET',  path: '/api/rooms/feed',            auth: true },
  { name: 'GET /api/issues/feed',         method: 'GET',  path: '/api/issues/feed',           auth: true },
  { name: 'GET /api/rooms/my-rooms',      method: 'GET',  path: '/api/rooms/my-rooms',        auth: true },
  { name: 'GET /api/issues/my',           method: 'GET',  path: '/api/issues/my',             auth: true },
  { name: 'GET /api/users/suggestions',   method: 'GET',  path: '/api/users/suggestions?tech=react&experienceLevel=mid', auth: true },
  { name: 'GET /api/activity/dashboard',  method: 'GET',  path: '/api/activity/dashboard',    auth: true },
  { name: 'GET /api/auth/me',             method: 'GET',  path: '/api/auth/me',               auth: true },
];

// ─── Run one benchmark ──────────────────────────────────────────────────────

const runBenchmark = async (endpoint, token) => {
  // Dynamic import so npx autocannon is the only requirement
  const autocannon = (await import('autocannon')).default;

  const opts = {
    url: `${apiUrl}${endpoint.path}`,
    method: endpoint.method,
    connections,
    duration,
    headers: {}
  };

  if (endpoint.auth && token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolveRun, rejectRun) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) return rejectRun(err);
      resolveRun(result);
    });
    // Suppress autocannon's built-in progress bar
    autocannon.track(instance, { renderProgressBar: false });
  });
};

// ─── Main ───────────────────────────────────────────────────────────────────

const main = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Connect.dev  —  HTTP Latency Benchmark (autocannon)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Target:      ${apiUrl}`);
  console.log(`  Connections: ${connections}`);
  console.log(`  Duration:    ${duration}s per endpoint`);

  // 1. Login
  const token = await login();

  // 2. Run benchmarks
  const endpoints = buildEndpoints();
  const results = [];

  for (const ep of endpoints) {
    process.stdout.write(`⏱  Benchmarking ${ep.name} …`);
    const raw = await runBenchmark(ep, token);
    const entry = {
      endpoint: ep.name,
      requests: raw.requests.total,
      throughput: raw.requests.average,       // req/s
      latency: {
        p50:  raw.latency.p50,               // μs
        p90:  raw.latency.p90,
        p95:  raw.latency.p95 ?? raw.latency.p97_5,
        p99:  raw.latency.p99,
        avg:  raw.latency.average,
        max:  raw.latency.max,
        min:  raw.latency.min
      },
      errors: raw.errors,
      timeouts: raw.timeouts,
      non2xx: raw.non2xx
    };
    results.push(entry);
    console.log(` done  (p95 = ${fmtMs(entry.latency.p95)} ms)`);
  }

  // 3. Print table
  console.log('\n');
  const hdrSep = '─'.repeat(120);
  console.log(hdrSep);
  console.log(
    pad('Endpoint', 35),
    padR('Req/s', 8),
    padR('p50 ms', 10),
    padR('p90 ms', 10),
    padR('p95 ms', 10),
    padR('p99 ms', 10),
    padR('Avg ms', 10),
    padR('Max ms', 10),
    padR('Errors', 8)
  );
  console.log(hdrSep);

  for (const r of results) {
    console.log(
      pad(r.endpoint, 35),
      padR(r.throughput.toFixed(1), 8),
      padR(fmtMs(r.latency.p50), 10),
      padR(fmtMs(r.latency.p90), 10),
      padR(fmtMs(r.latency.p95), 10),
      padR(fmtMs(r.latency.p99), 10),
      padR(fmtMs(r.latency.avg), 10),
      padR(fmtMs(r.latency.max), 10),
      padR(r.errors + r.timeouts, 8)
    );
  }
  console.log(hdrSep);

  // 4. Save JSON report
  await mkdir(outputDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    config: { apiUrl, connections, durationSeconds: duration },
    results
  };
  const jsonPath = resolve(outputDir, 'benchmark-latency.json');
  await writeFile(jsonPath, JSON.stringify(report, null, 2));

  // 5. Save Markdown report
  const mdRows = results.map((r) =>
    `| ${r.endpoint} | ${r.throughput.toFixed(1)} | ${fmtMs(r.latency.p50)} | ${fmtMs(r.latency.p90)} | ${fmtMs(r.latency.p95)} | ${fmtMs(r.latency.p99)} | ${fmtMs(r.latency.avg)} | ${fmtMs(r.latency.max)} | ${r.errors + r.timeouts} |`
  );
  const md = [
    '# Connect.dev — HTTP Latency Benchmark',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `| Config | Value |`,
    `|---|---|`,
    `| Target | ${apiUrl} |`,
    `| Connections | ${connections} |`,
    `| Duration | ${duration}s per endpoint |`,
    '',
    `| Endpoint | Req/s | p50 ms | p90 ms | p95 ms | p99 ms | Avg ms | Max ms | Errors |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...mdRows,
    ''
  ].join('\n');
  const mdPath = resolve(outputDir, 'benchmark-latency.md');
  await writeFile(mdPath, md);

  console.log(`\n📄 JSON report: ${jsonPath}`);
  console.log(`📄 Markdown report: ${mdPath}`);
  console.log('\n✅ Benchmark complete!\n');
};

main().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exitCode = 1;
});
