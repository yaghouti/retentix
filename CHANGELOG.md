# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Node.js 24+ native TypeScript support
- Zod-based schema validation for policy files
- Policy parser with domain type conversion
- YAML policy file loader
- Support for PostgreSQL data sources
- Retention rules with delete, none, and anonymize actions
- Masking strategies (hash, null)
- Erasure (Right to be Forgotten) support
- Execution configuration with dry-run and apply modes
- Audit logging and reporting configuration
- Comprehensive test suite with 95%+ coverage (53 tests)
- Biome for code formatting and linting
- Vitest for unit and integration testing
- GitHub Actions CI/CD workflows
- Automated dependency updates with Dependabot
- CodeQL security analysis
- Issue and PR templates
- Contributing guidelines
- Security policy

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.0.1] - YYYY-MM-DD

### Added
- Initial release

---

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md with release date and changes
3. Commit changes: `git commit -m "chore: release v0.0.1"`
4. Create tag: `git tag v0.0.1`
5. Push: `git push && git push --tags`
6. GitHub Actions will automatically create a release

[Unreleased]: https://github.com/yaghouti/Retentix/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/yaghouti/Retentix/releases/tag/v0.0.1

