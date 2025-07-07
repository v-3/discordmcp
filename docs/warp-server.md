# Discord MCP Server - Warp Configuration

This document provides configuration examples for setting up the Discord MCP server with Warp.

## Minimal Host Configuration

Below is a minimal configuration snippet for setting up the Discord MCP server:

```json
{
  "servers": {
    "discord": {
      "type": "warp",
      "path": "/absolute/path/to/discord.warp",
      "env": {
        "DISCORD_BOT_TOKEN": "${input:discord_token}",
        "DISCORD_GUILD_ID": "${input:discord_guild_id}"
      }
    }
  },
  "inputs": [
    {
      "id": "discord_token",
      "type": "promptString",
      "description": "Discord Bot Token",
      "password": true
    },
    {
      "id": "discord_guild_id",
      "type": "promptString",
      "description": "Discord Guild ID"
    }
  ]
}
```

## Advanced Configuration Examples

### Enabling Read-Only Mode

To enable read-only mode, add the read-only flag to your environment configuration:

```json
{
  "servers": {
    "discord": {
      "type": "warp",
      "path": "/absolute/path/to/discord.warp",
      "env": {
        "DISCORD_BOT_TOKEN": "${input:discord_token}",
        "DISCORD_GUILD_ID": "${input:discord_guild_id}",
        "READ_ONLY": "true"
      }
    }
  }
}
```

### Custom Toolsets

You can configure custom toolsets by specifying additional environment variables:

```json
{
  "servers": {
    "discord": {
      "type": "warp",
      "path": "/absolute/path/to/discord.warp",
      "env": {
        "DISCORD_BOT_TOKEN": "${input:discord_token}",
        "DISCORD_GUILD_ID": "${input:discord_guild_id}",
        "TOOLSET_CONFIG": "/path/to/custom/toolset.json"
      }
    }
  }
}
```

### Logging Configuration

Enable detailed logging by setting the log level:

```json
{
  "servers": {
    "discord": {
      "type": "warp",
      "path": "/absolute/path/to/discord.warp",
      "env": {
        "DISCORD_BOT_TOKEN": "${input:discord_token}",
        "DISCORD_GUILD_ID": "${input:discord_guild_id}",
        "LOG_LEVEL": "debug",
        "LOG_FILE": "/path/to/discord-mcp.log"
      }
    }
  }
}
```

## Development Workflow

### Rebuilding and Repacking

When code changes, use the following commands:

- To rebuild the project:
  ```shell
  scripts/build.sh
  ```

- To repack with Warp:
  ```shell
  warp build
  ```

### Environment Setup

1. Create a `.env` file in the project root:
   ```
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_GUILD_ID=your_guild_id_here
   ```

2. Ensure the Discord bot has the necessary permissions in your Discord server.

3. Build the project before creating the Warp package:
   ```shell
   npm install
   npm run build
   ```

## Host Configuration File

The Discord MCP server includes a pre-configured host configuration file at `discord-warp-config.json`. This file contains the complete Warp host configuration with the Discord guild ID `1391789832770027702` already set up.

To use this configuration:

1. Copy `discord-warp-config.json` to your Warp configuration directory
2. Update the `path` field to point to your `discord.warp` executable location
3. Ensure your Discord bot token is available when prompted

The configuration file includes:
- Pre-configured Discord guild ID
- Secure token input prompting
- Proper environment variable setup

## File Structure

After setup, your Discord MCP server should have the following structure:

```
discordmcp/
├── src/
│   └── index.ts
├── build/
│   └── index.js (generated)
├── scripts/
│   └── build.sh
├── docs/
│   └── warp-server.md
├── discord.warp
├── discord-warp-config.json
├── Warp.toml
├── package.json
├── tsconfig.json
└── .env
```
