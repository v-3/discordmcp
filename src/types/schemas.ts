import { z } from 'zod';

export const SendMessageSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string().describe('Message content to send'),
});

export const SendAndWaitSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string().describe('Message content to send'),
  userId: z.string().describe('Discord user ID to wait for response from'),
  timeout: z.number().optional().default(60000).describe('Timeout in milliseconds to wait for response'),
});

export const ReadMessagesSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  limit: z.number().min(1).max(100).default(50).describe('Number of messages to fetch (max 100)'),
});

export interface MessageResponse {
  content: string;
  author: {
    id: string;
    tag: string;
  };
  timestamp: string;
}