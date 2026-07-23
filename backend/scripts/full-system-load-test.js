const http = require('http');
const https = require('https');

// ============================================================================
// 🚀 MASTER ALL-API 5,000 REQUESTS STRESS TESTER FOR RENDER SERVER
// ============================================================================

const BASE_URL = process.env.RENDER_URL || 'https://meal-book-backend.onrender.com';
const TOTAL_REQUESTS = 5000; // 5,000 requests per API endpoint
const CONCURRENCY = 100;     // 100 parallel connections

console.log(`\n================================================================`);
console.log(` 💥 STARTING MASTER ALL-API 5,000 REQUESTS LOAD TEST ON RENDER SERVER`);
console.log(` 🌐 Base URL         : ${BASE_URL}`);
console.log(` 📊 Target Volume    : ${TOTAL_REQUESTS} requests per API`);
console.log(` ⚡ Parallel Threads : ${CONCURRENCY} concurrent connections`);
console.log(`================================================================\n`);

let authToken = '';
const summaryResults = [];

function requestAsync(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const reqHeaders = {
      'User-Agent': 'MealBook-5000LoadTester/1.0',
      'Content-Type': 'application/json',
      ...headers,
    };

    if (authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    const req = client.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => { resBody += chunk; });
      res.on('end', () => {
        const latency = Date.now() - reqStart;
        resolve({
          statusCode: res.statusCode,
          latency,
          data: resBody ? safelyParseJson(resBody) : null,
        });
      });
    });

    req.on('error', () => {
      const latency = Date.now() - reqStart;
      resolve({ statusCode: 500, latency, data: null });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

function safelyParseJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

async function obtainAuthTokenAndSetupMess() {
  console.log('🔑 Step 1: Registering user & initializing Mess session on Render...');
  const testEmail = `loadtester_${Date.now()}@test.com`;

  // 1. Register temp user
  const regRes = await requestAsync(`${BASE_URL}/auth/register`, 'POST', {
    name: 'Load Tester 5000',
    email: testEmail,
    password: 'Password123!',
    phone: '01700000000',
  });

  if (regRes.data?.data?.accessToken) {
    authToken = regRes.data.data.accessToken;
    console.log(`   ✅ Auth Token acquired!`);

    // 2. Start Month Session
    await requestAsync(`${BASE_URL}/billing/start-month`, 'POST', { monthName: 'July 2026' });

    // 3. Create Mess for this user
    await requestAsync(`${BASE_URL}/mess`, 'POST', { name: 'Stress Test Haven Mess' });
    console.log(`   🏠 Mess & Active Month initialized for Load Test User!\n`);
  } else {
    console.log(`   ⚠️ Auth setup fallback mode.\n`);
  }
}

async function testApiEndpoint(apiName, path, method = 'GET', body = null) {
  console.log(`▶️ Testing API: [${method}] ${path} (${TOTAL_REQUESTS} reqs)...`);

  const latencies = [];
  let successCount = 0;
  let failCount = 0;
  let activePool = 0;
  let sentRequests = 0;
  let completedRequests = 0;
  const startTime = Date.now();

  await new Promise((resolve) => {
    function next() {
      if (sentRequests >= TOTAL_REQUESTS && activePool === 0) return resolve();

      while (activePool < CONCURRENCY && sentRequests < TOTAL_REQUESTS) {
        activePool++;
        sentRequests++;

        requestAsync(`${BASE_URL}${path}`, method, body).then((res) => {
          activePool--;
          completedRequests++;
          latencies.push(res.latency);

          if (res.statusCode >= 200 && res.statusCode < 400) successCount++;
          else failCount++;

          if (completedRequests % 1000 === 0 || completedRequests === TOTAL_REQUESTS) {
            process.stdout.write(`   ⚡ Progress: ${completedRequests}/${TOTAL_REQUESTS} reqs...\r`);
          }

          next();
        });
      }
    }
    next();
  });

  const totalTimeMs = Date.now() - startTime;
  const reqPerSec = Math.round((completedRequests / totalTimeMs) * 1000);
  latencies.sort((a, b) => a - b);

  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const maxLat = latencies[latencies.length - 1] || 0;

  summaryResults.push({
    apiName,
    method,
    path,
    reqPerSec,
    successCount,
    failCount,
    avgLatencyMs: avgLatency,
    p95Ms: p95,
    maxLatencyMs: maxLat,
  });

  console.log(`\n   ✅ Finished: ${successCount}/${TOTAL_REQUESTS} Success | Avg: ${avgLatency}ms | P95: ${p95}ms | Req/Sec: ${reqPerSec}\n`);
}

async function runMasterSuite() {
  await obtainAuthTokenAndSetupMess();

  const apisToTest = [
    { name: '1. Health Check', path: '/health', method: 'GET' },
    { name: '2. System Metrics Status', path: '/system/status', method: 'GET' },
    { name: '3. Login Verification', path: '/auth/login', method: 'POST', body: { email: 'manager@test.com', password: 'Password123!' } },
    { name: '4. Mess Members List', path: '/mess/members', method: 'GET' },
    { name: '5. Live Meals Status', path: '/meals/live', method: 'GET' },
    { name: '6. Submit Meal Request', path: '/meals/request', method: 'POST', body: { type: 'LUNCH', category: 'OFF', count: 1 } },
    { name: '7. Create Bazaar Item', path: '/bazaar', method: 'POST', body: { items: 'Rice 10kg, Fish 2kg' } },
    { name: '8. Bazaar Items List', path: '/bazaar/list', method: 'GET' },
    { name: '9. Billing Summary Sheet', path: '/billing/summary', method: 'GET' },
    { name: '10. Save FCM Token', path: '/notifications/token', method: 'POST', body: { fcmToken: 'sample_token_load_test' } },
    { name: '11. User Notifications', path: '/notifications', method: 'GET' },
    { name: '12. System Dashboard UI', path: '/system/dashboard', method: 'GET' },
  ];

  for (const api of apisToTest) {
    await testApiEndpoint(api.name, api.path, api.method, api.body);
  }

  console.log(`========================================================================================`);
  console.log(` 🏆 MASTER ALL-API 5,000 REQUESTS STRESS REPORT (RENDER SERVER)`);
  console.log(`========================================================================================`);
  console.table(summaryResults);
  console.log(`========================================================================================\n`);
}

runMasterSuite();
