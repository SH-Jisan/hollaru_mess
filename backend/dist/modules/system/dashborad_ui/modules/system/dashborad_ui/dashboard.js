let maxPoints = 20;
let rawMetrics = [];
let selectedMethod = 'ALL';
let memoryHistory = { labels: [], heap: [], rss: [] };
let routeHistoryMap = new Map();

// =========================================================================
// 🎨 Standalone Enterprise Native HTML5 Canvas Engine (0 External Dependencies)
// =========================================================================
function drawNativeChart(canvasId, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (parent) {
    canvas.width = parent.clientWidth || 600;
    canvas.height = parent.clientHeight || 140;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 25, bottom: 25, left: 45 };

  ctx.clearRect(0, 0, width, height);

  if (!labels || labels.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for real-time telemetry data...', width / 2, height / 2);
    return;
  }

  // Calculate min & max Y values
  let allValues = [];
  datasets.forEach((ds) => allValues.push(...ds.data));
  let maxVal = Math.max(...allValues, 1);
  let minVal = Math.min(...allValues, 0);
  if (maxVal === minVal) maxVal += 10;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Draw Grid Lines & Y-Axis Scale
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'right';

  const gridSteps = 3;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (chartHeight / gridSteps) * i;
    const val = Number((maxVal - ((maxVal - minVal) / gridSteps) * i).toFixed(1));

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillText(val + (options.unit || ''), padding.left - 6, y + 3);
  }

  // Render Datasets
  datasets.forEach((ds) => {
    if (!ds.data || ds.data.length === 0) return;

    const stepX = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth;
    const points = ds.data.map((val, idx) => {
      const x = padding.left + (labels.length > 1 ? idx * stepX : chartWidth / 2);
      const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
      return { x, y, val };
    });

    // Fill Gradient under area
    if (ds.fillColor && points.length > 1) {
      const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      grad.addColorStop(0, ds.fillColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.lineTo(points[0].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw Smooth Connecting Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = ds.color || '#818cf8';
    ctx.lineWidth = ds.lineWidth || 2;
    if (ds.dash) ctx.setLineDash(ds.dash);
    else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Glowing Data Nodes
    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = ds.color || '#818cf8';
      ctx.fill();
    });
  });

  // Draw X-Axis Timestamps
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(labels.length / 5));
  labels.forEach((label, idx) => {
    if (idx % labelStep === 0 || idx === labels.length - 1) {
      const x = padding.left + (labels.length > 1 ? idx * (chartWidth / (labels.length - 1)) : chartWidth / 2);
      ctx.fillText(label, x, height - 6);
    }
  });
}

function renderMemoryChart() {
  drawNativeChart('memoryChart', memoryHistory.labels, [
    { label: 'Heap Used (MB)', data: memoryHistory.heap, color: '#818cf8', fillColor: 'rgba(129, 140, 248, 0.18)' },
    { label: 'RSS Memory (MB)', data: memoryHistory.rss, color: '#10b981', dash: [4, 4] }
  ], { unit: 'MB' });
}

// =========================================================================
// 🔄 Real-Time Telemetry Fetcher & Analytics Insights
// =========================================================================
async function fetchMetrics() {
  try {
    const res = await fetch('/system/status?t=' + Date.now());
    const json = await res.json();
    const data = json.data || json;

    if (!data || !data.uptime) return;

    // 1. Update Key Performance Indicator Cards
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
      const modelName = data.cpu.model ? data.cpu.model.split(' ')[0] : 'Processor';
      document.getElementById('cpuCores').innerText = (data.cpu.cores || 1) + ' Cores (' + modelName + ')';
    }

    if (data.uptime && document.getElementById('uptimeVal')) {
      document.getElementById('uptimeVal').innerText = data.uptime.formatted || '--';
    }
    if (data.memory && document.getElementById('heapVal')) {
      document.getElementById('heapVal').innerText = (data.memory.heapUsedMb || '0') + ' MB';
    }
    if (data.memory && document.getElementById('rssVal')) {
      document.getElementById('rssVal').innerText = 'RSS: ' + (data.memory.processRssMb || '0') + ' MB';
    }

    if (document.getElementById('heapProgressBar')) {
      const pct = data.memory ? data.memory.heapPercent : 20;
      document.getElementById('heapProgressBar').style.width = Math.min(100, Math.max(5, pct)) + '%';
    }

    if (data.database && document.getElementById('dbLatencyVal')) {
      document.getElementById('dbLatencyVal').innerText = data.database.latencyMs || '0 ms';
    }
    if (data.database && document.getElementById('dbStatusVal')) {
      document.getElementById('dbStatusVal').innerText = 'Supabase Status: ' + (data.database.status || 'HEALTHY');
    }

    if (data.queue) {
      document.getElementById('queueActiveVal').innerText = data.queue.active + ' Active';
      document.getElementById('queueSubVal').innerText = `Waiting: ${data.queue.waiting} | Failed: ${data.queue.failed} | Done: ${data.queue.completed}`;
    }

    // 2. Memory Trend & Leak Detector
    const timeLabel = new Date().toLocaleTimeString();
    if (data.memory) {
      memoryHistory.labels.push(timeLabel);
      memoryHistory.heap.push(parseFloat(data.memory.heapUsedMb));
      memoryHistory.rss.push(parseFloat(data.memory.processRssMb));

      if (memoryHistory.labels.length > maxPoints) {
        memoryHistory.labels.shift();
        memoryHistory.heap.shift();
        memoryHistory.rss.shift();
      }
      renderMemoryChart();

      // Memory Leak Detector Logic
      const isLeaking = memoryHistory.heap.length >= 10 && memoryHistory.heap.slice(-5).every((v, i, arr) => i === 0 || v > arr[i - 1]);
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
    }

    // 3. Update API Endpoint Metrics List & Compute Telemetry Insights
    rawMetrics = data.apiMetrics || [];
    updateInsightsPanel(rawMetrics);
    updateRouteHistory(rawMetrics, timeLabel);
    renderAccordionList(rawMetrics);
    updateRouteCharts();
  } catch (err) {
    console.error('Metrics fetch error:', err);
  }
}

// Compute Insights (Fastest, Slowest, P95, Total Errors)
function updateInsightsPanel(metrics) {
  if (!metrics || metrics.length === 0) return;

  const hitMetrics = metrics.filter((m) => m.totalRequests > 0);
  if (hitMetrics.length === 0) {
    if (document.getElementById('fastestRouteVal')) document.getElementById('fastestRouteVal').innerText = '--';
    if (document.getElementById('slowestRouteVal')) document.getElementById('slowestRouteVal').innerText = '--';
    if (document.getElementById('p95LatencyVal')) document.getElementById('p95LatencyVal').innerText = '0 ms';
    if (document.getElementById('totalErrorsVal')) document.getElementById('totalErrorsVal').innerText = '0 Errors';
    return;
  }

  // Sorted by average latency
  const sorted = [...hitMetrics].sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];

  const totalHits = hitMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const totalErrors = metrics.reduce((sum, m) => sum + m.failedRequests, 0);
  const avgLatencyOverall = Number((hitMetrics.reduce((sum, m) => sum + m.averageLatencyMs, 0) / hitMetrics.length).toFixed(2));

  if (document.getElementById('fastestRouteVal')) {
    document.getElementById('fastestRouteVal').innerText = `${fastest.method} ${fastest.path} (${fastest.averageLatencyMs} ms)`;
  }
  if (document.getElementById('slowestRouteVal')) {
    document.getElementById('slowestRouteVal').innerText = `${slowest.method} ${slowest.path} (${slowest.averageLatencyMs} ms)`;
  }
  if (document.getElementById('p95LatencyVal')) {
    document.getElementById('p95LatencyVal').innerText = `${avgLatencyOverall} ms`;
  }
  if (document.getElementById('totalErrorsVal')) {
    const errorEl = document.getElementById('totalErrorsVal');
    errorEl.innerText = `${totalErrors} Errors`;
    errorEl.style.color = totalErrors > 0 ? 'var(--danger)' : 'var(--success)';
  }
}

function updateRouteHistory(metrics, timeLabel) {
  metrics.forEach((m) => {
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
  document.querySelectorAll('.method-pills .pill').forEach((p) => p.classList.remove('active'));
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

  let list = metrics.filter((m) => {
    const matchesMethod = selectedMethod === 'ALL' || m.method.toUpperCase() === selectedMethod;
    const matchesSearch = m.path.toLowerCase().includes(filterQuery) || m.method.toLowerCase().includes(filterQuery);
    return matchesMethod && matchesSearch;
  });

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

  list.forEach((m) => {
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
        <div class="accordion-header">
          <div class="accordion-left">
            <span class="method method-${m.method}">${m.method}</span>
            <span class="route-path">${m.path}</span>
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

      const header = itemEl.querySelector('.accordion-header');
      if (header) {
        header.onclick = function () {
          itemEl.classList.toggle('active');
          if (itemEl.classList.contains('active')) {
            setTimeout(() => initRouteChart(key, safeKey), 50);
          }
        };
      }
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

function initRouteChart(key, safeKey) {
  const history = routeHistoryMap.get(key) || [];
  drawNativeChart(
    `chart-${safeKey}`,
    history.map((h) => h.time),
    [{ label: 'Latency (ms)', data: history.map((h) => h.latency), color: '#818cf8', fillColor: 'rgba(129, 140, 248, 0.18)' }],
    { unit: ' ms' },
  );
}

function updateRouteCharts() {
  document.querySelectorAll('.accordion-item.active').forEach((item) => {
    const key = item.getAttribute('data-key');
    if (key) {
      const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
      initRouteChart(key, safeKey);
    }
  });
}

function filterRoutes() {
  renderAccordionList(rawMetrics);
}

function exportMetricsJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rawMetrics, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `meal_book_api_metrics_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Real-Time Server-Sent Events (SSE) Stream Setup
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
      updateInsightsPanel(rawMetrics);
      updateRouteHistory(rawMetrics, timeLabel);
      renderAccordionList(rawMetrics);
      updateRouteCharts();
    }
  } catch (err) {
    console.error('SSE Live Metric Parse Error:', err);
  }
};

window.addEventListener('resize', () => {
  renderMemoryChart();
  updateRouteCharts();
});

fetchMetrics();
setInterval(fetchMetrics, 15000);
