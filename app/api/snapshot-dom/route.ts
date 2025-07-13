import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  try {
    const { liveUrl } = await request.json();

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Navigate to URL
    await page.goto(liveUrl, {
      waitUntil: 'networkidle0',
    });

    // Get page metrics and DOM structure
    const metrics = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).map(el => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          text: el.textContent?.trim(),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          styles: {
            fontFamily: computedStyle.fontFamily,
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            color: computedStyle.color,
            backgroundColor: computedStyle.backgroundColor,
          },
        };
      });

      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        elements,
      };
    });

    await browser.close();

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error capturing website:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 