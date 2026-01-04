#!/usr/bin/env node

/**
 * Check for cookies in requests to oms.surpath.net
 */

import { initializeDatabase, getStorageManager } from './src/storage/database.js';

async function main() {
  try {
    await initializeDatabase();
    const storageManager = getStorageManager();
    
    // Get all sessions
    const sessions = await storageManager.getAllSessions();
    
    console.log('🔍 Searching for requests to oms.surpath.net...\n');
    
    let foundRequests = [];
    
    for (const session of sessions) {
      const requests = await storageManager.getRequestResponses(session.sessionId);
      
      for (const req of requests) {
        if (req.url && req.url.includes('surpath.net')) {
          foundRequests.push({
            session: session.name,
            sessionId: session.sessionId,
            ...req
          });
        }
      }
    }
    
    console.log(`✅ Found ${foundRequests.length} request(s) to surpath.net\n`);
    
    if (foundRequests.length === 0) {
      console.log('❌ No requests found to oms.surpath.net');
      console.log('   Make sure you recorded a session that visited this site.');
      await storageManager.close();
      return;
    }
    
    // Check each request for cookies
    for (let i = 0; i < foundRequests.length; i++) {
      const req = foundRequests[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Request ${i + 1}: ${req.method || 'GET'} ${req.url}`);
      console.log(`Session: ${req.session}`);
      console.log('='.repeat(80));
      
      // Parse headers
      let requestHeaders = {};
      let responseHeaders = {};
      
      try {
        requestHeaders = typeof req.requestHeaders === 'string' 
          ? JSON.parse(req.requestHeaders || '{}')
          : (req.requestHeaders || {});
      } catch (e) {
        console.log('   ⚠️  Could not parse request headers');
        continue;
      }
      
      try {
        responseHeaders = typeof req.responseHeaders === 'string'
          ? JSON.parse(req.responseHeaders || '{}')
          : (req.responseHeaders || {});
      } catch (e) {
        // Response headers might not exist
      }
      
      // Show ALL headers to see what we have
      console.log('\n📋 ALL Request Headers:');
      const headerKeys = Object.keys(requestHeaders);
      if (headerKeys.length === 0) {
        console.log('   ⚠️  No headers found!');
      } else {
        headerKeys.forEach(key => {
          const value = String(requestHeaders[key]);
          const isCookie = key.toLowerCase().includes('cookie');
          const marker = isCookie ? '🍪' : '  ';
          console.log(`${marker} ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        });
      }
      
      // Check specifically for cookies
      const cookieVariations = ['Cookie', 'cookie', 'COOKIE', 'Cookies', 'cookies'];
      let foundCookie = false;
      
      for (const cookieKey of cookieVariations) {
        if (requestHeaders[cookieKey]) {
          console.log(`\n🍪 FOUND COOKIE HEADER: ${cookieKey}`);
          console.log(`   Value: ${requestHeaders[cookieKey]}`);
          foundCookie = true;
        }
      }
      
      // Check response headers for Set-Cookie
      console.log('\n📋 Response Headers:');
      const responseHeaderKeys = Object.keys(responseHeaders);
      if (responseHeaderKeys.length === 0) {
        console.log('   No response headers found');
      } else {
        responseHeaderKeys.forEach(key => {
          const value = String(responseHeaders[key]);
          const isSetCookie = key.toLowerCase().includes('set-cookie');
          const marker = isSetCookie ? '🍪' : '  ';
          console.log(`${marker} ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        });
      }
      
      if (!foundCookie) {
        console.log('\n   ⚠️  No Cookie header found in request headers');
        console.log('   This could mean:');
        console.log('   1. Cookies are stored in browser but not sent with this request');
        console.log('   2. Cookies are sent but not captured by CDP');
        console.log('   3. The request was made before cookies were set');
      }
    }
    
    await storageManager.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
