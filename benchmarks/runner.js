import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import yaml from 'js-yaml';

// Ensure results directory exists
function ensureResultsDir() {
  const resultsDir = path.resolve('results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log(`[runner] Created results directory: ${resultsDir}`);
  }
  return resultsDir;
}

// Load scenario configuration
function loadScenario(scenarioPath) {
  try {
    const scenarioFile = fs.readFileSync(scenarioPath, 'utf8');
    const scenario = yaml.load(scenarioFile);
    console.log(`[runner] Loaded scenario: ${scenario.name}`);
    return scenario;
  } catch (error) {
    console.error(`[runner] Error loading scenario ${scenarioPath}:`, error.message);
    process.exit(1);
  }
}

// Execute before/after commands
function executeCommands(commands, label) {
  if (!commands || commands.length === 0) return;
  
  console.log(`[runner] Executing ${label} commands...`);
  for (const cmd of commands) {
    try {
      console.log(`[runner] ${cmd.name}: ${cmd.command}`);
      execSync(cmd.command, { stdio: 'inherit', shell: true });
    } catch (error) {
      console.error(`[runner] ${label} command failed: ${cmd.name}`);
      console.error(error.message);
    }
  }
}

// Run a single test scenario
function runScenario(scenario, env = {}) {
  const testEnv = { ...process.env, ...scenario.env, ...env };
  const results = [];
  
  console.log(`[runner] Running scenario: ${scenario.name}`);
  
  for (let i = 0; i < (scenario.repeat || 1); i++) {
    console.log(`[runner] Iteration ${i + 1}/${scenario.repeat || 1}`);
    
    const start = process.hrtime.bigint();
    try {
      const output = execSync(scenario.command, { 
        stdio: 'pipe',
        env: testEnv,
        encoding: 'utf8',
        timeout: scenario.timeout || 30000
      });
      
      const end = process.hrtime.bigint();
      const executionTime = Number(end - start) / 1e6; // ms
      
      // Try to parse JSON metrics from output
      let metrics = null;
      try {
        const lines = output.split('\n');
        const jsonLine = lines.find(line => line.includes('"type":'));
        if (jsonLine) {
          metrics = JSON.parse(jsonLine);
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      results.push({
        iteration: i + 1,
        execution_time_ms: executionTime,
        success: true,
        metrics,
        output: output.slice(0, 500) // Truncate long output
      });
      
    } catch (error) {
      const end = process.hrtime.bigint();
      const executionTime = Number(end - start) / 1e6;
      
      results.push({
        iteration: i + 1,
        execution_time_ms: executionTime,
        success: false,
        error: error.message,
        output: null
      });
      
      console.error(`[runner] Scenario failed on iteration ${i + 1}:`, error.message);
    }
  }
  
  return results;
}

// Calculate statistics from results
function calculateStats(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length === 0) {
    return {
      success_rate: 0,
      total_runs: results.length,
      failed_runs: failed.length,
      average_time: null,
      min_time: null,
      max_time: null
    };
  }
  
  const times = successful.map(r => r.execution_time_ms);
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  
  return {
    success_rate: (successful.length / results.length) * 100,
    total_runs: results.length,
    successful_runs: successful.length,
    failed_runs: failed.length,
    average_time: parseFloat(avgTime.toFixed(2)),
    min_time: Math.min(...times),
    max_time: Math.max(...times),
    metrics_collected: successful.filter(r => r.metrics).length
  };
}

// Main execution function
function main() {
  const args = process.argv.slice(2);
  const scenarioPath = args[0] || './scenarios/claude-code.yml';
  const environment = args[1] || 'default';
  
  console.log(`[runner] Starting benchmark with scenario: ${scenarioPath}`);
  console.log(`[runner] Environment: ${environment}`);
  
  // Ensure results directory exists
  const resultsDir = ensureResultsDir();
  
  // Load scenario
  const config = loadScenario(scenarioPath);
  
  // Execute before commands
  executeCommands(config.before, 'before');
  
  const timestamp = new Date().toISOString();
  const runResults = {
    scenario: config.name,
    environment,
    timestamp,
    config: config.config,
    results: {}
  };
  
  // Run all scenarios
  if (config.scenarios) {
    for (const scenario of config.scenarios) {
      const results = runScenario(scenario, config.env);
      const stats = calculateStats(results);
      
      runResults.results[scenario.name] = {
        description: scenario.description,
        command: scenario.command,
        stats,
        raw_results: results
      };
      
      console.log(`[runner] ${scenario.name} completed:`, stats);
    }
  } else {
    // Legacy mode: use old scenario format
    const scenarios = [
      { name: 'startup', command: 'node scripts/start-server.js', repeat: 3 },
      { name: 'api_latency', command: 'node scripts/api-test.js', repeat: 3 },
      { name: 'content_gen', command: 'node scripts/content-gen.js', repeat: 3 },
    ];
    
    for (const scenario of scenarios) {
      const results = runScenario(scenario, config.env || {});
      const stats = calculateStats(results);
      runResults.results[scenario.name] = { stats, raw_results: results };
    }
  }
  
  // Execute after commands
  executeCommands(config.after, 'after');
  
  // Save results
  const resultsFile = path.join(resultsDir, `metrics-${environment}-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(runResults, null, 2));
  
  console.log(`[runner] Benchmark completed!`);
  console.log(`[runner] Results saved to: ${resultsFile}`);
  console.log(`[runner] Summary:`, Object.keys(runResults.results).map(name => ({
    scenario: name,
    success_rate: runResults.results[name].stats.success_rate
  })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
