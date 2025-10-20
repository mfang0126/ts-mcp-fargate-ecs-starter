# MCP Transport Guide - SSE and HTTP Streaming

This guide explains how to use both SSE and HTTP streaming transports with the FastMCP server.

## Transport Endpoints

When you start the server with `transportType: "httpStream"`, FastMCP automatically provides **two endpoints**:

1. **`/mcp`** - HTTP Streaming (Primary)
2. **`/sse`** - Server-Sent Events (Fallback)

Both endpoints support the full MCP protocol with the same authentication.

## HTTP Streaming Endpoint (`/mcp`)

**Recommended** for most use cases. Supports bidirectional communication.

### Usage with curl

```bash
# Initialize
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call tool
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "sayHello",
      "arguments": {"name": "World"}
    }
  }'
```

### Usage with MCP Inspector

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

### Usage with Claude Desktop

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

## SSE Endpoint (`/sse`)

Server-Sent Events endpoint for clients that prefer SSE transport.

### Usage with curl

```bash
# For SSE, use the /sse endpoint with event-stream accept header
curl -N -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

**Note**: SSE is primarily for streaming responses and server-to-client push notifications.

### Usage with JavaScript/TypeScript

```typescript
import { EventSource } from 'eventsource';

const eventSource = new EventSource('http://localhost:3000/sse', {
  headers: {
    'Authorization': 'Bearer mcp-secret-token-12345'
  }
});

eventSource.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Received:', response);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};

// Send a request
fetch('http://localhost:3000/sse', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer mcp-secret-token-12345',
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  })
});
```

## Transport Comparison

| Feature | HTTP Streaming (`/mcp`) | SSE (`/sse`) |
|---------|-------------------------|--------------|
| **Direction** | Bidirectional | Server → Client |
| **Connection** | Request-response | Long-lived |
| **Browser Support** | Universal | Modern browsers |
| **Firewall Friendly** | ✅ Yes | ✅ Yes |
| **Recommended** | ✅ Primary | Fallback |
| **MCP Inspector** | ✅ Works | ✅ Works |

## Authentication

Both endpoints use the same Bearer token authentication:

```bash
-H "Authorization: Bearer mcp-secret-token-12345"
```

The token is configured via the `BEARER_TOKEN` environment variable:

```bash
export BEARER_TOKEN=your-secret-token
npm start
```

## Response Format

### HTTP Streaming Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "hello-mcp-fargate",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {}
    }
  }
}
```

### SSE Response Format

SSE responses are formatted as Server-Sent Events:

```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}

event: message
data: {"jsonrpc":"2.0","id":2,"result":{...}}
```

## Stateless Mode

Both endpoints run in **stateless mode** when configured:

```typescript
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 3000,
    stateless: true  // No session persistence
  }
});
```

**Benefits of Stateless Mode**:
- ✅ Perfect for containerized deployments (Fargate, K8s)
- ✅ No session management overhead
- ✅ Horizontal scaling friendly
- ✅ Each request is independent

## Testing Both Endpoints

### Test HTTP Streaming

```bash
# Should return JSON response immediately
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

### Test SSE

```bash
# Should stream response as events
curl -N -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Common Issues

### 1. Missing Accept Header

**Error**: `400 Bad Request`

**Solution**: Include the Accept header:
```bash
-H "Accept: application/json, text/event-stream"
```

### 2. Authentication Failure

**Error**: `401 Unauthorized`

**Solution**: Include Bearer token:
```bash
-H "Authorization: Bearer mcp-secret-token-12345"
```

### 3. SSE Not Streaming

**Problem**: SSE responses not streaming

**Solution**: Use `-N` flag with curl to disable buffering:
```bash
curl -N -X POST http://localhost:3000/sse ...
```

## Production Deployment

### Environment Variables

```bash
PORT=3000
BEARER_TOKEN=your-production-token
NODE_ENV=production
```

### Health Check

Both transports share the same health endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Architecture

```
Client
  │
  ├─→ /mcp endpoint (HTTP Streaming)
  │   └─→ FastMCP Server → JSON-RPC Handler
  │
  └─→ /sse endpoint (Server-Sent Events)
      └─→ FastMCP Server → JSON-RPC Handler
```

Both endpoints share the same:
- Authentication layer
- JSON-RPC protocol handler
- MCP tool execution
- Stateless session management

## Further Reading

- [MCP Specification](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## Summary

**Use `/mcp` (HTTP Streaming)** for:
- ✅ MCP Inspector
- ✅ Claude Desktop
- ✅ Most production clients
- ✅ Bidirectional communication

**Use `/sse` (Server-Sent Events)** for:
- Browser-based clients needing live updates
- Clients that prefer SSE transport
- Scenarios requiring server push notifications

Both transports are **production-ready** and fully support the MCP protocol with authentication and stateless mode.
