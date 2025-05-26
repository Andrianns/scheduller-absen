const { chromium } = require('playwright');

const USERNAME = 'Andrian.Kurnia@steradian.co.id';
const PASSWORD = '087739993050';
const URL = 'https://quadrang.steradian.co.id/login/';
function getRandomDelayMs() {
  const now = new Date();

  // WIB = UTC+7, kita pakai waktu lokal komputer lalu ubah ke WIB:
  // Asumsi server sudah di timezone WIB atau sesuaikan dengan offset
  const targetHour = 7;
  const minMinute = 15;
  const maxMinute = 29;

  const start = new Date(now);
  start.setHours(targetHour, minMinute, 0, 0);

  const end = new Date(now);
  end.setHours(targetHour, maxMinute, 59, 999);

  // Random milisecond antara start dan end
  const randomTime =
    start.getTime() +
    Math.floor(Math.random() * (end.getTime() - start.getTime()));

  return randomTime - now.getTime(); // delay dari sekarang sampai waktu random itu
}
async function runAbsen() {
  console.log('[INFO] Mulai absen...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser', // path default Chromium di Render
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      geolocation: {
        latitude: -6.216845646559504,
        longitude: 106.81443407439703,
      },
      permissions: ['geolocation'],
    });

    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });

    await page.fill('#username', USERNAME);
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    clockInBtn = 'button[data-target="#clockinConfirmation"]';
    clockInConfirm = 'button.oh-btn--success-outline';

    clockOutBtn = 'button[data-target="#clockoutConfirmation"]';
    clockOutConfirm = 'button.oh-btn--warning-outline';
    await page.waitForTimeout(5000);
    await page.click(clockInBtn);
    await page.waitForTimeout(6000);
    await page.click(clockInConfirm);
    await page.waitForTimeout(6000);

    console.log('✅ Berhasil absen!');
  } catch (err) {
    console.error('❌ Gagal absen:', err.message);
  } finally {
    await browser.close();
  }
}

function randomTimeBetween7_15To7_29() {
  const now = new Date();

  const targetHour = 7;
  const baseMinute = 15;
  const maxDelaySeconds = 14 * 60 + 59; // 07:15:00 - 07:29:59

  const start = new Date(now);
  start.setHours(targetHour, baseMinute, 0, 0);

  // Jika waktu target sudah lewat sekarang, pakai hari besok
  // if (start <= now) {
  //   start.setDate(start.getDate() + 1);
  // }

  const randomDelay = Math.floor(Math.random() * maxDelaySeconds * 1000); // ms

  const scheduledTime = new Date(start.getTime() + randomDelay);
  const delayMs = scheduledTime.getTime() - now.getTime();

  console.log(
    `[INFO] Akan absen pukul: ${formatTime(
      scheduledTime
    )} (tunggu ${formatDuration(delayMs)})`
  );

  setTimeout(async () => {
    await runAbsen();
    scheduleNextDay(); // lanjut besok
  }, delayMs);
}

function waitUntilTomorrowAt7AM() {
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setDate(now.getDate() + 1);
  scheduledTime.setHours(7, 0, 0, 0);

  const delay = scheduledTime.getTime() - now.getTime();

  const jam = now.getHours().toString().padStart(2, '0');
  const menit = now.getMinutes().toString().padStart(2, '0');
  const detik = now.getSeconds().toString().padStart(2, '0');

  console.log(`[INFO] Service dimulai pada ${jam}:${menit}:${detik}`);
  console.log(
    `[INFO] Menunggu hingga jam ${scheduledTime.toLocaleTimeString()} — sekitar ${formatDuration(
      delay
    )}...`
  );
  setTimeout(() => {
    randomTimeBetween7_15To7_29();
  }, 10000);
}
function scheduleNextDay() {
  const now = new Date();
  // Set ke jam 07:00:00 besok
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(7, 0, 0, 0);

  const delayMs = nextDay.getTime() - now.getTime();
  console.log(
    `[INFO] Jadwal berikutnya diatur untuk besok pukul 07:00 (tunggu ${formatDuration(
      delayMs
    )})`
  );

  setTimeout(() => {
    randomTimeBetween7_15To7_29();
  }, delayMs);
}

function runEveryMinuteForDebug() {
  console.log(
    '[DEBUG] Mode debug aktif: absen akan dijalankan setiap 1 menit.'
  );
  setInterval(async () => {
    const now = new Date().toLocaleTimeString();
    console.log(`[DEBUG] Trigger absen pada: ${now}`);
    await runAbsen();
  }, 60 * 1000); // setiap 60 detik
}
// Mulai program
console.log('[INFO] Scheduler aktif...');
waitUntilTomorrowAt7AM();

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  // Optional: const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}
