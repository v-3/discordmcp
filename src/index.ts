import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, GatewayIntentBits, TextChannel, ForumChannel, ChannelType, ThreadChannel, Collection } from "discord.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

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
      .map((g) => `"${g.name}"`)
      .join(", ");
    throw new Error(
      `Bot is in multiple servers. Please specify server name or ID. Available servers: ${guildList}`
    );
  }

  // Try to fetch by ID first
  try {
    const guild = await client.guilds.fetch(guildIdentifier);
    if (guild) return guild;
  } catch {
    // If ID fetch fails, search by name
    const guilds = client.guilds.cache.filter(
      (g) => g.name.toLowerCase() === guildIdentifier.toLowerCase()
    );

    if (guilds.size === 0) {
      const availableGuilds = Array.from(client.guilds.cache.values())
        .map((g) => `"${g.name}"`)
        .join(", ");
      throw new Error(
        `Server "${guildIdentifier}" not found. Available servers: ${availableGuilds}`
      );
    }
    if (guilds.size > 1) {
      const guildList = guilds.map((g) => `${g.name} (ID: ${g.id})`).join(", ");
      throw new Error(
        `Multiple servers found with name "${guildIdentifier}": ${guildList}. Please specify the server ID.`
      );
    }
    return guilds.first()!;
  }
  throw new Error(`Server "${guildIdentifier}" not found`);
}

// Helper function to find a channel by name or ID within a specific guild
async function findChannel(
  channelIdentifier: string,
  guildIdentifier?: string
): Promise<TextChannel | ThreadChannel> {
  const guild = await findGuild(guildIdentifier);

  // First try to fetch by ID
  try {
    const channel = await client.channels.fetch(channelIdentifier);
    if (channel && 
        ((channel instanceof TextChannel && channel.guild.id === guild.id) ||
         (channel instanceof ThreadChannel && channel.guild.id === guild.id))) {
      return channel;
    }
  } catch {
    // If fetching by ID fails, search by name in the specified guild
    const channels = guild.channels.cache.filter(
      (channel): channel is TextChannel =>
        channel instanceof TextChannel &&
        (channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
          channel.name.toLowerCase() ===
            channelIdentifier.toLowerCase().replace("#", ""))
    );

    if (channels.size === 0) {
      const availableChannels = guild.channels.cache
        .filter((c): c is TextChannel => c instanceof TextChannel)
        .map((c) => `"#${c.name}"`)
        .join(", ");
      throw new Error(
        `Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`
      );
    }
    if (channels.size > 1) {
      const channelList = channels
        .map((c) => `#${c.name} (${c.id})`)
        .join(", ");
      throw new Error(
        `Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`
      );
    }
    return channels.first()!;
  }
  throw new Error(
    `Channel "${channelIdentifier}" is not a text channel/thread or not found in server "${guild.name}"`
  );
}

// Updated validation schemas
const SendMessageSchema = z.object({
  server: z
    .string()
    .optional()
    .describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string(),
});

const ReadMessagesSchema = z.object({
  server: z
    .string()
    .optional()
    .describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  limit: z.number().min(1).max(100).default(50),
  before: z.union([z.string(), z.number()]).optional().describe("Message ID to fetch messages before (for pagination)"),
});

const ReadForumThreadsSchema = z.object({
  server: z
    .string()
    .optional()
    .describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe("Forum channel name or ID"),
  limit: z.number().min(1).max(50).default(10),
  before: z.union([z.string(), z.number()]).optional().describe("Message ID to fetch messages before in each thread (for pagination)"),
});

const DownloadAttachmentSchema = z.object({
  url: z.string().url().describe("Discord attachment URL to download"),
  filename: z.string().optional().describe("Optional filename to save as (will extract from URL if not provided)"),
  directory: z.string().optional().describe("Directory to save to (defaults to current directory)"),
});

const AddThreadTagsSchema = z.object({
  server: z.string().optional().describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe("Forum channel name or ID"),
  threadId: z.string().describe("Thread ID to add tags to"),
  tagNames: z.array(z.string()).describe("Array of tag names to add to the thread"),
});

const ListThreadsSchema = z.object({
  server: z.string().optional().describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe("Forum channel name or ID"),
  limit: z.number().min(1).max(100).default(50).describe("Number of threads to fetch"),
  includeArchived: z.boolean().default(false).describe("Include archived threads"),
});

const SearchThreadsSchema = z.object({
  server: z.string().optional().describe("Server name or ID (optional if bot is only in one server)"),
  channel: z.string().describe("Forum channel name or ID"),
  query: z.string().describe("Search query to match against thread names"),
  limit: z.number().min(1).max(100).default(50).describe("Maximum number of threads to return"),
  includeArchived: z.boolean().default(true).describe("Include archived threads in search"),
  exactMatch: z.boolean().default(false).describe("Whether to match exactly or use contains search"),
});

const UnarchiveThreadSchema = z.object({
  server: z.string().optional().describe("Server name or ID (optional if bot is only in one server)"),
  threadId: z.string().describe("Thread ID to unarchive/reopen"),
  reason: z.string().optional().describe("Optional reason for unarchiving the thread"),
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
              description:
                "Server name or ID (optional if bot is only in one server)",
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
        description: "Read recent messages from a Discord channel",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description:
                "Server name or ID (optional if bot is only in one server)",
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
            before: {
              type: "string",
              description: "Message ID to fetch messages before (for pagination)",
            },
          },
          required: ["channel"],
        },
      },
      {
        name: "read-forum-threads",
        description: "Read threads and posts from a Discord forum channel",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description:
                "Server name or ID (optional if bot is only in one server)",
            },
            channel: {
              type: "string",
              description: "Forum channel name or ID",
            },
            limit: {
              type: "number",
              description: "Number of threads to fetch (max 50)",
              default: 10,
            },
            before: {
              type: "string",
              description: "Message ID to fetch messages before in each thread (for pagination)",
            },
          },
          required: ["channel"],
        },
      },
      {
        name: "download-attachment",
        description: "Download a Discord attachment to local filesystem",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Discord attachment URL to download",
            },
            filename: {
              type: "string",
              description: "Optional filename to save as (will extract from URL if not provided)",
            },
            directory: {
              type: "string",
              description: "Directory to save to (defaults to current directory)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "add-thread-tags",
        description: "Add tags to a Discord forum thread",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "Server name or ID (optional if bot is only in one server)",
            },
            channel: {
              type: "string",
              description: "Forum channel name or ID",
            },
            threadId: {
              type: "string",
              description: "Thread ID to add tags to",
            },
            tagNames: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Array of tag names to add to the thread",
            },
          },
          required: ["channel", "threadId", "tagNames"],
        },
      },
      {
        name: "list-threads",
        description: "List forum thread information without messages",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "Server name or ID (optional if bot is only in one server)",
            },
            channel: {
              type: "string",
              description: "Forum channel name or ID",
            },
            limit: {
              type: "number",
              description: "Number of threads to fetch (max 100)",
              default: 50,
            },
            includeArchived: {
              type: "boolean",
              description: "Include archived threads",
              default: false,
            },
          },
          required: ["channel"],
        },
      },
      {
        name: "search-threads",
        description: "Search for forum threads by name or other criteria",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "Server name or ID (optional if bot is only in one server)",
            },
            channel: {
              type: "string",
              description: "Forum channel name or ID",
            },
            query: {
              type: "string",
              description: "Search query to match against thread names",
            },
            limit: {
              type: "number",
              description: "Maximum number of threads to return (max 100)",
              default: 50,
            },
            includeArchived: {
              type: "boolean",
              description: "Include archived threads in search",
              default: true,
            },
            exactMatch: {
              type: "boolean",
              description: "Whether to match exactly or use contains search",
              default: false,
            },
          },
          required: ["channel", "query"],
        },
      },
      {
        name: "unarchive-thread",
        description: "Unarchive (reopen) a forum thread",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "Server name or ID (optional if bot is only in one server)",
            },
            threadId: {
              type: "string",
              description: "Thread ID to unarchive/reopen",
            },
            reason: {
              type: "string",
              description: "Optional reason for unarchiving the thread",
            },
          },
          required: ["threadId"],
        },
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
        const { channel: channelIdentifier, message } =
          SendMessageSchema.parse(args);
        const channel = await findChannel(channelIdentifier);

        const sent = await channel.send(message);
        return {
          content: [
            {
              type: "text",
              text: `Message sent successfully to #${channel.name} in ${channel.guild.name}. Message ID: ${sent.id}`,
            },
          ],
        };
      }

      case "read-messages": {
        const { channel: channelIdentifier, limit, before } =
          ReadMessagesSchema.parse(args);
        const channel = await findChannel(channelIdentifier);

        const fetchOptions: { limit: number; before?: string } = { limit };
        if (before) {
          fetchOptions.before = String(before);
        }

        const messages = await channel.messages.fetch(fetchOptions);
        const formattedMessages = messages.map((msg) => ({
          messageId: msg.id,
          channel: `#${channel.name}`,
          server: channel.guild.name,
          author: msg.author.tag,
          content: msg.content,
          timestamp: msg.createdAt.toISOString(),
          attachments: msg.attachments.map(attachment => ({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            proxyUrl: attachment.proxyURL,
            size: attachment.size,
            contentType: attachment.contentType,
            width: attachment.width,
            height: attachment.height,
          })),
          embeds: msg.embeds.length > 0 ? msg.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            url: embed.url,
            image: embed.image?.url,
            thumbnail: embed.thumbnail?.url,
          })) : [],
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(Array.from(formattedMessages.values()), null, 2),
            },
          ],
        };
      }

      case "read-forum-threads": {
        const { channel: channelIdentifier, limit, before } =
          ReadForumThreadsSchema.parse(args);
        // Find the guild and forum channel
        const guild = await findGuild(args!.server as string | undefined);
        // Try to fetch by ID first
        let forumChannel: ForumChannel | undefined;
        try {
          const ch = await guild.channels.fetch(channelIdentifier);
          if (ch && ch.type === ChannelType.GuildForum) {
            forumChannel = ch as ForumChannel;
          }
        } catch {}
        if (!forumChannel) {
          // Search by name
          const channels = guild.channels.cache.filter(
            (c): c is ForumChannel =>
              c.type === ChannelType.GuildForum &&
              (c.name.toLowerCase() === channelIdentifier.toLowerCase() ||
                c.name.toLowerCase() ===
                  channelIdentifier.toLowerCase().replace("#", ""))
          );
          if (channels.size === 0) {
            const availableForums = guild.channels.cache
              .filter((c) => c.type === ChannelType.GuildForum)
              .map((c) => `"#${c.name}"`)
              .join(", ");
            throw new Error(
              `Forum channel "${channelIdentifier}" not found in server "${guild.name}". Available forums: ${availableForums}`
            );
          }
          if (channels.size > 1) {
            const forumList = channels
              .map((c) => `#${c.name} (${c.id})`)
              .join(", ");
            throw new Error(
              `Multiple forum channels found with name "${channelIdentifier}" in server "${guild.name}": ${forumList}. Please specify the channel ID.`
            );
          }
          forumChannel = channels.first();
        }
        
        if (!forumChannel) {
          throw new Error(`Forum channel "${channelIdentifier}" not found`);
        }
        
        // Fetch threads in the forum channel
        const threads = await forumChannel.threads.fetchActive();
        const threadList = Array.from(threads.threads.values()).slice(0, limit);
        // For each thread, fetch the latest messages
        const result = [];
        for (const thread of threadList) {
          const fetchOptions: { limit: number; before?: string } = { limit: 10 };
          if (before) {
            fetchOptions.before = String(before);
          }
          
          const threadMessages = await thread.messages.fetch(fetchOptions);
          
          // Get thread tags
          const threadTags = thread.appliedTags.map(tagId => {
            const tag = forumChannel!.availableTags.find(t => t.id === tagId);
            return tag ? {
              id: tag.id,
              name: tag.name,
              emoji: tag.emoji ? {
                id: tag.emoji.id,
                name: tag.emoji.name
              } : null
            } : {
              id: tagId,
              name: 'Unknown Tag',
              emoji: null
            };
          });
          
          const messagesArr = Array.from(threadMessages.values()).map(
            (msg) => ({
              messageId: msg.id,
              thread: thread.name,
              threadId: thread.id,
              channel: `#${forumChannel!.name}`,
              server: guild.name,
              author: msg.author.tag,
              content: msg.content,
              timestamp: msg.createdAt.toISOString(),
              attachments: msg.attachments.map(attachment => ({
                id: attachment.id,
                name: attachment.name,
                url: attachment.url,
                proxyUrl: attachment.proxyURL,
                size: attachment.size,
                contentType: attachment.contentType,
                width: attachment.width,
                height: attachment.height,
              })),
              embeds: msg.embeds.length > 0 ? msg.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                url: embed.url,
                image: embed.image?.url,
                thumbnail: embed.thumbnail?.url,
              })) : [],
            })
          );
          result.push({
            thread: thread.name,
            threadId: thread.id,
            tags: threadTags,
            messages: messagesArr,
          });
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "download-attachment": {
        const { url, filename, directory } = DownloadAttachmentSchema.parse(args);
        
        // Extract filename from URL if not provided
        let finalFilename = filename;
        if (!finalFilename) {
          const urlParts = new URL(url);
          const pathParts = urlParts.pathname.split('/');
          finalFilename = pathParts[pathParts.length - 1] || 'downloaded_file';
          // Remove Discord's URL parameters for cleaner filename
          if (finalFilename.includes('?')) {
            finalFilename = finalFilename.split('?')[0];
          }
        }
        
        // Set directory (default to current working directory)
        const saveDir = directory || process.cwd();
        const fullPath = path.join(saveDir, finalFilename);
        
        // Ensure directory exists
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }
        
        try {
          // Download the file
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Get file data
          const buffer = await response.arrayBuffer();
          
          // Write to file
          fs.writeFileSync(fullPath, Buffer.from(buffer));
          
          // Get file stats
          const stats = fs.statSync(fullPath);
          
          return {
            content: [
              {
                type: "text",
                text: `File downloaded successfully!\nPath: ${fullPath}\nSize: ${stats.size} bytes\nFilename: ${finalFilename}`,
              },
            ],
          };
        } catch (downloadError) {
          throw new Error(`Failed to download file: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
        }
      }

      case "add-thread-tags": {
        const { server, channel: channelIdentifier, threadId, tagNames } = AddThreadTagsSchema.parse(args);
        
        // Find the guild and forum channel
        const guild = await findGuild(server);
        let forumChannel: ForumChannel | undefined;
        try {
          const ch = await guild.channels.fetch(channelIdentifier);
          if (ch && ch.type === ChannelType.GuildForum) {
            forumChannel = ch as ForumChannel;
          }
        } catch {}
        
        if (!forumChannel) {
          // Search by name
          const channels = guild.channels.cache.filter(
            (c): c is ForumChannel =>
              c.type === ChannelType.GuildForum &&
              (c.name.toLowerCase() === channelIdentifier.toLowerCase() ||
                c.name.toLowerCase() === channelIdentifier.toLowerCase().replace("#", ""))
          );
          if (channels.size === 0) {
            const availableForums = guild.channels.cache
              .filter((c) => c.type === ChannelType.GuildForum)
              .map((c) => `"#${c.name}"`)
              .join(", ");
            throw new Error(
              `Forum channel "${channelIdentifier}" not found in server "${guild.name}". Available forums: ${availableForums}`
            );
          }
          if (channels.size > 1) {
            const forumList = channels
              .map((c) => `#${c.name} (${c.id})`)
              .join(", ");
            throw new Error(
              `Multiple forum channels found with name "${channelIdentifier}" in server "${guild.name}": ${forumList}. Please specify the channel ID.`
            );
          }
          forumChannel = channels.first();
        }
        
        if (!forumChannel) {
          throw new Error(`Forum channel "${channelIdentifier}" not found`);
        }
        
        // Get the thread
        const thread = await guild.channels.fetch(threadId);
        if (!thread || thread.type !== ChannelType.PublicThread || thread.parent?.id !== forumChannel.id) {
          throw new Error(`Thread "${threadId}" not found in forum channel "${forumChannel.name}"`);
        }
        
        // Find tag IDs from tag names
        const tagIds: string[] = [];
        const notFoundTags: string[] = [];
        
        for (const tagName of tagNames) {
          const foundTag = forumChannel.availableTags.find(tag => 
            tag.name.toLowerCase() === tagName.toLowerCase()
          );
          if (foundTag) {
            tagIds.push(foundTag.id);
          } else {
            notFoundTags.push(tagName);
          }
        }
        
        if (notFoundTags.length > 0) {
          const availableTags = forumChannel.availableTags.map(tag => `"${tag.name}"`).join(", ");
          throw new Error(
            `Tags not found: ${notFoundTags.join(", ")}. Available tags: ${availableTags}`
          );
        }
        
        // Combine existing tags with new tags (avoid duplicates)
        const currentTagIds = thread.appliedTags;
        const newTagIds = [...new Set([...currentTagIds, ...tagIds])];
        
        // Apply the tags
        await thread.setAppliedTags(newTagIds);
        
        // Get the updated tag names for response
        const updatedTagNames = newTagIds.map(tagId => {
          const tag = forumChannel!.availableTags.find(t => t.id === tagId);
          return tag ? tag.name : 'Unknown Tag';
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Tags added successfully to thread "${thread.name}" in #${forumChannel.name}!\nApplied tags: ${updatedTagNames.join(", ")}`,
            },
          ],
        };
      }

      case "list-threads": {
        const { server, channel: channelIdentifier, limit, includeArchived } = ListThreadsSchema.parse(args);
        
        // Find the guild and forum channel
        const guild = await findGuild(server);
        let forumChannel: ForumChannel | undefined;
        try {
          const ch = await guild.channels.fetch(channelIdentifier);
          if (ch && ch.type === ChannelType.GuildForum) {
            forumChannel = ch as ForumChannel;
          }
        } catch {}
        
        if (!forumChannel) {
          // Search by name
          const channels = guild.channels.cache.filter(
            (c): c is ForumChannel =>
              c.type === ChannelType.GuildForum &&
              (c.name.toLowerCase() === channelIdentifier.toLowerCase() ||
                c.name.toLowerCase() === channelIdentifier.toLowerCase().replace("#", ""))
          );
          if (channels.size === 0) {
            const availableForums = guild.channels.cache
              .filter((c) => c.type === ChannelType.GuildForum)
              .map((c) => `"#${c.name}"`)
              .join(", ");
            throw new Error(
              `Forum channel "${channelIdentifier}" not found in server "${guild.name}". Available forums: ${availableForums}`
            );
          }
          if (channels.size > 1) {
            const forumList = channels
              .map((c) => `#${c.name} (${c.id})`)
              .join(", ");
            throw new Error(
              `Multiple forum channels found with name "${channelIdentifier}" in server "${guild.name}": ${forumList}. Please specify the channel ID.`
            );
          }
          forumChannel = channels.first();
        }
        
        if (!forumChannel) {
          throw new Error(`Forum channel "${channelIdentifier}" not found`);
        }
        
        // Fetch both active and archived threads
        let allThreads: Collection<string, ThreadChannel> = new Collection();
        
        // Get active threads
        const activeThreads = await forumChannel.threads.fetchActive();
        allThreads = allThreads.concat(activeThreads.threads);
        
        // Get archived threads if requested
        if (includeArchived) {
          const archivedThreads = await forumChannel.threads.fetchArchived();
          allThreads = allThreads.concat(archivedThreads.threads);
        }
        
        // Sort by creation date (newest first) and limit
        const threadList = Array.from(allThreads.values())
          .sort((a, b) => b.createdTimestamp! - a.createdTimestamp!)
          .slice(0, limit);
        
        // Format thread information
        const result = threadList.map(thread => {
          // Get thread tags
          const threadTags = thread.appliedTags.map(tagId => {
            const tag = forumChannel!.availableTags.find(t => t.id === tagId);
            return tag ? {
              id: tag.id,
              name: tag.name,
              emoji: tag.emoji ? {
                id: tag.emoji.id,
                name: tag.emoji.name
              } : null
            } : {
              id: tagId,
              name: 'Unknown Tag',
              emoji: null
            };
          });
          
          return {
            threadId: thread.id,
            threadName: thread.name,
            createdAt: thread.createdAt?.toISOString(),
            createdTimestamp: thread.createdTimestamp,
            ownerId: thread.ownerId,
            archived: thread.archived,
            locked: thread.locked,
            messageCount: thread.messageCount,
            memberCount: thread.memberCount,
            totalMessageSent: thread.totalMessageSent,
            rateLimitPerUser: thread.rateLimitPerUser,
            tags: threadTags,
            lastMessageId: thread.lastMessageId,
            lastPinTimestamp: thread.lastPinTimestamp ? new Date(thread.lastPinTimestamp).toISOString() : null,
          };
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                forumChannel: forumChannel.name,
                server: guild.name,
                totalThreads: result.length,
                includeArchived,
                threads: result
              }, null, 2),
            },
          ],
        };
      }

      case "search-threads": {
        const { server, channel: channelIdentifier, query, limit, includeArchived, exactMatch } = SearchThreadsSchema.parse(args);
        
        // Find the guild and forum channel
        const guild = await findGuild(server);
        let forumChannel: ForumChannel | undefined;
        try {
          const ch = await guild.channels.fetch(channelIdentifier);
          if (ch && ch.type === ChannelType.GuildForum) {
            forumChannel = ch as ForumChannel;
          }
        } catch {}
        
        if (!forumChannel) {
          // Search by name
          const channels = guild.channels.cache.filter(
            (c): c is ForumChannel =>
              c.type === ChannelType.GuildForum &&
              (c.name.toLowerCase() === channelIdentifier.toLowerCase() ||
                c.name.toLowerCase() === channelIdentifier.toLowerCase().replace("#", ""))
          );
          if (channels.size === 0) {
            const availableForums = guild.channels.cache
              .filter((c) => c.type === ChannelType.GuildForum)
              .map((c) => `"#${c.name}"`)
              .join(", ");
            throw new Error(
              `Forum channel "${channelIdentifier}" not found in server "${guild.name}". Available forums: ${availableForums}`
            );
          }
          if (channels.size > 1) {
            const forumList = channels
              .map((c) => `#${c.name} (${c.id})`)
              .join(", ");
            throw new Error(
              `Multiple forum channels found with name "${channelIdentifier}" in server "${guild.name}": ${forumList}. Please specify the channel ID.`
            );
          }
          forumChannel = channels.first();
        }
        
        if (!forumChannel) {
          throw new Error(`Forum channel "${channelIdentifier}" not found`);
        }
        
        // Fetch both active and archived threads
        let allThreads: Collection<string, ThreadChannel> = new Collection();
        
        // Get active threads
        const activeThreads = await forumChannel.threads.fetchActive();
        allThreads = allThreads.concat(activeThreads.threads);
        
        // Get archived threads if requested
        if (includeArchived) {
          // Try to fetch as many archived threads as possible with pagination
          let hasMore = true;
          let before: string | undefined = undefined;
          let fetchCount = 0;
          const maxFetches = 10; // Limit to prevent infinite loops
          
          while (hasMore && fetchCount < maxFetches) {
            const archivedOptions: any = { limit: 100 };
            if (before) {
              archivedOptions.before = before;
            }
            
            const archivedThreads = await forumChannel.threads.fetchArchived(archivedOptions);
            
            if (archivedThreads.threads.size === 0) {
              hasMore = false;
            } else {
              allThreads = allThreads.concat(archivedThreads.threads);
              // Get the oldest thread ID for pagination
              const threadIds = Array.from(archivedThreads.threads.keys());
              before = threadIds[threadIds.length - 1];
              fetchCount++;
            }
          }
        }
        
        // Filter threads based on search query
        const queryLower = query.toLowerCase();
        const filteredThreads = Array.from(allThreads.values()).filter(thread => {
          const threadNameLower = thread.name.toLowerCase();
          if (exactMatch) {
            return threadNameLower === queryLower;
          } else {
            return threadNameLower.includes(queryLower);
          }
        });
        
        // Sort by creation date (newest first) and limit
        const threadList = filteredThreads
          .sort((a, b) => b.createdTimestamp! - a.createdTimestamp!)
          .slice(0, limit);
        
        // Format thread information
        const result = threadList.map(thread => {
          // Get thread tags
          const threadTags = thread.appliedTags.map(tagId => {
            const tag = forumChannel!.availableTags.find(t => t.id === tagId);
            return tag ? {
              id: tag.id,
              name: tag.name,
              emoji: tag.emoji ? {
                id: tag.emoji.id,
                name: tag.emoji.name
              } : null
            } : {
              id: tagId,
              name: 'Unknown Tag',
              emoji: null
            };
          });
          
          return {
            threadId: thread.id,
            threadName: thread.name,
            createdAt: thread.createdAt?.toISOString(),
            createdTimestamp: thread.createdTimestamp,
            ownerId: thread.ownerId,
            archived: thread.archived,
            locked: thread.locked,
            messageCount: thread.messageCount,
            memberCount: thread.memberCount,
            totalMessageSent: thread.totalMessageSent,
            rateLimitPerUser: thread.rateLimitPerUser,
            tags: threadTags,
            lastMessageId: thread.lastMessageId,
            lastPinTimestamp: thread.lastPinTimestamp ? new Date(thread.lastPinTimestamp).toISOString() : null,
          };
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                forumChannel: forumChannel.name,
                server: guild.name,
                query: query,
                exactMatch: exactMatch,
                totalFound: result.length,
                totalSearched: filteredThreads.length,
                includeArchived,
                threads: result
              }, null, 2),
            },
          ],
        };
      }

      case "unarchive-thread": {
        const { server, threadId, reason } = UnarchiveThreadSchema.parse(args);
        
        // Find the guild
        const guild = await findGuild(server);
        
        // Get the thread
        const thread = await guild.channels.fetch(threadId);
        if (!thread || !(thread instanceof ThreadChannel)) {
          throw new Error(`Thread "${threadId}" not found or is not a thread`);
        }
        
        // Check if thread is already unarchived
        if (!thread.archived) {
          return {
            content: [
              {
                type: "text",
                text: `Thread "${thread.name}" is already active (not archived).`,
              },
            ],
          };
        }
        
        // Unarchive the thread
        await thread.setArchived(false, reason);
        
        return {
          content: [
            {
              type: "text",
              text: `Thread "${thread.name}" (ID: ${thread.id}) has been successfully unarchived and is now active.${reason ? `\nReason: ${reason}` : ''}`,
            },
          ],
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
client.once("ready", () => {
  console.error("Discord bot is ready!");
});

// Start the server
async function main() {
  // Check for Discord token
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error("DISCORD_TOKEN environment variable is not set");
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
