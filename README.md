# Discord MCP Server

A Model Context Protocol (MCP) server that enables LLMs to interact with Discord channels, allowing them to send and read messages through Discord's API. Using this server, LLMs like Claude can directly interact with Discord channels while maintaining user control and security.

## Features

- Send messages to Discord channels
- Send messages and wait for specific user responses
- Wait for messages from specific users
- Interruptable wait operations by primary user
- Read recent messages from channels
- Automatic server and channel discovery
- Support for both channel names and IDs
- Proper error handling and validation
- Configurable response timeout

## Prerequisites

- Node.js 16.x or higher
- A Discord bot token
- Your Discord user ID (for primary user features)
- The bot must be invited to your server with proper permissions:
  - Read Messages/View Channels
  - Send Messages
  - Read Message History

## Setup

1. Clone this repository:
```bash
git clone https://github.com/yourusername/discordmcp.git
cd discordmcp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Discord bot token and primary user ID:
```
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_PRIMARY_USER_ID=your_discord_user_id_here
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
        "DISCORD_TOKEN": "your_discord_bot_token_here",
        "DISCORD_PRIMARY_USER_ID": "your_discord_user_id_here"
      }
    }
  }
}
```

3. Restart Claude for Desktop

## Available Tools

### send-message
Sends a message to a specified Discord channel.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `message`: Message content to send

Example:
```json
{
  "channel": "general",
  "message": "Hello from MCP!"
}
```

Response format:
```json
{
  "messageId": "123456789012345678",
  "content": "Hello from MCP!",
  "channel": "#general",
  "server": "My Server"
}
```

### send-and-wait
Sends a message to a specified Discord channel and waits for a response from a specific user. Can be interrupted by the primary user.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `message`: Message content to send
- `userId`: Discord user ID to wait for response from
- `timeout` (optional): Timeout in milliseconds (default: 3600000ms = 60 minutes)

Example:
```json
{
  "channel": "general",
  "message": "Hello! What do you think about this?",
  "userId": "123456789012345678",
  "timeout": 3600000
}
```

Response format:
```json
{
  "sentMessage": {
    "content": "Hello! What do you think about this?",
    "messageId": "123456789012345678",
    "channel": "#general",
    "server": "My Server"
  },
  "response": {
    "content": "I think that's a great idea!",
    "author": {
      "id": "123456789012345678",
      "tag": "User#1234"
    },
    "timestamp": "2024-02-24T16:45:00.000Z",
    "interrupted": false
  },
  "status": "completed"
}
```

### wait-for-message
Waits for a message from a specific user in a channel. Can be interrupted by the primary user.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `userId`: Discord user ID to wait for message from
- `timeout` (optional): Timeout in milliseconds (default: 3600000ms = 60 minutes)

Example:
```json
{
  "channel": "general",
  "userId": "123456789012345678",
  "timeout": 3600000
}
```

Response format:
```json
{
  "message": {
    "content": "Here's my message",
    "author": {
      "id": "123456789012345678",
      "tag": "User#1234"
    },
    "timestamp": "2024-02-24T16:45:00.000Z",
    "interrupted": false
  },
  "channel": "#general",
  "server": "My Server",
  "status": "completed"
}
```

### read-messages
Reads recent messages from a specified Discord channel.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `limit` (optional): Number of messages to fetch (default: 50, max: 100)

Example:
```json
{
  "channel": "general",
  "limit": 10
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

1. "Can you read the last 5 messages from the general channel?"
2. "Please send a message to the announcements channel saying 'Meeting starts in 10 minutes'"
3. "Send a question to the development channel and wait for the team lead (ID: 123456789) to respond"
4. "Wait for any message from user 123456789 in the general channel"
5. "Post the meeting agenda in the team channel"

Claude will use the appropriate tools to interact with Discord while asking for your approval before sending any messages.

## Primary User Features

The primary user (configured via DISCORD_PRIMARY_USER_ID) has special privileges:

1. Can interrupt any waiting operation by sending a message
2. When a wait is interrupted, the response includes an `interrupted: true` flag
3. Useful for canceling long-running wait operations or taking over conversations

## Security Considerations

- The bot requires proper Discord permissions to function
- All message sending operations require explicit user approval
- Environment variables should be properly secured
- Token should never be committed to version control
- Channel access is limited to channels the bot has been given access to
- Response waiting is limited to specific users and includes configurable timeouts
- Primary user ID should be properly secured and belong to a trusted user

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