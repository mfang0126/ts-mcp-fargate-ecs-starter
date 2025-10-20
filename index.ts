import { FastMCP } from "fastmcp";
import { z } from "zod";

// Create MCP server for local development (stdio)
const server = new FastMCP({
  name: "Hello MCP Server",
  version: "1.0.0",
  instructions: "A simple MCP server with basic tools.",
});

// Tool 1: Say hello to someone
server.addTool({
  name: "sayHello",
  description: "Say hello to someone",
  parameters: z.object({
    name: z.string().describe("The name of the person to greet"),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! 👋`;
  },
});

// Start server with stdio (for local development with Claude Desktop)
server.start({
  transportType: "stdio",
});

console.log("MCP Server running in stdio mode...");
