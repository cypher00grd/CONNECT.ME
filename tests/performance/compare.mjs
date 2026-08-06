import { spawn } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..', '..');
const serverDir = resolve(root, 'server');
const outputDir = resolve(root, 'artifacts', 'performance');
const redisUrl = process.env.REDIS_URL || 'redis://:connect_redis_test@127.0.0.1:6380';
const runCount = Number(process.env.PERF_RUNS || (process.env.CI ? 5 : 3));
const apiUrl = 'http://127.0.0.1:5002';
const useDockerK6 = process.env.K6_DOCKER === 'true';

const modes = [
  { id: 'mongo-only', redisUrl: '', cache: 'false' },
  { id: 'redis-no-cache', redisUrl, cache: 'false' },
  { id: 'redis-cache', redisUrl, cache: 'true' }
];

const runCommand = (command, args, options = {}) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || 'inherit',
    shell: process.platform === 'win32'
  });
  child.once('error', rejectRun);
  child.once('exit', (code) => {
    if (code === 0) resolveRun();
    else rejectRun(new Error(`${command} exited with code ${code}`));
  });
});

const waitForUrl = async (url, timeoutMs = 30000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const stopChild = async (child) => {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolveStop) => {
    child.once('exit', resolveStop);
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolveStop();
    }, 5000).unref();
  });
};

const login = async () => {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'testuser0@example.test',
      password: 'ConnectTestOnly!1'
    })
  });
  if (!response.ok) throw new Error(`Benchmark login failed with ${response.status}`);
  const payload = await response.json();
  return payload.data?.token;
};

const metricValues = (summary) => ({
  p50: summary.metrics?.http_req_duration?.values?.['p(50)'] ?? null,
  p95: summary.metrics?.http_req_duration?.values?.['p(95)'] ?? null,
  p99: summary.metrics?.http_req_duration?.values?.['p(99)'] ?? null,
  requestsPerSecond: summary.metrics?.http_reqs?.values?.rate ?? null,
  errorRate: summary.metrics?.http_req_failed?.values?.rate ?? null
});

await mkdir(outputDir, { recursive: true });
await runCommand('npm', ['--prefix', 'server', 'run', 'test:seed', '--', '--profile=performance']);

const results = [];

for (const mode of modes) {
  for (let run = 1; run <= runCount; run += 1) {
    const server = spawn(process.execPath, ['scripts/start-test-server.mjs'], {
      cwd: serverDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '5002',
        REDIS_URL: mode.redisUrl,
        REDIS_CACHE_ENABLED: mode.cache,
        REDIS_KEY_PREFIX: `connect:perf:${mode.id}:${run}`,
        EXPOSE_CACHE_HEADERS: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverLog = '';
    server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
    server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

    try {
      await waitForUrl(`${apiUrl}/livez`);
      const token = await login();
      if (!token) throw new Error('Benchmark login did not return a token');

      // Warm-up is excluded from the measured k6 run.
      for (let index = 0; index < 30; index += 1) {
        await fetch(`${apiUrl}/api/users/suggestions?tech=react`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const summaryPath = resolve(outputDir, `${mode.id}-${run}.json`);
      const k6Environment = {
        K6_API_URL: apiUrl,
        K6_AUTH_TOKEN: token,
        K6_VUS: process.env.K6_VUS || '10',
        K6_DURATION: process.env.K6_DURATION || '30s'
      };
      if (useDockerK6) {
        const relativeSummary = `artifacts/performance/${mode.id}-${run}.json`;
        await runCommand('docker', [
          'run', '--rm', '--network', 'host',
          '-e', 'K6_API_URL',
          '-e', 'K6_AUTH_TOKEN',
          '-e', 'K6_VUS',
          '-e', 'K6_DURATION',
          '-v', `${root}:/work`,
          'grafana/k6:latest',
          'run', `--summary-export=/work/${relativeSummary}`, '/work/tests/performance/feed.js'
        ], { env: k6Environment });
      } else {
        await runCommand('k6', [
          'run',
          `--summary-export=${summaryPath}`,
          resolve(root, 'tests', 'performance', 'feed.js')
        ], { env: k6Environment });
      }

      const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
      results.push({ mode: mode.id, run, ...metricValues(summary) });
    } catch (error) {
      throw new Error(`${mode.id} run ${run} failed: ${error.message}\n${serverLog.slice(-3000)}`);
    } finally {
      await stopChild(server);
    }
  }
}

const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const aggregate = modes.map((mode) => {
  const runs = results.filter((result) => result.mode === mode.id);
  return {
    mode: mode.id,
    runs: runs.length,
    p50: median(runs.map((run) => run.p50)),
    p95: median(runs.map((run) => run.p95)),
    p99: median(runs.map((run) => run.p99)),
    requestsPerSecond: median(runs.map((run) => run.requestsPerSecond)),
    errorRate: median(runs.map((run) => run.errorRate))
  };
});

const mongo = aggregate.find((entry) => entry.mode === 'mongo-only');
const cached = aggregate.find((entry) => entry.mode === 'redis-cache');
const p95Improvement = mongo?.p95 && cached?.p95
  ? ((mongo.p95 - cached.p95) / mongo.p95) * 100
  : null;
const passed = Number.isFinite(p95Improvement)
  && p95Improvement >= 30
  && (cached.errorRate ?? 1) < 0.01;

const report = {
  generatedAt: new Date().toISOString(),
  runCount,
  aggregate,
  p95ImprovementPercent: p95Improvement,
  acceptance: { requiredP95ImprovementPercent: 30, maximumErrorRate: 0.01, passed },
  rawRuns: results
};
await writeFile(resolve(outputDir, 'redis-comparison.json'), JSON.stringify(report, null, 2));

const rows = aggregate.map((entry) => (
  `| ${entry.mode} | ${entry.runs} | ${entry.p50?.toFixed(2) ?? 'n/a'} | ${entry.p95?.toFixed(2) ?? 'n/a'} | ${entry.p99?.toFixed(2) ?? 'n/a'} | ${entry.requestsPerSecond?.toFixed(2) ?? 'n/a'} | ${((entry.errorRate ?? 0) * 100).toFixed(2)}% |`
));
const markdown = `# Redis Performance Comparison\n\n` +
  `Generated: ${report.generatedAt}\n\n` +
  `| Mode | Runs | p50 ms | p95 ms | p99 ms | req/s | errors |\n` +
  `|---|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\n` +
  `Mongo-only to cached Redis p95 improvement: ${p95Improvement?.toFixed(2) ?? 'n/a'}%\n\n` +
  `Acceptance: ${passed ? 'PASS' : 'FAIL'}\n`;
await writeFile(resolve(outputDir, 'redis-comparison.md'), markdown);
console.log(markdown);

if (!passed) process.exitCode = 1;
