#!/usr/bin/env node

const http = require('http');
const path = require('path');

const startTime = process.hrtime.bigint();

// Simulate server startup operations
console.log('[server] Starting server...');

// Simulate various startup tasks
const tasks = [
  { name: 'Load configuration', delay: 100 },
  { name: 'Initialize database connections', delay: 200 },
  { name: 'Load middleware', delay: 150 },
  { name: 'Setup routes', delay: 100 },
  { name: 'Start HTTP server', delay: 300 }
];

async function simulateTask(task) {
  console.log(`[server] ${task.name}...`);
  await new Promise(resolve => setTimeout(resolve, task.delay));
  console.log(`[server] ${task.name} complete (${task.delay}ms)`);
}

async function main() {
  try {
    // Simulate startup tasks
    for (const task of tasks) {
      await simulateTask(task);
    }

    // Create actual server for realistic measurement
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    });

    const port = process.env.PORT || 3001;
    
    server.listen(port, () => {
      const endTime = process.hrtime.bigint();
      const startupTime = Number(endTime - startTime) / 1e6; // ms
      
      console.log(`[server] Server ready on port ${port}`);
      console.log(`[server] Startup time: ${startupTime.toFixed(2)}ms`);
      
      // Output metrics for benchmark collection
      console.log(JSON.stringify({
        type: 'startup_metrics',
        startup_time_ms: startupTime,
        port: port,
        tasks_completed: tasks.length
      }));

      // Keep server alive for a short time then exit
      setTimeout(() => {
        console.log('[server] Shutting down...');
        server.close(() => {
          process.exit(0);
        });
      }, 1000);
    });

  } catch (error) {
    console.error('[server] Error during startup:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };