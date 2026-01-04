#!/usr/bin/env node

/**
 * Script to extract cookies from API requests and responses
 * Usage: node extract-cookies.js [sessionId]
 * If sessionId is not provided, extracts cookies from all sessions
 */

import { initializeDatabase, getStorageManager } from './src/storage/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
 * Parse Set-Cookie header (can have multiple cookies)
 */
function parseSetCookies(setCookieString) {
  if (!setCookieString) return [];
  
  // Set-Cookie can be an array or a single string
  const cookies = Array.isArray(setCookieString) ? setCookieString : [setCookieString];
  const parsed = [];
  
  for (const cookieStr of cookies) {
    const parts = cookieStr.split(';').map(c => c.trim());
    const cookie = {
      name: '',
      value: '',
      attributes: {}
    };
    
    // First part is name=value
    const [nameValue, ...attributes] = parts;
    if (nameValue) {
      const [name, ...valueParts] = nameValue.split('=');
      cookie.name = name.trim();
      cookie.value = valueParts.join('=').trim();
    }
    
    // Rest are attributes (HttpOnly, Secure, Path, Domain, Expires, Max-Age, SameSite)
    for (const attr of attributes) {
      const [key, ...valueParts] = attr.split('=');
      const keyLower = key.toLowerCase();
      const value = valueParts.join('=').trim();
      
      if (keyLower === 'httponly' || keyLower === 'secure') {
        cookie.attributes[keyLower] = true;
      } else if (value) {
        cookie.attributes[keyLower] = value;
      }
    }
    
    parsed.push(cookie);
  }
  
  return parsed;
}

/**
 * Extract cookies from headers
 */
function extractCookiesFromHeaders(headers) {
  const result = {
    requestCookies: {},
    responseCookies: []
  };
  
  if (!headers || typeof headers !== 'object') {
    return result;
  }
  
  // Check for Cookie header (request cookies)
  const cookieHeader = headers['Cookie'] || headers['cookie'] || headers['COOKIE'];
  if (cookieHeader) {
    result.requestCookies = parseCookies(cookieHeader);
  }
  
  // Check for Set-Cookie header (response cookies)
  const setCookieHeader = headers['Set-Cookie'] || headers['set-cookie'] || headers['SET-COOKIE'];
  if (setCookieHeader) {
    result.responseCookies = parseSetCookies(setCookieHeader);
  }
  
  return result;
}

/**
 * Print cookies in a readable format
 */
function printCookies(requestResponse, index) {
  const url = requestResponse.url || 'N/A';
  const method = requestResponse.method || 'N/A';
  
  const requestHeaders = typeof requestResponse.requestHeaders === 'string' 
    ? JSON.parse(requestResponse.requestHeaders || '{}')
    : (requestResponse.requestHeaders || {});
    
  const responseHeaders = typeof requestResponse.responseHeaders === 'string'
    ? JSON.parse(requestResponse.responseHeaders || '{}')
    : (requestResponse.responseHeaders || {});
  
  const requestCookies = extractCookiesFromHeaders(requestHeaders).requestCookies;
  const responseCookies = extractCookiesFromHeaders(responseHeaders).responseCookies;
  
  let hasCookies = false;
  
  if (Object.keys(requestCookies).length > 0 || responseCookies.length > 0) {
    hasCookies = true;
    
    console.log('\n' + '='.repeat(80));
    console.log(`🍪 COOKIES FOUND - Request ${index + 1}`);
    console.log('='.repeat(80));
    console.log(`\n🔗 URL: ${url}`);
    console.log(`📋 Method: ${method}`);
    
    // Request Cookies (sent by client)
    if (Object.keys(requestCookies).length > 0) {
      console.log('\n📤 Request Cookies (Cookie header):');
      console.log(JSON.stringify(requestCookies, null, 2));
      
      // Also print in cookie string format
      const cookieString = Object.entries(requestCookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
      console.log(`\n📋 Cookie String: ${cookieString}`);
    }
    
    // Response Cookies (set by server)
    if (responseCookies.length > 0) {
      console.log('\n📥 Response Cookies (Set-Cookie header):');
      for (const cookie of responseCookies) {
        console.log(`\n  Name: ${cookie.name}`);
        console.log(`  Value: ${cookie.value}`);
        if (Object.keys(cookie.attributes).length > 0) {
          console.log(`  Attributes: ${JSON.stringify(cookie.attributes, null, 2)}`);
        }
        
        // Full Set-Cookie string
        let setCookieStr = `${cookie.name}=${cookie.value}`;
        for (const [key, value] of Object.entries(cookie.attributes)) {
          if (value === true) {
            setCookieStr += `; ${key}`;
          } else {
            setCookieStr += `; ${key}=${value}`;
          }
        }
        console.log(`  Full Set-Cookie: ${setCookieStr}`);
      }
    }
  }
  
  return hasCookies;
}

/**
 * Extract cookies from text file (if it contains cookie data)
 */
function extractCookiesFromTextFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(content);
      // Search for cookie-related fields in the JSON
      const cookieData = findCookiesInObject(data);
      return cookieData;
    } catch {
      // Not JSON, search for cookie patterns in text
      const cookiePattern = /(?:Cookie|Set-Cookie|set-cookie):\s*([^\r\n]+)/gi;
      const matches = content.matchAll(cookiePattern);
      const cookies = [];
      for (const match of matches) {
        cookies.push(match[1]);
      }
      return cookies;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Recursively search for cookies in an object
 */
function findCookiesInObject(obj, path = '') {
  const results = [];
  
  if (typeof obj !== 'object' || obj === null) {
    return results;
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      if (key.toLowerCase().includes('cookie') || value.includes('Cookie') || value.includes('Set-Cookie')) {
        results.push({ path: currentPath, value });
      }
    } else if (typeof value === 'object') {
      results.push(...findCookiesInObject(value, currentPath));
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if user wants to extract from text file
    const textFilePath = join(__dirname, 'apirecorder.txt');
    
    console.log('🔍 Extracting cookies...\n');
    
    // First, try to extract from database
    await initializeDatabase();
    const storageManager = getStorageManager();
    
    const sessionId = process.argv[2];
    let allCookies = [];
    let cookieCount = 0;
    
    if (sessionId) {
      console.log(`📁 Extracting cookies from session: ${sessionId}\n`);
      const requests = await storageManager.getRequestResponses(sessionId);
      
      if (requests.length === 0) {
        console.log('❌ No requests found for this session.');
      } else {
        console.log(`✅ Found ${requests.length} request(s)\n`);
        
        requests.forEach((request, index) => {
          if (printCookies(request, index)) {
            cookieCount++;
          }
        });
      }
    } else {
      console.log('📁 Extracting cookies from all sessions...\n');
      const sessions = await storageManager.getAllSessions();
      
      if (sessions.length === 0) {
        console.log('❌ No sessions found.');
      } else {
        console.log(`✅ Found ${sessions.length} session(s)\n`);
        
        for (const session of sessions) {
          console.log(`\n📂 Session: ${session.name || 'Unnamed'} (${session.sessionId})`);
          const requests = await storageManager.getRequestResponses(session.sessionId);
          
          if (requests.length > 0) {
            requests.forEach((request, index) => {
              if (printCookies(request, index)) {
                cookieCount++;
              }
            });
          }
        }
      }
    }
    
    // Also try to extract from text file if it exists
    try {
      const textFileCookies = extractCookiesFromTextFile(textFilePath);
      if (textFileCookies && textFileCookies.length > 0) {
        console.log('\n\n' + '='.repeat(80));
        console.log('🍪 COOKIES FOUND IN TEXT FILE');
        console.log('='.repeat(80));
        console.log(JSON.stringify(textFileCookies, null, 2));
      }
    } catch (error) {
      // File doesn't exist or can't be read, that's okay
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Found cookies in ${cookieCount} request(s)`);
    
    // Close database connection
    await storageManager.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
