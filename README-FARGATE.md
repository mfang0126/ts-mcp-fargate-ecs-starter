# Hello MCP Server - Fargate ECS Version (FastMCP)

Lightweight MCP server for AWS Fargate ECS deployment using FastMCP with built-in HTTP streaming.

## Overview

This is a containerized version of the Hello MCP Server using **FastMCP** - a TypeScript framework that simplifies MCP server development. No Express.js needed!

## Features

- ✅ **FastMCP Framework**: Built-in HTTP streaming and SSE support
- ✅ **Ultra Simple**: Only ~50 lines of code (vs 210+ with Express)
- ✅ **MCP Protocol Compliant**: JSON-RPC 2.0 with streaming
- ✅ **Bearer Token Authentication**: Secure API access
- ✅ **Stateless Mode**: Perfect for containerized deployments
- ✅ **Always On**: No cold starts
- ✅ **Minimal Dependencies**: Just fastmcp + zod

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

FastMCP requires the `Accept` header for streaming:

```bash
# Initialize MCP
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call sayHello tool
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
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

## FastMCP Benefits

### Before (Express.js - 210 lines)
```typescript
import express from 'express';
// ... 200+ lines of boilerplate
```

### After (FastMCP - 50 lines)
```typescript
import { FastMCP } from "fastmcp";

const server = new FastMCP({
  name: "hello-mcp-fargate",
  version: "1.0.0",
});

server.addTool({
  name: "sayHello",
  description: "Greet someone by name",
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => `Hello, ${args.name}! 👋`,
});

server.start({
  transportType: "httpStream",
  httpStream: { port: 3000, stateless: true }
});
```

**Improvements**:
- 🎯 75% less code
- ✅ Built-in HTTP streaming
- ✅ Built-in SSE support
- ✅ No Express dependency
- ✅ Automatic JSON-RPC handling
- ✅ Built-in authentication
- ✅ Stateless mode for containers

## AWS Deployment Options

### Option 1: AWS App Runner (Recommended - Simplest)

**Cost**: ~$12/month
**Complexity**: Low
**Setup Time**: < 10 minutes

App Runner is the simplest way to deploy this container:

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag hello-mcp-fargate:latest YOUR_ECR_URL/hello-mcp-fargate:latest
docker push YOUR_ECR_URL/hello-mcp-fargate:latest

# Create App Runner service via console or CLI
```

### Option 2: AWS Fargate ECS

**Cost**: ~$26/month
**Complexity**: Medium
**Setup Time**: ~30 minutes

For full ECS deployment with ALB, use CDK (see FARGATE_PLAN.md).

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
   ├── Container: FastMCP Server
   ├── Port: 3000
   └── Endpoints: /mcp, /sse
```

## FastMCP Features

### HTTP Streaming
FastMCP provides native HTTP streaming support with SSE fallback:
- Primary endpoint: `/mcp` (HTTP streaming)
- Fallback endpoint: `/sse` (Server-Sent Events)

### Stateless Mode
Perfect for containerized deployments:
```typescript
httpStream: {
  stateless: true, // No session persistence
}
```

### Authentication
Built-in authentication support:
```typescript
authenticate: async (headers) => {
  const token = headers.authorization?.replace("Bearer ", "");
  if (token !== BEARER_TOKEN) {
    throw new Error("Invalid token");
  }
  return true;
}
```

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

## Comparison: Express vs FastMCP

| Feature | Express | FastMCP |
|---------|---------|---------|
| **Lines of Code** | ~210 | ~50 |
| **Dependencies** | 3 | 2 |
| **HTTP Streaming** | Manual | ✅ Built-in |
| **SSE Support** | Manual | ✅ Built-in |
| **JSON-RPC** | Manual | ✅ Built-in |
| **Authentication** | Manual | ✅ Built-in |
| **Stateless Mode** | Manual | ✅ Built-in |
| **MCP Inspector** | ✅ Works | ✅ Works |

## Development

### Project Structure

```
.
├── server.ts           # FastMCP server (~50 lines!)
├── Dockerfile          # Container definition
├── package.json        # Dependencies (fastmcp, zod)
└── README-FARGATE.md   # This file
```

### Scripts

- `npm start`: Run server with tsx
- `npm run build`: Compile TypeScript
- `npm run start:prod`: Build and run production server

## Why FastMCP?

FastMCP was specifically designed for MCP servers and provides:

1. **Less Boilerplate**: Framework handles all protocol details
2. **Better MCP Support**: Built for MCP protocol from the ground up
3. **Easier Maintenance**: Less code = fewer bugs
4. **Better DX**: Simple, intuitive API
5. **Container-Ready**: Stateless mode perfect for Fargate/K8s

## Security

- Bearer token authentication on all MCP endpoints
- Environment variable configuration
- Stateless mode prevents session-based attacks
- No sensitive data in logs

## Monitoring

FastMCP provides built-in logging:
```
[FastMCP info] Starting server in stateless mode
🚀 FastMCP Server running on port 3000
📍 MCP endpoint: http://localhost:3000/mcp
📍 SSE endpoint: http://localhost:3000/sse
📍 Stateless mode: enabled
```

## License

MIT
