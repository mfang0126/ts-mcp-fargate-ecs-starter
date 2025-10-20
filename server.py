"""
Hello MCP Server - Python FastMCP Implementation
Simple MCP server for AWS Fargate ECS deployment using FastMCP
"""

import os
from fastmcp import FastMCP

# Create FastMCP server
mcp = FastMCP("hello-mcp-python", version="1.0.0")


@mcp.tool()
def say_hello(name: str) -> str:
    """
    Greet someone by name

    Args:
        name: The name of the person to greet

    Returns:
        A friendly greeting message
    """
    return f"Hello, {name}! 👋"


@mcp.tool()
def add_numbers(a: int, b: int) -> int:
    """
    Add two numbers together

    Args:
        a: First number
        b: Second number

    Returns:
        The sum of a and b
    """
    return a + b


@mcp.tool()
def get_server_info() -> dict:
    """
    Get information about the running server

    Returns:
        Server information including version and environment
    """
    return {
        "name": "hello-mcp-python",
        "version": "1.0.0",
        "language": "Python",
        "framework": "FastMCP",
        "environment": os.getenv("NODE_ENV", "development"),
        "port": os.getenv("PORT", "3000")
    }


if __name__ == "__main__":
    # Get configuration from environment
    port = int(os.getenv("PORT", "3000"))
    bearer_token = os.getenv("BEARER_TOKEN", "mcp-secret-token-12345")

    # Run server with HTTP transport
    mcp.run(
        transport="sse",
        host="0.0.0.0",  # Listen on all interfaces for container access
        port=port,
        bearer_token=bearer_token
    )
