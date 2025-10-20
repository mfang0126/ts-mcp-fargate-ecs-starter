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

### Testing

```bash
# Test local server with MCP Inspector
npm run test:local

# Test deployed Fargate server with MCP Inspector
npm run test:fargate
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

## AWS Fargate ECS Deployment Tutorial

### Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed locally
- AWS account with permissions for ECR, ECS, ALB, and IAM

### Step-by-Step Deployment Guide

#### 1. Create ECR Repository

```bash
# Set your AWS region
REGION="ap-southeast-2"

# Create ECR repository
aws ecr create-repository \
  --repository-name hello-mcp-fargate \
  --region $REGION
```

#### 2. Build and Push Docker Image

**Important**: Build for AMD64 platform (Fargate requirement):

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build for AMD64 platform
docker buildx build --platform linux/amd64 \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/hello-mcp-fargate:latest . \
  --load

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Push image
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/hello-mcp-fargate:latest
```

#### 3. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name hello-mcp-cluster \
  --region $REGION
```

#### 4. Create Security Groups

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $REGION)

# Create ALB security group
ALB_SG=$(aws ec2 create-security-group \
  --group-name hello-mcp-alb-sg \
  --description "Security group for Hello MCP ALB" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

# Allow HTTP traffic to ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION

# Create ECS security group
ECS_SG=$(aws ec2 create-security-group \
  --group-name hello-mcp-ecs-sg \
  --description "Security group for Hello MCP ECS tasks" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB to ECS on port 3000
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG \
  --region $REGION
```

#### 5. Create Application Load Balancer

```bash
# Get default subnets
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text \
  --region $REGION | tr '\t' ' ')

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name hello-mcp-alb \
  --subnets $SUBNETS \
  --security-groups $ALB_SG \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region $REGION)

echo "ALB DNS: http://$ALB_DNS"

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name hello-mcp-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /mcp \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200-499 \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $REGION
```

#### 6. Create IAM Role for ECS Task Execution

```bash
# Create trust policy file
cat > ecs-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-trust-policy.json

# Attach managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### 7. Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/hello-mcp \
  --region $REGION
```

#### 8. Register Task Definition

Update `task-definition.json` with your account ID and region, then:

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $REGION
```

#### 9. Create ECS Service

```bash
# Get subnet IDs for service
SUBNET_IDS=$(echo $SUBNETS | tr ' ' ',')

# Create service
aws ecs create-service \
  --cluster hello-mcp-cluster \
  --service-name hello-mcp-service \
  --task-definition hello-mcp-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=hello-mcp-container,containerPort=3000" \
  --region $REGION
```

#### 10. Test the Deployment

Wait 2-3 minutes for the service to start, then test:

**With MCP Inspector** (easiest):
```bash
# Update inspector-fargate-config.json with your ALB DNS, then:
npm run test:fargate
```

**With curl**:
```bash
# Test tools/list
curl -X POST "http://$ALB_DNS/mcp" \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test sayHello tool
curl -X POST "http://$ALB_DNS/mcp" \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"sayHello","arguments":{"name":"World"}}}'
```

### Cleanup

To delete all AWS resources and avoid charges:

```bash
chmod +x cleanup-aws.sh
./cleanup-aws.sh
```

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

**📖 For detailed transport usage examples, see [TRANSPORT_GUIDE.md](./TRANSPORT_GUIDE.md)**

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

### Local Testing

Test the local server (requires `npm start` running):

```bash
npm run test:local
```

This opens MCP Inspector connected to `http://localhost:3000/mcp`.

### Fargate Testing

Test the deployed Fargate server:

```bash
npm run test:fargate
```

This opens MCP Inspector connected to your ALB endpoint.

### Manual Configuration

**Local Server** (`inspector-config.json`):
```json
{
  "mcpServers": {
    "hello-mcp-local": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

**Fargate Server** (`inspector-fargate-config.json`):
```json
{
  "mcpServers": {
    "hello-mcp-fargate": {
      "url": "http://hello-mcp-alb-661567224.ap-southeast-2.elb.amazonaws.com/mcp",
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
