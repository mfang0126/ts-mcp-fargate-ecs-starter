# XPlan Python MCP Server

Python implementation of MCP server for AWS Fargate ECS deployment using FastMCP.

## Features

- ✅ **FastMCP Python**: Native Python MCP framework
- ✅ **Simple & Clean**: ~60 lines of Python code
- ✅ **Type Hints**: Full typing support with Pydantic
- ✅ **HTTP Streaming**: Built-in HTTP streaming with SSE fallback
- ✅ **Dual Endpoints**: Both `/mcp` (HTTP) and `/sse` (SSE) available
- ✅ **Bearer Token Auth**: Secure API access
- ✅ **Container Ready**: Optimized for Docker/Fargate
- ✅ **Multiple Tools**: sayHello, addNumbers, getServerInfo

## Prerequisites

- **Python 3.10 or higher** (FastMCP requirement)
- pip
- Git (for installing FastMCP from GitHub)

## Quick Start

### Local Development

```bash
# Check Python version (must be 3.10+)
python3 --version

# Create virtual environment with Python 3.10+
python3.11 -m venv venv  # or python3.10, python3.12, etc.
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies (FastMCP installed from GitHub)
pip install -r requirements.txt

# Start server
python server.py

# Server runs on http://0.0.0.0:3000
# Provides both /mcp (HTTP streaming) and /sse (SSE) endpoints
```

**Note**: FastMCP is currently installed from GitHub as it's not yet published to PyPI.

### Test with curl

The server provides **two endpoints**:
- **`/mcp`** - HTTP streaming (recommended)
- **`/sse`** - Server-Sent Events (fallback)

```bash
# Using /mcp endpoint (HTTP streaming - recommended)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call sayHello tool
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"say_hello","arguments":{"name":"Python"}}}'

# Alternative: Using /sse endpoint (Server-Sent Events)
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call addNumbers tool
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"add_numbers","arguments":{"a":10,"b":32}}}'
```

## Docker

### Build Image

```bash
docker build -f Dockerfile.python -t xplan-python-mcp .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e BEARER_TOKEN=mcp-secret-token-12345 \
  xplan-python-mcp
```

## Available Tools

### 1. say_hello

Greet someone by name.

**Parameters:**
- `name` (str): The name of the person to greet

**Returns:** String greeting message

**Example:**
```python
say_hello(name="World")
# Returns: "Hello, World! 👋"
```

### 2. add_numbers

Add two numbers together.

**Parameters:**
- `a` (int): First number
- `b` (int): Second number

**Returns:** Integer sum

**Example:**
```python
add_numbers(a=10, b=32)
# Returns: 42
```

### 3. get_server_info

Get information about the running server.

**Parameters:** None

**Returns:** Dictionary with server information

**Example:**
```python
get_server_info()
# Returns: {
#   "name": "xplan-python-mcp",
#   "version": "1.0.0",
#   "language": "Python",
#   "framework": "FastMCP",
#   "environment": "production",
#   "port": "3000"
# }
```

## Code Structure

```python
from fastmcp import FastMCP

# Create server
mcp = FastMCP("xplan-python-mcp", version="1.0.0")

# Register tools with decorator
@mcp.tool()
def say_hello(name: str) -> str:
    """Greet someone by name"""
    return f"Hello, {name}! 👋"

# Run server with HTTP streaming transport
# This provides both /mcp (HTTP streaming) and /sse (SSE) endpoints
if __name__ == "__main__":
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=3000,
        bearer_token="mcp-secret-token-12345"
    )
```

## AWS Fargate Deployment

### Prerequisites

- AWS CLI configured
- Docker installed
- Python 3.11+

### Deployment Steps

#### 1. Create ECR Repository

```bash
REGION="ap-southeast-2"
aws ecr create-repository \
  --repository-name xplan-python-mcp \
  --region $REGION
```

#### 2. Build and Push Docker Image

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build for AMD64
docker buildx build --platform linux/amd64 \
  -f Dockerfile.python \
  -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/xplan-python-mcp:latest . \
  --load

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Push image
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/xplan-python-mcp:latest
```

#### 3. Create ECS Task Definition

Create `task-definition-python.json`:

```json
{
  "family": "xplan-python-mcp-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "xplan-python-mcp-container",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/xplan-python-mcp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "BEARER_TOKEN",
          "value": "mcp-secret-token-12345"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/xplan-python-mcp",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "mcp"
        }
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
}
```

#### 4. Deploy to ECS

Follow the same deployment steps as the TypeScript version in README-FARGATE.md, replacing:
- Repository name: `xplan-mcp-fargate` → `xplan-python-mcp`
- Task definition: `task-definition.json` → `task-definition-python.json`
- Container name: `xplan-mcp-container` → `xplan-python-mcp-container`

## Testing with MCP Inspector

The server provides two endpoints for testing:

### Option 1: HTTP Streaming (Recommended)

Create `inspector-python-config.json`:

```json
{
  "mcpServers": {
    "xplan-python-mcp-local": {
      "url": "http://localhost:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

### Option 2: SSE Fallback

```json
{
  "mcpServers": {
    "xplan-python-mcp-local": {
      "url": "http://localhost:3000/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer mcp-secret-token-12345"
      }
    }
  }
}
```

Run inspector:
```bash
npx @modelcontextprotocol/inspector inspector-python-config.json
```

## Python vs TypeScript Comparison

| Feature | Python | TypeScript |
|---------|--------|------------|
| **Lines of Code** | ~60 | ~50 |
| **Dependencies** | 3 | 2 |
| **Type Safety** | ✅ Pydantic | ✅ Zod |
| **SSE Support** | ✅ Built-in | ✅ Built-in |
| **Performance** | Good | Excellent |
| **Cold Start** | ~1s | ~500ms |
| **Memory Usage** | ~150MB | ~100MB |
| **Ecosystem** | Python ML/Data | JS/TS Web |

## Development

### Install Dev Dependencies

```bash
pip install -r requirements.txt
pip install black pylint mypy  # Optional dev tools
```

### Code Formatting

```bash
black server.py
```

### Type Checking

```bash
mypy server.py
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `BEARER_TOKEN`: Authentication token (default: mcp-secret-token-12345)
- `NODE_ENV`: Environment (production/development)

## FastMCP Python Features

### Decorators

```python
@mcp.tool()
def my_tool(param: str) -> str:
    """Tool description"""
    return result

@mcp.resource("resource://example")
def my_resource() -> str:
    """Resource description"""
    return content

@mcp.prompt()
def my_prompt() -> str:
    """Prompt template"""
    return template
```

### Type Validation

FastMCP uses Pydantic for automatic type validation:

```python
@mcp.tool()
def typed_function(
    name: str,
    age: int,
    score: float,
    active: bool
) -> dict:
    """All parameters are automatically validated"""
    return {"name": name, "age": age}
```

## Why Python FastMCP?

1. **Pythonic**: Natural Python syntax with decorators
2. **Type Safe**: Pydantic validation out of the box
3. **Simple**: Less boilerplate than TypeScript for simple tools
4. **ML Ready**: Perfect for AI/ML model integration
5. **Data Science**: Easy integration with NumPy, Pandas, etc.

## Example Use Cases

- **ML Model Serving**: Wrap models as MCP tools
- **Data Processing**: ETL pipelines as MCP services
- **Scientific Computing**: Math/stats functions
- **API Integration**: Python client library wrappers
- **Automation**: System administration tasks

## License

MIT
