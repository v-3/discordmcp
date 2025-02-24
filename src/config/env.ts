import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables configuration
export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    primaryUserId: process.env.DISCORD_PRIMARY_USER_ID,
  },
};

// Validate required environment variables
export function validateEnv() {
  const errors: string[] = [];

  if (!config.discord.token) {
    errors.push('DISCORD_TOKEN environment variable is not set');
  }

  if (!config.discord.primaryUserId) {
    errors.push('DISCORD_PRIMARY_USER_ID environment variable is not set');
  }

  if (errors.length > 0) {
    throw new Error('Environment validation failed:\n' + errors.join('\n'));
  }
}