#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const startTime = process.hrtime.bigint();

// Content generation configuration
const config = {
  outputDir: process.env.CONTENT_OUTPUT_DIR || './tmp/generated',
  fileCount: parseInt(process.env.CONTENT_FILE_COUNT) || 10,
  contentSize: parseInt(process.env.CONTENT_SIZE) || 1000, // characters per file
  formats: process.env.CONTENT_FORMATS ? process.env.CONTENT_FORMATS.split(',') : ['md', 'txt', 'json']
};

console.log('[content-gen] Starting content generation...');
console.log(`[content-gen] Output directory: ${config.outputDir}`);
console.log(`[content-gen] Files to generate: ${config.fileCount}`);
console.log(`[content-gen] Content size: ${config.contentSize} characters`);

// Ensure output directory exists
function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Generate sample content based on format
function generateContent(format, index) {
  const timestamp = new Date().toISOString();
  const baseContent = `Generated content file #${index + 1}\nTimestamp: ${timestamp}\n\n`;
  
  switch (format) {
    case 'md':
      return baseContent + `# Sample Markdown Document

This is a sample markdown document generated for testing purposes.

## Features
- **Bold text**
- *Italic text* 
- \`Code snippets\`
- [Links](https://example.com)

## Content
${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(Math.floor(config.contentSize / 50))}

### Generated at
${timestamp}
`;

    case 'json':
      const jsonData = {
        id: index + 1,
        timestamp,
        title: `Generated Document ${index + 1}`,
        content: 'Sample content here. '.repeat(Math.floor(config.contentSize / 20)),
        metadata: {
          generator: 'safe-ops-agent',
          format: 'json',
          size: config.contentSize
        },
        tags: ['generated', 'test', 'sample']
      };
      return JSON.stringify(jsonData, null, 2);

    case 'txt':
    default:
      return baseContent + 'Plain text content.\n' + 
        'This is sample text content generated for testing. '.repeat(Math.floor(config.contentSize / 50));
  }
}

// Simulate CPU-intensive content processing
function processContent(content) {
  // Simulate some processing time with actual work
  let processed = content;
  
  // Simple transformations to use CPU time
  for (let i = 0; i < 100; i++) {
    processed = processed.replace(/\s+/g, ' ').trim();
    processed = processed.toLowerCase();
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  }
  
  return processed;
}

async function generateFile(index, format) {
  const fileName = `generated-${index + 1}.${format}`;
  const filePath = path.join(config.outputDir, fileName);
  
  console.log(`[content-gen] Generating ${fileName}...`);
  
  const startGenTime = process.hrtime.bigint();
  
  // Generate content
  let content = generateContent(format, index);
  
  // Process content (simulate AI processing)
  content = processContent(content);
  
  // Write file
  fs.writeFileSync(filePath, content, 'utf8');
  
  const endGenTime = process.hrtime.bigint();
  const genTime = Number(endGenTime - startGenTime) / 1e6; // ms
  
  console.log(`[content-gen] Generated ${fileName} (${content.length} chars, ${genTime.toFixed(2)}ms)`);
  
  return {
    fileName,
    filePath,
    format,
    contentLength: content.length,
    generationTime: genTime
  };
}

async function main() {
  try {
    ensureDir(config.outputDir);
    
    const results = [];
    const formatCycle = config.formats;
    
    for (let i = 0; i < config.fileCount; i++) {
      const format = formatCycle[i % formatCycle.length];
      const result = await generateFile(i, format);
      results.push(result);
      
      // Small delay to simulate realistic generation timing
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1e6; // ms
    
    // Calculate statistics
    const stats = {
      total_files: results.length,
      total_time_ms: totalTime,
      avg_time_per_file: totalTime / results.length,
      total_content_chars: results.reduce((sum, r) => sum + r.contentLength, 0),
      files_by_format: {}
    };
    
    // Group by format
    config.formats.forEach(format => {
      const formatFiles = results.filter(r => r.format === format);
      stats.files_by_format[format] = {
        count: formatFiles.length,
        avg_time: formatFiles.length > 0 ? 
          formatFiles.reduce((sum, f) => sum + f.generationTime, 0) / formatFiles.length : 0
      };
    });
    
    console.log(`\n[content-gen] Generation completed`);
    console.log(`[content-gen] Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`[content-gen] Average per file: ${stats.avg_time_per_file.toFixed(2)}ms`);
    console.log(`[content-gen] Files generated: ${results.length}`);
    
    // Output metrics
    console.log(JSON.stringify({
      type: 'content_generation_metrics',
      config,
      stats,
      results
    }));
    
  } catch (error) {
    console.error('[content-gen] Error during generation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, config };