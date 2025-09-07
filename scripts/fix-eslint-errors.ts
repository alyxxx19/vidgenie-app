#!/usr/bin/env npx tsx
/**
 * Script to fix common ESLint errors automatically
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Common ESLint error fixes
const ESLINT_FIXES = [
  // Unused imports - remove them
  {
    pattern: /^import\s+\{\s*NextResponse\s*\}\s+from\s+['"][^'"]+['"];\s*$/gm,
    replace: (match: string, fileContent: string) => {
      // Only remove if NextResponse is not used in the file
      if (!fileContent.includes('NextResponse.') && !fileContent.includes('return NextResponse')) {
        return '';
      }
      return match;
    }
  },
  
  // Unused function parameters - prefix with underscore
  {
    pattern: /(\(|,\s*)([a-zA-Z_][a-zA-Z0-9_]*)(:\s*[^,)]+)(\s*[,)])/g,
    replace: (match: string, prefix: string, paramName: string, type: string, suffix: string, fileContent: string) => {
      // Check if parameter is used in function body
      const regex = new RegExp(`\\b${paramName}\\b`, 'g');
      const matches = fileContent.match(regex) || [];
      // If only mentioned once (in parameter declaration), it's unused
      if (matches.length <= 1) {
        return `${prefix}_${paramName}${type}${suffix}`;
      }
      return match;
    }
  },
  
  // let to const for never reassigned variables
  {
    pattern: /let\s+(\w+)\s*=/g,
    replace: 'const $1 ='
  },
  
  // Trivial type annotations
  {
    pattern: /:\s*number\s*=\s*\d+/g,
    replace: (match: string) => match.replace(/:\s*number/, '')
  },
  {
    pattern: /:\s*boolean\s*=\s*(true|false)/g,
    replace: (match: string) => match.replace(/:\s*boolean/, '')
  },
  
  // Unused caught errors - prefix with underscore
  {
    pattern: /catch\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
    replace: (match: string, errorName: string, fileContent: string) => {
      // Check if error is used in catch block
      const catchBlockStart = fileContent.indexOf(match);
      const afterCatch = fileContent.substring(catchBlockStart);
      const nextOpenBrace = afterCatch.indexOf('{');
      const catchBlock = afterCatch.substring(0, afterCatch.indexOf('}', nextOpenBrace) + 1);
      
      if (!catchBlock.includes(errorName + '.') && !catchBlock.includes(errorName + ',') && !catchBlock.includes(errorName + ')')) {
        return match.replace(errorName, '_' + errorName);
      }
      return match;
    }
  }
];

/**
 * Fix ESLint errors in a file
 */
function fixESLintErrors(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;

  for (const fix of ESLINT_FIXES) {
    if (typeof fix.replace === 'function') {
      const newContent = content.replace(fix.pattern, (match, ...args) => {
        return (fix.replace as Function)(match, content, ...args);
      });
      if (newContent !== modified) {
        modified = newContent;
        hasChanges = true;
      }
    } else {
      const newContent = modified.replace(fix.pattern, fix.replace as string);
      if (newContent !== modified) {
        modified = newContent;
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    writeFileSync(filePath, modified);
  }

  return hasChanges;
}

/**
 * Process directory recursively
 */
function processDirectory(dirPath: string, stats = { processed: 0, modified: 0 }): { processed: number; modified: number } {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = join(dirPath, item);
    
    if (item.startsWith('.') || item === 'node_modules' || item === 'scripts') {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath, stats);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      stats.processed++;
      
      try {
        const wasModified = fixESLintErrors(fullPath);
        if (wasModified) {
          stats.modified++;
          console.log(`✅ Fixed: ${fullPath.replace(process.cwd() + '/', '')}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${fullPath}:`, error);
      }
    }
  }
  
  return stats;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Fixing common ESLint errors...');
  console.log('📁 Processing src/ directory...\n');
  
  const srcPath = join(process.cwd(), 'src');
  const stats = processDirectory(srcPath);
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${stats.processed}`);
  console.log(`   Files modified: ${stats.modified}`);
  
  if (stats.modified > 0) {
    console.log('\n✅ ESLint error fixes completed!');
  } else {
    console.log('\n✨ No files needed ESLint fixes!');
  }
}

// Run the script
main();