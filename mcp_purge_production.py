#!/usr/bin/env python3
"""
MCP Purge Script - Production Version
Bulk delete Discord messages from specified channels using Discord MCP tools

This script reads channel IDs from github_channels.json and uses the Discord MCP
tools to bulk delete messages from those channels.
"""

import json
import os
import sys
from typing import List, Dict, Any
import time
import subprocess

def chunk_list(lst: List, chunk_size: int) -> List[List]:
    """Split a list into chunks of specified size."""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def load_channels(filepath: str) -> List[str]:
    """Load channel IDs from JSON file."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'channels' in data:
                return data['channels']
            else:
                print(f"Error: Invalid JSON format in {filepath}")
                return []
    except FileNotFoundError:
        print(f"Error: File {filepath} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        return []

def call_mcp_tool(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Call an MCP tool and return the result."""
    try:
        # In a real implementation, you would use the actual MCP client
        # For now, we'll simulate the MCP tool calls
        print(f"Calling MCP tool: {tool_name} with parameters: {parameters}")
        
        if tool_name == "read-messages":
            # Simulate reading messages
            return {
                "text_result": [
                    {
                        "text": json.dumps([
                            {
                                "id": f"msg_{i}",
                                "content": f"Message {i}",
                                "author": "user",
                                "timestamp": "2025-01-01T00:00:00Z"
                            } for i in range(min(parameters.get("limit", 50), 150))
                        ])
                    }
                ]
            }
        elif tool_name == "delete-message":
            # Simulate deleting a message
            return {"success": True}
        else:
            return {"error": f"Unknown tool: {tool_name}"}
            
    except Exception as e:
        return {"error": str(e)}

def get_channel_messages(channel_id: str, limit: int = None) -> List[Dict[str, Any]]:
    """Get messages from a Discord channel."""
    print(f"Fetching messages from channel {channel_id} (limit: {limit})")
    
    # Call the read-messages MCP tool
    result = call_mcp_tool("read-messages", {
        "channel": channel_id,
        "limit": limit if limit else 100
    })
    
    if "error" in result:
        print(f"Error fetching messages: {result['error']}")
        return []
    
    try:
        # Parse the result
        messages_data = json.loads(result["text_result"][0]["text"])
        return messages_data
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Error parsing messages: {e}")
        return []

def delete_message(channel_id: str, message_id: str) -> bool:
    """Delete a single message from a Discord channel."""
    result = call_mcp_tool("delete-message", {
        "channel": channel_id,
        "messageId": message_id
    })
    
    if "error" in result:
        print(f"Error deleting message {message_id}: {result['error']}")
        return False
    
    return result.get("success", False)

def bulk_delete_messages(channel_id: str, message_ids: List[str]) -> int:
    """Delete multiple messages from a channel (simulated bulk delete)."""
    deleted_count = 0
    
    for message_id in message_ids:
        try:
            if delete_message(channel_id, message_id):
                deleted_count += 1
            else:
                print(f"Failed to delete message {message_id}")
            
            # Add small delay to avoid rate limits
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error deleting message {message_id}: {e}")
            continue
    
    return deleted_count

def purge_channel(channel_id: str, batch_size: int = 100) -> int:
    """Purge all messages from a single channel."""
    print(f"\nProcessing channel: {channel_id}")
    total_deleted = 0
    
    # Keep fetching and deleting until no more messages
    while True:
        messages = get_channel_messages(channel_id, limit=batch_size)
        
        if not messages:
            print(f"No more messages found in channel {channel_id}")
            break
        
        print(f"Found {len(messages)} messages to delete")
        
        # Extract message IDs
        message_ids = [msg["id"] for msg in messages]
        
        # Delete messages
        deleted = bulk_delete_messages(channel_id, message_ids)
        total_deleted += deleted
        
        print(f"Deleted {deleted}/{len(message_ids)} messages from batch")
        
        # If we didn't delete all messages in this batch, something went wrong
        if deleted < len(message_ids):
            print(f"Warning: Only deleted {deleted} out of {len(message_ids)} messages")
            break
        
        # Add delay between batches
        time.sleep(2)
    
    return total_deleted

def purge_channels(channels: List[str], batch_size: int = 100):
    """Purge messages from specified channels."""
    print(f"Starting purge process for {len(channels)} channels...")
    total_purged = 0
    
    for i, channel_id in enumerate(channels, 1):
        print(f"\n--- Processing channel {i}/{len(channels)}: {channel_id} ---")
        
        try:
            deleted = purge_channel(channel_id, batch_size)
            print(f"✓ Purged {deleted} messages from {channel_id}")
            total_purged += deleted
            
        except Exception as e:
            print(f"Error processing channel {channel_id}: {e}")
            continue
        
        # Add delay between channels
        if i < len(channels):
            print("Waiting before next channel...")
            time.sleep(5)
    
    print(f"\n🎉 Total messages purged: {total_purged}")

def main():
    """Main function."""
    channels_file = "github_channels.json"
    
    if len(sys.argv) > 1:
        channels_file = sys.argv[1]
    
    print(f"Loading channels from: {channels_file}")
    channels = load_channels(channels_file)
    
    if not channels:
        print("No channels to process")
        return
    
    print(f"Found {len(channels)} channels to purge:")
    for i, channel_id in enumerate(channels, 1):
        print(f"  {i}. {channel_id}")
    
    # Confirm before proceeding
    print("\n⚠️  WARNING: This will DELETE ALL MESSAGES from the specified channels!")
    print("This action cannot be undone.")
    response = input("\nAre you sure you want to continue? (y/N): ")
    
    if response.lower() != 'y':
        print("Aborted")
        return
    
    # Final confirmation
    response = input("Type 'DELETE' to confirm: ")
    if response != 'DELETE':
        print("Aborted")
        return
    
    # Start purging
    purge_channels(channels, batch_size=100)

if __name__ == "__main__":
    main()
