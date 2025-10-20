import { APIGatewayProxyResult } from "aws-lambda";

// Bearer token from environment
const BEARER_TOKEN = process.env.BEARER_TOKEN || "mcp-secret-token-12345";

// MCP Protocol Types
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Tool definitions
const TOOLS = [
  {
    name: "sayHello",
    description: "Greet someone by name",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the person to greet",
        },
      },
      required: ["name"],
    },
  },
];

// Tool implementations
async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case "sayHello":
      return [
        {
          type: "text",
          text: `Hello, ${args.name}! 👋`,
        },
      ];
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// MCP Protocol handlers
async function handleInitialize(params: any): Promise<any> {
  return {
    protocolVersion: "2024-11-05",
    serverInfo: {
      name: "Hello MCP Server",
      version: "1.0.0",
    },
    capabilities: {
      tools: {},
    },
  };
}

async function handleToolsList(): Promise<any> {
  return {
    tools: TOOLS,
  };
}

async function handleToolsCall(params: any): Promise<any> {
  const { name, arguments: args } = params;

  if (!name) {
    throw new Error("Tool name is required");
  }

  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  const content = await executeTool(name, args || {});

  return {
    content,
  };
}

// JSON-RPC 2.0 request handler
async function handleJsonRpcRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  console.log("MCP Request:", JSON.stringify(request));

  try {
    let result: any;

    switch (request.method) {
      case "initialize":
        result = await handleInitialize(request.params);
        break;
      case "tools/list":
        result = await handleToolsList();
        break;
      case "tools/call":
        result = await handleToolsCall(request.params);
        break;
      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    };
  } catch (error) {
    console.error("Error handling request:", error);
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}

// Check bearer token authentication
function authenticate(event: any): boolean {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7);
  return token === BEARER_TOKEN;
}

// Lambda handler
export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  // Support both API Gateway v1 (REST API) and v2 (HTTP API)
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath || event.requestContext?.http?.path || "/";

  console.log("Request:", httpMethod, path);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // CORS preflight
  if (httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Health check
  if (path === "/health") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
    };
  }

  // Root endpoint
  if (path === "/" || path === "") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({
        message: "MCP Server is running on Lambda",
        server: { name: "Hello MCP Server", version: "1.0.0" },
        protocol: "MCP over HTTP with JSON-RPC 2.0",
        authentication: "Bearer token required for /mcp",
        endpoints: {
          health: "/health",
          mcp: "/mcp (POST with JSON-RPC 2.0 requests)",
        },
      }),
    };
  }

  // MCP endpoint - requires authentication and POST method
  if (path === "/mcp" || path.startsWith("/mcp/")) {
    if (!authenticate(event)) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized - Valid Bearer token required",
          },
        }),
      };
    }

    if (httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed - Use POST for MCP requests",
          },
        }),
      };
    }

    // Handle MCP JSON-RPC request
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
          body: JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error - Request body is required",
            },
          }),
        };
      }

      const request: JsonRpcRequest = JSON.parse(event.body);

      // Validate JSON-RPC 2.0 format
      if (request.jsonrpc !== "2.0") {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32600,
              message: "Invalid Request - jsonrpc must be '2.0'",
            },
          }),
        };
      }

      if (!request.method) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32600,
              message: "Invalid Request - method is required",
            },
          }),
        };
      }

      const response = await handleJsonRpcRequest(request);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify(response),
      };
    } catch (error) {
      console.error("Error:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        }),
      };
    }
  }

  // Not found
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify({ error: "Not Found" }),
  };
};
