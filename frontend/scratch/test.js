import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    // wait a bit for react to render and potentially crash
    await new Promise(r => setTimeout(r, 3000));
    
    const content = await page.content();
    console.log("Error shown:", content.includes("This page didn't load"));
  } catch (e) {
    console.log('Nav error:', e.message);
  }

  await browser.close();
})();
