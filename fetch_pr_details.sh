#!/bin/bash

# Script to fetch detailed PR metadata for each PR number
# Usage: ./fetch_pr_details.sh [pr_numbers_file] [repo_name]

# Default values
PR_NUMBERS_FILE="${1:-pr_numbers.txt}"
REPO_NAME="${2:-}"
OUTPUT_FILE="prs_raw.json"

# Function to display usage
show_usage() {
    echo "Usage: $0 [pr_numbers_file] [repo_name]"
    echo "  pr_numbers_file: File containing PR numbers (one per line) - default: pr_numbers.txt"
    echo "  repo_name: Repository name in format owner/repo - if not provided, will extract from each line"
    echo ""
    echo "File format options:"
    echo "  1. Just PR numbers (one per line) - requires repo_name parameter"
    echo "  2. Format: repo_name|pr_number"
    echo "  3. Format: repo_name pr_number"
    echo ""
    echo "Output: Detailed PR metadata saved to prs_raw.json"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Initialize output file
echo "[]" > "$OUTPUT_FILE"
temp_file=$(mktemp)

echo "Fetching detailed PR metadata..."
echo "Output file: $OUTPUT_FILE"

# Counter for tracking progress
total_prs=0
processed_prs=0
failed_prs=0

# First, count total PRs
if [[ -f "$PR_NUMBERS_FILE" ]]; then
    total_prs=$(wc -l < "$PR_NUMBERS_FILE")
    echo "Found $total_prs PR entries to process"
else
    echo "Error: PR numbers file '$PR_NUMBERS_FILE' not found!"
    echo "Creating sample file..."
    cat > "$PR_NUMBERS_FILE" << EOF
# Sample PR numbers file
# Format options:
# 1. Just PR numbers (requires repo_name parameter):
# 123
# 456
# 
# 2. Repository and PR number separated by pipe:
# owner/repo|123
# owner/repo|456
#
# 3. Repository and PR number separated by space:
# owner/repo 123
# owner/repo 456
EOF
    echo "Sample file created: $PR_NUMBERS_FILE"
    echo "Please edit this file with your PR numbers and re-run the script."
    exit 1
fi

# Read PR numbers and process each one
results_array="["
first_entry=true

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
        # Just PR number - use provided repo_name
        if [[ -z "$REPO_NAME" ]]; then
            echo "Error: Line '$line' appears to be just a PR number, but no repo_name provided!"
            continue
        fi
        repo="$REPO_NAME"
        pr_number="$line"
    fi
    
    # Validate inputs
    if [[ -z "$repo" || -z "$pr_number" ]]; then
        echo "Warning: Skipping invalid line: $line"
        continue
    fi
    
    # Remove any whitespace
    repo=$(echo "$repo" | xargs)
    pr_number=$(echo "$pr_number" | xargs)
    
    processed_prs=$((processed_prs + 1))
    echo "Processing PR #$pr_number from $repo ($processed_prs/$total_prs)..."
    
    # Fetch detailed PR metadata
    pr_data=$(gh pr view "$pr_number" --repo "$repo" --json number,title,mergeable,reviewDecision,isDraft,statusCheckRollup,commits,author,updatedAt 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$pr_data" ]]; then
        # Add comma separator (except for first entry)
        if [[ "$first_entry" != true ]]; then
            results_array+=","
        fi
        first_entry=false
        
        # Add repository information to the PR data
        enhanced_data=$(echo "$pr_data" | jq --arg repo "$repo" '. + {repository: $repo}')
        results_array+="$enhanced_data"
        
        echo "  ✓ Successfully fetched PR #$pr_number from $repo"
    else
        failed_prs=$((failed_prs + 1))
        echo "  ✗ Failed to fetch PR #$pr_number from $repo"
    fi
    
done < "$PR_NUMBERS_FILE"

results_array+="]"

# Save results to file
echo "$results_array" | jq '.' > "$OUTPUT_FILE"

# Summary
echo ""
echo "=== SUMMARY ==="
echo "Total PRs processed: $processed_prs"
echo "Successfully fetched: $((processed_prs - failed_prs))"
echo "Failed to fetch: $failed_prs"
echo "Output saved to: $OUTPUT_FILE"

# Display first few results
if [[ $((processed_prs - failed_prs)) -gt 0 ]]; then
    echo ""
    echo "=== SAMPLE OUTPUT ==="
    echo "First PR in results:"
    jq '.[0] | {number, title, repository, author: .author.login, isDraft, reviewDecision}' "$OUTPUT_FILE" 2>/dev/null || echo "Error displaying sample output"
fi

echo ""
echo "Script completed!"
