import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config/env.js';

// Create Discord client instance
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Initialize Discord client
export async function initializeClient(): Promise<void> {
  // Set up event handlers
  client.once('ready', () => {
    console.log('Discord bot is ready!');
  });

  // Handle errors
  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  // Login to Discord
  await client.login(config.discord.token);
}