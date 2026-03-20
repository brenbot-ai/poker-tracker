// Data layer — all localStorage operations

const STORAGE_KEY = 'poker_tracker_sessions';

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function updateSession(id, updates) {
  const sessions = getSessions().map(s => s.id === id ? { ...s, ...updates } : s);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // crossed midnight
  return mins;
}

export function formatDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatMoney(n) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '-' : '') + '$' + abs;
}

export function getSessionsByYear(year) {
  return getSessions().filter(s => s.date.startsWith(year));
}

export function getYears() {
  const years = [...new Set(getSessions().map(s => s.date.slice(0, 4)))];
  return years.sort().reverse();
}

// Stats helpers
export function calcStats(sessions) {
  const total = sessions.length;
  const wins = sessions.filter(s => s.net > 0).length;
  const net = sessions.reduce((sum, s) => sum + s.net, 0);
  const totalWon = sessions.filter(s => s.net > 0).reduce((sum, s) => sum + s.net, 0);
  const totalLost = sessions.filter(s => s.net < 0).reduce((sum, s) => sum + s.net, 0);
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const avgNet = total > 0 ? net / total : 0;
  const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
  const hourlyRate = totalHours > 0 ? net / totalHours : 0;
  return { total, wins, net, totalWon, totalLost, winRate, avgNet, totalHours, hourlyRate };
}
