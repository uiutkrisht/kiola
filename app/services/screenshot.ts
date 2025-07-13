import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  waitForSelector?: string;
  delay?: number;
}

export class ScreenshotService {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      console.log('Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
    }
    return this.browser;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async removeOverlays(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        // Remove common overlay elements that might block content
        const selectors = [
          '[class*="cookie"]',
          '[class*="gdpr"]',
          '[class*="popup"]',
          '[class*="modal"]',
          '[class*="overlay"]',
          '[class*="banner"]',
          '[id*="cookie"]',
          '[id*="gdpr"]',
          '[id*="popup"]',
          '[id*="modal"]',
          '[data-testid*="cookie"]',
          '[data-testid*="banner"]',
          '.fixed',
          '.sticky'
        ];

        selectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              // Remove elements that cover significant screen real estate
              if ((rect.width > window.innerWidth * 0.8) || 
                  (rect.height > window.innerHeight * 0.3) ||
                  el.innerHTML.toLowerCase().includes('cookie') ||
                  el.innerHTML.toLowerCase().includes('gdpr')) {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              }
            });
          } catch (e) {
            // Ignore errors for individual selectors
          }
        });

        // Remove elements with high z-index that might be overlays
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex);
          if (zIndex > 9999 && style.position === 'fixed') {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          }
        });
      });
    } catch (error) {
      console.warn('Error removing overlays:', error);
    }
  }

  async takeScreenshot(url: string, options: ScreenshotOptions = {}): Promise<Buffer> {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      console.log('Taking full-page screenshot of:', url);

      // Set viewport size for consistent rendering
      await page.setViewport({
        width: options.width || 1440,
        height: options.height || 900,
        deviceScaleFactor: 1
      });

      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Block unnecessary resources to speed up loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        
        // Block ads, analytics, and other non-essential resources
        if (resourceType === 'image' && (url.includes('ads') || url.includes('tracking') || url.includes('analytics'))) {
          req.abort();
        } else if (resourceType === 'script' && (url.includes('analytics') || url.includes('tracking') || url.includes('ads'))) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Strategy 1: Try with networkidle2 (more lenient)
      let navigationSuccess = false;
      try {
        console.log('Attempting navigation with networkidle2...');
        await page.goto(url, {
          waitUntil: 'networkidle2', // Wait until only 2 or fewer network requests for 500ms
          timeout: 60000 // Increased timeout to 60 seconds
        });
        navigationSuccess = true;
        console.log('Navigation successful with networkidle2');
      } catch (error) {
        console.warn('networkidle2 strategy failed:', error instanceof Error ? error.message : String(error));
      }

      // Strategy 2: Try with domcontentloaded if networkidle2 fails
      if (!navigationSuccess) {
        try {
          console.log('Attempting navigation with domcontentloaded...');
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          navigationSuccess = true;
          console.log('Navigation successful with domcontentloaded');
        } catch (error) {
          console.warn('domcontentloaded strategy failed:', error instanceof Error ? error.message : String(error));
        }
      }

      // Strategy 3: Basic load if others fail
      if (!navigationSuccess) {
        try {
          console.log('Attempting basic navigation...');
          await page.goto(url, {
            waitUntil: 'load',
            timeout: 30000
          });
          navigationSuccess = true;
          console.log('Navigation successful with basic load');
        } catch (error) {
          throw new Error(`All navigation strategies failed. Last error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
          console.log(`Found selector: ${options.waitForSelector}`);
        } catch (error) {
          console.warn(`Selector ${options.waitForSelector} not found, proceeding anyway`);
        }
      }

      // Additional delay for dynamic content and animations
      const delay = options.delay || 5000; // Increased default delay
      console.log(`Waiting ${delay}ms for dynamic content...`);
      await this.delay(delay);

      // Remove overlays that might interfere
      console.log('Removing overlay elements...');
      await this.removeOverlays(page);

      // Wait a bit more after removing overlays
      await this.delay(2000);

      // Take full-page screenshot
      console.log('Capturing screenshot...');
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true
      });

      console.log('Full-page screenshot captured successfully');
      return screenshot as Buffer;

    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Turn off request interception
      try {
        await page.setRequestInterception(false);
      } catch (e) {
        // Ignore cleanup errors
      }
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Create a singleton instance
let screenshotService: ScreenshotService | null = null;

export function getScreenshotService(): ScreenshotService {
  if (!screenshotService) {
    screenshotService = new ScreenshotService();
  }
  return screenshotService;
} 