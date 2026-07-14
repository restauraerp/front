#!/bin/bash

# Stop execution if any command fails
set -e

# Run the version bump command using custom Node script for X.YY.ZZ format
echo "Bumping application version..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');
let [x, y, z] = pkg.version.split('.').map(Number);
z++;
if (z > 99) { z = 0; y++; }
if (y > 99) { y = 0; x++; }
pkg.version = \`\${x}.\${y.toString().padStart(2, '0')}.\${z.toString().padStart(2, '0')}\`;
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Sync package-lock.json with the new version
npm install --package-lock-only --ignore-scripts

# Extract the new bumped version from package.json
VERSION=$(node -p "require('./package.json').version")

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from package.json"
    exit 1
fi

# Stash the changes made by version bump
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
