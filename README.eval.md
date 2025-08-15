# Performance Evaluation Guide

This guide provides detailed instructions for conducting fair and reproducible performance comparisons between different AI coding assistants using the safe-ops-agent benchmark suite.

## 🎯 Evaluation Objectives

- **Performance**: Measure execution speed and response times
- **Reliability**: Track success rates and error handling
- **Usability**: Assess ease of integration and usage
- **Cost-effectiveness**: Evaluate resource usage and time investment

## 🖥️ Test Environment Requirements

### System Specifications

Document your test environment before running benchmarks:

```bash
# System information
node --version          # Node.js version
npm --version          # npm version
uname -a               # OS details (Linux/macOS)
# or
systeminfo             # Windows system info

# Hardware specs
nproc                  # CPU cores (Linux)
free -h                # Memory (Linux)
# or equivalent commands for your OS
```

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: Latest stable version
- **Git**: For repository management
- **Optional**: Docker for containerized testing

### Network Requirements

- Stable internet connection for AI service calls
- Firewall configuration allowing outbound HTTPS
- Optional: Local server setup for API testing

## 📋 Pre-Test Setup

### 1. Environment Preparation

```bash
# Clone and setup
git clone https://github.com/your-org/safe-ops-agent.git
cd safe-ops-agent

# Install dependencies
npm install
cd agent-cli && npm install && cd ..

# Create required directories
mkdir -p results tmp/generated-claude tmp/generated-codex

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys and settings
```

### 2. Configuration

Create your test configuration:

```bash
# Copy and customize agent configuration
cp agent-cli/agent.config.json agent.config.test.json
# Edit with your test targets and settings
```

**Example test configuration:**
```json
{
  "targets": {
    "test": {
      "host": "localhost",
      "user": "testuser",
      "cwd": "/tmp/test-workspace"
    }
  },
  "healthcheck": {
    "urls": ["http://localhost:3000/health"]
  }
}
```

### 3. Baseline Verification

Verify your setup works correctly:

```bash
# Test basic functionality
node scripts/start-server.js
node scripts/api-test.js
node scripts/content-gen.js

# Test benchmark runner
node benchmarks/runner.js scenarios/claude-code.yml test
```

## 🧪 Running Benchmarks

### Individual Environment Testing

**Test Claude Code environment:**
```bash
# Run Claude Code benchmarks
node benchmarks/runner.js scenarios/claude-code.yml claude

# Verify results
ls -la results/metrics-claude-*.json
```

**Test Codex CLI environment:**
```bash
# Run Codex CLI benchmarks  
node benchmarks/runner.js scenarios/codex-cli.yml codex

# Verify results
ls -la results/metrics-codex-*.json
```

### Comparative Testing

**Run side-by-side comparison:**
```bash
# Full comparative benchmark
node benchmarks/runner.js scenarios/comparative.yml comparison

# Generate comparison report
node scripts/compare-results.js

# View results
cat results/comparison-report.md
```

### Custom Scenarios

Create custom test scenarios by modifying YAML files:

```yaml
name: "Custom Test Scenario"
description: "Your custom test description"
environment: "custom"

config:
  iterations: 5
  timeout: 60000

scenarios:
  - name: "your_test"
    description: "Custom test description"
    command: "node your-test-script.js"
    repeat: 3
```

## 📊 Metrics Collection

### Automatic Metrics

The benchmark suite automatically collects:

- **Execution time**: Total time for each operation
- **Success rate**: Percentage of successful runs
- **Resource usage**: Memory and CPU utilization
- **Error rates**: Failed operations and error types

### Custom Metrics

Add custom metrics to your test scripts:

```javascript
// In your test script
console.log(JSON.stringify({
  type: 'custom_metrics',
  your_metric: value,
  timestamp: new Date().toISOString()
}));
```

### Data Export

Results are automatically saved in multiple formats:

- **JSON files**: Raw metrics data (`results/metrics-*.json`)
- **Markdown reports**: Human-readable summaries (`results/comparison-report.md`)
- **Log files**: Detailed execution logs (`results/*-execution.log`)

## 📈 Result Analysis

### Understanding Output

**Success Rate Interpretation:**
- **100%**: All tests passed successfully
- **80-99%**: Mostly successful with minor issues
- **50-79%**: Significant reliability concerns
- **<50%**: Major stability problems

**Performance Benchmarks:**
- **Server startup**: < 1000ms = Good, < 500ms = Excellent
- **API response**: < 100ms = Good, < 50ms = Excellent  
- **Content generation**: < 5000ms = Good, < 2000ms = Excellent

### Statistical Significance

For reliable results:
- Run each test scenario **at least 5 times**
- Use **consistent test environment** across runs
- Allow **system cooldown** between intensive tests
- **Document any anomalies** or environmental factors

### Comparison Guidelines

When comparing different tools:

1. **Use identical hardware and software configurations**
2. **Run tests in randomized order** to avoid bias
3. **Account for warm-up effects** (first run may be slower)
4. **Consider network variability** for API-dependent tests
5. **Document all configuration differences**

## 🔧 Troubleshooting

### Common Issues

**Permission Errors:**
```bash
# Fix file permissions
chmod +x scripts/*.js
sudo chown -R $USER:$GROUP results/
```

**Network Timeouts:**
```bash
# Increase timeout in scenario files
timeout: 60000  # 60 seconds
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"
```

**Port Conflicts:**
```bash
# Use different ports for parallel testing
export PORT=3001
export TEST_BASE_URL="http://localhost:3001"
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=debug

# Run with verbose output
node benchmarks/runner.js scenarios/your-scenario.yml your-env
```

### Result Validation

Verify result integrity:

```bash
# Check result file format
node -e "console.log(JSON.parse(require('fs').readFileSync('results/metrics-test.json')))"

# Validate against schema
# (Add schema validation script if needed)
```

## 📋 Best Practices

### Before Testing
- [ ] Document test environment specifications
- [ ] Clear previous test data and logs
- [ ] Verify all dependencies are installed
- [ ] Test network connectivity and API access
- [ ] Set consistent system resource limits

### During Testing
- [ ] Monitor system resource usage
- [ ] Log any environmental changes
- [ ] Run tests in isolation (avoid parallel execution)
- [ ] Maintain consistent testing conditions
- [ ] Document any anomalies or interruptions

### After Testing
- [ ] Verify result file completeness
- [ ] Generate comparison reports
- [ ] Archive test data with timestamps
- [ ] Document findings and conclusions
- [ ] Clean up temporary test files

## 📝 Reporting Results

### Minimum Required Information

When sharing results, include:

1. **System specifications** (OS, CPU, RAM, Node.js version)
2. **Test configuration** (scenarios used, iterations, timeouts)
3. **Environment details** (network conditions, concurrent processes)
4. **Raw metrics data** (JSON files)
5. **Summary report** (markdown with key findings)
6. **Test timestamp and duration**

### Result Format

Use this template for consistent reporting:

```markdown
# Performance Test Results

## Environment
- **OS**: Ubuntu 22.04 LTS
- **CPU**: Intel i7-10700K (8 cores)
- **RAM**: 32GB DDR4
- **Node.js**: v18.17.0
- **Date**: 2024-01-15T10:30:00Z

## Test Configuration
- **Scenarios**: claude-code.yml, codex-cli.yml
- **Iterations**: 5 per scenario
- **Total Duration**: 45 minutes

## Key Findings
- Claude Code: 95% success rate, 850ms avg response
- Codex CLI: 92% success rate, 720ms avg response
- Winner: Codex CLI (performance), Claude Code (reliability)

## Recommendations
[Your conclusions and recommendations]
```

## 🚀 Advanced Testing

### Load Testing

For stress testing:

```yaml
# In scenario file
config:
  iterations: 50
  parallel_execution: true
  stress_test_mode: true
```

### Continuous Integration

Add to CI pipeline:

```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: |
    node benchmarks/runner.js scenarios/ci.yml ci
    node scripts/compare-results.js
```

### Custom Metrics Collection

Implement custom collectors:

```javascript
// custom-collector.js
const { createLogEntry, writeLogEntry } = require('./agent-cli/src/lib/log');

function collectCustomMetrics(testResults) {
  const entry = createLogEntry('performance_test', {
    summary: 'Custom performance analysis',
    results: testResults,
    // ... your custom metrics
  });
  
  writeLogEntry(entry);
}
```

---

## 📞 Support

For issues with the evaluation process:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [GitHub Issues](https://github.com/your-org/safe-ops-agent/issues)
3. Contact: [evaluation@denebola.net](mailto:evaluation@denebola.net)

---

*Last updated: 2025-01-15*
*Generated by safe-ops-agent evaluation framework*