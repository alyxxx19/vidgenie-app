#!/usr/bin/env npx tsx
/**
 * Script to fix Next.js 15 route handler parameter issues
 * In Next.js 15, route params are now async and need to be awaited
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Pattern to match route handler signatures that need fixing
const ROUTE_HANDLER_PATTERNS = [
  // Match function signatures with params
  {
    search: /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*([^)]+)\s*\)\s*\{/g,
    needsFix: (match: string) => {
      return match.includes('{ params }') && 
             !match.includes('Promise<{') &&
             match.includes('[') // Dynamic route indicator
    }
  }
];

// Patterns for param destructuring that need to be awaited
const PARAM_ACCESS_PATTERNS = [
  {
    search: /const\s+(\w+)\s*=\s*params\.(\w+);?/g,
    replace: 'const $1 = (await params).$2;'
  },
  {
    search: /const\s*\{\s*([^}]+)\s*\}\s*=\s*params;?/g,
    replace: 'const { $1 } = await params;'
  },
  {
    search: /params\.(\w+)/g,
    replace: '(await params).$1'
  }
];

/**
 * Fix route handler parameters in a file
 */
function fixRouteHandlerParams(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf8');
  let modified = content;
  let hasChanges = false;

  // Skip files that don't contain route handlers
  if (!content.includes('export async function') || 
      !content.includes('{ params }')) {
    return false;
  }

  // Fix function signatures
  modified = modified.replace(
    /(\{ params \}:\s*\{\s*params:\s*)(\{[^}]+\})(\s*\})/g,
    '$1Promise<$2>$3'
  );

  if (modified !== content) {
    hasChanges = true;
  }

  // Fix param access patterns (but only if we already have async params)
  if (hasChanges && modified.includes('Promise<{')) {
    // Replace simple param access: params.id -> (await params).id
    modified = modified.replace(/params\.(\w+)(?!\s*\})/g, '(await params).$1');
    
    // Fix destructuring: const { id } = params -> const { id } = await params
    modified = modified.replace(/const\s*\{\s*([^}]+)\s*\}\s*=\s*params;/g, 'const { $1 } = await params;');
    
    // Fix direct assignment: const id = params.id -> const id = (await params).id  
    modified = modified.replace(/const\s+(\w+)\s*=\s*\(await params\)\.(\w+);/g, 'const $1 = (await params).$2;');
  }

  if (modified !== content) {
    writeFileSync(filePath, modified);
    return true;
  }

  return false;
}

/**
 * Process directory recursively
 */
function processDirectory(dirPath: string, stats = { processed: 0, modified: 0 }): { processed: number; modified: number } {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = join(dirPath, item);
    
    if (item.startsWith('.') || item === 'node_modules') {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath, stats);
    } else if (item.endsWith('.ts') && item === 'route.ts') {
      stats.processed++;
      
      try {
        const wasModified = fixRouteHandlerParams(fullPath);
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
  console.log('🔧 Fixing Next.js 15 route handler parameters...');
  console.log('📁 Processing src/app/api/ directory...\n');
  
  const apiPath = join(process.cwd(), 'src', 'app', 'api');
  const stats = processDirectory(apiPath);
  
  console.log('\n📊 Summary:');
  console.log(`   Route files processed: ${stats.processed}`);
  console.log(`   Files modified: ${stats.modified}`);
  
  if (stats.modified > 0) {
    console.log('\n✅ Next.js 15 route handler fixes completed!');
    console.log('   All route handlers now use async params correctly.');
  } else {
    console.log('\n✨ No route handlers needed fixing!');
  }
}

// Run the script
main();