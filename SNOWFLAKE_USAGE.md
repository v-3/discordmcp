# Snowflake ID Extractor Usage

## Overview
The `extractSnowflakes` function extracts Discord snowflake IDs from text strings. Discord uses 17-20 digit "snowflake" IDs for channels, users, messages, guilds, and other resources.

## Import
```typescript
import { extractSnowflakes } from './utils.js';
// or from the main index
import { extractSnowflakes } from './index.js';
```

## Usage Examples

### Basic Usage
```typescript
const text = "Please check channel 123456789012345678 and user 987654321098765432";
const ids = extractSnowflakes(text);
console.log(ids); // ['123456789012345678', '987654321098765432']
```

### Discord Mentions
```typescript
const discordMessage = "User <@1234567890123456789> mentioned role <@&9876543210987654321>";
const ids = extractSnowflakes(discordMessage);
console.log(ids); // ['1234567890123456789', '9876543210987654321']
```

### Deduplication
```typescript
const text = "ID 123456789012345678 appears twice: 123456789012345678";
const ids = extractSnowflakes(text);
console.log(ids); // ['123456789012345678'] - automatically deduplicated
```

### Null/Empty Handling
```typescript
extractSnowflakes(null);      // []
extractSnowflakes(undefined); // []
extractSnowflakes("");        // []
```

## Features
- ✅ Matches 17-20 digit numbers (Discord snowflake range)
- ✅ Uses word boundaries to avoid partial matches
- ✅ Automatically deduplicates found IDs
- ✅ Handles null/undefined input gracefully
- ✅ Returns empty array for no matches

## Testing
Run the test suite with:
```bash
npm run build
node build/test-utils.js
```
