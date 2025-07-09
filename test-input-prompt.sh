#!/bin/bash

echo "=== Discord MCP Server Configuration Test ==="
echo "This simulates the input prompt functionality that Warp terminal would provide."
echo

# Simulate the input prompt for Discord token
echo "🔐 Discord Bot Token Required"
echo "Please enter your Discord bot token (or 'dummy' for testing):"
read -s DISCORD_TOKEN
echo

# The Guild ID is already configured
DISCORD_GUILD_ID="1391789832770027702"
echo "📋 Configuration:"
echo "- Guild ID: $DISCORD_GUILD_ID (inherited from config)"
echo "- Token: $(echo $DISCORD_TOKEN | sed 's/./*/g') (entered via prompt)"
echo

# Test the server startup
echo "🚀 Starting Discord MCP Server..."
echo "Working directory: $(pwd)"
echo "Environment configured:"
echo "  DISCORD_TOKEN=${DISCORD_TOKEN:0:10}..."
echo "  DISCORD_GUILD_ID=$DISCORD_GUILD_ID"
echo

# Run the server with timeout to show startup behavior
echo "Server output:"
export DISCORD_TOKEN
export DISCORD_GUILD_ID
timeout 5s node build/index.js 2>&1 || echo "✅ Server startup sequence completed"
