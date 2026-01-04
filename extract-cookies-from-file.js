#!/usr/bin/env node

/**
 * Script to extract cookies from apirecorder.txt file
 * Searches for cookie patterns in the file content
 */

import { readFileSync, writeFileSync } from 'fs';
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
 * Extract cookies from text content
 */
function extractCookiesFromText(content) {
  const results = {
    cookieHeaders: [],
    setCookieHeaders: [],
    cookieStrings: [],
    cookieObjects: []
  };
  
  // Pattern 1: Cookie header format - "Cookie: ..." or "cookie: ..."
  const cookieHeaderPattern = /(?:Cookie|cookie|COOKIE)\s*:\s*([^\r\n]+)/gi;
  let match;
  while ((match = cookieHeaderPattern.exec(content)) !== null) {
    const cookieString = match[1].trim();
    results.cookieHeaders.push(cookieString);
    results.cookieStrings.push(cookieString);
    results.cookieObjects.push(parseCookies(cookieString));
  }
  
  // Pattern 2: Set-Cookie header format - "Set-Cookie: ..." or "set-cookie: ..."
  const setCookiePattern = /(?:Set-Cookie|set-cookie|SET-COOKIE)\s*:\s*([^\r\n]+)/gi;
  while ((match = setCookiePattern.exec(content)) !== null) {
    const cookieString = match[1].trim();
    results.setCookieHeaders.push(cookieString);
  }
  
  // Pattern 3: JSON format cookies - look for "cookie" or "Cookie" keys in JSON
  try {
    // Try to find JSON objects with cookie data
    const jsonCookiePattern = /"cookie"\s*:\s*"([^"]+)"/gi;
    while ((match = jsonCookiePattern.exec(content)) !== null) {
      const cookieString = match[1];
      if (!results.cookieStrings.includes(cookieString)) {
        results.cookieStrings.push(cookieString);
        results.cookieObjects.push(parseCookies(cookieString));
      }
    }
    
    // Try case-insensitive
    const jsonCookiePattern2 = /"Cookie"\s*:\s*"([^"]+)"/gi;
    while ((match = jsonCookiePattern2.exec(content)) !== null) {
      const cookieString = match[1];
      if (!results.cookieStrings.includes(cookieString)) {
        results.cookieStrings.push(cookieString);
        results.cookieObjects.push(parseCookies(cookieString));
      }
    }
  } catch (e) {
    // Not JSON, that's okay
  }
  
  // Pattern 4: Look for cookie-like patterns (name=value; name2=value2)
  const cookieLikePattern = /\b([a-zA-Z0-9_\-]+)\s*=\s*([a-zA-Z0-9_\-\.]+)(?:\s*;\s*([a-zA-Z0-9_\-]+)\s*=\s*([a-zA-Z0-9_\-\.]+))*\b/g;
  // This is a simplified pattern - we'll be more careful
  
  // Pattern 5: Common cookie names
  const commonCookieNames = [
    'JSESSIONID', 'PHPSESSID', 'sessionid', 'session_id', 'session',
    'token', 'access_token', 'refresh_token', 'auth_token',
    'csrf', 'csrftoken', 'XSRF-TOKEN',
    'userId', 'user_id', 'uid',
    'remember', 'remember_me'
  ];
  
  for (const cookieName of commonCookieNames) {
    const pattern = new RegExp(`"${cookieName}"\\s*:\\s*"([^"]+)"`, 'gi');
    while ((match = pattern.exec(content)) !== null) {
      const value = match[1];
      const cookieObj = { [cookieName]: value };
      if (!results.cookieObjects.some(c => JSON.stringify(c) === JSON.stringify(cookieObj))) {
        results.cookieObjects.push(cookieObj);
      }
    }
  }
  
  return results;
}

/**
 * Main function
 */
function main() {
  const filePath = join(__dirname, 'apirecorder.txt');
  
  console.log('🔍 Extracting cookies from apirecorder.txt...\n');
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    console.log(`📄 File size: ${(content.length / 1024).toFixed(2)} KB\n`);
    
    const results = extractCookiesFromText(content);
    
    // Print results
    if (results.cookieHeaders.length > 0) {
      console.log('='.repeat(80));
      console.log('🍪 COOKIE HEADERS FOUND (Cookie: ...)');
      console.log('='.repeat(80));
      results.cookieHeaders.forEach((cookie, index) => {
        console.log(`\n${index + 1}. ${cookie}`);
        const parsed = parseCookies(cookie);
        console.log('   Parsed:', JSON.stringify(parsed, null, 2));
      });
    }
    
    if (results.setCookieHeaders.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🍪 SET-COOKIE HEADERS FOUND (Set-Cookie: ...)');
      console.log('='.repeat(80));
      results.setCookieHeaders.forEach((cookie, index) => {
        console.log(`\n${index + 1}. ${cookie}`);
      });
    }
    
    if (results.cookieObjects.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🍪 COOKIES FOUND IN JSON/OBJECT FORMAT');
      console.log('='.repeat(80));
      results.cookieObjects.forEach((cookieObj, index) => {
        console.log(`\n${index + 1}.`, JSON.stringify(cookieObj, null, 2));
      });
    }
    
    if (results.cookieStrings.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🍪 ALL COOKIE STRINGS');
      console.log('='.repeat(80));
      results.cookieStrings.forEach((cookie, index) => {
        console.log(`${index + 1}. ${cookie}`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Cookie Headers: ${results.cookieHeaders.length}`);
    console.log(`✅ Set-Cookie Headers: ${results.setCookieHeaders.length}`);
    console.log(`✅ Cookie Objects: ${results.cookieObjects.length}`);
    console.log(`✅ Total Cookie Strings: ${results.cookieStrings.length}`);
    
    if (results.cookieHeaders.length === 0 && 
        results.setCookieHeaders.length === 0 && 
        results.cookieObjects.length === 0) {
      console.log('\n⚠️  No cookies found in the file.');
      console.log('   The file might not contain cookie data, or cookies might be stored in a different format.');
    }
    
    // Export to file
    if (results.cookieObjects.length > 0 || results.cookieStrings.length > 0) {
      const exportData = {
        extractedAt: new Date().toISOString(),
        cookieHeaders: results.cookieHeaders,
        setCookieHeaders: results.setCookieHeaders,
        cookieObjects: results.cookieObjects,
        cookieStrings: results.cookieStrings
      };
      
      const exportPath = join(__dirname, 'extracted-cookies.json');
      writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      console.log(`\n💾 Cookies exported to: ${exportPath}`);
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ File not found: ${filePath}`);
    } else {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
