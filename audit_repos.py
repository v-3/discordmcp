#!/usr/bin/env python3
"""
GitHub Repository Audit Script
Checks pull requests across multiple c1nderscript repositories
"""

import re

def load_repos_from_file(filename="repos.txt"):
    """Load repository slugs from repos.txt file"""
    repos = []
    try:
        with open(filename, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.endswith('|'):
                    # Extract repo slug from numbered format
                    if '|' in line:
                        repo_slug = line.split('|')[1]
                        repos.append(repo_slug)
                    else:
                        # Handle plain format
                        repos.append(line)
    except FileNotFoundError:
        print(f"Error: {filename} not found")
        return []
    
    return repos

def main():
    # Load repositories from repos.txt
    repos = load_repos_from_file()
    
    print(f"Loaded {len(repos)} repositories for audit:")
    for i, repo in enumerate(repos, 1):
        print(f"{i}. {repo}")
    
    print("\nRepository list loaded successfully!")
    print("Use MCP GitHub tools to check pull requests for each repository.")

if __name__ == "__main__":
    main()
