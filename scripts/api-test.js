#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

const startTime = process.hrtime.bigint();

// Test configuration
const testConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  endpoints: [
    { path: '/', method: 'GET', name: 'homepage' },
    { path: '/health', method: 'GET', name: 'health_check' },
    { path: '/api/test', method: 'GET', name: 'api_endpoint' }
  ],
  iterations: parseInt(process.env.TEST_ITERATIONS) || 5,
  timeout: parseInt(process.env.TEST_TIMEOUT) || 5000
};

console.log('[api-test] Starting API latency tests...');
console.log(`[api-test] Base URL: ${testConfig.baseUrl}`);
console.log(`[api-test] Iterations: ${testConfig.iterations}`);

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: options.timeout || testConfig.timeout,
      headers: {
        'User-Agent': 'safe-ops-agent-benchmark/1.0',
        ...options.headers
      }
    };

    const start = process.hrtime.bigint();
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const responseTime = Number(end - start) / 1e6; // ms
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          dataLength: data.length,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testEndpoint(endpoint) {
  const results = [];
  console.log(`[api-test] Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
  
  for (let i = 0; i < testConfig.iterations; i++) {
    try {
      const url = `${testConfig.baseUrl}${endpoint.path}`;
      const result = await makeRequest(url, { method: endpoint.method });
      results.push(result);
      
      console.log(`[api-test]   Iteration ${i + 1}: ${result.responseTime.toFixed(2)}ms (${result.statusCode})`);
      
      // Brief delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`[api-test]   Iteration ${i + 1}: ERROR - ${error.message}`);
      results.push({
        error: error.message,
        responseTime: null,
        success: false
      });
    }
  }
  
  return results;
}

function calculateStats(results) {
  const successfulResults = results.filter(r => r.success && r.responseTime !== null);
  
  if (successfulResults.length === 0) {
    return { 
      average: null, 
      min: null, 
      max: null, 
      success_rate: 0,
      total_requests: results.length
    };
  }
  
  const times = successfulResults.map(r => r.responseTime);
  const average = times.reduce((sum, time) => sum + time, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const successRate = (successfulResults.length / results.length) * 100;
  
  return {
    average: parseFloat(average.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    success_rate: parseFloat(successRate.toFixed(1)),
    total_requests: results.length
  };
}

async function main() {
  try {
    const allResults = {};
    
    for (const endpoint of testConfig.endpoints) {
      const results = await testEndpoint(endpoint);
      const stats = calculateStats(results);
      allResults[endpoint.name] = {
        endpoint: endpoint.path,
        method: endpoint.method,
        stats,
        raw_results: results
      };
      
      console.log(`[api-test] ${endpoint.name} stats:`, stats);
    }
    
    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1e6; // ms
    
    // Output final metrics
    console.log('\n[api-test] Test completed');
    console.log(`[api-test] Total execution time: ${totalTime.toFixed(2)}ms`);
    
    console.log(JSON.stringify({
      type: 'api_test_metrics',
      total_time_ms: totalTime,
      config: testConfig,
      results: allResults
    }));
    
  } catch (error) {
    console.error('[api-test] Error during testing:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, testConfig };