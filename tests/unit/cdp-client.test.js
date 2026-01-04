/**
 * Unit Tests for CDP Client
 * Uses Node.js built-in test runner
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { CDPClient } from '../../src/core/cdp-client.js';

test('CDPClient - should create instance', () => {
  const mockCDPSession = { send: () => {}, on: () => {}, off: () => {} };
  const cdpClient = new CDPClient(mockCDPSession);
  
  assert.ok(cdpClient);
  assert.strictEqual(cdpClient.cdpSession, mockCDPSession);
});

test('CDPClient - should send CDP command', async () => {
  let calledMethod = null;
  let calledParams = null;
  
  const mockCDPSession = {
    send: async (method, params) => {
      calledMethod = method;
      calledParams = params;
      return { result: 'success' };
    },
    on: () => {},
    off: () => {}
  };
  
  const cdpClient = new CDPClient(mockCDPSession);
  const result = await cdpClient.send('Network.enable');
  
  assert.strictEqual(calledMethod, 'Network.enable');
  assert.deepStrictEqual(calledParams, {});
  assert.deepStrictEqual(result, { result: 'success' });
});

test('CDPClient - should enable domain', async () => {
  let calledMethod = null;
  
  const mockCDPSession = {
    send: async (method) => {
      calledMethod = method;
      return {};
    },
    on: () => {},
    off: () => {}
  };
  
  const cdpClient = new CDPClient(mockCDPSession);
  await cdpClient.enableDomain('Network');
  
  assert.strictEqual(calledMethod, 'Network.enable');
});

test('CDPClient - should throw error if session not initialized', () => {
  const client = new CDPClient(null);
  
  assert.throws(() => {
    client.send('Network.enable');
  }, /CDP session not initialized/);
  
  assert.throws(() => {
    client.on('event', () => {});
  }, /CDP session not initialized/);
});
