# /pr-it

Create new branch if currently on main, commit all changes and push, then create a PR.

## Usage

```
/pr-it
```

## What it does

1. **Branch Check**: If currently on main branch, create a new feature branch with format `ejfn/feature-branch-name`
2. **Commit Changes**: Add all changes and create a commit with a descriptive message
3. **Push to Remote**: Push the branch to origin with upstream tracking
4. **Create PR**: Use GitHub CLI to create a pull request with appropriate title and description

## Example Flow

```bash
# If on main, create new branch
git checkout -b ejfn/fix-trump-following

# Stage and commit all changes
git add .
git commit -m "fix: resolve trump tractor following issue with proper pair usage"

# Push with upstream tracking
git push origin ejfn/fix-trump-following -u

# Create PR
gh pr create --title "Fix: Trump Tractor Following" --body "Description..."
```

## Notes

- Follows the project's git workflow requirements (no direct commits to main)
- Uses descriptive branch naming convention: `ejfn/feature-description`
- Ensures all changes are committed before creating PR
- Automatically sets up upstream tracking for the branch