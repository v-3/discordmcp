import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, Collection, GatewayIntentBits, Message, Snowflake, TextChannel } from 'discord.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Load environment variables
dotenv.config();

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Helper function to find a guild by name or ID
async function findGuild(guildIdentifier?: string) {
  if (!guildIdentifier) {
    // If no guild specified and bot is only in one guild, use that
    if (client.guilds.cache.size === 1) {
      return client.guilds.cache.first()!;
    }
    // List available guilds
    const guildList = Array.from(client.guilds.cache.values())
      .map(g => `"${g.name}"`).join(', ');
    throw new Error(`Bot is in multiple servers. Please specify server name or ID. Available servers: ${guildList}`);
  }

  // Try to fetch by ID first
  try {
    const guild = await client.guilds.fetch(guildIdentifier);
    if (guild) return guild;
  } catch {
    // If ID fetch fails, search by name
    const guilds = client.guilds.cache.filter(
      g => g.name.toLowerCase() === guildIdentifier.toLowerCase()
    );
    
    if (guilds.size === 0) {
      const availableGuilds = Array.from(client.guilds.cache.values())
        .map(g => `"${g.name}"`).join(', ');
      throw new Error(`Server "${guildIdentifier}" not found. Available servers: ${availableGuilds}`);
    }
    if (guilds.size > 1) {
      const guildList = guilds.map(g => `${g.name} (ID: ${g.id})`).join(', ');
      throw new Error(`Multiple servers found with name "${guildIdentifier}": ${guildList}. Please specify the server ID.`);
    }
    return guilds.first()!;
  }
  throw new Error(`Server "${guildIdentifier}" not found`);
}

// Helper function to find a channel by name or ID within a specific guild
async function findChannel(channelIdentifier: string, guildIdentifier?: string): Promise<TextChannel> {
  const guild = await findGuild(guildIdentifier);
  
  // First try to fetch by ID
  try {
    const channel = await client.channels.fetch(channelIdentifier);
    if (channel instanceof TextChannel && channel.guild.id === guild.id) {
      return channel;
    }
  } catch {
    // If fetching by ID fails, search by name in the specified guild
    const channels = guild.channels.cache.filter(
      (channel): channel is TextChannel =>
        channel instanceof TextChannel &&
        (channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
         channel.name.toLowerCase() === channelIdentifier.toLowerCase().replace('#', ''))
    );

    if (channels.size === 0) {
      const availableChannels = guild.channels.cache
        .filter((c): c is TextChannel => c instanceof TextChannel)
        .map(c => `"#${c.name}"`).join(', ');
      throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`);
    }
    if (channels.size > 1) {
      const channelList = channels.map(c => `#${c.name} (${c.id})`).join(', ');
      throw new Error(`Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`);
    }
    return channels.first()!;
  }
  throw new Error(`Channel "${channelIdentifier}" is not a text channel or not found in server "${guild.name}"`);
}

async function* fetchMessagePages(channel: TextChannel, limit: number = 100) {
  let lastMessageId: Snowflake | undefined;

  while (true) {
    const fetchedMessages: Collection<Snowflake, Message> = await channel.messages.fetch({
      limit: limit,
      before: lastMessageId
    });

    if (fetchedMessages.size === 0) {
      break;
    }

    yield fetchedMessages;
    lastMessageId = fetchedMessages.last()?.id;
  }
}

async function getMessagesInTimePeriod(channel: TextChannel, startTime: string, endTime: string, limit: number): Promise<Collection<Snowflake, Message>> {
  const startTimeDate = startTime ? new Date(startTime).getTime() : 0;
  const endTimeDate = new Date(endTime).getTime();
  const messages: Collection<Snowflake, Message> = new Collection();

  for await (const page of fetchMessagePages(channel, limit)) {
    for (const [sf, message] of page) {
      if (message.createdTimestamp >= startTimeDate && message.createdTimestamp <= endTimeDate) {
        messages.set(sf, message);
      } else if (message.createdTimestamp < startTimeDate) {
        return messages; // We've gone past the start time, no need to continue
      }
    }
  }

  return messages;
}

function zodSchemaToJsonSchema(zodSchema: z.ZodSchema) {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
    $refStrategy: 'relative',
  });
  
  // not needed for MCP
  if (jsonSchema.$schema) {
    delete jsonSchema.$schema;
  }
  
  return jsonSchema;
}

// Updated validation schemas
const SendMessageSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string(),
});

const ReadMessagesSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  limit: z.number().min(1).default(50).describe('Number of messages to fetch (max 100). Either use limit OR startDate/endDate'),
  startDate: z.string().optional().describe('Start date in ISO format (e.g., "2025-01-01T00:00:00.000Z"). If provided, fetches all messages from now back to this date (limit is ignored)'),
  endDate: z.string().default(() => new Date().toISOString()).describe('End date in ISO format (e.g., "2025-01-01T00:00:00.000Z"). If provided with startDate, fetches messages between startDate and endDate'),
});

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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send-message",
        description: "Send a message to a Discord channel",
        inputSchema: zodSchemaToJsonSchema(SendMessageSchema),
      },
      {
        name: "read-messages",
        description: "Read recent messages from a Discord channel",
        inputSchema: zodSchemaToJsonSchema(ReadMessagesSchema),
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send-message": {
        const { channel: channelIdentifier, message } = SendMessageSchema.parse(args);
        const channel = await findChannel(channelIdentifier);
        
        const sent = await channel.send(message);
        return {
          content: [{
            type: "text",
            text: `Message sent successfully to #${channel.name} in ${channel.guild.name}. Message ID: ${sent.id}`,
          }],
        };
      }

      case "read-messages": {
        const { channel: channelIdentifier, limit, startDate, endDate } = ReadMessagesSchema.parse(args);
        const channel = await findChannel(channelIdentifier);
        
        let messages: Collection<Snowflake, Message>
        if (startDate) {
          messages = await getMessagesInTimePeriod(channel, startDate, endDate, 100);
        } else {
          if (limit < 100) {
            messages = await channel.messages.fetch({ limit });
          } else {
          // Use the generator for simple limit-based fetching
            messages = new Collection();
            let count = 0;
            for await (const page of fetchMessagePages(channel)) {
              for (const [sf, message] of page) {
                if (count >= limit) break;
                messages.set(sf, message);
                count++;
              }
              if (count >= limit) break;
            }
          }
        }
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

// Discord client login and error handling
client.once('ready', () => {
  console.error('Discord bot is ready!');
});

// Start the server
async function main() {
  // Check for Discord token
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is not set');
  }
  
  try {
    // Login to Discord
    await client.login(token);

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Discord MCP Server running on stdio");
  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

main();