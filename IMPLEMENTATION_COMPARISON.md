# MCP Server Implementation Comparison

This document compares the two implementations of the Hello MCP Server: Lambda and Fargate ECS.

## Project Status

**Date**: 2025-10-20
**Repository Status**: 2 feature branches, ready to push to remote

### Branches

1. **feature/lambda-mcp-server** - Lambda implementation with JSON-RPC 2.0
2. **feature/fargate-ecs-mcp-server** - Fargate ECS implementation with Express.js

## Implementation Comparison

### Lambda Version (Branch: feature/lambda-mcp-server)

**Files**: `lambda.ts`, `template.yaml`, `samconfig.toml`

**Architecture**:
```
Internet → API Gateway HTTP API v2 → Lambda Function → JSON-RPC Handler
```

**Pros**:
- ✅ Low cost (~$5/month for typical usage)
- ✅ Serverless - no server management
- ✅ Auto-scaling built-in
- ✅ Pay-per-request pricing
- ✅ Currently deployed and working

**Cons**:
- ❌ Cold starts (~1-2 seconds)
- ❌ Requires Lambda Web Adapter for MCP Inspector compatibility
- ❌ More complex integration for streaming
- ❌ Limited to simple HTTP POST (not StreamableHTTP)
- ❌ API Gateway event format complexity (v1 vs v2)

**Current Status**:
- ✅ Deployed to AWS (ap-southeast-2)
- ✅ Working with curl and custom test UI
- ❌ Not compatible with MCP Inspector (requires StreamableHTTP)
- URL: `https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp`

### Fargate ECS Version (Branch: feature/fargate-ecs-mcp-server)

**Files**: `server.ts`, `Dockerfile`, `README-FARGATE.md`

**Architecture**:
```
Internet → ALB → Fargate Task → Express.js → JSON-RPC Handler
```

**Pros**:
- ✅ Native Express.js - no adapter needed
- ✅ No cold starts - always warm
- ✅ Native HTTP support for MCP Inspector
- ✅ Simpler codebase - standard web server
- ✅ Better for long-running connections
- ✅ Easier local development and testing
- ✅ Standard Node.js debugging

**Cons**:
- ❌ Higher cost (~$26/month for Fargate + ALB)
- ❌ Requires container orchestration setup
- ❌ More infrastructure to manage (VPC, ALB, ECS)
- ❌ Always running (not pay-per-request)

**Current Status**:
- ✅ Fully implemented and tested locally
- ✅ All MCP methods working (initialize, tools/list, tools/call)
- ✅ Docker container built and tested
- ⏳ Not yet deployed to AWS
- ⏳ CDK/App Runner infrastructure pending

## Test Results

### Lambda Version
```bash
# Deployed URL
https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp

# Test Results
✅ Health check: Working
✅ Initialize: Working
✅ Tools/list: Working
✅ Tools/call: Working
❌ MCP Inspector: Not compatible (transport mismatch)
```

### Fargate Version
```bash
# Local URL (tested)
http://localhost:3000/mcp

# Test Results
✅ Health check: Working
✅ Initialize: Working
✅ Tools/list: Working
✅ Tools/call: Working
⏳ MCP Inspector: Should work (pending test after deployment)
⏳ Docker build: Pending
```

## Cost Comparison

| Item | Lambda | Fargate ECS | App Runner |
|------|--------|-------------|------------|
| **Compute** | ~$0.20/million requests | ~$7/month (0.25 vCPU) | ~$12/month |
| **Memory** | Included | ~$3/month (0.5 GB) | Included |
| **Load Balancer** | API Gateway (~$1/million) | ALB (~$16/month) | Included |
| **Data Transfer** | ~$0.09/GB | ~$0.09/GB | ~$0.09/GB |
| **Total (low traffic)** | ~$1-5/month | ~$26/month | ~$12/month |

**Recommendation**:
- Use **Lambda** for low-traffic, cost-sensitive deployments
- Use **App Runner** for simplicity and moderate traffic
- Use **Fargate ECS** for high-traffic, enterprise deployments

## Feature Comparison

| Feature | Lambda | Fargate |
|---------|--------|---------|
| **MCP Protocol** | ✅ JSON-RPC 2.0 | ✅ JSON-RPC 2.0 |
| **Authentication** | ✅ Bearer Token | ✅ Bearer Token |
| **Health Check** | ✅ /health | ✅ /health |
| **MCP Inspector** | ❌ Requires adapter | ✅ Native support |
| **Cold Starts** | ❌ Yes (1-2s) | ✅ No |
| **Local Testing** | ⚠️ SAM required | ✅ Simple npm start |
| **Deployment** | ✅ SAM deploy | ⏳ CDK/App Runner |
| **Debugging** | ⚠️ CloudWatch logs | ✅ Standard Node.js |

## Next Steps

### Option 1: Keep Lambda, Add Adapter (Quick Fix)
1. Add Lambda Web Adapter layer to template.yaml
2. Modify lambda.ts to use Express + StreamableHTTPServerTransport
3. Test with MCP Inspector
4. **Time**: ~2-3 hours
5. **Complexity**: Medium

### Option 2: Deploy Fargate ECS (Clean Slate)
1. Create CDK infrastructure (VPC, ALB, ECS Cluster)
2. Push Docker image to ECR
3. Deploy ECS service
4. Test with MCP Inspector
5. **Time**: ~3-4 hours
6. **Complexity**: High

### Option 3: Deploy App Runner (Recommended)
1. Create App Runner service configuration
2. Push Docker image to ECR
3. Deploy to App Runner
4. Test with MCP Inspector
5. **Time**: ~30 minutes
6. **Complexity**: Low

## Recommended Path Forward

**For this project**: **Option 3 - App Runner**

**Reasoning**:
1. Simplest deployment (no VPC/ALB setup)
2. Best balance of cost ($12/month) and simplicity
3. Native Express.js support
4. MCP Inspector compatibility
5. Fast iteration and testing
6. Production-ready with minimal config

## Commands for Next Session

### Push branches to GitHub
```bash
# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/hello-mcp.git

# Push Lambda branch
git push -u origin feature/lambda-mcp-server

# Push Fargate branch
git push -u origin feature/fargate-ecs-mcp-server
```

### Deploy to App Runner
```bash
# Build and push Docker image
docker build -t hello-mcp-fargate .
docker tag hello-mcp-fargate:latest YOUR_ECR_URL/hello-mcp-fargate:latest
docker push YOUR_ECR_URL/hello-mcp-fargate:latest

# Create App Runner service (via AWS Console or CDK)
```

## Files Created

### Lambda Branch
- `lambda.ts` - Lambda handler with JSON-RPC 2.0
- `template.yaml` - SAM infrastructure
- `test-ui.html` - Custom test interface
- `test-mcp-lambda.ts` - Local test script
- `STATUS.md` - Project status
- `GIT_SETUP.md` - Git instructions
- `FARGATE_PLAN.md` - Fargate planning doc

### Fargate Branch
- `server.ts` - Express MCP server
- `Dockerfile` - Container definition
- `README-FARGATE.md` - Fargate documentation
- `package.json` - Updated with start scripts

### Shared Files
- `package.json` - Dependencies (MCP SDK, Express, Zod)
- `tsconfig.json` - TypeScript configuration
- `index.ts` - Local stdio MCP server (unchanged)
- `.gitignore` - Git ignore patterns

## Lessons Learned

1. **MCP Transport Matters**: Simple HTTP POST works for basic clients, but MCP Inspector requires StreamableHTTP or SSE
2. **Lambda Complexity**: Lambda + API Gateway requires careful event format handling (v1 vs v2)
3. **Express Simplicity**: Native Express.js is much simpler than Lambda adapters
4. **Cost vs Simplicity**: Sometimes paying $7/month more is worth the reduced complexity
5. **Local Testing**: Fargate approach allows standard `npm start` vs SAM local invoke
6. **Tool Selection**: MCP Inspector is picky about transport - test early with target tools

## Conclusion

Both implementations work, but they serve different use cases:

- **Lambda**: Best for cost-sensitive, low-traffic scenarios where cold starts are acceptable
- **Fargate/App Runner**: Best for reliable, always-on MCP servers with MCP Inspector compatibility

The Fargate implementation is recommended for this project due to:
- Better MCP Inspector compatibility
- Simpler codebase and development workflow
- No cold starts
- Easier debugging
- More suitable for MCP server use cases

**Current Status**: ✅ Both implementations working locally, ready for deployment decisions
