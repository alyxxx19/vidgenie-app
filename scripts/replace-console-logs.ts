#!/usr/bin/env npx tsx
/**
 * Script to replace all console.log/error/warn/info/debug with secure logging
 * Part of PHASE 1.3 - Security Infrastructure Implementation
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Files to skip (already done or should not be modified)
const SKIP_FILES = new Set([
  'src/lib/secure-logger.ts', // The logger itself
  'AUDIT_TECHNIQUE_COMPLET_VIDGENIE.md', // Documentation
  'SECURITY-IMPROVEMENTS.md', // Documentation
  'package.json', // Package file
  '.github/workflows/security-audit.yml', // CI/CD
]);

// Extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Console method mappings to secure log methods
const CONSOLE_MAPPINGS: Record<string, string> = {
  'console.log': 'secureLog.info',
  'console.info': 'secureLog.info',
  'console.warn': 'secureLog.warn',
  'console.error': 'secureLog.error',
  'console.debug': 'secureLog.debug',
};

// Security-related console.error should use secureLog.security
const SECURITY_PATTERNS = [
  /auth|login|signin|signup|password|token|session|unauthorized|forbidden|security/i,
  /rate\s*limit|ddos|attack|blocked|suspicious/i,
];

/**
 * Check if a console statement should use security logging
 */
function shouldUseSecurityLog(line: string): boolean {
  return SECURITY_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Replace console statements in a single file
 */
function replaceInFile(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let hasChanges = false;
  let hasSecureLogImport = content.includes("from '@/lib/secure-logger'");
  let needsImport = false;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let modified = false;
    
    // Check for console statements
    for (const [consoleMethod, secureMethod] of Object.entries(CONSOLE_MAPPINGS)) {
      if (line.includes(consoleMethod)) {
        // Special case: security-related errors
        if (consoleMethod === 'console.error' && shouldUseSecurityLog(line)) {
          line = line.replace(new RegExp(consoleMethod.replace('.', '\\.'), 'g'), 'secureLog.security');
        } else {
          line = line.replace(new RegExp(consoleMethod.replace('.', '\\.'), 'g'), secureMethod);
        }
        modified = true;
        needsImport = true;
      }
    }
    
    if (modified) {
      lines[i] = line;
      hasChanges = true;
    }
  }
  
  // Add import if needed and not already present
  if (needsImport && !hasSecureLogImport) {
    // Find the last import statement
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && !lines[i].includes('type ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "import { secureLog } from '@/lib/secure-logger';");
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    writeFileSync(filePath, lines.join('\n'));
  }
  
  return hasChanges;
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath: string, stats = { processed: 0, modified: 0 }): { processed: number; modified: number } {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = join(dirPath, item);
    const relativePath = fullPath.replace(process.cwd() + '/', '');
    
    // Skip certain directories and files
    if (item.startsWith('.') || item === 'node_modules' || SKIP_FILES.has(relativePath)) {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath, stats);
    } else if (stat.isFile() && EXTENSIONS.includes(item.slice(item.lastIndexOf('.')))) {
      stats.processed++;
      
      try {
        const wasModified = replaceInFile(fullPath);
        if (wasModified) {
          stats.modified++;
          console.log(`✅ Modified: ${relativePath}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${relativePath}:`, error);
      }
    }
  }
  
  return stats;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting console.log replacement script...');
  console.log('📁 Processing src/ directory...\n');
  
  const srcPath = join(process.cwd(), 'src');
  const stats = processDirectory(srcPath);
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${stats.processed}`);
  console.log(`   Files modified: ${stats.modified}`);
  console.log(`   Success rate: ${((stats.modified / stats.processed) * 100).toFixed(1)}%`);
  
  if (stats.modified > 0) {
    console.log('\n✅ Console logging replacement completed!');
    console.log('   All console.* statements have been replaced with secure logging.');
    console.log('   Security-related errors now use secureLog.security()');
  } else {
    console.log('\n✨ No files needed modification - all console statements already secure!');
  }
}

// Run the script
main();