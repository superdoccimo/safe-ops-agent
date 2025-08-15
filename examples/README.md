# Examples

This directory contains example configurations and workflows for the safe-ops-agent CLI.

## ⚠️ Safety First

All examples default to **dry-run mode** for safety. Use `--apply` flag only after reviewing the operations.

## Available Examples

### 1. Next.js Deployment (`next/`)

**File:** `next/agent.yml`

A complete Next.js deployment workflow including:
- Deploy to production target
- Cache revalidation for updated content
- Health checks to verify deployment

**Usage:**
```bash
# Dry run (safe preview)
agent run-recipe --recipe examples/next/agent.yml --dry-run

# Execute (only after review)
agent run-recipe --recipe examples/next/agent.yml --apply
```

### 2. Static Site Deployment (`static/`)

**File:** `static/agent.yml`

Basic static site deployment with:
- Simple deployment process
- Health checks

**Usage:**
```bash
# Dry run (safe preview)
agent run-recipe --recipe examples/static/agent.yml --dry-run

# Execute (only after review) 
agent run-recipe --recipe examples/static/agent.yml --apply
```

### 3. Strapi CMS Deployment (`strapi/`)

**File:** `strapi/agent.yml`

Strapi CMS deployment workflow:
- Backend deployment
- Health monitoring
- **Note:** All content created via Strapi integration will be in draft mode by default

**Usage:**
```bash
# Dry run (safe preview)
agent run-recipe --recipe examples/strapi/agent.yml --dry-run

# Execute (only after review)
agent run-recipe --recipe examples/strapi/agent.yml --apply
```

## Configuration Requirements

Before using these examples, ensure your `agent.config.json` is properly configured:

1. **Copy the example config:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Update agent.config.json with your targets:**
   ```json
   {
     "targets": {
       "prod": {
         "host": "your-server.com",
         "user": "deploy",
         "cwd": "/path/to/your/app"
       }
     }
   }
   ```

## Creating Custom Examples

To create your own example:

1. Create a new directory under `examples/`
2. Add an `agent.yml` file with your workflow
3. Test with `--dry-run` first
4. Validate against the schema: `docs/agent.config.schema.json`

## Security Notes

- **All operations default to dry-run mode**
- **File operations are restricted to workspace directory**
- **System paths are blocked for security**
- **All operations are logged for audit trail**
- **Strapi content is created as drafts requiring manual review**

## Troubleshooting

1. **Configuration errors:** Check schema validation messages
2. **Permission denied:** Ensure SSH keys are properly configured
3. **Network issues:** Verify target hosts are accessible
4. **Path errors:** Ensure all paths are within workspace bounds

For more help, see the main [README.md](../README.md) and [SECURITY.md](../SECURITY.md).