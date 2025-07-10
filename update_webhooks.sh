#!/bin/bash

# Function to get existing webhook ID for a repository
get_existing_webhook_id() {
    local repo=$1
    local webhook_url=$(cat webhook.json.tmpl | envsubst | jq -r '.config.url')
    
    # Get all webhooks for the repository and find the one with matching URL
    gh api "repos/c1nderscript/$repo/hooks" 2>/dev/null | jq -r ".[] | select(.config.url == \"$webhook_url\") | .id" | head -1
}

# Process each repository
while read -r repo; do
    echo "Processing $repo …"
    
    # Substitute environment variables in template
    body=$(envsubst < webhook.json.tmpl)
    
    # Try to create the webhook
    if gh api -X POST "repos/c1nderscript/$repo/hooks" --input - <<< "$body" >/dev/null 2>&1; then
        echo "$repo,success"
    else
        # Check if it's a 422 error (webhook already exists)
        response=$(gh api -X POST "repos/c1nderscript/$repo/hooks" --input - <<< "$body" 2>&1)
        
        if echo "$response" | grep -q "422"; then
            echo "Webhook already exists for $repo, attempting to update..."
            
            # Get the existing webhook ID
            webhook_id=$(get_existing_webhook_id "$repo")
            
            if [ -n "$webhook_id" ]; then
                # Update the existing webhook
                if gh api -X PATCH "repos/c1nderscript/$repo/hooks/$webhook_id" --input - <<< "$body" >/dev/null 2>&1; then
                    echo "$repo,updated"
                else
                    echo "$repo,update_failed"
                fi
            else
                echo "$repo,webhook_id_not_found"
            fi
        else
            echo "$repo,failure"
        fi
    fi
done < repos.txt | tee results.csv
