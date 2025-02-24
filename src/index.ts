import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { validateEnv } from './config/env.js';
import { initializeClient } from './client/index.js';
import { tools } from './server/tools.js';
import { handleSendMessage, handleSendAndWait, handleReadMessages, handleError } from './server/handlers.js';

// Create server instance
const server = new Server(
  {
    name: "discord",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send-message":
        return await handleSendMessage(args);

      case "send-and-wait":
        return await handleSendAndWait(args);

      case "read-messages":
        return await handleReadMessages(args);

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    // Always return a proper response even in case of error
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  try {
    // Validate environment variables
    validateEnv();
    
    // Initialize Discord client
    await initializeClient().catch(error => {
      console.error('Failed to initialize Discord client:', error);
      throw error;
    });

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Discord MCP Server running on stdio");
  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  try {
    await server.close();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

main();