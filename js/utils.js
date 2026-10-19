export function measureDistance(point1, point2) { return point1.distanceTo(point2); }

export function formatTime(seconds) {
  const ticks = Math.floor(Math.max(0, seconds) * 100);
  const minutes = Math.floor(ticks / 6000).toString().padStart(2, '0');
  const wholeSeconds = Math.floor(ticks % 6000 / 100).toString().padStart(2, '0');
  const hundredths = (ticks % 100).toString().padStart(2, '0');
  return minutes + ':' + wholeSeconds + '.' + hundredths;
}

export function updateBestStats(stats) {
  const fields = ['time', 'accuracy', 'kills', 'kpm', 'longestKill'];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('bestStats') || '{}') || {}; } catch {}
  const best = {};
  for (const field of fields) {
    const current = Number.isFinite(stats[field]) && stats[field] >= 0 ? stats[field] : 0;
    const previous = saved[field];
    best[field] = Number.isFinite(previous) && previous >= 0
      ? (field === 'time' ? Math.min(previous, current) : Math.max(previous, current))
      : current;
  }
  try { localStorage.setItem('bestStats', JSON.stringify(best)); } catch {}
  return best;
}
