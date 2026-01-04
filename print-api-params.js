#!/usr/bin/env node

/**
 * Script to print API request parameters and response parameters
 * Usage: node print-api-params.js [sessionId]
 * If sessionId is not provided, prints all sessions and their requests
 */

import { initializeDatabase, getStorageManager } from './src/storage/database.js';
import { StorageManager } from './src/managers/storage-manager.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse query string to object
 */
function parseQueryString(queryString) {
  if (!queryString) return {};
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Parse JSON safely
 */
function parseJSON(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Format headers for display
 */
function formatHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};
  return headers;
}

/**
 * Print request parameters
 */
function printRequestParams(request) {
  console.log('\n' + '='.repeat(80));
  console.log('📤 API REQUEST PARAMETERS');
  console.log('='.repeat(80));
  
  console.log(`\n🔗 URL: ${request.url || 'N/A'}`);
  console.log(`📋 Method: ${request.method || 'N/A'}`);
  console.log(`📦 Resource Type: ${request.resourceType || 'N/A'}`);
  console.log(`🕐 Timestamp: ${request.createdAt || 'N/A'}`);
  
  // Query Parameters
  if (request.queryString) {
    const queryParams = parseQueryString(request.queryString);
    if (Object.keys(queryParams).length > 0) {
      console.log('\n🔍 Query Parameters:');
      console.log(JSON.stringify(queryParams, null, 2));
    }
  }
  
  // Request Headers
  const headers = formatHeaders(request.requestHeaders);
  if (Object.keys(headers).length > 0) {
    console.log('\n📨 Request Headers:');
    console.log(JSON.stringify(headers, null, 2));
  }
  
  // Request Body (POST Data)
  if (request.postData) {
    console.log('\n📝 Request Body:');
    const parsedBody = parseJSON(request.postData);
    if (typeof parsedBody === 'object') {
      console.log(JSON.stringify(parsedBody, null, 2));
    } else {
      console.log(request.postData);
    }
  }
  
  // Referrer
  if (request.referrer) {
    console.log(`\n🔗 Referrer: ${request.referrer}`);
  }
}

/**
 * Print response parameters
 */
function printResponseParams(response) {
  console.log('\n' + '='.repeat(80));
  console.log('📥 API RESPONSE PARAMETERS');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Status: ${response.status || 'N/A'} ${response.statusText || ''}`);
  console.log(`📦 MIME Type: ${response.mimeType || 'N/A'}`);
  console.log(`📏 Body Size: ${response.bodySize ? `${(response.bodySize / 1024).toFixed(2)} KB` : 'N/A'}`);
  
  // Response Headers
  const headers = formatHeaders(response.responseHeaders);
  if (Object.keys(headers).length > 0) {
    console.log('\n📨 Response Headers:');
    console.log(JSON.stringify(headers, null, 2));
  }
  
  // Response Body
  if (response.body) {
    console.log('\n📝 Response Body:');
    const parsedBody = parseJSON(response.body);
    if (typeof parsedBody === 'object') {
      // Limit body display to first 2000 characters if it's too large
      const bodyStr = JSON.stringify(parsedBody, null, 2);
      if (bodyStr.length > 2000) {
        console.log(bodyStr.substring(0, 2000) + '\n... (truncated)');
      } else {
        console.log(bodyStr);
      }
    } else {
      const bodyStr = String(response.body);
      if (bodyStr.length > 2000) {
        console.log(bodyStr.substring(0, 2000) + '\n... (truncated)');
      } else {
        console.log(bodyStr);
      }
    }
  } else {
    console.log('\n📝 Response Body: (empty)');
  }
}

/**
 * Print request-response pair
 */
function printRequestResponse(pair, index, total) {
  console.log('\n\n' + '#'.repeat(80));
  console.log(`# REQUEST-RESPONSE PAIR ${index + 1} of ${total}`);
  console.log('#'.repeat(80));
  
  printRequestParams(pair);
  printResponseParams(pair);
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize database
    await initializeDatabase();
    const storageManager = getStorageManager();
    
    // Get sessionId from command line arguments
    const sessionId = process.argv[2];
    
    if (sessionId) {
      // Print requests for specific session
      console.log(`\n🔍 Fetching requests for session: ${sessionId}\n`);
      const requests = await storageManager.getRequestResponses(sessionId);
      
      if (requests.length === 0) {
        console.log('❌ No requests found for this session.');
        return;
      }
      
      console.log(`\n✅ Found ${requests.length} request(s)\n`);
      
      requests.forEach((request, index) => {
        printRequestResponse(request, index, requests.length);
      });
    } else {
      // Print all sessions and their requests
      console.log('\n🔍 Fetching all sessions...\n');
      const sessions = await storageManager.getAllSessions();
      
      if (sessions.length === 0) {
        console.log('❌ No sessions found.');
        return;
      }
      
      console.log(`\n✅ Found ${sessions.length} session(s)\n`);
      
      for (const session of sessions) {
        console.log('\n' + '='.repeat(80));
        console.log(`📁 SESSION: ${session.name || 'Unnamed'}`);
        console.log(`   ID: ${session.sessionId}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Total Requests: ${session.totalRequests || 0}`);
        console.log('='.repeat(80));
        
        const requests = await storageManager.getRequestResponses(session.sessionId);
        
        if (requests.length === 0) {
          console.log('\n   No requests found for this session.\n');
          continue;
        }
        
        console.log(`\n   Found ${requests.length} request(s) for this session\n`);
        
        requests.forEach((request, index) => {
          printRequestResponse(request, index, requests.length);
        });
      }
    }
    
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
