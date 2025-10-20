import { FastMCP } from "fastmcp";
import { z } from "zod";

// Create FastMCP server
const server = new FastMCP({
  name: "hello-mcp-fargate",
  version: "1.0.0",
});

// Register sayHello tool
server.addTool({
  name: "sayHello",
  description: "Greet someone by name",
  parameters: z.object({
    name: z.string().describe("The name of the person to greet"),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! 👋`;
  },
});

// Get configuration from environment
const PORT = parseInt(process.env.PORT || "3000");
const BEARER_TOKEN = process.env.BEARER_TOKEN || "mcp-secret-token-12345";

// Start HTTP streaming server with stateless mode for containerization
server.start({
  transportType: "httpStream",
  httpStream: {
    port: PORT,
    endpoint: "/mcp",
    stateless: true, // Enable stateless mode for containerized deployments
    authenticate: async (headers) => {
      // Bearer token authentication
      const authHeader = headers.authorization || headers.Authorization;
      if (!authHeader) {
        throw new Error("Missing Authorization header");
      }

      const token = authHeader.replace("Bearer ", "");
      if (token !== BEARER_TOKEN) {
        throw new Error("Invalid bearer token");
      }

      return true;
    },
  },
});

console.log(`🚀 FastMCP Server running on port ${PORT}`);
console.log(`📍 MCP endpoint: http://localhost:${PORT}/mcp`);
console.log(`📍 SSE endpoint: http://localhost:${PORT}/sse`);
console.log(`📍 Stateless mode: enabled`);
