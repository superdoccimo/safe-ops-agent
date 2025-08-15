# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it to:
- **Email**: security@denebola.net
- **Priority**: Critical security issues will be addressed within 48 hours

Please include:
- Detailed description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fixes (if any)

## Security Features

### Default Safe Mode
- **Dry-run by default**: All operations default to dry-run mode unless explicitly overridden
- **Explicit apply required**: Use `--apply` flag for CLI commands or `ALLOW_APPLY=true` for server
- **No automatic execution**: Files are never modified without explicit permission

### Path Security
- **Workspace restriction**: All file operations are restricted to the current working directory
- **System path protection**: Blocks access to system directories (Windows, Program Files, /etc, /usr, etc.)
- **Path traversal prevention**: Prevents access to parent directories using `../` patterns
- **Absolute path blocking**: Rejects operations on absolute paths outside workspace

### API Security
- **Server endpoints protected**: `/apply` and `/patch` endpoints require `ALLOW_APPLY=true` environment variable
- **Input validation**: All user inputs are validated and sanitized
- **Error disclosure prevention**: Generic error messages to prevent information leakage

### Content Management Security
- **Strapi draft mode**: All Strapi content is created as drafts (publishedAt: null) requiring manual review
- **No auto-publishing**: Prevents accidental publication of generated content

## Security Best Practices

### Key Management
- **Never commit secrets**: Use `.env` files for API keys and tokens (automatically excluded by .gitignore)
- **Environment variables**: Store sensitive configuration in environment variables
- **Key rotation**: Regularly rotate API keys and access tokens

### Key Leakage Response
If you accidentally commit API keys or secrets:
1. **Immediately revoke** the compromised keys
2. **Generate new keys** from the service provider
3. **Update environment variables** with new keys
4. **Force push history rewrite** to remove secrets from git history
5. **Audit access logs** for any unauthorized usage

### Operational Security
- **Audit logging**: All operations are logged to `logs/` directory for audit trail
- **Regular updates**: Keep dependencies updated using `npm audit`
- **Limited permissions**: Run with minimal required permissions
- **Network isolation**: Default configuration prevents external network calls

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Limitations

- SSH command generation must always be safely quoted
- Symlinks are not followed by patch/apply utilities  
- Windows-specific path handling is limited in v0.1

## Contact

For security-related questions or concerns:
- General: security@denebola.net
- Emergency: Use GitHub Security Advisory for critical issues

