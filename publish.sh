#!/bin/bash

# Stop execution if any command fails
set -e

# Extract the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Get the release message from the first script argument, or use a default
RELEASE_MESSAGE=${1:-"Release v$VERSION"}

# Finishing the release
git flow release finish -m "$RELEASE_MESSAGE" "v$VERSION"
echo "Release have been finished."

git push
echo "Remote `develop` branch updated"

git checkout master
git push
echo "Remote `master` branch updated"

git checkout develop

git push origin "v$VERSION"