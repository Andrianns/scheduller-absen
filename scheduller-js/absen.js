const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Biar kelihatan pas debugging
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: null
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://quadrang.steradian.co.id', ['geolocation']);

  const page = await browser.newPage();

  // Set lokasi GPS (Jakarta)
  await page.setGeolocation({
    latitude: -6.216845646559504,
    longitude: 106.81443407439703,
    accuracy: 100
  });

  await page.goto('https://quadrang.steradian.co.id', { waitUntil: 'networkidle2' });

  // Login
  await page.type('#username', 'Andrian.Kurnia@steradian.co.id');
  await page.type('#password', '087739993050');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(10000); // Tunggu halaman load

  // Klik tombol Clock Out
  try {
    await page.waitForXPath('//button[@data-target="#clockoutConfirmation"]', { timeout: 5000 });
    const [clockOutBtn] = await page.$x('//button[@data-target="#clockoutConfirmation"]');
    await clockOutBtn.click();
    await page.waitForTimeout(2000);

    // Klik tombol konfirmasi
    const [confirmBtn] = await page.$x('//button[contains(@class, "oh-btn--warning-outline") and contains(text(), "Confirm Clock Out")]');
    await confirmBtn.click();

    console.log('✅ Berhasil Clock Out');
  } catch (e) {
    console.error('⚠️ Gagal menemukan tombol Clock Out:', e);
  }

  await browser.close();
})();



const puppeteer = require('puppeteer');

// Fungsi untuk generate waktu acak antara 07:15:00 – 07:29:59 WIB
function randomTimeBetween7_15To7_29(callback) {
  const now = new Date();

  // Set jam 7:15:00 hari ini
  const baseTime = new Date(now);
  baseTime.setHours(7, 15, 0, 0);

  // 899 detik = 14 menit 59 detik
  const randomDelaySeconds = Math.floor(Math.random() * 900);
  const scheduledTime = new Date(baseTime.getTime() + randomDelaySeconds * 1000);

  const delayMs = scheduledTime.getTime() - now.getTime();

  console.log(`Akan absen pada: ${scheduledTime.toLocaleTimeString()} (tunggu ${Math.round(delayMs / 1000)} detik)`);

  if (delayMs > 0) {
    setTimeout(() => {
      callback();
    }, delayMs);
  } else {
    callback();
  }
}
