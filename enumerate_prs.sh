#!/bin/bash

# Create output file
output_file="open_prs_report.json"
echo "{" > "$output_file"

# Read repos from repos.txt and process each one
first_repo=true
while IFS='|' read -r number repo_name; do
    # Skip empty lines
    if [[ -z "$repo_name" ]]; then
        continue
    fi
    
    # Remove any trailing whitespace
    repo_name=$(echo "$repo_name" | tr -d '\r\n' | sed 's/[[:space:]]*$//')
    
    echo "Processing repository: $repo_name"
    
    # Add comma separator for JSON (except for first entry)
    if [ "$first_repo" = false ]; then
        echo "," >> "$output_file"
    fi
    first_repo=false
    
    # Add repository name to JSON
    echo "  \"$repo_name\": " >> "$output_file"
    
    # Run gh pr list command and capture output
    pr_output=$(gh pr list --state open --json number,title,updatedAt,headRefName,baseRefName --limit 100 --repo "$repo_name" 2>/dev/null)
    
    # Check if command was successful and output is not empty
    if [ $? -eq 0 ] && [ "$pr_output" != "[]" ] && [ -n "$pr_output" ]; then
        echo "$pr_output" >> "$output_file"
    else
        echo "\"No open PRs.\"" >> "$output_file"
    fi
    
done < repos.txt

echo "" >> "$output_file"
echo "}" >> "$output_file"

echo "Report saved to: $output_file"
