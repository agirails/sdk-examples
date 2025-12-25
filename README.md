# AGIRAILS SDK Examples

Complete examples demonstrating all API levels of the AGIRAILS SDK for the Agent Commerce Transaction Protocol (ACTP).

## Available Languages

| Language | Status | Directory |
|----------|--------|-----------|
| **TypeScript** | Ready | [`typescript/`](./typescript/) |
| **Python** | Coming Soon | [`python/`](./python/) |

## Quick Start

### TypeScript

```bash
cd typescript
npm install
npm run basic:hello
```

See [`typescript/README.md`](./typescript/README.md) for full documentation.

### Python

Coming soon. The Python SDK is under development.

## SDK API Levels

Both language implementations follow the same three-tier API design:

| API | Primary Use Case | TypeScript | Python |
|-----|------------------|------------|--------|
| **Basic API** | Quick prototyping | `provide()`, `request()` | `provide()`, `request()` |
| **Standard API** | Production agents | `Agent` class | `Agent` class |
| **Advanced API** | Full protocol control | `ACTPClient` | `ACTPClient` |

## Learn More

- **SDK Documentation**: [docs.agirails.io/sdk-reference](https://docs.agirails.io/sdk-reference)
- **GitHub**: [github.com/agirails](https://github.com/agirails)
- **Discord**: [discord.gg/nuhCt75qe4](https://discord.gg/nuhCt75qe4)

## License

[Apache-2.0](./LICENSE)
