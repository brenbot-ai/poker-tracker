import { getSessions, saveSession, updateSession, deleteSession,
  generateId, calcDuration, formatDuration, formatMoney,
  getSessionsByYear, getYears, calcStats } from './data.js';

// ── Router ──────────────────────────────────────────────
const routes = { dashboard: renderDashboard, log: renderLog, sessions: renderSessions, reports: renderReports };

function navigate(page, params = {}) {
  window.__currentPage = page;
  window.__pageParams = params;
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  render(page, params);
}

function render(page, params) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  (routes[page] || renderDashboard)(main, params);
}

// ── NAV ─────────────────────────────────────────────────
function buildNav() {
  const nav = document.querySelector('nav');
  [['dashboard','📊 Dashboard'],['log','➕ Log Session'],['sessions','📋 Sessions'],['reports','🧾 Reports']]
    .forEach(([page, label]) => {
      const a = document.createElement('a');
      a.href = '#'; a.textContent = label; a.dataset.page = page;
      a.addEventListener('click', e => { e.preventDefault(); navigate(page); });
      nav.appendChild(a);
    });
}

// ── DASHBOARD ───────────────────────────────────────────
function renderDashboard(main) {
  const all = getSessions();
  const poker = all.filter(s => s.category === 'poker');
  const other = all.filter(s => s.category === 'other');
  const year = new Date().getFullYear().toString();
  const yearSessions = all.filter(s => s.date.startsWith(year));

  main.innerHTML = `
    <h2>Dashboard</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">All-Time Net</div>
        <div class="stat-value ${calcStats(all).net >= 0 ? 'green' : 'red'}">${formatMoney(calcStats(all).net)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${year} Net (Tax Year)</div>
        <div class="stat-value ${calcStats(yearSessions).net >= 0 ? 'green' : 'red'}">${formatMoney(calcStats(yearSessions).net)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Sessions</div>
        <div class="stat-value">${all.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Overall Win Rate</div>
        <div class="stat-value">${calcStats(all).winRate}%</div>
      </div>
    </div>

    <div class="two-col">
      <div class="panel">
        <h3>🃏 Poker</h3>
        ${statBlock(poker)}
      </div>
      <div class="panel">
        <h3>🎰 Other Gambling</h3>
        ${statBlock(other)}
      </div>
    </div>

    <div class="panel">
      <h3>Recent Sessions</h3>
      ${recentSessionsTable(all.slice(-10).reverse())}
    </div>

    <div class="panel">
      <h3>Cumulative Net Over Time</h3>
      <canvas id="chartCanvas" height="80"></canvas>
    </div>
  `;

  drawChart(all);
}

function statBlock(sessions) {
  const s = calcStats(sessions);
  if (sessions.length === 0) return '<p class="muted">No sessions yet.</p>';
  return `
    <div class="mini-stats">
      <div><span class="muted">Sessions</span> <strong>${s.total}</strong></div>
      <div><span class="muted">Net</span> <strong class="${s.net >= 0 ? 'green' : 'red'}">${formatMoney(s.net)}</strong></div>
      <div><span class="muted">Win Rate</span> <strong>${s.winRate}%</strong></div>
      <div><span class="muted">Avg/Session</span> <strong class="${s.avgNet >= 0 ? 'green' : 'red'}">${formatMoney(s.avgNet)}</strong></div>
      <div><span class="muted">$/Hour</span> <strong class="${s.hourlyRate >= 0 ? 'green' : 'red'}">${formatMoney(s.hourlyRate)}</strong></div>
    </div>
  `;
}

function recentSessionsTable(sessions) {
  if (!sessions.length) return '<p class="muted">No sessions logged yet. <a href="#" data-page="log">Log your first session →</a></p>';
  return `<table class="session-table">
    <thead><tr><th>Date</th><th>Category</th><th>Game</th><th>Venue</th><th>Duration</th><th>Net</th></tr></thead>
    <tbody>${sessions.map(s => `
      <tr>
        <td>${s.date}</td>
        <td>${s.category === 'poker' ? '🃏 Poker' : '🎰 Other'}</td>
        <td>${s.gameType}</td>
        <td>${s.venue}</td>
        <td>${formatDuration(s.duration)}</td>
        <td class="${s.net >= 0 ? 'green' : 'red'}">${formatMoney(s.net)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function drawChart(all) {
  const canvas = document.getElementById('chartCanvas');
  if (!canvas || all.length === 0) return;
  const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));

  // Build cumulative series per category
  let pokerNet = 0, otherNet = 0;
  const labels = [], pokerData = [], otherData = [], allData = [];
  sorted.forEach(s => {
    if (s.category === 'poker') pokerNet += s.net;
    else otherNet += s.net;
    labels.push(s.date);
    pokerData.push(pokerNet);
    otherData.push(otherNet);
    allData.push(pokerNet + otherNet);
  });

  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth; const h = canvas.offsetHeight;
  canvas.width = w; canvas.height = canvas.clientHeight || 200;
  const ch = canvas.height;

  const allVals = [...pokerData, ...otherData, ...allData];
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(0, ...allVals);
  const range = maxV - minV || 1;
  const pad = 40;

  const xScale = i => pad + (i / (labels.length - 1 || 1)) * (w - pad * 2);
  const yScale = v => ch - pad - ((v - minV) / range) * (ch - pad * 2);

  ctx.clearRect(0, 0, w, ch);

  // Zero line
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, yScale(0)); ctx.lineTo(w - pad, yScale(0)); ctx.stroke();

  // Draw lines
  [{ data: pokerData, color: '#6366f1' }, { data: otherData, color: '#f59e0b' }, { data: allData, color: '#22c55e' }]
    .forEach(({ data, color }) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v)));
      ctx.stroke();
    });

  // Legend
  [['🃏 Poker', '#6366f1'], ['🎰 Other', '#f59e0b'], ['Combined', '#22c55e']].forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(pad + i * 110, 8, 12, 12);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText(label, pad + i * 110 + 16, 19);
  });
}

// ── LOG SESSION ─────────────────────────────────────────
const POKER_TYPES = ['Cash - NLHE', 'Cash - PLO', 'Cash - Other', 'Tournament - MTT', 'Tournament - Sit-n-Go', 'Other'];
const OTHER_TYPES = ['Blackjack', 'Slots', 'Roulette', 'Sports Betting', 'Horse Racing', 'Other'];

function renderLog(main, params = {}) {
  const editSession = params.edit || null;
  const s = editSession || {};

  main.innerHTML = `
    <h2>${editSession ? 'Edit Session' : 'Log Session'}</h2>
    <form id="sessionForm" class="session-form">
      <div class="form-row">
        <label>Date <input type="date" name="date" value="${s.date || today()}" required></label>
        <label>Start Time <input type="time" name="startTime" value="${s.startTime || ''}"></label>
        <label>End Time <input type="time" name="endTime" value="${s.endTime || ''}"></label>
      </div>
      <div class="form-row">
        <label>Category
          <select name="category" id="categorySelect">
            <option value="poker" ${(!s.category || s.category === 'poker') ? 'selected' : ''}>🃏 Poker</option>
            <option value="other" ${s.category === 'other' ? 'selected' : ''}>🎰 Other Gambling</option>
          </select>
        </label>
        <label>Game Type
          <select name="gameType" id="gameTypeSelect">
            ${(s.category === 'other' ? OTHER_TYPES : POKER_TYPES).map(t =>
              `<option value="${t}" ${s.gameType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>Venue Name <input type="text" name="venue" value="${s.venue || ''}" placeholder="e.g. Aria, Home Game" required></label>
        <label>Location <input type="text" name="location" value="${s.location || ''}" placeholder="e.g. Las Vegas NV, Online"></label>
      </div>
      <div class="form-row">
        <label>Total Buy-In ($) <input type="number" name="buyIn" value="${s.buyIn || ''}" min="0" step="0.01" required></label>
        <label>Cash-Out ($) <input type="number" name="cashOut" value="${s.cashOut || ''}" min="0" step="0.01" required></label>
        <label>Net <input type="text" id="netDisplay" readonly placeholder="auto-calculated"></label>
      </div>
      <div class="form-row">
        <label style="flex:1">Notes <textarea name="notes" rows="2" placeholder="Optional notes...">${s.notes || ''}</textarea></label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">${editSession ? 'Save Changes' : 'Log Session'}</button>
        <button type="button" class="btn-ghost" id="cancelBtn">Cancel</button>
      </div>
    </form>
  `;

  // Dynamic game types based on category
  document.getElementById('categorySelect').addEventListener('change', function () {
    const types = this.value === 'poker' ? POKER_TYPES : OTHER_TYPES;
    const sel = document.getElementById('gameTypeSelect');
    sel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
  });

  // Live net calculation
  ['buyIn', 'cashOut'].forEach(name => {
    document.querySelector(`[name="${name}"]`).addEventListener('input', updateNetDisplay);
  });

  function updateNetDisplay() {
    const buyIn = parseFloat(document.querySelector('[name="buyIn"]').value) || 0;
    const cashOut = parseFloat(document.querySelector('[name="cashOut"]').value) || 0;
    const net = cashOut - buyIn;
    const el = document.getElementById('netDisplay');
    el.value = formatMoney(net);
    el.className = net >= 0 ? 'green' : 'red';
  }
  updateNetDisplay();

  document.getElementById('cancelBtn').addEventListener('click', () => navigate('sessions'));

  document.getElementById('sessionForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const buyIn = parseFloat(fd.get('buyIn'));
    const cashOut = parseFloat(fd.get('cashOut'));
    const startTime = fd.get('startTime');
    const endTime = fd.get('endTime');
    const duration = calcDuration(startTime, endTime);
    const session = {
      id: editSession ? editSession.id : generateId(),
      date: fd.get('date'),
      startTime, endTime, duration,
      category: fd.get('category'),
      gameType: fd.get('gameType'),
      venue: fd.get('venue'),
      location: fd.get('location'),
      buyIn, cashOut,
      net: parseFloat((cashOut - buyIn).toFixed(2)),
      notes: fd.get('notes')
    };
    if (editSession) {
      updateSession(editSession.id, session);
    } else {
      saveSession(session);
    }
    navigate('sessions');
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── SESSIONS LIST ────────────────────────────────────────
function renderSessions(main) {
  const all = getSessions();
  const years = getYears();
  const currentYear = new Date().getFullYear().toString();

  main.innerHTML = `
    <div class="page-header">
      <h2>Sessions</h2>
      <button class="btn-primary" id="addBtn">➕ Log Session</button>
    </div>
    <div class="filters">
      <select id="filterCat">
        <option value="">All Categories</option>
        <option value="poker">🃏 Poker</option>
        <option value="other">🎰 Other Gambling</option>
      </select>
      <select id="filterYear">
        <option value="">All Years</option>
        ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
    </div>
    <div id="sessionsList"></div>
  `;

  document.getElementById('addBtn').addEventListener('click', () => navigate('log'));

  function applyFilters() {
    const cat = document.getElementById('filterCat').value;
    const year = document.getElementById('filterYear').value;
    let filtered = all;
    if (cat) filtered = filtered.filter(s => s.category === cat);
    if (year) filtered = filtered.filter(s => s.date.startsWith(year));
    filtered = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    renderSessionsList(filtered, document.getElementById('sessionsList'));
  }

  document.getElementById('filterCat').addEventListener('change', applyFilters);
  document.getElementById('filterYear').addEventListener('change', applyFilters);
  applyFilters();
}

function renderSessionsList(sessions, container) {
  if (!sessions.length) {
    container.innerHTML = '<p class="muted">No sessions found.</p>';
    return;
  }
  const s = calcStats(sessions);
  container.innerHTML = `
    <div class="summary-bar">
      <span>${sessions.length} sessions</span>
      <span>Net: <strong class="${s.net >= 0 ? 'green' : 'red'}">${formatMoney(s.net)}</strong></span>
      <span>Win Rate: <strong>${s.winRate}%</strong></span>
      <span>$/hr: <strong class="${s.hourlyRate >= 0 ? 'green' : 'red'}">${formatMoney(s.hourlyRate)}</strong></span>
    </div>
    <table class="session-table">
      <thead><tr><th>Date</th><th>Category</th><th>Game</th><th>Venue</th><th>Location</th><th>Duration</th><th>Buy-In</th><th>Cash-Out</th><th>Net</th><th></th></tr></thead>
      <tbody>${sessions.map(s => `
        <tr>
          <td>${s.date}</td>
          <td>${s.category === 'poker' ? '🃏 Poker' : '🎰 Other'}</td>
          <td>${s.gameType}</td>
          <td>${s.venue}</td>
          <td>${s.location || '—'}</td>
          <td>${formatDuration(s.duration)}</td>
          <td>${formatMoney(s.buyIn)}</td>
          <td>${formatMoney(s.cashOut)}</td>
          <td class="${s.net >= 0 ? 'green' : 'red'}">${formatMoney(s.net)}</td>
          <td>
            <button class="btn-sm" data-edit="${s.id}">✏️</button>
            <button class="btn-sm btn-danger" data-delete="${s.id}">🗑️</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const session = getSessions().find(s => s.id === btn.dataset.edit);
      navigate('log', { edit: session });
    });
  });

  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this session?')) {
        deleteSession(btn.dataset.delete);
        navigate('sessions');
      }
    });
  });
}

// ── REPORTS ──────────────────────────────────────────────
function renderReports(main) {
  const years = getYears();
  const currentYear = new Date().getFullYear().toString();

  main.innerHTML = `
    <h2>Tax Reports</h2>
    <div class="filters">
      <select id="reportYear">
        ${years.length ? years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('') : `<option value="${currentYear}">${currentYear}</option>`}
      </select>
      <button class="btn-primary" id="exportBtn">⬇️ Export CSV</button>
    </div>
    <div id="reportContent"></div>
  `;

  function buildReport() {
    const year = document.getElementById('reportYear').value;
    const sessions = getSessionsByYear(year);
    const poker = sessions.filter(s => s.category === 'poker');
    const other = sessions.filter(s => s.category === 'other');
    const rp = document.getElementById('reportContent');

    rp.innerHTML = `
      <div class="two-col">
        <div class="panel">
          <h3>🃏 Poker — ${year}</h3>
          ${taxBlock(poker)}
        </div>
        <div class="panel">
          <h3>🎰 Other Gambling — ${year}</h3>
          ${taxBlock(other)}
        </div>
      </div>
      <div class="panel">
        <h3>All Sessions — ${year}</h3>
        ${sessions.length ? `<table class="session-table">
          <thead><tr><th>Date</th><th>Category</th><th>Game</th><th>Venue</th><th>Location</th><th>Buy-In</th><th>Cash-Out</th><th>Net</th><th>Notes</th></tr></thead>
          <tbody>${sessions.sort((a,b) => a.date.localeCompare(b.date)).map(s => `
            <tr>
              <td>${s.date}</td>
              <td>${s.category === 'poker' ? '🃏 Poker' : '🎰 Other'}</td>
              <td>${s.gameType}</td>
              <td>${s.venue}</td>
              <td>${s.location || '—'}</td>
              <td>${formatMoney(s.buyIn)}</td>
              <td>${formatMoney(s.cashOut)}</td>
              <td class="${s.net >= 0 ? 'green' : 'red'}">${formatMoney(s.net)}</td>
              <td>${s.notes || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p class="muted">No sessions for this year.</p>'}
      </div>
    `;
  }

  document.getElementById('reportYear').addEventListener('change', buildReport);
  document.getElementById('exportBtn').addEventListener('click', () => {
    const year = document.getElementById('reportYear').value;
    exportCSV(year);
  });
  buildReport();
}

function taxBlock(sessions) {
  if (!sessions.length) return '<p class="muted">No sessions.</p>';
  const sp = calcStats(sessions);
  return `
    <table class="tax-table">
      <tr><td>Total Sessions</td><td><strong>${sp.total}</strong></td></tr>
      <tr><td>Winning Sessions</td><td class="green"><strong>${sp.wins}</strong></td></tr>
      <tr><td>Losing Sessions</td><td class="red"><strong>${sp.total - sp.wins}</strong></td></tr>
      <tr><td>Total Winnings</td><td class="green"><strong>${formatMoney(sp.totalWon)}</strong></td></tr>
      <tr><td>Total Losses</td><td class="red"><strong>${formatMoney(sp.totalLost)}</strong></td></tr>
      <tr class="total-row"><td>Net</td><td class="${sp.net >= 0 ? 'green' : 'red'}"><strong>${formatMoney(sp.net)}</strong></td></tr>
    </table>
    <p class="muted" style="font-size:0.8em;margin-top:8px">IRS: Report gross winnings as income. Losses deductible up to winnings (Schedule A, itemized).</p>
  `;
}

function exportCSV(year) {
  const sessions = getSessionsByYear(year).sort((a, b) => a.date.localeCompare(b.date));
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Category', 'Game Type', 'Venue', 'Location', 'Buy-In', 'Cash-Out', 'Net', 'Notes'];
  const rows = sessions.map(s => [
    s.date, s.startTime || '', s.endTime || '', s.duration || '',
    s.category, s.gameType, s.venue, s.location || '',
    s.buyIn, s.cashOut, s.net, (s.notes || '').replace(/,/g, ';')
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gambling-sessions-${year}.csv`;
  a.click();
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  navigate('dashboard');
  // Fix: delegate clicks on muted links inside dashboard
  document.getElementById('main').addEventListener('click', e => {
    if (e.target.dataset.page) { e.preventDefault(); navigate(e.target.dataset.page); }
  });
});
