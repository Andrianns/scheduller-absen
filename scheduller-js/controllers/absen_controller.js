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
  randomTimeBetween7_10To7_20,
  waitUntilTomorrowAt7AM,
  getUserCredentials,
  getNowJakarta,
} = require("../models/absen_model");
async function isLoggedIn(page) {
  // Ganti selector ini sesuai elemen unik di dashboard yang pasti ada saat login sukses
  const dashboardIndicator = await page.$('button#logout, div.profile-header, button[data-target="#clockinConfirmation"], button[data-target="#clockoutConfirmation"]');
  return !!dashboardIndicator;
}
async function safeActionWithReload(page, actionFn, description, waitForReadySelector = null) {
  while (true) {
    try {
      // Jalankan actionFn, tapi kasih delay pendek biar gak langsung ngulang
      const result = await actionFn();
      return result;
    } catch (err) {
      if (err.message.includes("Timeout")) {
        console.warn(`⚠️ [${description}] Timeout. Reloading page dan mencoba lagi...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // delay sebelum reload

        let reloadSuccess = false;
        while (!reloadSuccess) {
          try {
            if (page.isClosed()) throw new Error("Page sudah ditutup sebelum reload.");

            await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });

            if (waitForReadySelector) {
              await page.waitForSelector(waitForReadySelector, { timeout: 20000 });
            }

            reloadSuccess = true;
            console.log("✅ Reload berhasil. Mengulangi aksi...");
            
            // Setelah reload sukses, kasih jeda 2 detik sebelum coba actionFn lagi
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (reloadErr) {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
            console.warn(`[${timeStr}] ⚠️ Gagal reload halaman. Coba lagi dalam 5 detik...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // delay sebelum retry reload
          }
        }
      } else {
        throw err;
      }
    }
  }
}


async function runAbsen() {
  const { USERNAME, PASSWORD, URL } = getUserCredentials();
  console.log(`[INFO] Mulai absen pada ${formatTimeWithTimezone(new Date())} WIB...`);

  const browser = await chromium.launch({
    headless: false,
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

    // Load halaman login
    await safeActionWithReload(
      page,
      () => page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 }),
      "Membuka halaman login",
      "#username" // Tunggu input username muncul sebagai tanda halaman siap
    );

    // Pastikan masih di halaman login sebelum isi username/password dan klik login
    if (page.url().includes("/login")) {
      await page.fill("#username", USERNAME);
      await page.fill("#password", PASSWORD);

      await safeActionWithReload(
        page,
        async () => {
          const loginBtn = await page.$('button[type="submit"]');
          if (!loginBtn) {
            console.log("⚠️ Tombol login tidak ditemukan. Mungkin sudah login.");
            return;
          }
          await Promise.all([
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 7000 }),
            loginBtn.click(),
          ]);
        },
        "Klik tombol login",
        'button[data-target="#clockinConfirmation"], button[data-target="#clockoutConfirmation"]' // Tunggu tombol clock-in/out muncul setelah login
      );
    } else {
      console.log("Sudah bukan halaman login, lanjut ke dashboard...");
    }

    const clockInBtn = 'button[data-target="#clockinConfirmation"]';
    const clockOutBtn = 'button[data-target="#clockoutConfirmation"]';
    const clockInConfirm = "button.oh-btn--success-outline";

    // Tunggu tombol clock-in/out muncul (indikator sudah login sukses)
    await safeActionWithReload(
      page,
      () => page.waitForSelector(`${clockInBtn}, ${clockOutBtn}`, { timeout: 10000 }),
      "Menunggu tombol clock-in/out muncul",
      `${clockInBtn}, ${clockOutBtn}`
    );

    // Cek sudah clock-out atau belum
    const isAlreadyClockedOut = await page.$(clockOutBtn);
    if (isAlreadyClockedOut) {
      console.log("✅ Sudah absen sebelumnya. Tidak perlu clock-in ulang.");
      scheduleNextDay();
      return;
    }

    // Klik tombol Clock-In dengan retry jika timeout
    await safeActionWithReload(
      page,
      () => page.click(clockInBtn),
      "Klik tombol Clock-In",
      clockInConfirm // Tunggu tombol konfirmasi muncul
    );

    // Klik tombol konfirmasi clock-in dengan retry jika timeout
    await safeActionWithReload(
      page,
      async () => {
        await page.waitForSelector(clockInConfirm, { timeout: 5000 });
        await page.click(clockInConfirm);
      },
      "Klik tombol konfirmasi clock-in"
    );

    console.log("✅ Berhasil absen!");
  } catch (err) {
    console.error("❌ Gagal absen:", err.message);
    console.log("❌ Silakan cek secara manual.");
    scheduleNextDay();
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
  const { delayMs, scheduledTime } = randomTimeBetween7_10To7_20();

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

  console.log(`[INFO] username : ${getUserCredentials().USERNAME} | password : ${getUserCredentials().PASSWORD} | url : ${getUserCredentials().URL}`);
  console.log(`[INFO] Service started at ${jam}:${menit}:${detik}`);
  console.log(
    `[INFO ${formatDateIndo(now)}] Next working day schedule: ${formatDateIndo(
      scheduledTime
    )} 07:00 WIB approximately ${formatDuration(delay)}...`
  );

  setTimeout(() => {
    startScheduledAbsen();
  }, 2000);
}

module.exports = {
  runAbsen,
  scheduleNextDay,
  startScheduledAbsen,
  waitUntilTomorrowAt7AMController,
};
