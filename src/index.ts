import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, GatewayIntentBits, TextChannel, ChannelType, PermissionFlagsBits, Embed } from 'discord.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Import the snowflake extractor utility
import { extractSnowflakes } from './utils.js';
import EmbedSummary from './embed-summary.js';

// Export the snowflake extractor utility
export { extractSnowflakes } from './utils.js';

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

// Helper function to find any channel (not just text channels) by name or ID
async function findAnyChannel(channelIdentifier: string, guildIdentifier?: string) {
  const guild = await findGuild(guildIdentifier);
  
  // First try to fetch by ID
  try {
    const channel = await client.channels.fetch(channelIdentifier);
    if (channel && 'guild' in channel && channel.guild?.id === guild.id) {
      return channel;
    }
  } catch {
    // If fetching by ID fails, search by name in the specified guild
    const channels = guild.channels.cache.filter(
      (channel) =>
        channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
        channel.name.toLowerCase() === channelIdentifier.toLowerCase().replace('#', '')
    );

    if (channels.size === 0) {
      const availableChannels = guild.channels.cache
        .map(c => `"#${c.name}"`).join(', ');
      throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`);
    }
    if (channels.size > 1) {
      const channelList = channels.map(c => `#${c.name} (${c.id})`).join(', ');
      throw new Error(`Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`);
    }
    return channels.first()!;
  }
  throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}"`);
}

// Helper function to find a category channel by name or ID
async function findCategoryChannel(categoryIdentifier: string, guildIdentifier?: string) {
  const guild = await findGuild(guildIdentifier);
  
  // First try to fetch by ID
  try {
    const channel = await client.channels.fetch(categoryIdentifier);
    if (channel && channel.type === ChannelType.GuildCategory && channel.guild?.id === guild.id) {
      return channel;
    }
  } catch {
    // If fetching by ID fails, search by name in the specified guild
    const categories = guild.channels.cache.filter(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === categoryIdentifier.toLowerCase()
    );

    if (categories.size === 0) {
      const availableCategories = guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => `"${c.name}"`).join(', ');
      throw new Error(`Category "${categoryIdentifier}" not found in server "${guild.name}". Available categories: ${availableCategories}`);
    }
    if (categories.size > 1) {
      const categoryList = categories.map(c => `${c.name} (${c.id})`).join(', ');
      throw new Error(`Multiple categories found with name "${categoryIdentifier}" in server "${guild.name}": ${categoryList}. Please specify the category ID.`);
    }
    return categories.first()!;
  }
  throw new Error(`Category "${categoryIdentifier}" not found in server "${guild.name}"`);
}

// Helper function to check if bot has required permissions
function checkBotPermissions(channel: any, requiredPermissions: bigint[]): void {
  if (!channel.guild) return;
  
  const botMember = channel.guild.members.cache.get(client.user!.id);
  if (!botMember) {
    throw new Error('Bot member not found in guild');
  }
  
  const botPermissions = channel.permissionsFor(botMember);
  if (!botPermissions) {
    throw new Error('Unable to check bot permissions');
  }
  
  const missingPermissions = requiredPermissions.filter(perm => !botPermissions.has(perm));
  if (missingPermissions.length > 0) {
    const permissionNames = missingPermissions.map(perm => {
      switch (perm) {
        case PermissionFlagsBits.ManageMessages: return 'Manage Messages';
        case PermissionFlagsBits.ManageChannels: return 'Manage Channels';
        case PermissionFlagsBits.ReadMessageHistory: return 'Read Message History';
        case PermissionFlagsBits.SendMessages: return 'Send Messages';
        default: return `Permission ${perm}`;
      }
    });
    throw new Error(`Bot is missing required permissions: ${permissionNames.join(', ')}`);
  }
}

// Helper function to map channel type string to Discord ChannelType
function getChannelType(type: string): ChannelType {
  switch (type) {
    case 'text': return ChannelType.GuildText;
    case 'voice': return ChannelType.GuildVoice;
    case 'category': return ChannelType.GuildCategory;
    case 'news': return ChannelType.GuildAnnouncement;
    case 'stage': return ChannelType.GuildStageVoice;
    case 'forum': return ChannelType.GuildForum;
    default: return ChannelType.GuildText;
  }
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
  limit: z.number().min(1).max(100).default(50),
});

const DeleteMessageSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  messageId: z.string().describe('ID of the Discord message to delete'),
});

const CreateChannelSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  name: z.string().describe('Channel name (without #)'),
  type: z.enum(['text', 'voice', 'category', 'news', 'stage', 'forum']).default('text').describe('Channel type'),
  topic: z.string().optional().describe('Channel topic/description'),
  nsfw: z.boolean().default(false).describe('Whether the channel is NSFW'),
  parent: z.string().optional().describe('Parent category ID or name'),
});

const DeleteChannelSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name or ID to delete'),
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
        name: "read-messages",
        description: "Read recent messages from a Discord channel. Message objects now include an 'id' field and embed summaries may include 'messageIds' arrays.",
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
      {
        name: "delete-message",
        description: "Delete a message in a Discord channel by message ID",
        inputSchema: {
          type: "object",
          properties: {
            server: { type: "string", description: "Server name or ID (optional)" },
            channel: { type: "string", description: "Channel name or ID" },
            messageId: { type: "string", description: "ID of the message to delete" }
          },
          required: ["channel", "messageId"]
        }
      },
      {
        name: "create-channel",
        description: "Create a new channel in a Discord server",
        inputSchema: {
          type: "object",
          properties: {
            server: { type: "string", description: "Server name or ID (optional)" },
            name: { type: "string", description: "Channel name (without #)" },
            type: { 
              type: "string", 
              enum: ["text", "voice", "category", "news", "stage", "forum"],
              default: "text",
              description: "Channel type" 
            },
            topic: { type: "string", description: "Channel topic/description (optional)" },
            nsfw: { type: "boolean", default: false, description: "Whether the channel is NSFW" },
            parent: { type: "string", description: "Parent category ID or name (optional)" }
          },
          required: ["name"]
        }
      },
      {
        name: "delete-channel",
        description: "Delete a channel from a Discord server",
        inputSchema: {
          type: "object",
          properties: {
            server: { type: "string", description: "Server name or ID (optional)" },
            channel: { type: "string", description: "Channel name or ID to delete" }
          },
          required: ["channel"]
        }
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
        const { channel: channelIdentifier, limit } = ReadMessagesSchema.parse(args);
        const channel = await findChannel(channelIdentifier);
        
        const messages = await channel.messages.fetch({ limit });
        const formattedMessages = Array.from(messages.values()).map(msg => {
          // Extract and map embeds to EmbedSummary format with error handling
          const embedSummaries: (EmbedSummary | { error: string })[] = msg.embeds.map(embed => {
            try {
              // Extract message IDs from each embed field separately and merge results
              const idsInEmbed = [
                ...extractSnowflakes(embed.title),
                ...extractSnowflakes(embed.description),
                ...extractSnowflakes(embed.url)
              ];
              
              const summary: EmbedSummary = {
                title: embed.title || undefined,
                description: embed.description || undefined,
                url: embed.url || undefined,
              };
              
              // Only include messageIds if any were found
              if (idsInEmbed.length > 0) {
                summary.messageIds = idsInEmbed;
              }
              
              return summary;
            } catch (err) {
              return {
                error: "Failed to parse embed: " + (err instanceof Error ? err.message : String(err))
              };
            }
          });
          
          // Build the base message object with message ID
          const messageObj: any = {
            id: msg.id,
            channel: `#${channel.name}`,
            server: channel.guild.name,
            author: msg.author.tag,
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
          };
          
          // Parse message content for referenced message IDs
          const referencedMessageIds = extractSnowflakes(msg.content);
          if (referencedMessageIds.length > 0) {
            messageObj.referencedMessageIds = referencedMessageIds;
          }
          
          // Add embeds array if there are any embeds
          if (embedSummaries.length > 0) {
            messageObj.embeds = embedSummaries;
          }
          
          return messageObj;
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedMessages, null, 2),
          }],
        };
      }

      case "delete-message": {
        const { channel: channelIdentifier, messageId } = DeleteMessageSchema.parse(args);
        const channel = await findChannel(channelIdentifier);
        
        // Check if bot has Manage Messages permission
        checkBotPermissions(channel, [PermissionFlagsBits.ManageMessages]);
        
        try {
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
          return { content: [{ type: "text", text: `Message ${messageId} deleted from #${channel.name} in ${channel.guild.name}.` }] };
        } catch (err) {
          if (err instanceof Error) {
            // Handle specific Discord API errors
            if (err.message.includes('Unknown Message') || err.message.includes('10008')) {
              throw new Error(`Message with ID ${messageId} not found in channel #${channel.name}. The message may have been deleted already, or the ID may be incorrect.`);
            }
            if (err.message.includes('Missing Permissions') || err.message.includes('50013')) {
              throw new Error(`Insufficient permissions to delete message ${messageId} in channel #${channel.name}. The bot requires 'Manage Messages' permission.`);
            }
            if (err.message.includes('Cannot delete a message authored by another user') || err.message.includes('50005')) {
              throw new Error(`Cannot delete message ${messageId} in channel #${channel.name}. The bot can only delete its own messages unless it has 'Manage Messages' permission.`);
            }
            if (err.message.includes('Invalid Form Body') || err.message.includes('50035')) {
              throw new Error(`Invalid message ID format: ${messageId}. Message IDs should be 18-19 digit numbers (Discord snowflakes).`);
            }
            // Generic error fallback
            throw new Error(`Failed to delete message ${messageId} from #${channel.name}: ${err.message}`);
          }
          throw new Error(`Failed to delete message ${messageId} from #${channel.name}: ${String(err)}`);
        }
      }

      case "create-channel": {
        const { server: serverIdentifier, name, type, topic, nsfw, parent } = CreateChannelSchema.parse(args);
        const guild = await findGuild(serverIdentifier);
        
        // Check if bot has Manage Channels permission
        const botMember = guild.members.cache.get(client.user!.id);
        if (!botMember) {
          throw new Error('Bot member not found in guild');
        }
        
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
          throw new Error(`Bot is missing required permission: Manage Channels`);
        }
        
        try {
          const channelOptions: any = {
            name: name,
            type: getChannelType(type),
            nsfw: nsfw,
            reason: 'Created via MCP server'
          };
          
          if (topic) {
            channelOptions.topic = topic;
          }
          
          if (parent) {
            const parentChannel = await findCategoryChannel(parent, serverIdentifier);
            channelOptions.parent = parentChannel.id;
          }
          
          const newChannel = await guild.channels.create(channelOptions);
          
          return {
            content: [{
              type: "text",
              text: `Channel created successfully: #${newChannel.name} (${newChannel.id}) in ${guild.name}`,
            }],
          };
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('Missing Permissions') || err.message.includes('50013')) {
              throw new Error(`Insufficient permissions to create channel "${name}" in server "${guild.name}". The bot requires 'Manage Channels' permission.`);
            }
            if (err.message.includes('Invalid Form Body') || err.message.includes('50035')) {
              throw new Error(`Invalid channel name "${name}". Channel names must be 1-100 characters and contain only alphanumeric characters, hyphens, and underscores.`);
            }
            throw new Error(`Failed to create channel "${name}" in server "${guild.name}": ${err.message}`);
          }
          throw new Error(`Failed to create channel "${name}" in server "${guild.name}": ${String(err)}`);
        }
      }

      case "delete-channel": {
        const { server: serverIdentifier, channel: channelIdentifier } = DeleteChannelSchema.parse(args);
        const channel = await findAnyChannel(channelIdentifier, serverIdentifier);
        const guild = await findGuild(serverIdentifier);
        
        // Check if bot has Manage Channels permission
        const botMember = guild.members.cache.get(client.user!.id);
        if (!botMember) {
          throw new Error('Bot member not found in guild');
        }
        
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
          throw new Error(`Bot is missing required permission: Manage Channels`);
        }
        
        const channelName = 'name' in channel ? channel.name : 'unknown';
        const channelId = 'id' in channel ? channel.id : 'unknown';
        
        try {
          await channel.delete('Deleted via MCP server');
          
          return {
            content: [{
              type: "text",
              text: `Channel #${channelName} (${channelId}) deleted successfully from ${guild.name}`,
            }],
          };
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('Missing Permissions') || err.message.includes('50013')) {
              throw new Error(`Insufficient permissions to delete channel "${channelName}" in server "${guild.name}". The bot requires 'Manage Channels' permission.`);
            }
            if (err.message.includes('Unknown Channel') || err.message.includes('10003')) {
              throw new Error(`Channel "${channelIdentifier}" not found or already deleted in server "${guild.name}".`);
            }
            throw new Error(`Failed to delete channel "${channelName}" from server "${guild.name}": ${err.message}`);
          }
          throw new Error(`Failed to delete channel "${channelName}" from server "${guild.name}": ${String(err)}`);
        }
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