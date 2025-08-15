#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ENVIRONMENTS = {
  'claude': {
    name: 'Claude Code',
    description: 'Claude Code AI assistant environment',
    config: {
      scenarios: ['claude-code.yml'],
      env: {
        AI_PROVIDER: 'claude',
        TEST_ENV: 'claude',
        CONTENT_OUTPUT_DIR: './tmp/generated-claude'
      }
    }
  },
  'codex': {
    name: 'Codex CLI',
    description: 'GitHub Codex CLI environment',
    config: {
      scenarios: ['codex-cli.yml'],
      env: {
        AI_PROVIDER: 'codex',
        TEST_ENV: 'codex',
        CONTENT_OUTPUT_DIR: './tmp/generated-codex'
      }
    }
  },
  'comparison': {
    name: 'Comparative Testing',
    description: 'Side-by-side comparison mode',
    config: {
      scenarios: ['comparative.yml'],
      env: {
        AI_PROVIDER: 'both',
        TEST_ENV: 'comparison',
        ENABLE_COMPARISON: 'true'
      }
    }
  }
};

function printUsage() {
  console.log(`
Environment Switcher for safe-ops-agent

Usage: node scripts/switch-environment.js [command] [environment]

Commands:
  list                List available environments
  switch <env>        Switch to specified environment
  current             Show current environment
  run <env>           Run benchmarks for environment
  compare             Run comparison between all environments

Available Environments:
${Object.entries(ENVIRONMENTS).map(([key, env]) => 
  `  ${key.padEnd(12)} ${env.name} - ${env.description}`
).join('\n')}

Examples:
  node scripts/switch-environment.js list
  node scripts/switch-environment.js switch claude
  node scripts/switch-environment.js run codex
  node scripts/switch-environment.js compare
`);
}

function getCurrentEnvironment() {
  const envFile = '.env.current';
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/CURRENT_ENV=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function switchEnvironment(envName) {
  if (!ENVIRONMENTS[envName]) {
    console.error(`[switch] Unknown environment: ${envName}`);
    console.log('Available environments:', Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }
  
  const env = ENVIRONMENTS[envName];
  console.log(`[switch] Switching to ${env.name}...`);
  
  // Create environment-specific configuration
  const envConfig = {
    current_environment: envName,
    name: env.name,
    description: env.description,
    timestamp: new Date().toISOString(),
    ...env.config
  };
  
  // Save current environment
  const envVars = Object.entries(env.config.env || {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const envFile = `CURRENT_ENV=${envName}\n${envVars}\n`;
  fs.writeFileSync('.env.current', envFile);
  
  // Save environment configuration
  fs.writeFileSync(`.env.${envName}`, envFile);
  
  // Create environment-specific directories
  const outputDir = env.config.env?.CONTENT_OUTPUT_DIR;
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`[switch] Created output directory: ${outputDir}`);
  }
  
  console.log(`[switch] Environment switched to: ${env.name}`);
  console.log(`[switch] Configuration saved to: .env.${envName}`);
  
  return envConfig;
}

function listEnvironments() {
  const current = getCurrentEnvironment();
  
  console.log('\nAvailable Environments:\n');
  
  for (const [key, env] of Object.entries(ENVIRONMENTS)) {
    const marker = key === current ? '→' : ' ';
    console.log(`${marker} ${key.padEnd(12)} ${env.name}`);
    console.log(`   ${''.padEnd(12)} ${env.description}`);
    
    if (env.config.scenarios) {
      console.log(`   ${''.padEnd(12)} Scenarios: ${env.config.scenarios.join(', ')}`);
    }
    console.log();
  }
  
  if (current) {
    console.log(`Current environment: ${current} (${ENVIRONMENTS[current]?.name || 'Unknown'})`);
  } else {
    console.log('No environment currently selected');
  }
}

function runEnvironment(envName) {
  console.log(`[run] Starting benchmark for environment: ${envName}`);
  
  if (!ENVIRONMENTS[envName]) {
    console.error(`[run] Unknown environment: ${envName}`);
    process.exit(1);
  }
  
  // Switch to environment first
  const config = switchEnvironment(envName);
  
  // Run benchmark
  const { execSync } = require('child_process');
  
  try {
    const scenarios = config.scenarios || ['default.yml'];
    
    for (const scenario of scenarios) {
      const scenarioPath = `scenarios/${scenario}`;
      
      if (!fs.existsSync(scenarioPath)) {
        console.warn(`[run] Scenario file not found: ${scenarioPath}`);
        continue;
      }
      
      console.log(`[run] Executing scenario: ${scenario}`);
      
      const cmd = `node benchmarks/runner.js ${scenarioPath} ${envName}`;
      console.log(`[run] Running: ${cmd}`);
      
      // Set environment variables
      const env = { ...process.env };
      if (config.env) {
        Object.assign(env, config.env);
      }
      
      execSync(cmd, {
        stdio: 'inherit',
        env
      });
    }
    
    console.log(`[run] Benchmark completed for environment: ${envName}`);
    console.log(`[run] Results saved in: results/metrics-${envName}-*.json`);
    
  } catch (error) {
    console.error(`[run] Benchmark failed:`, error.message);
    process.exit(1);
  }
}

function runComparison() {
  console.log('[compare] Starting comprehensive comparison...');
  
  const environments = ['claude', 'codex'];
  const results = [];
  
  for (const env of environments) {
    try {
      console.log(`\n[compare] Running ${ENVIRONMENTS[env].name}...`);
      runEnvironment(env);
      results.push(env);
    } catch (error) {
      console.error(`[compare] Failed to run ${env}:`, error.message);
    }
  }
  
  if (results.length > 1) {
    console.log('\n[compare] Generating comparison report...');
    
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/compare-results.js', { stdio: 'inherit' });
      
      console.log('[compare] Comparison completed!');
      console.log('[compare] View results: results/comparison-report.md');
      
    } catch (error) {
      console.error('[compare] Failed to generate comparison report:', error.message);
    }
  } else {
    console.log('[compare] Not enough successful runs for comparison');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1];
  
  switch (command) {
    case 'list':
      listEnvironments();
      break;
      
    case 'switch':
      if (!environment) {
        console.error('Environment name required');
        printUsage();
        process.exit(1);
      }
      switchEnvironment(environment);
      break;
      
    case 'current':
      const current = getCurrentEnvironment();
      if (current) {
        console.log(`Current environment: ${current} (${ENVIRONMENTS[current]?.name || 'Unknown'})`);
      } else {
        console.log('No environment currently selected');
      }
      break;
      
    case 'run':
      if (!environment) {
        console.error('Environment name required');
        printUsage();
        process.exit(1);
      }
      runEnvironment(environment);
      break;
      
    case 'compare':
      runComparison();
      break;
      
    case 'help':
    case '--help':
    case '-h':
    default:
      printUsage();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ENVIRONMENTS,
  switchEnvironment,
  runEnvironment,
  runComparison,
  getCurrentEnvironment
};