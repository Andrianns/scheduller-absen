const { chromium } = require('playwright');
const {
  formatTimeWithTimezone,
  formatDuration,
  formatTime,
} = require('../helpers/time_helper');

const {
  randomTimeBetween7_15To7_29,
  waitUntilTomorrowAt7AM,
  getUserCredentials,
  getNowJakarta,
} = require('../models/absen_model');

async function runAbsen(retryCount = 0, maxRetries = 3) {
  const { USERNAME, PASSWORD, URL } = getUserCredentials();

  console.log(
    `[INFO] Mulai absen pada ${formatTimeWithTimezone(new Date())} WIB...`
  );

  const browser = await chromium.launch({
    headless: true,
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

    const clockInBtn = 'button[data-target="#clockinConfirmation"]';
    const clockInConfirm = 'button.oh-btn--success-outline';
    const clockOutBtn = 'button[data-target="#clockoutConfirmation"]';

    await page.waitForTimeout(10000);

    const isAlreadyClockedOut = await page.$(clockOutBtn);
    if (isAlreadyClockedOut) {
      console.log('✅ Sudah absen sebelumnya. Tidak perlu clock-in ulang.');
      scheduleNextDay();
    }

    // const isClockInAvailable = await page.$(clockInBtn);
    // if (!isClockInAvailable) {
    //   throw new Error('Tombol Clock-In tidak ditemukan.');
    // }

    await page.click(clockInBtn);
    await page.waitForTimeout(6000);
    await page.click(clockInConfirm);
    await page.waitForTimeout(6000);

    console.log('✅ Berhasil absen!');
  } catch (err) {
    console.error('❌ Gagal absen:', err.message);
    if (retryCount < maxRetries) {
      console.log(`🔁 Mencoba kembali dalam 5 detik...`);
      setTimeout(() => runAbsen(retryCount + 1, maxRetries), 5000); // retry after 10s
    } else {
      console.log(
        '❌ Gagal absen setelah beberapa kali percobaan. Silakan cek secara manual.'
      );
      scheduleNextDay();
    }
  } finally {
    await browser.close();
  }
}

function scheduleNextDay() {
  const nowJakarta = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  );

  const nextDayJakarta = new Date(nowJakarta);
  nextDayJakarta.setDate(nowJakarta.getDate() + 1);
  nextDayJakarta.setHours(7, 0, 0, 0);

  const delayMs = nextDayJakarta.getTime() - nowJakarta.getTime();

  console.log(
    `[INFO] Jadwal berikutnya diatur untuk besok pukul 07:00 WIB (tunggu ${formatDuration(
      delayMs
    )})`
  );

  setTimeout(() => {
    startScheduledAbsen();
  }, delayMs);
}

function startScheduledAbsen() {
  const { delayMs, scheduledTime } = randomTimeBetween7_15To7_29();

  console.log(
    `[INFO] Akan absen pukul: ${formatTime(
      scheduledTime
    )} (tunggu ${formatDuration(delayMs)})`
  );

  setTimeout(async () => {
    await runAbsen();
    scheduleNextDay();
  }, delayMs);
}

function waitUntilTomorrowAt7AMController() {
  const { delay, scheduledTime } = waitUntilTomorrowAt7AM();
  const now = getNowJakarta();

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
    startScheduledAbsen();
  }, delay);
}

module.exports = {
  runAbsen,
  scheduleNextDay,
  startScheduledAbsen,
  waitUntilTomorrowAt7AMController,
};
