#!/usr/bin/env node

/**
 * Script to find and display cookie information from the database
 * Shows all requests with their headers to help identify cookies
 */

import { initializeDatabase, getStorageManager } from './src/storage/database.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse cookie string into object
 */
function parseCookies(cookieString) {
  if (!cookieString) return {};
  
  const cookies = {};
  const pairs = cookieString.split(';').map(c => c.trim());
  
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split('=');
    if (name) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  }
  
  return cookies;
}

/**
 * Check headers for cookies
 */
function findCookiesInHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return { hasCookies: false, cookies: {}, cookieString: null };
  }
  
  // Try different case variations
  const cookieHeader = headers['Cookie'] || headers['cookie'] || headers['COOKIE'];
  const setCookieHeader = headers['Set-Cookie'] || headers['set-cookie'] || headers['SET-COOKIE'];
  
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const cookieString = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    return {
      hasCookies: true,
      cookies,
      cookieString,
      type: 'request'
    };
  }
  
  if (setCookieHeader) {
    return {
      hasCookies: true,
      cookies: Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader],
      cookieString: Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader,
      type: 'response'
    };
  }
  
  return { hasCookies: false, cookies: {}, cookieString: null };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Searching for cookies in database...\n');
    
    await initializeDatabase();
    const storageManager = getStorageManager();
    
    // Get all sessions
    const sessions = await storageManager.getAllSessions();
    console.log(`📁 Found ${sessions.length} session(s)\n`);
    
    let totalRequests = 0;
    let requestsWithCookies = 0;
    let allCookies = [];
    
    for (const session of sessions) {
      const requests = await storageManager.getRequestResponses(session.sessionId);
      totalRequests += requests.length;
      
      if (requests.length === 0) continue;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📂 Session: ${session.name || 'Unnamed'}`);
      console.log(`   ID: ${session.sessionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Requests: ${requests.length}`);
      console.log('='.repeat(80));
      
      for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        
        // Parse headers
        let requestHeaders = {};
        let responseHeaders = {};
        
        try {
          requestHeaders = typeof req.requestHeaders === 'string' 
            ? JSON.parse(req.requestHeaders || '{}')
            : (req.requestHeaders || {});
        } catch (e) {
          console.log(`   ⚠️  Request ${i + 1}: Could not parse request headers`);
          continue;
        }
        
        try {
          responseHeaders = typeof req.responseHeaders === 'string'
            ? JSON.parse(req.responseHeaders || '{}')
            : (req.responseHeaders || {});
        } catch (e) {
          // Response headers might not exist
        }
        
        // Check for cookies
        const requestCookieInfo = findCookiesInHeaders(requestHeaders);
        const responseCookieInfo = findCookiesInHeaders(responseHeaders);
        
        if (requestCookieInfo.hasCookies || responseCookieInfo.hasCookies) {
          requestsWithCookies++;
          
          console.log(`\n   🍪 Request ${i + 1}: ${req.method || 'GET'} ${req.url || 'N/A'}`);
          
          if (requestCookieInfo.hasCookies) {
            console.log(`      📤 Request Cookies (Cookie header):`);
            if (requestCookieInfo.type === 'request') {
              console.log(`         ${JSON.stringify(requestCookieInfo.cookies, null, 10)}`);
              console.log(`         Cookie String: ${requestCookieInfo.cookieString}`);
              allCookies.push({
                sessionId: session.sessionId,
                sessionName: session.name,
                url: req.url,
                method: req.method,
                type: 'request',
                cookies: requestCookieInfo.cookies,
                cookieString: requestCookieInfo.cookieString
              });
            }
          }
          
          if (responseCookieInfo.hasCookies) {
            console.log(`      📥 Response Cookies (Set-Cookie header):`);
            console.log(`         ${responseCookieInfo.cookieString}`);
            allCookies.push({
              sessionId: session.sessionId,
              sessionName: session.name,
              url: req.url,
              method: req.method,
              type: 'response',
              cookies: responseCookieInfo.cookies,
              cookieString: responseCookieInfo.cookieString
            });
          }
          
          // Show all headers for debugging
          console.log(`\n      📋 All Request Headers:`);
          Object.entries(requestHeaders).forEach(([key, value]) => {
            if (key.toLowerCase().includes('cookie')) {
              console.log(`         ${key}: ${value}`);
            }
          });
        } else {
          // Show sample of headers to help debug
          if (i === 0) {
            console.log(`\n   📋 Sample Request ${i + 1} Headers (first request in session):`);
            const headerKeys = Object.keys(requestHeaders);
            if (headerKeys.length > 0) {
              headerKeys.slice(0, 10).forEach(key => {
                console.log(`      ${key}: ${String(requestHeaders[key]).substring(0, 50)}...`);
              });
              if (headerKeys.length > 10) {
                console.log(`      ... and ${headerKeys.length - 10} more headers`);
              }
            } else {
              console.log(`      ⚠️  No headers found for this request`);
            }
          }
        }
      }
    }
    
    // Summary
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Sessions: ${sessions.length}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Requests with Cookies: ${requestsWithCookies}`);
    console.log(`Total Cookie Entries Found: ${allCookies.length}`);
    
    if (allCookies.length > 0) {
      console.log(`\n🍪 All Cookies Found:`);
      allCookies.forEach((cookieInfo, index) => {
        console.log(`\n${index + 1}. ${cookieInfo.type.toUpperCase()} Cookie from ${cookieInfo.sessionName}`);
        console.log(`   URL: ${cookieInfo.url}`);
        console.log(`   Method: ${cookieInfo.method}`);
        if (cookieInfo.type === 'request') {
          console.log(`   Cookies: ${cookieInfo.cookieString}`);
        } else {
          console.log(`   Set-Cookie: ${cookieInfo.cookieString}`);
        }
      });
    } else {
      console.log(`\n⚠️  No cookies found in any requests.`);
      console.log(`\nPossible reasons:`);
      console.log(`1. The websites you visited didn't use cookies`);
      console.log(`2. Cookies might be HttpOnly and not captured in request headers`);
      console.log(`3. The browser might not have sent Cookie headers for those requests`);
      console.log(`4. Cookies might be stored in browser storage but not sent with requests`);
    }
    
    await storageManager.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
