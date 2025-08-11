# Security Policy (Draft)

- The CLI refuses to write outside the current working directory.
- Use `--dry-run` to inspect actions before executing.
- SSH command generation must always be safely quoted.
- Symlinks are not followed by patch/apply utilities.
- Windows-specific paths are not supported in v0.1.

