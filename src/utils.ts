/**
 * Discord snowflake ID extractor utility
 * 
 * Discord uses "snowflake" IDs which are 17-20 digit numbers.
 * This utility extracts and deduplicates these IDs from text.
 */

const SNOWFLAKE_RE = /\b\d{17,20}\b/g;   // Discord IDs are 17–20 digit "snowflakes"

/**
 * Extracts Discord snowflake IDs from text
 * @param text - The input text to search for snowflake IDs
 * @returns Array of unique snowflake IDs found in the text
 */
export function extractSnowflakes(text: string | null | undefined): string[] {
  if (!text) return [];
  return Array.from(new Set(text.match(SNOWFLAKE_RE) ?? []));
}
