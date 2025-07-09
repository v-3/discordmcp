#!/bin/bash

# Simple example of fetching PR metadata for a given repository
repo_name='c1nderscript/discordmcp' # replace with actual repo
output_file='prs_raw.json'

echo "Fetching PRs from $repo_name..."
pr_list=$(gh pr list --state all --json number --repo "$repo_name" | jq '.[].number')

if [[ -z "$pr_list" ]]; then
    echo "No PRs found in $repo_name"
    echo '[]' > "$output_file"
    exit 0
fi

echo '[' > "$output_file"
first_entry=true

for pr_number in $pr_list; do
    echo "Fetching details for PR #$pr_number"
    pr_details=$(gh pr view "$pr_number" --repo "$repo_name" --json number,title,mergeable,reviewDecision,isDraft,checks,statusCheckRollup,commits,author,updatedAt)
    
    if [[ $? -eq 0 && -n "$pr_details" ]]; then
        # Add comma separator (except for first entry)
        if [[ "$first_entry" != true ]]; then
            echo ',' >> "$output_file"
        fi
        first_entry=false
        
        # Add repository information to the PR data
        enhanced_data=$(echo "$pr_details" | jq --arg repo "$repo_name" '. + {repository: $repo}')
        echo "$enhanced_data" >> "$output_file"
        
        echo "  ✓ Successfully fetched PR #$pr_number"
    else
        echo "  ✗ Failed to fetch PR #$pr_number"
    fi
done

echo ']' >> "$output_file"
echo "Results saved to: $output_file"
