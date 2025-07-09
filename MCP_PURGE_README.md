# MCP Purge Scripts

This directory contains minimal MCP purge scripts for bulk deleting Discord messages from specified channels.

## Files

- `mcp_purge.py` - Mock implementation for testing and demonstration
- `mcp_purge_production.py` - Production version that uses actual Discord MCP tools
- `github_channels.json` - Configuration file containing channel IDs to purge
- `MCP_PURGE_README.md` - This documentation file

## Configuration

Edit `github_channels.json` to specify the channel IDs you want to purge:

```json
[
  "1391834179804729456",
  "1392190885264883752",
  "1391837665577533440"
]
```

Alternatively, you can use a more structured format:

```json
{
  "channels": [
    "1391834179804729456",
    "1392190885264883752"
  ]
}
```

## Environment Setup

Set the MCP_TOKEN environment variable (for the mock version):

```bash
export MCP_TOKEN="your_mcp_token_here"
```

## Usage

### Mock Version (Testing)
```bash
python3 mcp_purge.py [channels_file]
```

### Production Version
```bash
python3 mcp_purge_production.py [channels_file]
```

If no channels file is specified, it defaults to `github_channels.json`.

## Features

- **Bulk Deletion**: Handles bulk deletion with configurable batch sizes
- **Rate Limiting**: Includes delays between requests to avoid API rate limits  
- **Chunking**: Automatically splits large message lists into smaller chunks
- **Error Handling**: Robust error handling for network issues and API errors
- **Safety Confirmations**: Multiple confirmation prompts before deletion
- **Progress Reporting**: Shows detailed progress during the purge process

## Safety Features

- Double confirmation required before deletion
- Progress reporting for each channel
- Error handling that continues processing other channels if one fails
- Rate limiting to avoid Discord API limits

## Implementation Details

The production version uses Discord MCP tools:
- `read-messages` - Fetch messages from channels
- `delete-message` - Delete individual messages

The script handles:
- Channel message fetching with pagination
- Message deletion with rate limiting
- Error recovery and reporting
- Batch processing for efficiency

## Limitations

- Discord doesn't provide a true bulk delete API, so messages are deleted individually
- Rate limits may slow down the process for channels with many messages
- Messages older than 2 weeks may have additional restrictions (Discord limitation)

## Example Output

```
Loading channels from: github_channels.json
Found 3 channels to purge:
  1. 1391834179804729456
  2. 1392190885264883752
  3. 1391837665577533440

⚠️  WARNING: This will DELETE ALL MESSAGES from the specified channels!
This action cannot be undone.

Are you sure you want to continue? (y/N): y
Type 'DELETE' to confirm: DELETE

Starting purge process for 3 channels...

--- Processing channel 1/3: 1391834179804729456 ---
Fetching messages from channel 1391834179804729456 (limit: 100)
Found 150 messages to delete
Deleted 150/150 messages from batch
✓ Purged 150 messages from 1391834179804729456

🎉 Total messages purged: 450
```

## Notes

- The mock version simulates MCP tool calls for testing
- The production version needs to be integrated with actual MCP client
- Batch sizes can be adjusted based on Discord API limits
- Consider running during off-peak hours for large purges
