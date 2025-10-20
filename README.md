# Hello MCP Server

Simple MCP (Model Context Protocol) server with AWS Lambda deployment.

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

Connect to Claude Desktop by adding to config:
```json
{
  "mcpServers": {
    "hello-mcp": {
      "command": "npx",
      "args": ["tsx", "/Users/mingfang/Code/hello-mcp/index.ts"]
    }
  }
}
```

### Deploy to AWS Lambda
```bash
# Build and deploy
npm run deploy

# Or step by step
npm run build:lambda
sam deploy --guided
```

**First time setup:**
- Stack Name: `hello-mcp-stack`
- Region: `ap-southeast-2`
- Bearer Token: `mcp-secret-token-12345`
- Confirm all: `Y`

## 🔑 Authentication

Bearer token: `mcp-secret-token-12345`

Change it:
```bash
sam deploy --parameter-overrides BearerToken="your-new-token"
```

## 🧪 Test Deployment

```bash
# Health check
curl https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/health

# List available tools
curl -H "Authorization: Bearer mcp-secret-token-12345" \
  https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp

# Call sayHello tool
curl -X POST \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"tool": "sayHello", "params": {"name": "World"}}' \
  https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/mcp
```

## 🔌 Connect Claude to Lambda

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**Important:** Use `"transport": "http"` for Lambda.

## 🛠️ Tools

- **sayHello** - Greet someone by name

## 📋 Deployment Record

**Stack Name:** `hello-mcp-stack`
**Region:** `ap-southeast-2`
**Deployed:** 2025-10-17
**Status:** ✅ Tested and working

**Outputs:**
- **API URL:** `https://gjt4ggcz76.execute-api.ap-southeast-2.amazonaws.com/`
- **Lambda ARN:** `arn:aws:lambda:ap-southeast-2:670326884047:function:hello-mcp-server`
- **Authentication:** Bearer token with 'http' transport

**Test Results:**
```bash
# ✅ Health check working
# ✅ Tool listing: ["sayHello"]
# ✅ sayHello execution: "Hello, AWS Lambda! 👋"
```

## 📁 Project Structure

```
hello-mcp/
├── index.ts          # Local development (stdio)
├── lambda.ts         # AWS Lambda handler
├── template.yaml     # AWS SAM template
├── samconfig.toml    # SAM configuration
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## 💰 Cost

Lambda free tier: 1M requests/month
Expected cost: $0-5/month

## 📚 Learn More

- [FastMCP](https://github.com/punkpeye/fastmcp)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
