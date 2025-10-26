#!/usr/bin/env node

/**
 * Post-install script to patch the Chatwoot SDK
 *
 * CRITICAL: The Chatwoot SDK hardcodes 'api_access_token' in headers (line 148 of request.js)
 * but Chatwoot's nginx reverse proxy only accepts 'api-access-token' (with hyphens).
 *
 * This script directly modifies the SDK's source code in node_modules to fix the header name.
 */

const fs = require('fs');
const path = require('path');

const SDK_REQUEST_FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  '@figuro',
  'chatwoot-sdk',
  'dist',
  'core',
  'request.js'
);

console.log('[CHATWOOT SDK PATCH] Starting patch process...');
console.log(`[CHATWOOT SDK PATCH] Target file: ${SDK_REQUEST_FILE}`);

if (!fs.existsSync(SDK_REQUEST_FILE)) {
  console.error('[CHATWOOT SDK PATCH] ❌ SDK request.js file not found!');
  console.error('[CHATWOOT SDK PATCH] Skipping patch (SDK may not be installed yet)');
  process.exit(0); // Exit gracefully
}

try {
  // Read the file
  let content = fs.readFileSync(SDK_REQUEST_FILE, 'utf8');

  // Check if already patched
  if (content.includes('api-access-token')) {
    console.log('[CHATWOOT SDK PATCH] ℹ️  Already patched, skipping...');
    process.exit(0);
  }

  // Replace the problematic line
  // Original line 148: headers["api_access_token"] = token;
  // New line: headers["api-access-token"] = token;
  const originalLine = 'headers["api_access_token"] = token;';
  const patchedLine = 'headers["api-access-token"] = token;';

  if (!content.includes(originalLine)) {
    console.error('[CHATWOOT SDK PATCH] ⚠️  Original line not found - SDK version may have changed');
    console.error('[CHATWOOT SDK PATCH] Looking for: ' + originalLine);
    process.exit(1);
  }

  // Apply the patch
  content = content.replace(originalLine, patchedLine);

  // Write back
  fs.writeFileSync(SDK_REQUEST_FILE, content, 'utf8');

  console.log('[CHATWOOT SDK PATCH] ✅ Successfully patched Chatwoot SDK!');
  console.log('[CHATWOOT SDK PATCH] Changed: api_access_token → api-access-token');

} catch (error) {
  console.error('[CHATWOOT SDK PATCH] ❌ Error patching SDK:', error.message);
  process.exit(1);
}
