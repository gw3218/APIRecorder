/**
 * Unit Tests for Browser Launcher
 * Uses Node.js built-in test runner
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { BrowserLauncher } from '../../src/core/browser-launcher.js';

test('BrowserLauncher - should create instance', () => {
  const launcher = new BrowserLauncher();
  assert.ok(launcher);
  assert.strictEqual(launcher.browser, null);
  assert.strictEqual(launcher.cdpSession, null);
});

test('BrowserLauncher - should launch browser', async () => {
  const launcher = new BrowserLauncher();
  const result = await launcher.launch({ headless: true });
  
  assert.ok(result);
  assert.ok(result.browser);
  assert.ok(result.page);
  assert.ok(result.cdpSession);
  assert.strictEqual(launcher.isRunning(), true);
  
  await launcher.close();
});

test('BrowserLauncher - should close browser', async () => {
  const launcher = new BrowserLauncher();
  await launcher.launch({ headless: true });
  assert.strictEqual(launcher.isRunning(), true);
  
  await launcher.close();
  assert.strictEqual(launcher.isRunning(), false);
  assert.strictEqual(launcher.browser, null);
});

test('BrowserLauncher - should get CDP session', async () => {
  const launcher = new BrowserLauncher();
  await launcher.launch({ headless: true });
  const session = launcher.getCDPSession();
  
  assert.ok(session);
  assert.notStrictEqual(session, null);
  
  await launcher.close();
});

test('BrowserLauncher - should get page', async () => {
  const launcher = new BrowserLauncher();
  await launcher.launch({ headless: true });
  const page = launcher.getPage();
  
  assert.ok(page);
  assert.notStrictEqual(page, null);
  
  await launcher.close();
});
