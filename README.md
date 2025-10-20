# Hello MCP Server - Python FastMCP

Python implementation of MCP server for AWS Fargate ECS deployment using FastMCP.

## 🚀 Features

- ✅ **FastMCP Python**: Native Python MCP framework
- ✅ **Simple & Clean**: ~60 lines of Python code
- ✅ **Type Hints**: Full typing support with Pydantic
- ✅ **SSE Transport**: Built-in Server-Sent Events
- ✅ **Bearer Token Auth**: Secure API access
- ✅ **Container Ready**: Optimized for Docker/Fargate
- ✅ **Multiple Tools**: sayHello, addNumbers, getServerInfo

## 📋 Prerequisites

- **Python 3.10 or higher** (FastMCP requirement)
- pip
- Git (for installing FastMCP from GitHub)

## 🚀 Quick Start

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
```

**Note**: FastMCP is currently installed from GitHub as it's not yet published to PyPI.

### Test with curl

```bash
# Initialize MCP
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# List tools
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call sayHello tool
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer mcp-secret-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"say_hello","arguments":{"name":"Python"}}}'
```

## 🐳 Docker

### Build Image

```bash
docker build -t hello-mcp-python .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e BEARER_TOKEN=mcp-secret-token-12345 \
  hello-mcp-python
```

## 🔧 Available Tools

### 1. say_hello

Greet someone by name.

**Parameters:**
- `name` (str): The name of the person to greet

**Returns:** String greeting message

### 2. add_numbers

Add two numbers together.

**Parameters:**
- `a` (int): First number
- `b` (int): Second number

**Returns:** Integer sum

### 3. get_server_info

Get information about the running server.

**Parameters:** None

**Returns:** Dictionary with server information

## 🧪 Testing with MCP Inspector

Create or use the existing `inspector-python-config.json`:

```json
{
  "mcpServers": {
    "hello-mcp-python-local": {
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

## ☁️ AWS Fargate Deployment

For detailed deployment instructions to AWS Fargate ECS, see [README-PYTHON.md](README-PYTHON.md#aws-fargate-deployment).

## 📁 Project Structure

```
hello-mcp/
├── server.py                      # FastMCP server implementation
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Container definition
├── inspector-python-config.json   # MCP Inspector config
├── README.md                      # This file
└── README-PYTHON.md              # Detailed documentation
```

## 🌐 Environment Variables

- `PORT`: Server port (default: 3000)
- `BEARER_TOKEN`: Authentication token (default: mcp-secret-token-12345)
- `NODE_ENV`: Environment (production/development)

## 📚 Documentation

- **README-PYTHON.md**: Comprehensive Python implementation guide with AWS deployment
- **FastMCP**: https://github.com/jlowin/fastmcp
- **MCP Protocol**: https://modelcontextprotocol.io/

## 📝 License

MIT
