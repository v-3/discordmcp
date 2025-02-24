import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables configuration
export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
  },
};

// Validate required environment variables
export function validateEnv() {
  if (!config.discord.token) {
    throw new Error('DISCORD_TOKEN environment variable is not set');
  }
}