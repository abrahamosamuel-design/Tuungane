import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0', timeout: 5000 });
    await page.screenshot({ path: 'scratch/screenshot.png' });
    const content = await page.content();
    console.log("Error shown:", content.includes("This page didn't load"));
    console.log("Is Loader showing:", content.includes("bounce"));
  } catch (e) {
    console.log('Nav error:', e.message);
  }

  await browser.close();
})();
