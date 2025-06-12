#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get the path to the TypeScript file
const scriptPath = path.join(__dirname, 'create-user.ts');

try {
  // Run the TypeScript file using ts-node
  console.log('Creating default admin user...');
  execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Error running script:', error);
  process.exit(1);
}
