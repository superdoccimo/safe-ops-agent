#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('[compare] Starting result comparison analysis...');

// Find all result files
function findResultFiles() {
  const resultsDir = './results';
  if (!fs.existsSync(resultsDir)) {
    console.error('[compare] Results directory not found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(resultsDir)
    .filter(file => file.startsWith('metrics-') && file.endsWith('.json'))
    .map(file => path.join(resultsDir, file));
    
  console.log(`[compare] Found ${files.length} result files`);
  return files;
}

// Load and parse result files
function loadResults(files) {
  const results = {};
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const environment = data.environment || 'unknown';
      
      if (!results[environment]) {
        results[environment] = [];
      }
      
      results[environment].push({
        file: path.basename(file),
        timestamp: data.timestamp,
        scenario: data.scenario,
        results: data.results
      });
      
    } catch (error) {
      console.warn(`[compare] Failed to load ${file}:`, error.message);
    }
  }
  
  return results;
}

// Calculate aggregate statistics
function calculateAggregateStats(runs) {
  const aggregated = {};
  
  for (const run of runs) {
    for (const [scenarioName, scenarioData] of Object.entries(run.results)) {
      if (!aggregated[scenarioName]) {
        aggregated[scenarioName] = {
          runs: [],
          avg_success_rate: 0,
          avg_execution_time: 0,
          total_runs: 0
        };
      }
      
      aggregated[scenarioName].runs.push(scenarioData.stats);
    }
  }
  
  // Calculate averages
  for (const [scenarioName, data] of Object.entries(aggregated)) {
    const validRuns = data.runs.filter(r => r.success_rate > 0);
    
    if (validRuns.length > 0) {
      data.avg_success_rate = validRuns.reduce((sum, r) => sum + r.success_rate, 0) / validRuns.length;
      data.avg_execution_time = validRuns.reduce((sum, r) => sum + (r.average_time || 0), 0) / validRuns.length;
      data.total_runs = validRuns.length;
    }
  }
  
  return aggregated;
}

// Generate comparison report
function generateReport(results) {
  const environments = Object.keys(results);
  console.log(`[compare] Comparing environments: ${environments.join(', ')}`);
  
  const aggregated = {};
  for (const [env, runs] of Object.entries(results)) {
    aggregated[env] = calculateAggregateStats(runs);
  }
  
  // Generate markdown report
  let report = `# Performance Comparison Report

Generated: ${new Date().toISOString()}

## Summary

`;

  // Environment overview
  for (const env of environments) {
    const envData = aggregated[env];
    const scenarios = Object.keys(envData);
    
    report += `### ${env.charAt(0).toUpperCase() + env.slice(1)} Environment
- Scenarios tested: ${scenarios.length}
- Total test runs: ${Object.values(envData).reduce((sum, s) => sum + s.total_runs, 0)}

`;
  }
  
  // Detailed comparison
  report += `## Detailed Comparison

| Scenario | `;
  for (const env of environments) {
    report += `${env} Success Rate | ${env} Avg Time (ms) | `;
  }
  report += `Winner |\n`;
  
  report += `| --- | `;
  for (const env of environments) {
    report += `--- | --- | `;
  }
  report += `--- |\n`;
  
  // Get all unique scenarios
  const allScenarios = new Set();
  for (const envData of Object.values(aggregated)) {
    Object.keys(envData).forEach(scenario => allScenarios.add(scenario));
  }
  
  for (const scenario of allScenarios) {
    report += `| ${scenario} | `;
    
    let bestTime = Infinity;
    let bestSuccessRate = 0;
    let winners = [];
    
    for (const env of environments) {
      const data = aggregated[env][scenario];
      if (data && data.total_runs > 0) {
        const successRate = data.avg_success_rate.toFixed(1);
        const avgTime = data.avg_execution_time.toFixed(2);
        
        report += `${successRate}% | ${avgTime} | `;
        
        // Determine winner (higher success rate first, then lower time)
        if (data.avg_success_rate > bestSuccessRate || 
           (data.avg_success_rate === bestSuccessRate && data.avg_execution_time < bestTime)) {
          bestSuccessRate = data.avg_success_rate;
          bestTime = data.avg_execution_time;
          winners = [env];
        } else if (data.avg_success_rate === bestSuccessRate && data.avg_execution_time === bestTime) {
          winners.push(env);
        }
      } else {
        report += `N/A | N/A | `;
      }
    }
    
    report += `${winners.join(', ')} |\n`;
  }
  
  // Recommendations
  report += `
## Recommendations

Based on the performance comparison:

`;

  // Calculate overall scores
  const scores = {};
  for (const env of environments) {
    scores[env] = { performance: 0, reliability: 0, scenarios: 0 };
    
    for (const [scenario, data] of Object.entries(aggregated[env])) {
      if (data.total_runs > 0) {
        scores[env].reliability += data.avg_success_rate;
        scores[env].performance += data.avg_execution_time > 0 ? (10000 / data.avg_execution_time) : 0; // Inverse time score
        scores[env].scenarios += 1;
      }
    }
    
    if (scores[env].scenarios > 0) {
      scores[env].reliability /= scores[env].scenarios;
      scores[env].performance /= scores[env].scenarios;
    }
  }
  
  // Find best performing environment
  let bestEnv = environments[0];
  let bestScore = scores[bestEnv].reliability + scores[bestEnv].performance;
  
  for (const env of environments) {
    const envScore = scores[env].reliability + scores[env].performance;
    if (envScore > bestScore) {
      bestEnv = env;
      bestScore = envScore;
    }
  }
  
  report += `- **Recommended environment:** ${bestEnv}
  - **Reliability score:** ${scores[bestEnv].reliability.toFixed(1)}%
  - **Performance score:** ${scores[bestEnv].performance.toFixed(1)}

## Raw Data

\`\`\`json
${JSON.stringify(aggregated, null, 2)}
\`\`\`

---
*Generated by safe-ops-agent comparison tool*
`;

  return report;
}

// Main execution
function main() {
  try {
    const files = findResultFiles();
    
    if (files.length === 0) {
      console.log('[compare] No result files found');
      return;
    }
    
    const results = loadResults(files);
    const report = generateReport(results);
    
    // Save report
    const reportPath = './results/comparison-report.md';
    fs.writeFileSync(reportPath, report);
    
    console.log(`[compare] Comparison report generated: ${reportPath}`);
    console.log(`[compare] Environments compared: ${Object.keys(results).join(', ')}`);
    
    // Also save raw comparison data
    const rawDataPath = './results/comparison-data.json';
    fs.writeFileSync(rawDataPath, JSON.stringify(results, null, 2));
    
    console.log(`[compare] Raw comparison data saved: ${rawDataPath}`);
    
  } catch (error) {
    console.error('[compare] Error during comparison:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };