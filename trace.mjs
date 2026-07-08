import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Intercept and log all network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/data/')) {
      console.log('REQUESTED DATA FILE:', url);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/data/')) {
      console.log('RESPONSE:', url, 'STATUS:', response.status());
    }
  });

  await page.goto('https://graph.hangout.audio/iem/5128/?share=Chu_2', { waitUntil: 'networkidle2' });
  
  await browser.close();
})();
