# Discord MCP Server

A Model Context Protocol (MCP) server that enables LLMs to interact with Discord channels, allowing them to send and read messages through Discord's API. Using this server, LLMs like Claude or GitHub Copilot can directly interact with Discord channels while maintaining user control and security.

## Features

- **Channel Messaging**: Send and read messages from Discord channels
- **Forum Thread Support**: Browse, search, and read forum threads with pagination
- **Thread Management**: Add tags to threads and unarchive closed threads
- **File Downloads**: Download Discord attachments directly to your local filesystem
- **Advanced Search**: Search forum threads with exact match or contains filtering
- **Automatic Discovery**: Automatically find servers and channels
- **Flexible Input**: Support for both channel/thread names and IDs
- **Comprehensive Error Handling**: Proper validation and informative error messages
- **Pagination Support**: Handle large numbers of archived threads and messages

## Prerequisites

- Node.js 16.x or higher
- A Discord bot token
- The bot must be invited to your server with proper permissions:
  - **Read Messages/View Channels** - Required for reading messages
  - **Send Messages** - Required for sending messages
  - **Read Message History** - Required for fetching past messages
  - **Manage Threads** - Required for unarchiving threads and managing thread tags
  - **Attach Files** - Recommended for full functionality

## Setup

1. Clone this repository:
```bash
git clone https://github.com/evilbocchi/discordmcp.git
cd discordmcp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Discord bot token:
```
DISCORD_TOKEN=your_discord_bot_token_here
```

4. Build the server:
```bash
npm run build
```

## Usage with Claude for Desktop

1. Open your Claude for Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Discord MCP server configuration:
```json
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["path/to/discordmcp/build/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_discord_bot_token_here"
      }
    }
  }
}
```

3. Restart Claude for Desktop

## Available Tools

### send-message
Sends a message to a specified Discord channel.

**Parameters:**
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `message`: Message content to send

**Example:**
```json
{
  "channel": "general",
  "message": "Hello from MCP!"
}
```

### read-messages
Reads recent messages from a specified Discord channel or forum thread.

**Parameters:**
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general"), thread ID, or channel ID
- `limit` (optional): Number of messages to fetch (default: 50, max: 100)
- `before` (optional): Message ID to fetch messages before (for pagination)

**Example:**
```json
{
  "channel": "general",
  "limit": 10
}
```

**Note:** You can also use thread IDs directly to read messages from specific forum threads!

### read-forum-threads
Reads threads and posts from a Discord forum channel. Returns both thread metadata and recent messages from active threads.

**Parameters:**
- `server` (optional): Server name or ID
- `channel`: Forum channel name or ID
- `limit` (optional): Number of threads to fetch (default: 10, max: 50)
- `before` (optional): Message ID for pagination within threads

**Example:**
```json
{
  "channel": "qna",
  "limit": 20
}
```

### list-threads
Lists forum threads with metadata (without fetching all messages). Useful for getting an overview of threads.

**Parameters:**
- `server` (optional): Server name or ID
- `channel`: Forum channel name or ID
- `limit` (optional): Number of threads to fetch (default: 50, max: 100)
- `includeArchived` (optional): Include archived threads (default: false)

**Example:**
```json
{
  "channel": "qna",
  "limit": 100,
  "includeArchived": true
}
```

### search-threads
Search for forum threads by name with advanced filtering. Supports pagination to fetch up to 1000 archived threads.

**Parameters:**
- `server` (optional): Server name or ID
- `channel`: Forum channel name or ID
- `query`: Search query to match against thread names
- `limit` (optional): Maximum results to return (default: 50, max: 100)
- `includeArchived` (optional): Include archived threads (default: true)
- `exactMatch` (optional): Exact match vs. contains search (default: false)

**Example:**
```json
{
  "channel": "qna",
  "query": "Library",
  "exactMatch": true,
  "includeArchived": true
}
```

**Advanced:** The search-threads tool uses pagination to fetch up to 1000 archived threads in batches, overcoming Discord's default 50-thread limit. This allows discovery of deeply buried archived threads.

### download-attachment
Downloads a Discord attachment (file, image, etc.) to your local filesystem.

**Parameters:**
- `url`: Discord attachment URL (CDN link)
- `filename` (optional): Custom filename (extracted from URL if not provided)
- `directory` (optional): Directory to save to (defaults to current directory)

**Example:**
```json
{
  "url": "https://cdn.discordapp.com/attachments/123/456/file.png",
  "filename": "myfile.png",
  "directory": "C:\\Users\\username\\Downloads\\discord_files"
}
```

### add-thread-tags
Add tags to a Discord forum thread. Useful for categorizing and organizing forum posts.

**Parameters:**
- `server` (optional): Server name or ID
- `channel`: Forum channel name or ID
- `threadId`: Thread ID to add tags to
- `tagNames`: Array of tag names to add

**Example:**
```json
{
  "channel": "qna",
  "threadId": "1234567890123456789",
  "tagNames": ["Answered", "Important"]
}
```

### unarchive-thread
Unarchives (reopens) a closed/archived forum thread, making it active again.

**Parameters:**
- `server` (optional): Server name or ID
- `threadId`: Thread ID to unarchive
- `reason` (optional): Reason for unarchiving (for audit logs)

**Example:**
```json
{
  "threadId": "1234567890123456789",
  "reason": "Reopening for additional discussion"
}
```

## Development

1. Install development dependencies:
```bash
npm install --save-dev typescript @types/node
```

2. Start the server in development mode:
```bash
npm run dev
```

## Testing

You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Examples

Here are some example interactions you can try with Claude after setting up the Discord MCP server:

### Basic Channel Operations
1. "Can you read the last 5 messages from the general channel?"
2. "Please send a message to the announcements channel saying 'Meeting starts in 10 minutes'"
3. "What were the most recent messages in the development channel about the latest release?"

### Forum Thread Operations
4. "Search for threads containing 'bug' in the bug-reports forum"
5. "List all archived threads in the qna channel"
6. "Read the messages from the 'Feature Request: Dark Mode' thread"
7. "Can you find a thread named 'Library' in qna and show me its contents?"

### Thread Management
8. "Add the 'Approved' and 'In Progress' tags to thread ID 1234567890"
9. "Unarchive the thread with ID 1234567890 so we can continue the discussion"

### File Downloads
10. "Download all .png files from the qna forum threads"
11. "Find threads tagged 'Pending' and download any attachments to my Downloads folder"

### Advanced Search
12. "Search the qna forum for all threads containing 'Hamster' that are archived"
13. "Find all non-implemented submissions (threads without the 'Implemented' tag) and download their files"

The chatbot will use the appropriate tools to interact with Discord while asking for your approval before sending any messages or downloading files.

## Security Considerations

- The bot requires proper Discord permissions to function
- All message sending operations require explicit user approval
- Environment variables should be properly secured
- Token should never be committed to version control
- Channel access is limited to channels the bot has been given access to
- Downloaded files are saved to the specified directory - ensure proper path validation
- Thread management operations (tags, unarchiving) respect Discord's permission system
- Pagination limits prevent excessive API calls (max 1000 threads via 10 batches of 100)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
1. Check the GitHub Issues section
2. Consult the MCP documentation at https://modelcontextprotocol.io
3. Open a new issue with detailed reproduction steps