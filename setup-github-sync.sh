#!/bin/bash

# GitHub Private Repository Setup Script
# This script helps you create and configure a GitHub private repository with auto-sync

set -e

echo "🚀 GitHub Private Repository Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is configured
echo "📋 Step 1: Checking Git Configuration"
echo "-----------------------------------"

if ! git config user.name > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Git user.name not configured${NC}"
    read -p "Enter your Git username: " GIT_USERNAME
    git config --global user.name "$GIT_USERNAME"
fi

if ! git config user.email > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Git user.email not configured${NC}"
    read -p "Enter your Git email: " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
fi

echo -e "${GREEN}✅ Git configuration complete${NC}"
echo "  Username: $(git config user.name)"
echo "  Email: $(git config user.email)"
echo ""

# Repository details
echo "📋 Step 2: Repository Details"
echo "------------------------------"
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name [composition-evaluator]: " REPO_NAME
REPO_NAME=${REPO_NAME:-composition-evaluator}

REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
echo ""
echo "Repository URL will be: ${REPO_URL}"
echo ""

# Instructions for creating repository
echo "📋 Step 3: Create GitHub Repository"
echo "-----------------------------------"
echo -e "${YELLOW}Please follow these steps:${NC}"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://github.com/new"
echo ""
echo "2. Fill in the repository details:"
echo "   - Repository name: ${REPO_NAME}"
echo "   - Description: Composition Evaluator - AI-powered evaluation system with role-based authentication"
echo "   - Visibility: 🔒 Private"
echo "   - ✅ Do NOT initialize with README (we already have code)"
echo ""
echo "3. Click 'Create repository'"
echo ""
read -p "Press Enter once you've created the repository..."

# Add remote
echo ""
echo "📋 Step 4: Configure Git Remote"
echo "-------------------------------"

# Check if origin already exists
if git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Remote 'origin' already exists${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_REMOTE
    if [ "$UPDATE_REMOTE" = "y" ]; then
        git remote set-url origin "${REPO_URL}"
        echo -e "${GREEN}✅ Remote updated${NC}"
    else
        echo "Keeping existing remote configuration"
    fi
else
    git remote add origin "${REPO_URL}"
    echo -e "${GREEN}✅ Remote 'origin' added${NC}"
fi

echo ""
echo "Current remote configuration:"
git remote -v
echo ""

# Push to GitHub
echo "📋 Step 5: Push to GitHub"
echo "------------------------"
echo -e "${YELLOW}This will push your code to GitHub${NC}"
read -p "Continue? (y/n): " PUSH_CONFIRM

if [ "$PUSH_CONFIRM" = "y" ]; then
    echo ""
    echo "Pushing main branch to GitHub..."
    if git push -u origin main --force; then
        echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    else
        echo -e "${RED}❌ Failed to push to GitHub${NC}"
        echo ""
        echo "Possible issues:"
        echo "1. Repository doesn't exist on GitHub"
        echo "2. Authentication failed"
        echo "3. Network issues"
        echo ""
        echo "Troubleshooting:"
        echo "1. Verify the repository exists at: ${REPO_URL}"
        echo "2. Check if you're authenticated:"
        echo "   - If using SSH: Ensure SSH keys are set up"
        echo "   - If using HTTPS: You may need a Personal Access Token"
        echo ""
        exit 1
    fi
else
    echo "Skipping push. You can push manually later with:"
    echo "  git push -u origin main"
fi

echo ""
echo "📋 Step 6: Verify Setup"
echo "----------------------"
echo ""
echo "✅ Repository URL: ${REPO_URL}"
echo "✅ GitHub Actions workflows configured:"
echo "   - Auto Sync (.github/workflows/auto-sync.yml)"
echo "   - CI/CD (.github/workflows/ci.yml)"
echo "   - BMAD Integration (.github/workflows/bmad-integration.yml)"
echo ""

# Final instructions
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your repository is now configured with:"
echo ""
echo "✅ GitHub Private Repository"
echo "✅ Auto-sync via GitHub Actions"
echo "✅ CI/CD pipelines for testing"
echo "✅ BMAD integration validation"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Visit your repository: ${REPO_URL}"
echo "2. Check GitHub Actions tab to see workflows running"
echo "3. Configure branch protection rules (recommended)"
echo "4. Add collaborators (Settings → Collaborators)"
echo ""
echo "Auto-sync is now active!"
echo "Every push to your local repository will automatically sync to GitHub."
echo ""
echo "For BMAD usage, see: docs/bmad-quick-start.md"
echo ""
