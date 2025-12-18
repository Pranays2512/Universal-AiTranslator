#!/usr/bin/env node

/**
 * Test Runner Script
 * 
 * This script provides a convenient way to run different test suites
 * Usage: node scripts/test.js [options]
 */

const { spawn } = require('child_process');
const args = process.argv.slice(2);

// Parse command line arguments
const options = {
    coverage: args.includes('--coverage') || args.includes('-c'),
    watch: args.includes('--watch') || args.includes('-w'),
    unit: args.includes('--unit') || args.includes('-u'),
    integration: args.includes('--integration') || args.includes('-i'),
    e2e: args.includes('--e2e') || args.includes('-e'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    bail: args.includes('--bail') || args.includes('-b'),
};

// Build jest command
let command = 'jest';
const jestArgs = [];

if (options.coverage) {
    jestArgs.push('--coverage');
}

if (options.watch) {
    jestArgs.push('--watch');
}

if (options.verbose) {
    jestArgs.push('--verbose');
}

if (options.bail) {
    jestArgs.push('--bail');
}

// Test path patterns
if (options.unit) {
    jestArgs.push('--testPathPattern=__tests__/unit');
} else if (options.integration) {
    jestArgs.push('--testPathPattern=__tests__/integration');
} else if (options.e2e) {
    jestArgs.push('--testPathPattern=__tests__/e2e');
}

// Run tests
console.log(`\n🧪 Running tests: ${command} ${jestArgs.join(' ')}\n`);

const testProcess = spawn(command, jestArgs, {
    stdio: 'inherit',
    shell: true
});

testProcess.on('exit', (code) => {
    if (code === 0) {
        console.log('\n✅ All tests passed!\n');
    } else {
        console.log('\n❌ Some tests failed.\n');
    }
    process.exit(code);
});

testProcess.on('error', (err) => {
    console.error('Failed to start test process:', err);
    process.exit(1);
});
