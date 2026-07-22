let memoryChart;
const maxPoints = 20;
let rawMetrics = [];
let routeChartsMap = new Map(); // Stores Chart.js instances for each API
let routeHistoryMap = new Map(); // Stores latency history for each API

function initMemoryChart() {
  const ctx = document.getElementById('memoryChart').getContext('2d');
  memoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Heap Used (MB)',
          data: [],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'RSS Memory (MB)',
          data: [],
          borderColor: '#10b981',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { labels: { color: '#f8fafc' } } }
    }
  });
}

async function fetchMetrics() {
  try {
    const res = await fetch('/system/status');
    const json = await res.json();
    const data = json.data || json;

    if (!data || !data.uptime) return;

    // Update Top Cards
    document.getElementById('uptimeVal').innerText = data.uptime.formatted;
    document.getElementById('uptimeSec').innerText = data.uptime.seconds + 's running';
    document.getElementById('heapVal').innerText = data.memory.heapUsedMb + ' MB';
    document.getElementById('rssVal').innerText = 'RSS: ' + data.memory.processRssMb + ' MB';

    document.getElementById('dbLatencyVal').innerText = data.database.latencyMs;
    document.getElementById('dbStatusVal').innerText = 'Supabase Status: ' + data.database.status;

    if (data.queue) {
      document.getElementById('queueActiveVal').innerText = data.queue.active + ' Active';
      document.getElementById('queueSubVal').innerText = `Waiting: ${data.queue.waiting} | Failed: ${data.queue.failed} | Done: ${data.queue.completed}`;
    }

    document.getElementById('lastUpdated').innerText = 'Live ' + new Date().toLocaleTimeString();

    // Update Memory Chart
    const timeLabel = new Date().toLocaleTimeString();
    memoryChart.data.labels.push(timeLabel);
    memoryChart.data.datasets[0].data.push(parseFloat(data.memory.heapUsedMb));
    memoryChart.data.datasets[1].data.push(parseFloat(data.memory.processRssMb));

    if (memoryChart.data.labels.length > maxPoints) {
      memoryChart.data.labels.shift();
      memoryChart.data.datasets[0].data.shift();
      memoryChart.data.datasets[1].data.shift();
    }
    memoryChart.update();

    // Update API Metrics & Accordion List
    rawMetrics = data.apiMetrics || [];
    updateRouteHistory(rawMetrics, timeLabel);
    renderAccordionList(rawMetrics);
    updateRouteCharts();
  } catch (err) {
    console.error('Metrics fetch error:', err);
  }
}

function updateRouteHistory(metrics, timeLabel) {
  metrics.forEach(m => {
    const key = `${m.method}:${m.path}`;
    if (!routeHistoryMap.has(key)) {
      routeHistoryMap.set(key, []);
    }
    const history = routeHistoryMap.get(key);
    history.push({ time: timeLabel, latency: m.averageLatencyMs });
    if (history.length > maxPoints) history.shift();
  });
}

function renderAccordionList(metrics) {
  const container = document.getElementById('accordionContainer');
  if (!metrics || metrics.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No API calls recorded yet. Hit some endpoints in Postman/Swagger!</div>';
    return;
  }

  const filterQuery = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered = metrics.filter(m => m.path.toLowerCase().includes(filterQuery) || m.method.toLowerCase().includes(filterQuery));

  // If container currently has placeholder text, clear it
  if (container.querySelector('.text-muted') && container.children.length === 1) {
    container.innerHTML = '';
  }

  filtered.forEach(m => {
    const key = `${m.method}:${m.path}`;
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    let itemEl = document.getElementById(`item-${safeKey}`);

    let latClass = 'lat-fast';
    if (m.averageLatencyMs > 100 && m.averageLatencyMs <= 300) latClass = 'lat-med';
    if (m.averageLatencyMs > 300) latClass = 'lat-slow';

    if (!itemEl) {
      // 🟢 Create new persistent DOM node if it doesn't exist yet
      itemEl = document.createElement('div');
      itemEl.className = 'accordion-item';
      itemEl.id = `item-${safeKey}`;
      itemEl.setAttribute('data-key', key);

      itemEl.innerHTML = `
        <div class="accordion-header" onclick="toggleAccordion('${key}', '${safeKey}')">

          <div class="accordion-left">
            <span class="method method-${m.method}">${m.method}</span>
            <span style="font-weight:600; color:#fff; font-size:14px;">${m.path}</span>
          </div>
          <div class="accordion-right">
            <span style="font-size:12px; color:var(--text-muted);">Calls: <strong style="color:#fff;" id="calls-${safeKey}">${m.totalRequests}</strong></span>
            <span class="latency-tag ${latClass}" id="latTag-${safeKey}">⚡ ${m.averageLatencyMs} ms</span>
            <span class="chevron">▼</span>
          </div>
        </div>

        <div class="accordion-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted);">Success / Error</div>
              <div style="font-size:14px; font-weight:700; color:#34d399; margin-top:2px;" id="succ-${safeKey}">✅ ${m.successfulRequests} / <span style="color:#f87171;">❌ ${m.failedRequests}</span></div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg Latency</div>
              <div style="font-size:14px; font-weight:700; color:#818cf8; margin-top:2px;" id="avgLat-${safeKey}">⚡ ${m.averageLatencyMs} ms</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg RAM Used</div>
              <div style="font-size:14px; font-weight:700; color:#a5b4fc; margin-top:2px;" id="ram-${safeKey}">🧠 ${m.averageRamMb || '0.05'} MB</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg CPU Time</div>
              <div style="font-size:14px; font-weight:700; color:#facc15; margin-top:2px;" id="cpu-${safeKey}">⚙️ ${m.averageCpuMs || '0.20'} ms</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted);">Last Hit Time</div>
              <div style="font-size:12px; font-weight:600; color:#fff; margin-top:4px;" id="lastTime-${safeKey}">${new Date(m.lastRequestedAt).toLocaleTimeString()}</div>
            </div>
          </div>


          <div style="font-size:12px; font-weight:600; margin-bottom:8px; color:var(--text-muted);">📈 Real-Time Response Latency Trend (ms):</div>
          <div style="height:140px; width:100%;">
            <canvas id="chart-${safeKey}"></canvas>
          </div>
        </div>
      `;
      container.appendChild(itemEl);

      container.appendChild(itemEl);
    } else {
      // 🟢 Smoothly update existing numbers without destroying canvas
      document.getElementById(`calls-${safeKey}`).innerText = m.totalRequests;
      document.getElementById(`succ-${safeKey}`).innerHTML = `✅ ${m.successfulRequests} / <span style="color:#f87171;">❌ ${m.failedRequests}</span>`;
      document.getElementById(`avgLat-${safeKey}`).innerText = `⚡ ${m.averageLatencyMs} ms`;
      if (document.getElementById(`ram-${safeKey}`)) document.getElementById(`ram-${safeKey}`).innerText = `🧠 ${m.averageRamMb || '0.05'} MB`;
      if (document.getElementById(`cpu-${safeKey}`)) document.getElementById(`cpu-${safeKey}`).innerText = `⚙️ ${m.averageCpuMs || '0.20'} ms`;
      document.getElementById(`lastTime-${safeKey}`).innerText = new Date(m.lastRequestedAt).toLocaleTimeString();
      
      const tag = document.getElementById(`latTag-${safeKey}`);
      tag.className = `latency-tag ${latClass}`;
      tag.innerText = `⚡ ${m.averageLatencyMs} ms`;
    }
  });
}

function toggleAccordion(key, safeKey) {
  const item = document.getElementById(`item-${safeKey}`);
  if (!item) return;
  
  item.classList.toggle('active');
  
  if (item.classList.contains('active')) {
    setTimeout(() => initRouteChart(key, safeKey), 50);
  }
}


function initRouteChart(key, safeKey) {
  const canvas = document.getElementById(`chart-${safeKey}`);
  if (!canvas || routeChartsMap.has(key)) return;

  const history = routeHistoryMap.get(key) || [];
  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => h.time),
      datasets: [
        {
          label: 'Latency (ms)',
          data: history.map(h => h.latency),
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.15)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
      },
      plugins: { legend: { display: false } }
    }
  });

  routeChartsMap.set(key, chart);
}

function updateRouteCharts() {
  routeChartsMap.forEach((chart, key) => {
    const history = routeHistoryMap.get(key) || [];
    chart.data.labels = history.map(h => h.time);
    chart.data.datasets[0].data = history.map(h => h.latency);
    chart.update();
  });
}

function filterRoutes() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  document.querySelectorAll('.accordion-item').forEach(el => {
    const key = el.getAttribute('data-key').toLowerCase();
    el.style.display = key.includes(query) ? 'block' : 'none';
  });
}

initMemoryChart();
fetchMetrics();
setInterval(fetchMetrics, 3000);
