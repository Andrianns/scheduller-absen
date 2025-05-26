function formatTimeWithTimezone(date, timeZone = 'Asia/Jakarta') {
  return date.toLocaleTimeString('en-US', { hour12: false, timeZone });
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

module.exports = { formatTimeWithTimezone, formatDuration, formatTime };
