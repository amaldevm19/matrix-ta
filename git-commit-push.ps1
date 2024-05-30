# PowerShell script for git add, commit, and push

# Function to perform git operations
function Invoke-GitCommitAndPush {
    param (
        [string]$CommitMessage
    )

    # Ensure we are in a git repository
    if (-not (Test-Path .git)) {
        Write-Error "This directory is not a git repository."
        return
    }

    # Add all changes
    git add .

    # Commit with the provided message
    if ($CommitMessage -eq "") {
        Write-Error "Commit message cannot be empty."
        return
    }
    git commit -m $CommitMessage

    # Push the changes
    git push
}

# Main script
# Prompt the user for a commit message
$CommitMessage = Read-Host "Enter the commit message"

# Call the function to add, commit, and push
Invoke-GitCommitAndPush -CommitMessage $CommitMessage
# PowerShell script for git add, commit, and push

# Function to perform git operations
function Invoke-GitCommitAndPush {
    param (
        [string]$CommitMessage
    )

    # Ensure we are in a git repository
    if (-not (Test-Path .git)) {
        Write-Error "This directory is not a git repository."
        return
    }

    # Add all changes
    git add .

    # Commit with the provided message
    if ($CommitMessage -eq "") {
        Write-Error "Commit message cannot be empty."
        return
    }
    git commit -m $CommitMessage

    # Push the changes
    git push
}

# Main script
# Prompt the user for a commit message
$CommitMessage = Read-Host "Enter the commit message"

# Call the function to add, commit, and push
Invoke-GitCommitAndPush -CommitMessage $CommitMessage
