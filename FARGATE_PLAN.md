# Fargate ECS MCP Server Plan

## Overview

Create a **simpler, more reliable** MCP server using AWS Fargate ECS instead of Lambda.

### Why Fargate vs Lambda?

| Feature | Lambda (Current) | Fargate ECS |
|---------|------------------|-------------|
| **Transport** | Need Lambda Web Adapter | ✅ Native Express.js |
| **Complexity** | Medium (adapter layer) | ✅ Simple (standard web server) |
| **Cold Start** | Yes (~1-2s) | ✅ Always running |
| **Streaming** | Requires workarounds | ✅ Native support |
| **MCP Inspector** | ⚠️ Needs adapter | ✅ Works out-of-box |
| **Cost** | $0-5/month | ~$10-15/month |
| **Debugging** | Harder | ✅ Easier (CloudWatch logs) |

**Verdict:** Fargate is **simpler and more reliable** for MCP servers.

---

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

---

## Implementation Steps

### 1. Reuse Express Code
We already have Express + MCP SDK installed! Just need to create the server:

```typescript
// server.ts
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'hello-mcp-fargate',
  version: '1.0.0'
});

// Register sayHello tool
server.registerTool(
  'sayHello',
  {
    title: 'Say Hello',
    description: 'Greet someone by name',
    inputSchema: { name: z.string() },
    outputSchema: { greeting: z.string() }
  },
  async ({ name }) => {
    const output = { greeting: `Hello, ${name}! 👋` };
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output
    };
  }
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});
```

### 2. Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
```

### 3. Infrastructure with CDK (TypeScript)

```typescript
// lib/fargate-mcp-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class FargateMcpStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'McpVpc', { maxAzs: 2 });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'McpCluster', { vpc });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'McpTask', {
      memoryLimitMiB: 512,
      cpu: 256
    });

    // Container
    taskDefinition.addContainer('McpContainer', {
      image: ecs.ContainerImage.fromAsset('.'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'mcp' }),
      environment: {
        PORT: '3000',
        BEARER_TOKEN: process.env.BEARER_TOKEN || 'mcp-secret-token-12345'
      },
      portMappings: [{ containerPort: 3000 }]
    });

    // Fargate Service
    const service = new ecs.FargateService(this, 'McpService', {
      cluster,
      taskDefinition,
      desiredCount: 1
    });

    // Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, 'McpLB', {
      vpc,
      internetFacing: true
    });

    const listener = lb.addListener('McpListener', { port: 80 });

    listener.addTargets('McpTarget', {
      port: 3000,
      targets: [service],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30)
      }
    });

    // Output
    new cdk.CfnOutput(this, 'LoadBalancerURL', {
      value: `http://${lb.loadBalancerDnsName}`
    });
  }
}
```

---

## Deployment Commands

```bash
# Initialize CDK (if not already)
npm install -g aws-cdk
cdk init app --language typescript

# Deploy
cdk deploy

# Get URL
aws cloudformation describe-stacks \
  --stack-name FargateMcpStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text
```

---

## Testing

```bash
# Health check
curl http://YOUR-ALB-URL/health

# MCP Inspector config
{
  "mcpServers": {
    "hello-mcp-fargate": {
      "url": "http://YOUR-ALB-URL/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

---

## Advantages of Fargate Approach

1. ✅ **No Lambda Web Adapter needed** - Pure Express.js
2. ✅ **MCP Inspector works immediately** - StreamableHTTP native
3. ✅ **No cold starts** - Always warm
4. ✅ **Easier debugging** - Standard Node.js app
5. ✅ **Better for streaming** - Long-running connections
6. ✅ **Simpler codebase** - No adapter layer complexity

## Cost Estimate

```
Fargate vCPU: 0.25 vCPU × $0.04048/hour × 730 hours = ~$7/month
Fargate Memory: 0.5 GB × $0.004445/hour × 730 hours = ~$3/month
ALB: $16/month + data transfer

Total: ~$26/month (vs Lambda ~$0-5/month)

Optimization: Use AWS App Runner instead → ~$12/month
```

---

## Next Steps

1. Create `feature/fargate-ecs-mcp-server` branch
2. Copy `lambda.ts` logic to `server.ts` with Express
3. Create Dockerfile
4. Set up CDK infrastructure
5. Deploy to AWS
6. Test with MCP Inspector
7. Compare with Lambda version

---

## Files to Create

```
fargate-mcp/
├── server.ts           # Express MCP server
├── Dockerfile          # Container definition
├── cdk/
│   ├── bin/app.ts      # CDK app entry
│   ├── lib/stack.ts    # Infrastructure
│   └── cdk.json        # CDK config
├── package.json        # Dependencies (reuse existing)
└── README.md           # Fargate-specific docs
```

---

## Decision: Fargate vs App Runner

**AWS App Runner** is even simpler:
- No VPC/ALB setup needed
- Automatic scaling
- ~$12/month
- Perfect for this use case!

**Recommendation:** Start with **App Runner**, fall back to Fargate if needed.
