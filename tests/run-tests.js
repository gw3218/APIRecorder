#!/usr/bin/env node

/**
 * Test Runner
 * Runs all tests and provides summary
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, stat } from 'fs/promises';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname);
const ROOT_DIR = join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function findTestFiles(dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await findTestFiles(fullPath));
      } else if (entry.name.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  return files;
}

async function runTest(file) {
  return new Promise((resolve) => {
    log(`\nRunning: ${file}`, 'blue');
    const testProcess = spawn('node', ['--test', file], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      resolve(code === 0);
    });

    testProcess.on('error', (error) => {
      log(`Error running test: ${error.message}`, 'red');
      resolve(false);
    });
  });
}

async function main() {
  log('🧪 API Recorder Test Suite', 'blue');
  log('='.repeat(50), 'blue');

  // Check if Node.js test runner is available
  try {
    const { execSync } = await import('child_process');
    execSync('node --version', { stdio: 'ignore' });
  } catch (error) {
    log('❌ Node.js is not available. Please install Node.js first.', 'red');
    process.exit(1);
  }

  const testFiles = await findTestFiles(TEST_DIR);
  
  if (testFiles.length === 0) {
    log('⚠️  No test files found', 'yellow');
    log('Test files should end with .test.js', 'yellow');
    process.exit(0);
  }

  log(`\nFound ${testFiles.length} test file(s)`, 'blue');

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    const success = await runTest(file);
    if (success) {
      passed++;
      log(`✅ ${file} passed`, 'green');
    } else {
      failed++;
      log(`❌ ${file} failed`, 'red');
    }
  }

  log('\n' + '='.repeat(50), 'blue');
  log(`\nTest Summary:`, 'blue');
  log(`  Total: ${testFiles.length}`, 'blue');
  log(`  Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`  Failed: ${failed}`, 'red');
  }
  log('='.repeat(50) + '\n', 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
