package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/chromedp/cdproto/emulation" // ✅ INI WAJIB
	"github.com/chromedp/chromedp"          // <-- ini yang benar
	"github.com/robfig/cron/v3"
)

func main() {
	c := cron.New()

	_, err := c.AddFunc("*/1 * * * *", func() {
		testNow()
	})
	if err != nil {
		log.Fatalf("Gagal menjadwalkan job: %v", err)
	}

	c.Start()
	log.Println("Scheduler siap...")

	select {}
}
func testNow() {
	log.Println("Test langsung tanpa delay")
	err := absen()
	if err != nil {
		log.Printf("Gagal absen: %v", err)
	} else {
		log.Println("Berhasil absen")
	}
}

func randomTimeBetween7_15To7_29() {
	rand.Seed(time.Now().UnixNano())

	// Total detik dari 07:15:00 ke 07:29:59 = 899
	randomDelay := rand.Intn(900) // 0–899 detik

	scheduledTime := time.Now().Truncate(time.Hour).Add(15 * time.Minute).Add(time.Duration(randomDelay) * time.Second)
	now := time.Now()

	delay := scheduledTime.Sub(now)
	log.Printf("Akan absen pukul: %s (tunggu %v)", scheduledTime.Format("15:04:05"), delay)

	if delay > 0 {
		time.Sleep(delay)
	}

	err := absen()
	if err != nil {
		log.Printf("Gagal absen: %v", err)
	} else {
		log.Println("Berhasil absen")
	}
}

func absen() error {
	now := time.Now()
	log.Printf("[INFO] Mulai absen pada: %s", now.Format("2006-01-02 15:04:05"))

	latitude := -6.216845646559504
	longitude := 106.81443407439703
	accuracy := 100.0

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", false),
		chromedp.Flag("no-first-run", true),
		chromedp.Flag("no-default-browser-check", true),
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("disable-infobars", true),
		chromedp.Flag("disable-password-manager", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("use-fake-ui-for-media-stream", true),
		chromedp.Flag("enable-features", "GeolocationOverride"),
		chromedp.Flag("use-fake-device-for-media-stream", true),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	var res string

	tasks := chromedp.Tasks{

		// Set lokasi GPS
		emulation.SetGeolocationOverride().
			WithLatitude(latitude).
			WithLongitude(longitude).
			WithAccuracy(accuracy),

		chromedp.Navigate("https://quadrang.steradian.co.id/"),
		chromedp.WaitVisible(`#username`),

		chromedp.Clear(`#username`),
		chromedp.SendKeys(`#username`, "Andrian.Kurnia@steradian.co.id"),

		chromedp.Clear(`#password`),
		chromedp.SendKeys(`#password`, "087739993050"),

		chromedp.Click(`button[type="submit"]`),
		chromedp.Sleep(10 * time.Second),

		chromedp.Click(`//button[@data-target="#clockoutConfirmation"]`, chromedp.NodeVisible),
		chromedp.Sleep(2 * time.Second),

		// Klik tombol Confirm Clock Out di modal
		chromedp.Click(`//button[contains(@class, "oh-btn--warning-outline") and contains(text(), "Confirm Clock Out")]`, chromedp.NodeVisible),
		chromedp.Sleep(2 * time.Second),

		chromedp.Text("body", &res),
	}

	if err := chromedp.Run(ctx, tasks); err != nil {
		return fmt.Errorf("error saat absen: %w", err)
	}

	fmt.Println("Absen sukses. Respon:", res)
	return nil
}
