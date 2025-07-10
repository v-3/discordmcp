#!/bin/bash

# Comprehensive script to fetch detailed PR metadata
# This script can work with:
# 1. A list of repositories (from repos.txt)
# 2. A specific repository
# 3. A file with PR numbers

OUTPUT_FILE="prs_raw.json"
TEMP_FILE=$(mktemp)

echo "=== PR Metadata Fetcher ==="
echo "Output file: $OUTPUT_FILE"

# Function to fetch PR details for a single PR
fetch_pr_details() {
    local repo="$1"
    local pr_number="$2"
    local output_array_name="$3"
    
    echo "  Fetching PR #$pr_number from $repo..."
    
    # Fetch detailed PR metadata using the correct field names
    pr_data=$(gh pr view "$pr_number" --repo "$repo" --json number,title,mergeable,reviewDecision,isDraft,statusCheckRollup,commits,author,updatedAt 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$pr_data" ]]; then
        # Add repository information to the PR data
        enhanced_data=$(echo "$pr_data" | jq --arg repo "$repo" '. + {repository: $repo}')
        
        # Add to results array
        if [[ "$first_entry" != true ]]; then
            echo "," >> "$TEMP_FILE"
        fi
        first_entry=false
        
        echo "$enhanced_data" >> "$TEMP_FILE"
        echo "    ✓ Successfully fetched PR #$pr_number from $repo"
        return 0
    else
        echo "    ✗ Failed to fetch PR #$pr_number from $repo"
        return 1
    fi
}

# Initialize output
echo "[" > "$TEMP_FILE"
first_entry=true
total_fetched=0
total_failed=0

# Check if we have repos.txt and fetch PRs from all repositories
if [[ -f "repos.txt" ]]; then
    echo "Found repos.txt - scanning all repositories for PRs..."
    
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Clean up the repository name
        repo=$(echo "$line" | sed 's/^[0-9]*|//' | xargs)
        
        if [[ -n "$repo" ]]; then
            echo "Scanning repository: $repo"
            
            # Get all PRs from this repository
            pr_numbers=$(gh pr list --state all --repo "$repo" --json number --jq '.[].number' 2>/dev/null)
            
            if [[ -n "$pr_numbers" ]]; then
                echo "  Found PRs: $(echo "$pr_numbers" | tr '\n' ' ')"
                
                # Fetch details for each PR
                for pr_number in $pr_numbers; do
                    if fetch_pr_details "$repo" "$pr_number"; then
                        total_fetched=$((total_fetched + 1))
                    else
                        total_failed=$((total_failed + 1))
                    fi
                done
            else
                echo "  No PRs found in $repo"
            fi
        fi
    done < repos.txt
else
    echo "No repos.txt found. Checking for alternative input methods..."
    
    # Check if there's a pr_numbers.txt file
    if [[ -f "pr_numbers.txt" ]]; then
        echo "Found pr_numbers.txt - processing PR numbers from file..."
        
        while IFS= read -r line; do
            # Skip empty lines and comments
            if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
                continue
            fi
            
            # Parse the line to extract repo and PR number
            if [[ "$line" =~ \| ]]; then
                # Format: repo|pr_number
                repo=$(echo "$line" | cut -d'|' -f1 | xargs)
                pr_number=$(echo "$line" | cut -d'|' -f2 | xargs)
            elif [[ "$line" =~ [[:space:]] ]]; then
                # Format: repo pr_number
                repo=$(echo "$line" | awk '{print $1}')
                pr_number=$(echo "$line" | awk '{print $2}')
            else
                echo "Warning: Line '$line' format not recognized. Expected 'repo|pr_number' or 'repo pr_number'"
                continue
            fi
            
            if [[ -n "$repo" && -n "$pr_number" ]]; then
                if fetch_pr_details "$repo" "$pr_number"; then
                    total_fetched=$((total_fetched + 1))
                else
                    total_failed=$((total_failed + 1))
                fi
            fi
        done < pr_numbers.txt
    else
        echo "Creating sample pr_numbers.txt file..."
        cat > pr_numbers.txt << 'EOF'
# Sample PR numbers file
# Format: repository|pr_number or repository pr_number
# Examples:
# microsoft/vscode|12345
# facebook/react 67890
# 
# Add your PR numbers here:
EOF
        echo "Sample file created: pr_numbers.txt"
        echo "Please edit this file with your PR numbers and re-run the script."
    fi
fi

# Close the JSON array
echo "]" >> "$TEMP_FILE"

# Format and save the final output
if [[ $total_fetched -gt 0 ]]; then
    jq '.' "$TEMP_FILE" > "$OUTPUT_FILE"
else
    echo "[]" > "$OUTPUT_FILE"
fi

# Clean up
rm -f "$TEMP_FILE"

# Summary
echo ""
echo "=== SUMMARY ==="
echo "Total PRs successfully fetched: $total_fetched"
echo "Total PRs failed to fetch: $total_failed"
echo "Output saved to: $OUTPUT_FILE"

if [[ $total_fetched -gt 0 ]]; then
    echo ""
    echo "=== SAMPLE OUTPUT ==="
    echo "First PR in results:"
    jq '.[0] | {number, title, repository, author: .author.login, isDraft, reviewDecision}' "$OUTPUT_FILE" 2>/dev/null || echo "Error displaying sample output"
    
    echo ""
    echo "File structure:"
    echo "- Each PR record contains: number, title, mergeable, reviewDecision, isDraft, checks, statusCheckRollup, commits, author, updatedAt, repository"
fi

echo ""
echo "Script completed!"
