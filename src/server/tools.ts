import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: "send-message",
    description: "Send a message to a Discord channel",
    inputSchema: {
      type: "object",
      properties: {
        server: {
          type: "string",
          description: 'Server name or ID (optional if bot is only in one server)',
        },
        channel: {
          type: "string",
          description: 'Channel name (e.g., "general") or ID',
        },
        message: {
          type: "string",
          description: "Message content to send",
        },
      },
      required: ["channel", "message"],
    },
  },
  {
    name: "send-and-wait",
    description: "Send a message to a Discord channel and wait for a response from a specific user",
    inputSchema: {
      type: "object",
      properties: {
        server: {
          type: "string",
          description: 'Server name or ID (optional if bot is only in one server)',
        },
        channel: {
          type: "string",
          description: 'Channel name (e.g., "general") or ID',
        },
        message: {
          type: "string",
          description: "Message content to send",
        },
        userId: {
          type: "string",
          description: "Discord user ID to wait for response from",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 3600000ms = 60 minutes)",
          default: 3600000,
        },
      },
      required: ["channel", "message", "userId"],
    },
  },
  {
    name: "wait-for-message",
    description: "Wait for a message from a specific user in a channel",
    inputSchema: {
      type: "object",
      properties: {
        server: {
          type: "string",
          description: 'Server name or ID (optional if bot is only in one server)',
        },
        channel: {
          type: "string",
          description: 'Channel name (e.g., "general") or ID',
        },
        userId: {
          type: "string",
          description: "Discord user ID to wait for message from",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 3600000ms = 60 minutes)",
          default: 3600000,
        },
      },
      required: ["channel", "userId"],
    },
  },
  {
    name: "read-messages",
    description: "Read recent messages from a Discord channel",
    inputSchema: {
      type: "object",
      properties: {
        server: {
          type: "string",
          description: 'Server name or ID (optional if bot is only in one server)',
        },
        channel: {
          type: "string",
          description: 'Channel name (e.g., "general") or ID',
        },
        limit: {
          type: "number",
          description: "Number of messages to fetch (max 100)",
          default: 50,
        },
      },
      required: ["channel"],
    },
  },
];