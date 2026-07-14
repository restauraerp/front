#!/bin/bash

# Stop execution if any command fails
set -e

# Default to patch if no argument is provided
BUMP_TYPE=${1:-patch}

# Run the version bump command using npm
echo "Bumping application version ($BUMP_TYPE)..."
npm version $BUMP_TYPE --no-git-tag-version

# Extract the new bumped version from package.json
VERSION=$(node -p "require('./package.json').version")

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from package.json"
    exit 1
fi

# Stash the changes made by npm version
echo "Stashing unstaged changes..."
git stash

# Start the git flow release
echo "Starting git flow release for version: $VERSION"
git flow release start "v$VERSION"

# Pop the stashed changes back into the release branch
echo "Applying stashed changes..."
git stash pop 0

# Commit the version bump
echo "Committing the version bump..."
git add package.json package-lock.json
git commit -m "chore(release): version bumped to $VERSION"

# Publishing the release
echo "Publishing the release..."
git flow release publish

echo "Done!"
