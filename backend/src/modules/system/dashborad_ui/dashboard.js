let memoryChart;
const maxPoints = 20;
let rawMetrics = [];
let selectedMethod = 'ALL';
let routeChartsMap = new Map();
let routeHistoryMap = new Map();

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
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.15)',
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
    if (document.getElementById('healthScoreVal')) {
      const score = data.healthScore !== undefined ? data.healthScore : 100;
      document.getElementById('healthScoreVal').innerText = score + '%';
      const statusText = score >= 90 ? 'EXCELLENT' : score >= 75 ? 'GOOD' : 'WARNING';
      const statusColor = score >= 90 ? '#34d399' : score >= 75 ? '#fbbf24' : '#f87171';
      document.getElementById('healthScoreStatus').innerHTML = `Status: <strong style="color:${statusColor}">${statusText}</strong>`;
    }

    if (data.trafficSummary) {
      document.getElementById('totalTrafficVal').innerText = data.trafficSummary.totalRequests + ' Hits';
      document.getElementById('successRateVal').innerText = `Success Rate: ${data.trafficSummary.successRatePercent}%`;
    }

    if (data.engine) {
      if (document.getElementById('nodeVer')) document.getElementById('nodeVer').innerText = 'Node.js ' + data.engine.nodeVersion;
      if (document.getElementById('platformVer')) document.getElementById('platformVer').innerText = data.engine.platform + ' (PID: ' + data.engine.pid + ')';
      if (document.getElementById('envVal')) document.getElementById('envVal').innerText = data.engine.env;
    }

    if (data.cpu && document.getElementById('cpuCores')) {
      document.getElementById('cpuCores').innerText = data.cpu.cores + ' Cores (' + data.cpu.model.split(' ')[0] + ')';
    }

    document.getElementById('uptimeVal').innerText = data.uptime.formatted;
    document.getElementById('heapVal').innerText = data.memory.heapUsedMb + ' MB';
    document.getElementById('rssVal').innerText = 'RSS: ' + data.memory.processRssMb + ' MB';

    if (document.getElementById('heapProgressBar')) {
      const pct = data.memory.heapPercent || 20;
      document.getElementById('heapProgressBar').style.width = Math.min(100, Math.max(5, pct)) + '%';
    }

    document.getElementById('dbLatencyVal').innerText = data.database.latencyMs;
    document.getElementById('dbStatusVal').innerText = 'Supabase Status: ' + data.database.status;

    if (data.queue) {
      document.getElementById('queueActiveVal').innerText = data.queue.active + ' Active';
      document.getElementById('queueSubVal').innerText = `Waiting: ${data.queue.waiting} | Failed: ${data.queue.failed} | Done: ${data.queue.completed}`;
    }

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

    // Memory Leak Status Assessment
    const heapData = memoryChart.data.datasets[0].data;
    const isLeaking = heapData.length >= 10 && heapData.slice(-5).every((v, i, arr) => i === 0 || v > arr[i - 1]);
    const leakBadge = document.getElementById('memLeakStatus');
    if (leakBadge) {
      if (isLeaking) {
        leakBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        leakBadge.style.color = '#f87171';
        leakBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        leakBadge.innerText = '⚠️ Memory Leak Warning';
      } else {
        leakBadge.style.background = 'rgba(16,185,129,0.15)';
        leakBadge.style.color = '#34d399';
        leakBadge.style.borderColor = 'rgba(16,185,129,0.3)';
        leakBadge.innerText = '🟢 Memory Status: Normal';
      }
    }

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

function filterByMethod(method, btnEl) {
  selectedMethod = method;
  document.querySelectorAll('.method-pills .pill').forEach(p => p.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderAccordionList(rawMetrics);
}

function applySorting() {
  renderAccordionList(rawMetrics);
}

function renderAccordionList(metrics) {
  const container = document.getElementById('accordionContainer');
  if (!metrics || metrics.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No API calls recorded yet. Hit some endpoints in Postman/Swagger!</div>';
    return;
  }

  const filterQuery = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const sortType = document.getElementById('sortSelect')?.value || 'calls';

  // 1. Filter by Method & Search query
  let list = metrics.filter(m => {
    const matchesMethod = selectedMethod === 'ALL' || m.method.toUpperCase() === selectedMethod;
    const matchesSearch = m.path.toLowerCase().includes(filterQuery) || m.method.toLowerCase().includes(filterQuery);
    return matchesMethod && matchesSearch;
  });

  // 2. Apply Sorting
  list.sort((a, b) => {
    if (sortType === 'calls') return b.totalRequests - a.totalRequests;
    if (sortType === 'latency') return b.averageLatencyMs - a.averageLatencyMs;
    if (sortType === 'errors') return b.failedRequests - a.failedRequests;
    if (sortType === 'recent') return new Date(b.lastRequestedAt || 0) - new Date(a.lastRequestedAt || 0);
    return 0;
  });

  if (container.querySelector('.text-muted') && container.children.length === 1) {
    container.innerHTML = '';
  }

  list.forEach(m => {
    const key = `${m.method}:${m.path}`;
    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    let itemEl = document.getElementById(`item-${safeKey}`);

    let latClass = 'lat-fast';
    if (m.averageLatencyMs > 100 && m.averageLatencyMs <= 300) latClass = 'lat-med';
    if (m.averageLatencyMs > 300) latClass = 'lat-slow';

    if (!itemEl) {
      itemEl = document.createElement('div');
      itemEl.className = 'accordion-item';
      itemEl.id = `item-${safeKey}`;
      itemEl.setAttribute('data-key', key);

      itemEl.innerHTML = `
        <div class="accordion-header" onclick="toggleAccordion('${key}', '${safeKey}')">
          <div class="accordion-left">
            <span class="method method-${m.method}">${m.method}</span>
            <span style="font-weight:700; color:#fff; font-size:14px;">${m.path}</span>
          </div>
          <div class="accordion-right">
            <span style="font-size:12px; color:var(--text-muted);">Calls: <strong style="color:#fff;" id="calls-${safeKey}">${m.totalRequests}</strong></span>
            <span class="latency-tag ${latClass}" id="latTag-${safeKey}">⚡ Avg: ${m.averageLatencyMs} ms</span>
            <span class="chevron">▼</span>
          </div>
        </div>

        <div class="accordion-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:12px; margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Success / Error</div>
              <div style="font-size:14px; font-weight:700; color:#34d399; margin-top:2px;" id="succ-${safeKey}">✅ ${m.successfulRequests} / <span style="color:#f87171;">❌ ${m.failedRequests}</span></div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Last Response Time</div>
              <div style="font-size:14px; font-weight:700; color:#38bdf8; margin-top:2px;" id="lastLat-${safeKey}">⏱️ ${m.lastLatencyMs || 0} ms</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg Latency</div>
              <div style="font-size:14px; font-weight:700; color:#818cf8; margin-top:2px;" id="avgLat-${safeKey}">⚡ ${m.averageLatencyMs} ms</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg RAM Used</div>
              <div style="font-size:14px; font-weight:700; color:#a5b4fc; margin-top:2px;" id="ram-${safeKey}">🧠 ${m.averageRamMb || '0.05'} MB</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Avg CPU Time</div>
              <div style="font-size:14px; font-weight:700; color:#facc15; margin-top:2px;" id="cpu-${safeKey}">⚙️ ${m.averageCpuMs || '0.20'} ms</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
              <div style="font-size:11px; color:var(--text-muted);">Last Hit Time</div>
              <div style="font-size:12px; font-weight:600; color:#fff; margin-top:4px;" id="lastTime-${safeKey}">${m.lastRequestedAt ? new Date(m.lastRequestedAt).toLocaleTimeString() : '--'}</div>
            </div>
          </div>

          <div style="font-size:12px; font-weight:600; margin-bottom:8px; color:var(--text-muted);">📈 Real-Time Latency Trend (ms):</div>
          <div style="height:140px; width:100%;">
            <canvas id="chart-${safeKey}"></canvas>
          </div>
        </div>
      `;
      container.appendChild(itemEl);
    } else {
      document.getElementById(`calls-${safeKey}`).innerText = m.totalRequests;
      document.getElementById(`succ-${safeKey}`).innerHTML = `✅ ${m.successfulRequests} / <span style="color:#f87171;">❌ ${m.failedRequests}</span>`;
      if (document.getElementById(`lastLat-${safeKey}`)) document.getElementById(`lastLat-${safeKey}`).innerText = `⏱️ ${m.lastLatencyMs || 0} ms`;
      document.getElementById(`avgLat-${safeKey}`).innerText = `⚡ ${m.averageLatencyMs} ms`;
      if (document.getElementById(`ram-${safeKey}`)) document.getElementById(`ram-${safeKey}`).innerText = `🧠 ${m.averageRamMb || '0.05'} MB`;
      if (document.getElementById(`cpu-${safeKey}`)) document.getElementById(`cpu-${safeKey}`).innerText = `⚙️ ${m.averageCpuMs || '0.20'} ms`;
      document.getElementById(`lastTime-${safeKey}`).innerText = m.lastRequestedAt ? new Date(m.lastRequestedAt).toLocaleTimeString() : '--';

      const tag = document.getElementById(`latTag-${safeKey}`);
      tag.className = `latency-tag ${latClass}`;
      tag.innerText = `⚡ Avg: ${m.averageLatencyMs} ms`;
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
          label: 'Avg Latency (ms)',
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
  renderAccordionList(rawMetrics);
}

function exportMetricsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawMetrics, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `meal_book_api_metrics_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

const eventSource = new EventSource('/system/events');

eventSource.onopen = () => {
  const badge = document.getElementById('lastUpdated');
  if (badge) badge.innerText = '🟢 Real-Time SSE Active';
};

eventSource.onerror = () => {
  const badge = document.getElementById('lastUpdated');
  if (badge) badge.innerText = '🟡 Reconnecting SSE Stream...';
};

eventSource.onmessage = (event) => {
  try {
    const apiMetrics = JSON.parse(event.data);
    if (apiMetrics && Array.isArray(apiMetrics)) {
      rawMetrics = apiMetrics;
      const timeLabel = new Date().toLocaleTimeString();
      updateRouteHistory(rawMetrics, timeLabel);
      renderAccordionList(rawMetrics);
      updateRouteCharts();
    }
  } catch (err) {
    console.error('SSE Live Metric Parse Error:', err);
  }
};

initMemoryChart();
fetchMetrics();
setInterval(fetchMetrics, 30000);
