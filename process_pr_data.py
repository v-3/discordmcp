#!/usr/bin/env python3
import json
import sys
from datetime import datetime

def determine_status(pr):
    """Determine the status of a PR based on its metadata"""
    if pr.get('isDraft', False):
        return "Draft"
    
    mergeable = pr.get('mergeable', 'UNKNOWN')
    if mergeable == 'CONFLICTING':
        return "Conflicting"
    elif mergeable == 'UNKNOWN':
        return "Unknown"
    
    # Check status checks
    status_checks = pr.get('statusCheckRollup', [])
    if status_checks:
        failed_checks = [check for check in status_checks if check.get('conclusion') == 'FAILURE']
        if failed_checks:
            return "CI Failed"
        
        success_checks = [check for check in status_checks if check.get('conclusion') == 'SUCCESS']
        if success_checks:
            return "CI Passed"
    
    # Check review decision
    review_decision = pr.get('reviewDecision', '')
    if review_decision == 'APPROVED':
        return "Approved"
    elif review_decision == 'CHANGES_REQUESTED':
        return "Changes Requested"
    elif review_decision == 'REVIEW_REQUIRED':
        return "Review Required"
    
    if mergeable == 'MERGEABLE':
        return "Ready"
    
    return "Pending"

def get_blocking_issues(pr):
    """Identify blocking issues for a PR"""
    issues = []
    
    if pr.get('isDraft', False):
        issues.append("Draft status")
    
    mergeable = pr.get('mergeable', 'UNKNOWN')
    if mergeable == 'CONFLICTING':
        issues.append("Merge conflicts")
    elif mergeable == 'UNKNOWN':
        issues.append("Mergeable status unknown")
    
    # Check failed status checks
    status_checks = pr.get('statusCheckRollup', [])
    failed_checks = [check for check in status_checks if check.get('conclusion') == 'FAILURE']
    if failed_checks:
        issues.append(f"CI failures ({len(failed_checks)} checks)")
    
    # Check review decision
    review_decision = pr.get('reviewDecision', '')
    if review_decision == 'CHANGES_REQUESTED':
        issues.append("Changes requested")
    elif review_decision == 'REVIEW_REQUIRED':
        issues.append("Review required")
    elif not review_decision and not pr.get('isDraft', False):
        issues.append("No review")
    
    return issues

def get_recommendation(pr, status, blocking_issues):
    """Get recommendation for a PR"""
    if pr.get('isDraft', False):
        return "Mark as ready when complete"
    
    if "Merge conflicts" in blocking_issues:
        return "Resolve conflicts with main"
    
    if "CI failures" in str(blocking_issues):
        return "Fix failing tests"
    
    if "Changes requested" in blocking_issues:
        return "Address review feedback"
    
    if "Review required" in blocking_issues or "No review" in blocking_issues:
        return "Request review from maintainer"
    
    if status == "Ready":
        return "✅ Ready to merge"
    
    return "Monitor status"

def process_pr_data(json_file):
    """Process PR data and generate report"""
    with open(json_file, 'r') as f:
        prs = json.load(f)
    
    # Group PRs by repository
    repos = {}
    for pr in prs:
        repo = pr.get('repository', 'unknown')
        if repo not in repos:
            repos[repo] = []
        repos[repo].append(pr)
    
    # Generate report
    report = []
    report.append("# PR Readiness Report")
    report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\n**Total PRs:** {len(prs)} across {len(repos)} repositories")
    
    # Statistics
    total_ready = 0
    total_blocked = 0
    total_draft = 0
    
    for repo, repo_prs in sorted(repos.items()):
        report.append(f"\n## {repo}")
        report.append(f"\n**PRs:** {len(repo_prs)}")
        
        # Table header
        report.append("\n| PR | Title | Status | Blocking Issues | Recommendation |")
        report.append("|---|---|---|---|---|")
        
        # Sort PRs by number (descending)
        sorted_prs = sorted(repo_prs, key=lambda x: x.get('number', 0), reverse=True)
        
        for pr in sorted_prs:
            pr_num = pr.get('number', 'N/A')
            title = pr.get('title', 'No title')[:50] + ('...' if len(pr.get('title', '')) > 50 else '')
            status = determine_status(pr)
            blocking_issues = get_blocking_issues(pr)
            recommendation = get_recommendation(pr, status, blocking_issues)
            
            # Update statistics
            if status == "Ready":
                total_ready += 1
            elif pr.get('isDraft', False):
                total_draft += 1
            elif blocking_issues:
                total_blocked += 1
            
            blocking_str = "; ".join(blocking_issues) if blocking_issues else "None"
            
            report.append(f"| #{pr_num} | {title} | {status} | {blocking_str} | {recommendation} |")
        
        # Action items for this repo
        action_items = []
        for pr in sorted_prs:
            status = determine_status(pr)
            blocking_issues = get_blocking_issues(pr)
            recommendation = get_recommendation(pr, status, blocking_issues)
            
            if "Request review" in recommendation:
                action_items.append(f"PR #{pr.get('number')}: Request review from maintainer")
            elif "Resolve conflicts" in recommendation:
                action_items.append(f"PR #{pr.get('number')}: Resolve merge conflicts")
            elif "Fix failing tests" in recommendation:
                action_items.append(f"PR #{pr.get('number')}: Fix CI failures")
            elif "Address review feedback" in recommendation:
                action_items.append(f"PR #{pr.get('number')}: Address requested changes")
        
        if action_items:
            report.append(f"\n**Action Items:**")
            for item in action_items:
                report.append(f"- {item}")
    
    # Summary
    report.append(f"\n## Summary")
    report.append(f"\n- **Ready to merge:** {total_ready} PRs")
    report.append(f"- **Blocked:** {total_blocked} PRs")
    report.append(f"- **Draft:** {total_draft} PRs")
    report.append(f"- **Total:** {len(prs)} PRs")
    
    return "\n".join(report)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_pr_data.py <json_file>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    try:
        report = process_pr_data(json_file)
        print(report)
    except Exception as e:
        print(f"Error processing PR data: {e}")
        sys.exit(1)
