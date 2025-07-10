/**
 * Lightweight TypeScript interface for embed data structure
 * Captures key properties while keeping JSON output concise and backward-compatible
 */
interface EmbedSummary {
  /** The title of the embed */
  title?: string;
  
  /** The description text of the embed */
  description?: string;
  
  /** URL that the embed links to */
  url?: string;
  
  /** Color of the embed (as a number/hex value) */
  color?: number;
  
  /** Array of field objects for structured data */
  fields?: {
    /** Name/title of the field */
    name: string;
    /** Value/content of the field */
    value: string;
    /** Whether the field should be displayed inline */
    inline?: boolean;
  }[];
  
  /** URL of the main image */
  image?: string;
  
  /** URL of the thumbnail image */
  thumbnail?: string;
  
  /** Footer text */
  footer?: string;
  
  /** Array of message IDs found within this embed */
  messageIds?: string[];
}

export default EmbedSummary;
