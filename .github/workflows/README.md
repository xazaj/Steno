# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated building, testing, and releasing of the Steno application.

## Workflows Overview

### 🔨 `build.yml` - Main Build Workflow
**Trigger**: Push to main/develop, PR to main, tags, manual dispatch
- **Purpose**: Build application binaries for all supported platforms
- **Platforms**: macOS (Apple Silicon + Intel), Windows x64
- **Outputs**: DMG files (macOS), MSI files (Windows)
- **Artifacts**: Uploaded with 30-day retention

### ✅ `ci.yml` - Continuous Integration
**Trigger**: Push to main/develop, PR to main
- **Purpose**: Run linting, type checking, and tests
- **Checks**: 
  - Frontend: ESLint, TypeScript checking, npm tests
  - Backend: Rust formatting, Clippy linting, Cargo tests
  - Build verification on all platforms

### 🚀 `release.yml` - Release Automation  
**Trigger**: Git tags (v*), manual dispatch
- **Purpose**: Create GitHub releases with binaries
- **Process**:
  1. Create draft release
  2. Build binaries for all platforms
  3. Upload assets to release
  4. Publish release

### 🌙 `nightly.yml` - Nightly Builds
**Trigger**: Daily at 2 AM UTC, manual dispatch
- **Purpose**: Generate nightly development builds
- **Retention**: 7 days, keeps last 3 builds
- **Note**: Only runs for repository owner

## Required Setup

### Repository Secrets
No additional secrets required - workflows use the default `GITHUB_TOKEN`.

### Branch Protection
Recommended branch protection rules for `main`:
- Require status checks: `lint-and-test`, `build-check`
- Require up-to-date branches
- Restrict pushes

### Release Process
1. Update version in `package.json`
2. Create and push a git tag: `git tag v1.0.0 && git push origin v1.0.0`
3. The release workflow will automatically build and publish

## Build Matrix

| Platform | Target | Output Format |
|----------|--------|---------------|
| macOS | `aarch64-apple-darwin` | `.dmg` |
| macOS | `x86_64-apple-darwin` | `.dmg` |  
| Windows | `x86_64-pc-windows-msvc` | `.msi` |

## Customization

### Adding Linux Support
To add Linux builds, add this to the build matrix:
```yaml
- platform: 'ubuntu-20.04'
  args: '--target x86_64-unknown-linux-gnu'
  target: 'x86_64-unknown-linux-gnu'
  arch: 'x64'
```

### Modifying Build Targets
Edit the `matrix.include` section in workflow files to add/remove build targets.

### Dependabot Configuration
The `dependabot.yml` file automatically creates PRs for:
- npm dependencies (weekly)
- Cargo dependencies (weekly)
- GitHub Actions versions (weekly)

## Troubleshooting

### Build Failures
1. Check workflow logs in GitHub Actions tab
2. Verify all dependencies are correctly specified
3. Ensure Tauri configuration is valid
4. Test builds locally with `npm run tauri:build`

### Release Issues
1. Ensure tag format matches `v*` pattern
2. Verify package.json version matches tag
3. Check that all required files exist
4. Review release workflow permissions

### Common Issues
- **Missing dependencies**: Add to workflow as needed
- **Target not found**: Ensure Rust toolchain includes target
- **Permission denied**: Check repository settings and token permissions