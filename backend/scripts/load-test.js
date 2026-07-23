const http = require('http');
const https = require('https');

// ============================================================================
// 🚀 HIGH-PERFORMANCE 1,000 REQUESTS/SEC AUTOMATED STRESS TEST SCRIPT
// ============================================================================

const TARGET_URL = process.env.TEST_URL || 'http://localhost:3000/system/status';
const TOTAL_REQUESTS = 1000; // Target total requests
const CONCURRENCY = 100;      // Simultaneous active connections

console.log(`\n================================================================`);
console.log(` 🔥 STARTING AUTOMATED LOAD STRESS TEST`);
console.log(` 🎯 Target Endpoint : ${TARGET_URL}`);
console.log(` 📊 Total Requests  : ${TOTAL_REQUESTS} requests`);
console.log(` ⚡ Concurrency     : ${CONCURRENCY} parallel connections`);
console.log(`================================================================\n`);

let completedRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const latencies = [];

const startTime = Date.now();

function makeRequest(client, options, callback) {
  const reqStart = Date.now();
  
  const req = client.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      const latency = Date.now() - reqStart;
      latencies.push(latency);

      if (res.statusCode >= 200 && res.statusCode < 400) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
      callback();
    });
  });

  req.on('error', (err) => {
    failedRequests++;
    const latency = Date.now() - reqStart;
    latencies.push(latency);
    callback();
  });

  req.end();
}

async function runBatch() {
  const parsedUrl = new URL(TARGET_URL);
  const client = parsedUrl.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'User-Agent': 'MealBook-StressTester/1.0',
    },
  };

  let activePool = 0;
  let sentRequests = 0;

  return new Promise((resolve) => {
    function next() {
      if (sentRequests >= TOTAL_REQUESTS && activePool === 0) {
        return resolve();
      }

      while (activePool < CONCURRENCY && sentRequests < TOTAL_REQUESTS) {
        activePool++;
        sentRequests++;

        makeRequest(client, options, () => {
          activePool--;
          completedRequests++;
          if (completedRequests % 200 === 0 || completedRequests === TOTAL_REQUESTS) {
            process.stdout.write(`⚡ Progress: ${completedRequests}/${TOTAL_REQUESTS} requests completed...\r`);
          }
          next();
        });
      }
    }

    next();
  });
}

async function startTest() {
  await runBatch();

  const totalTimeMs = Date.now() - startTime;
  const totalTimeSec = (totalTimeMs / 1000).toFixed(2);
  const reqPerSec = Math.round((completedRequests / totalTimeMs) * 1000);

  latencies.sort((a, b) => a - b);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`\n\n================================================================`);
  console.log(` 🏆 AUTOMATED LOAD TEST RESULTS`);
  console.log(`================================================================`);
  console.log(` ⏱️  Total Duration      : ${totalTimeSec} seconds`);
  console.log(` 🚀 Requests Per Sec     : ${reqPerSec} req/sec`);
  console.log(` ✅ Successful Requests : ${successfulRequests}`);
  console.log(` ❌ Failed Requests     : ${failedRequests}`);
  console.log(`----------------------------------------------------------------`);
  console.log(` ⚡ Minimum Latency     : ${minLatency} ms`);
  console.log(` ⚡ Average Latency     : ${avgLatency} ms`);
  console.log(` ⚡ 50th Percentile (P50): ${p50} ms`);
  console.log(` ⚡ 95th Percentile (P95): ${p95} ms`);
  console.log(` ⚡ 99th Percentile (P99): ${p99} ms`);
  console.log(` ⚡ Maximum Latency     : ${maxLatency} ms`);
  console.log(`================================================================\n`);
}

startTest();
