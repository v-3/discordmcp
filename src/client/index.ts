import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config/env.js';

// Create Discord client instance
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Discord client
export async function initializeClient(): Promise<void> {
  // Set up event handlers
  client.once('ready', () => {
    console.error('Discord bot is ready!');
  });

  // Login to Discord
  await client.login(config.discord.token);
}