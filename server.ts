import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Bearer token authentication
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'mcp-secret-token-12345';

function authenticate(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === BEARER_TOKEN;
}

// Create MCP Server
function createServer() {
  const server = new Server(
    {
      name: 'hello-mcp-fargate',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register sayHello tool
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'sayHello',
          description: 'Greet someone by name',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the person to greet',
              },
            },
            required: ['name'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'sayHello') {
      const nameSchema = z.object({
        name: z.string(),
      });

      const args = nameSchema.parse(request.params.arguments);

      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${args.name}! 👋`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  // Authentication
  if (!authenticate(req)) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Unauthorized - Valid Bearer token required',
      },
    });
  }

  try {
    const request = req.body;

    // Initialize
    if (request.method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'hello-mcp-fargate',
            version: '1.0.0',
          },
          capabilities: {
            tools: {},
          },
        },
      });
    }

    // List tools
    if (request.method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'sayHello',
              description: 'Greet someone by name',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the person to greet',
                  },
                },
                required: ['name'],
              },
            },
          ],
        },
      });
    }

    // Call tool
    if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;

      if (name === 'sayHello') {
        const nameSchema = z.object({
          name: z.string(),
        });

        const validatedArgs = nameSchema.parse(args);

        return res.json({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Hello, ${validatedArgs.name}! 👋`,
              },
            ],
          },
        });
      }

      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32602,
          message: `Unknown tool: ${name}`,
        },
      });
    }

    // Unknown method
    return res.status(400).json({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`,
      },
    });
  } catch (error: any) {
    console.error('MCP request error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 MCP endpoint: http://localhost:${PORT}/mcp`);
});
