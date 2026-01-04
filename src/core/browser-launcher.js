import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../../config/default.json'), 'utf-8'));

/**
 * Browser Launcher
 * Manages browser instance lifecycle and CDP connections
 */
export class BrowserLauncher {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.cdpSession = null;
  }

  /**
   * Launch browser instance
   * @param {Object} options - Launch options
   * @returns {Promise<void>}
   */
  async launch(options = {}) {
    const launchOptions = {
      headless: options.headless ?? config.browser.headless,
      args: config.browser.args || [],
      ...options
    };

    this.browser = await chromium.launch(launchOptions);
    this.context = await this.browser.newContext({
      viewport: config.browser.defaultViewport || { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();

    // Get CDP session for direct CDP access
    this.cdpSession = await this.context.newCDPSession(this.page);

    return {
      browser: this.browser,
      context: this.context,
      page: this.page,
      cdpSession: this.cdpSession
    };
  }

  /**
   * Close browser instance
   * @returns {Promise<void>}
   */
  async close() {
    if (this.cdpSession) {
      await this.cdpSession.detach();
      this.cdpSession = null;
    }
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if browser is running
   * @returns {boolean}
   */
  isRunning() {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Get CDP session
   * @returns {Object|null}
   */
  getCDPSession() {
    return this.cdpSession;
  }

  /**
   * Get Playwright page
   * @returns {Object|null}
   */
  getPage() {
    return this.page;
  }
}
