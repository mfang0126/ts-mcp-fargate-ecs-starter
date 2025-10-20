# Project Status: MCP Server on AWS Lambda

**Last Updated:** 2025-10-17
**Project:** Hello MCP Server with AWS Lambda Deployment

---

## 🎯 Project Goal

Build a Model Context Protocol (MCP) server deployed on AWS Lambda that:
- Works with official MCP Inspector
- Uses proper MCP streaming HTTP transport
- Implements the `sayHello` tool
- Can be tested and integrated with Claude Desktop

---

## ✅ Completed

### Phase 1: Initial Setup & Basic Lambda
- ✅ Created project structure with TypeScript
- ✅ Set up AWS SAM for Lambda deployment
- ✅ Deployed basic Lambda with API Gateway HTTP API v2
- ✅ Implemented authentication with Bearer tokens
- ✅ Added health check endpoint (`/health`)

### Phase 2: JSON-RPC 2.0 Implementation
- ✅ Implemented proper JSON-RPC 2.0 protocol
- ✅ Added MCP methods:
  - `initialize` - Server handshake
  - `tools/list` - List available tools
  - `tools/call` - Execute tools
- ✅ Created `sayHello` tool with proper schema
- ✅ Tested successfully with curl
- ✅ All JSON-RPC responses working correctly

### Phase 3: Testing & Documentation
- ✅ Created local test scripts
- ✅ Built custom test UI (test-ui.html)
- ✅ Verified all endpoints working in production
- ✅ Updated README with deployment info
- ✅ Installed MCP SDK (@modelcontextprotocol/sdk)
- ✅ Installed Express.js for web server

---

## 🔄 Current State

### What's Working
```bash
# Current deployment
API URL: https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/
Stack: hello-mcp-stack (ap-southeast-2)
Lambda: hello-mcp-server

# Working endpoints
✅ GET  /health - Health check
✅ GET  /       - Server info
✅ POST /mcp    - MCP JSON-RPC 2.0 endpoint

# Working MCP methods via curl
✅ initialize   - Returns server info and capabilities
✅ tools/list   - Returns [sayHello] tool
✅ tools/call   - Executes sayHello(name) → "Hello, {name}! 👋"
```

### Current Implementation Type
**Type:** Direct Lambda handler with custom JSON-RPC 2.0
**Transport:** Simple HTTP POST (not streaming)
**Status:** Works with curl, custom test UI, and direct HTTP clients
**Issue:** ❌ Not compatible with MCP Inspector (requires StreamableHTTP)

---

## ⚠️ Known Issues

### Issue 1: MCP Inspector Incompatibility
**Problem:** Official MCP Inspector expects StreamableHTTP or SSE transport
**Current:** We use simple HTTP POST with JSON-RPC 2.0
**Impact:** Cannot test with official MCP Inspector
**Logs show:**
```
Error: Invalid content type, expected "text/event-stream"
Error: ZodError - expecting streaming transport format
```

### Issue 2: Claude Desktop Connection
**Status:** Not yet tested
**Config:** Added to claude_desktop_config.json
**Unknown:** Whether simple HTTP POST will work with Claude Desktop

---

## 🔨 In Progress

### Discovered Solution
Found article: https://dev.to/aws-builders/mcp-server-with-aws-lambda-and-http-api-gateway-1j49

**Key Insights:**
1. Use **Express.js** + **StreamableHTTPServerTransport** from MCP SDK
2. Use **AWS Lambda Web Adapter** layer (converts API Gateway → Express)
3. Enable stateless mode: `sessionIdGenerator: undefined`
4. This makes Lambda work like a web server

### Current Todo List
- [x] Research MCP streaming HTTP transport requirements
- [x] Install @modelcontextprotocol/sdk package
- [x] Install Express dependency
- [ ] **IN PROGRESS:** Create Express-based MCP server
- [ ] Update SAM template for Lambda Web Adapter
- [ ] Test locally
- [ ] Deploy to Lambda
- [ ] Test with MCP Inspector

---

## 📦 Installed Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.1",
    "@types/express": "^5.0.3",
    "express": "^5.1.0",
    "fastmcp": "latest",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 🔜 Next Steps

### Immediate (To Fix MCP Inspector)

1. **Rewrite Lambda to use Express + MCP SDK**
   ```typescript
   // Pattern from article
   app.post("/mcp", async (req, res) => {
     const server = initializeServer();
     const transport = new StreamableHTTPServerTransport({
       sessionIdGenerator: undefined,
     });
     await server.connect(transport);
     await transport.handleRequest(req, res, req.body);
   });
   ```

2. **Update SAM Template**
   - Add AWS Lambda Web Adapter layer
   - Set environment variable: `AWS_LAMBDA_EXEC_WRAPPER: "/opt/bootstrap"`
   - Configure for web application mode

3. **Test Locally**
   - Run Express server locally
   - Test with MCP Inspector
   - Verify all methods work

4. **Deploy & Verify**
   - Deploy updated Lambda with adapter
   - Test with MCP Inspector
   - Test with Claude Desktop

### Future Enhancements
- Add more tools beyond sayHello
- Add resources support
- Add prompts support
- Session management (optional)
- Integration with other AWS services (S3, DynamoDB, etc.)

---

## 📚 Key Files

### Source Code
- `lambda.ts` - Current Lambda handler (needs rewrite)
- `index.ts` - Local stdio MCP server (working)
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration

### Infrastructure
- `template.yaml` - AWS SAM template (needs update)
- `samconfig.toml` - SAM configuration

### Documentation
- `README.md` - Project documentation
- `STATUS.md` - This file
- `CLEAN.md` - Cleanup notes

### Testing
- `test-ui.html` - Custom web test interface (working)

---

## 🔐 Configuration

### AWS Deployment
```yaml
Region: ap-southeast-2
Stack: hello-mcp-stack
Function: hello-mcp-server
API: https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/
```

### Authentication
```
Bearer Token: mcp-secret-token-12345
Environment Variable: BEARER_TOKEN
```

### Claude Desktop Config
```json
{
  "mcpServers": {
    "hello-mcp-lambda": {
      "url": "https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

---

## 🎓 Lessons Learned

1. **MCP Transport Types Matter**
   - Simple HTTP POST works for basic clients
   - MCP Inspector requires StreamableHTTP
   - SSE is deprecated, use StreamableHTTP

2. **Lambda Deployment Approaches**
   - Direct Lambda handler: Simple but limited transport support
   - Express + Lambda Web Adapter: Full web server capabilities

3. **Testing Strategy**
   - Start with curl for basic validation
   - Custom UI for visual testing
   - MCP Inspector for protocol compliance
   - Claude Desktop for real-world usage

4. **Official SDK Usage**
   - Using @modelcontextprotocol/sdk ensures compatibility
   - StreamableHTTPServerTransport is the recommended approach
   - Express integration pattern is well-documented

---

## 📞 Support & References

### Documentation
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter)

### Key Article
- [MCP Server with AWS Lambda and HTTP API Gateway](https://dev.to/aws-builders/mcp-server-with-aws-lambda-and-http-api-gateway-1j49)

### Test Commands
```bash
# Health check
curl https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/health

# Initialize
curl -X POST -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' \
  https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp | jq .

# List tools
curl -X POST -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp | jq .

# Call tool
curl -X POST -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sayHello","arguments":{"name":"World"}}}' \
  https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp | jq .
```

---

**Status:** 🔄 In Progress - Transitioning to Express + StreamableHTTP implementation
**Blocker:** Need to complete Express-based rewrite for MCP Inspector compatibility
**Next Action:** Complete Express server implementation following the dev.to article pattern
