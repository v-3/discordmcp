import { z } from 'zod';
import { client } from '../client/index.js';
import { findChannel, waitForResponse } from '../utils/discord.js';
import { SendMessageSchema, SendAndWaitSchema, ReadMessagesSchema } from '../types/schemas.js';

export async function handleSendMessage(args: unknown) {
  const { channel: channelIdentifier, message } = SendMessageSchema.parse(args);
  const channel = await findChannel(client, channelIdentifier);
  
  // Send the message
  const sent = await channel.send(message);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        messageId: sent.id,
        content: message,
        channel: `#${channel.name}`,
        server: channel.guild.name,
      }, null, 2),
    }],
  };
}

export async function handleSendAndWait(args: unknown) {
  const { channel: channelIdentifier, message, userId, timeout } = SendAndWaitSchema.parse(args);
  const channel = await findChannel(client, channelIdentifier);
  
  // Send the message
  const sent = await channel.send(message);
  
  try {
    // Wait for response
    const response = await waitForResponse(client, channel, userId, timeout);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          sentMessage: {
            content: message,
            messageId: sent.id,
            channel: `#${channel.name}`,
            server: channel.guild.name,
          },
          response: {
            content: response.content,
            author: response.author,
            timestamp: response.timestamp,
          }
        }, null, 2),
      }],
    };
  } catch (error) {
    // If timeout or other error occurs, still return the sent message info
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          sentMessage: {
            content: message,
            messageId: sent.id,
            channel: `#${channel.name}`,
            server: channel.guild.name,
          },
          error: error instanceof Error ? error.message : 'Unknown error waiting for response',
        }, null, 2),
      }],
      isError: true,
    };
  }
}

export async function handleReadMessages(args: unknown) {
  const { channel: channelIdentifier, limit } = ReadMessagesSchema.parse(args);
  const channel = await findChannel(client, channelIdentifier);
  
  const messages = await channel.messages.fetch({ limit });
  const formattedMessages = Array.from(messages.values()).map(msg => ({
    channel: `#${channel.name}`,
    server: channel.guild.name,
    author: msg.author.tag,
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
  }));

  return {
    content: [{
      type: "text",
      text: JSON.stringify(formattedMessages, null, 2),
    }],
  };
}

export function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    throw new Error(
      `Invalid arguments: ${error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ")}`
    );
  }
  throw error;
}