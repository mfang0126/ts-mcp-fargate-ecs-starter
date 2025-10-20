# Hello MCP Server - Fargate ECS Version

Express-based MCP server for AWS Fargate ECS deployment with native HTTP support.

## Overview

This is a containerized version of the Hello MCP Server that runs on AWS Fargate ECS. Unlike the Lambda version which requires Lambda Web Adapter, this implementation uses native Express.js and is simpler and more reliable.

## Features

- ✅ **Native Express.js**: No Lambda adapter needed
- ✅ **MCP Protocol Compliant**: JSON-RPC 2.0 implementation
- ✅ **Bearer Token Authentication**: Secure API access
- ✅ **Health Check Endpoint**: Container health monitoring
- ✅ **Docker Ready**: Containerized for Fargate deployment
- ✅ **Always On**: No cold starts

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3000
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Initialize MCP
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call sayHello tool
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sayHello","arguments":{"name":"World"}}}'
```

## Docker

### Build Image

```bash
docker build -t hello-mcp-fargate .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e BEARER_TOKEN=mcp-secret-token-12345 \
  hello-mcp-fargate
```

## AWS Deployment Options

### Option 1: AWS App Runner (Recommended - Simplest)

**Cost**: ~$12/month
**Complexity**: Low
**Setup Time**: < 10 minutes

App Runner is the simplest way to deploy this container:

```bash
# TODO: Add App Runner deployment commands
```

### Option 2: AWS Fargate ECS

**Cost**: ~$26/month
**Complexity**: Medium
**Setup Time**: ~30 minutes

For full ECS deployment with ALB:

```bash
# TODO: Add CDK deployment commands
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `BEARER_TOKEN`: Authentication token (default: mcp-secret-token-12345)
- `NODE_ENV`: Environment (production/development)

## MCP Protocol

### Supported Methods

1. **initialize**: Server handshake and capability negotiation
2. **tools/list**: List available tools
3. **tools/call**: Execute a tool

### Available Tools

- `sayHello`: Greet someone by name
  - Input: `{ name: string }`
  - Output: `Hello, {name}! 👋`

## Architecture

```
Internet
   ↓
Application Load Balancer (ALB)
   ↓
Target Group
   ↓
Fargate Task (ECS)
   ├── Container: MCP Server (Express.js)
   ├── Port: 3000
   └── Health Check: /health
```

## Comparison: Lambda vs Fargate

| Feature | Lambda | Fargate ECS |
|---------|--------|-------------|
| **Transport** | Needs adapter | ✅ Native Express |
| **Complexity** | Medium | ✅ Simple |
| **Cold Start** | Yes (~1-2s) | ✅ No |
| **Cost** | ~$5/month | ~$26/month |
| **Debugging** | Harder | ✅ Easier |
| **MCP Inspector** | Requires adapter | ✅ Works natively |

## Development

### Project Structure

```
.
├── server.ts           # Express MCP server
├── Dockerfile          # Container definition
├── package.json        # Dependencies
└── README-FARGATE.md   # This file
```

### Scripts

- `npm start`: Run server with tsx
- `npm run build`: Compile TypeScript
- `npm run start:prod`: Build and run production server

## Testing with MCP Inspector

```json
{
  "mcpServers": {
    "hello-mcp-fargate": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

## Monitoring

Health check endpoint returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T00:00:00.000Z",
  "version": "1.0.0"
}
```

Docker health check runs every 30 seconds.

## Security

- Bearer token authentication on all MCP endpoints
- Health endpoint is public (for load balancer checks)
- CORS enabled for development
- Environment variable for token configuration

## License

MIT
