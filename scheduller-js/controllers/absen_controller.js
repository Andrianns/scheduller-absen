const { chromium } = require("playwright");
const axios = require("axios");

const {
  formatTimeWithTimezone,
  formatDuration,
  formatTime,
  formatDateIndo,
} = require("../helpers/time_helper");

async function getHolidayMap() {
  try {
    const { data } = await axios.get("https://dayoffapi.vercel.app/api");
    return data.map((item) => item.tanggal);
  } catch (err) {
    console.error("❌ Gagal mengambil data hari libur:", err.message);
    return [];
  }
}
const {
  randomTimeBetween7_15To7_29,
  waitUntilTomorrowAt7AM,
  getUserCredentials,
  getNowJakarta,
} = require("../models/absen_model");

async function runAbsen(retryCount = 0, maxRetries = 3) {
  const { USERNAME, PASSWORD, URL } = getUserCredentials();
  console.log(
    `[INFO] Mulai absen pada ${formatTimeWithTimezone(new Date())} WIB...`
  );

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      geolocation: {
        latitude: -6.216845646559504,
        longitude: 106.81443407439703,
      },
      permissions: ["geolocation"],
    });

    const page = await context.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });

    await page.fill("#username", USERNAME);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');

    const clockInBtn = 'button[data-target="#clockinConfirmation"]';
    const clockInConfirm = "button.oh-btn--success-outline";
    const clockOutBtn = 'button[data-target="#clockoutConfirmation"]';

    await page.waitForTimeout(10000);

    const isAlreadyClockedOut = await page.$(clockOutBtn);
    if (isAlreadyClockedOut) {
      console.log("✅ Sudah absen sebelumnya. Tidak perlu clock-in ulang.");
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

    console.log("✅ Berhasil absen!");
  } catch (err) {
    console.error("❌ Gagal absen:", err.message);
    if (retryCount < maxRetries) {
      console.log(`🔁 Mencoba kembali dalam 5 detik...`);
      setTimeout(() => runAbsen(retryCount + 1, maxRetries), 5000); // retry after 10s
    } else {
      console.log(
        "❌ Gagal absen setelah beberapa kali percobaan. Silakan cek secara manual."
      );
      scheduleNextDay();
    }
  } finally {
    await browser.close();
  }
}
async function findNextWorkingDayAt7AM(date, holidayList) {
  const nextDay = new Date(date);
  nextDay.setHours(7, 0, 0, 0);

  while (true) {
    const day = nextDay.getDay(); // 0 = Minggu, 6 = Sabtu
    const dateStr = nextDay.toISOString().split("T")[0];

    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidayList.includes(dateStr);

    if (!isWeekend && !isHoliday) break;

    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(7, 0, 0, 0); // reset jam 7 pagi setiap iterasi
  }

  return nextDay;
}

async function scheduleNextDay() {
  const nowJakarta = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );

  const holidayList = await getHolidayMap();

  const nextDayJakarta = await findNextWorkingDayAt7AM(
    new Date(nowJakarta.getTime() + 24 * 60 * 60 * 1000),
    holidayList
  );

  const delayMs = nextDayJakarta.getTime() - nowJakarta.getTime();
  console.log(
    `[INFO ${formatDateIndo(
      nowJakarta
    )}] Next schedule is set for ${formatDateIndo(
      nextDayJakarta
    )} WIB (in ${formatDuration(delayMs)})`
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

async function waitUntilTomorrowAt7AMController() {
  const { scheduledTime } = waitUntilTomorrowAt7AM();
  const now = getNowJakarta();
  const holidayList = await getHolidayMap();

  const nextWorkingDay = await findNextWorkingDayAt7AM(
    scheduledTime,
    holidayList
  );
  scheduledTime.setTime(nextWorkingDay.getTime());

  const delay = scheduledTime.getTime() - now.getTime();

  console.log(holidayList);
  const jam = now.getHours().toString().padStart(2, "0");
  const menit = now.getMinutes().toString().padStart(2, "0");
  const detik = now.getSeconds().toString().padStart(2, "0");

  console.log(`[INFO] Service started at ${jam}:${menit}:${detik}`);
  console.log(
    `[INFO ${formatDateIndo(now)}] Next working day schedule: ${formatDateIndo(
      scheduledTime
    )} 07:00 WIB approximately ${formatDuration(delay)}...`
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
