#!/usr/bin/env python3
"""
MCP Purge Script - Bulk delete Discord messages from specified channels

This script reads channel IDs from github_channels.json and uses the Discord MCP
tools to bulk delete messages from those channels.
"""

import json
import os
import sys
from typing import List, Dict, Any
import time

# Mock MCP Client implementation for demonstration
# In a real implementation, you would import the actual MCP client
class MockMCPClient:
    def __init__(self, token: str):
        self.token = token
        print(f"Initialized MCP client with token: {token[:10]}...")
    
    def channel(self, channel_id: str):
        return MockChannel(channel_id)

class MockChannel:
    def __init__(self, channel_id: str):
        self.channel_id = channel_id
    
    def history(self, limit=None):
        # Mock implementation - in real use, this would call the actual MCP tool
        print(f"Fetching message history for channel {self.channel_id} (limit: {limit})")
        # Return mock message objects
        return [MockMessage(f"msg_{i}") for i in range(150)]  # Mock 150 messages
    
    def bulk_delete(self, message_ids: List[str]):
        # Mock implementation - in real use, this would call the actual MCP tool
        print(f"Bulk deleting {len(message_ids)} messages from channel {self.channel_id}")
        return True

class MockMessage:
    def __init__(self, message_id: str):
        self.id = message_id

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

def purge_channels(channels: List[str], bulk_limit: int = 100):
    """Purge messages from specified channels."""
    # Get MCP token from environment
    mcp_token = os.getenv("MCP_TOKEN")
    if not mcp_token:
        print("Error: MCP_TOKEN environment variable not set")
        return
    
    # Initialize MCP client
    client = MockMCPClient(mcp_token)
    
    total_purged = 0
    
    for channel_id in channels:
        print(f"\nProcessing channel: {channel_id}")
        
        try:
            # Get channel and fetch message history
            channel = client.channel(channel_id)
            messages = channel.history(limit=None)  # Pull all messages
            
            if not messages:
                print(f"No messages found in channel {channel_id}")
                continue
            
            # Extract message IDs
            message_ids = [msg.id for msg in messages]
            print(f"Found {len(message_ids)} messages to delete")
            
            # Split into chunks if needed (server bulk limit)
            if len(message_ids) > bulk_limit:
                chunks = chunk_list(message_ids, bulk_limit)
                print(f"Splitting into {len(chunks)} chunks of max {bulk_limit} messages")
            else:
                chunks = [message_ids]
            
            # Delete messages in chunks
            deleted_count = 0
            for i, chunk in enumerate(chunks, 1):
                print(f"Deleting chunk {i}/{len(chunks)} ({len(chunk)} messages)")
                
                try:
                    channel.bulk_delete(chunk)
                    deleted_count += len(chunk)
                    
                    # Add delay between chunks to avoid rate limits
                    if i < len(chunks):
                        time.sleep(1)
                        
                except Exception as e:
                    print(f"Error deleting chunk {i}: {e}")
                    continue
            
            print(f"✓ Purged {deleted_count} messages from {channel_id}")
            total_purged += deleted_count
            
        except Exception as e:
            print(f"Error processing channel {channel_id}: {e}")
            continue
    
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
    
    print(f"Found {len(channels)} channels to purge")
    
    # Confirm before proceeding
    response = input("\nThis will DELETE ALL MESSAGES from the specified channels. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Aborted")
        return
    
    # Start purging
    purge_channels(channels, bulk_limit=100)

if __name__ == "__main__":
    main()
