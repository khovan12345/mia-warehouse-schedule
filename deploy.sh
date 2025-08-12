#!/bin/bash

# Script deploy nhanh cho MIA Warehouse Schedule

echo "🚀 MIA Warehouse Schedule - Deploy Script"
echo "========================================="

# Kiểm tra git status
echo "📋 Checking git status..."
git status

echo ""
echo "📝 Enter commit message:"
read COMMIT_MSG

# Add all changes
echo "➕ Adding changes..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push

echo ""
echo "✅ Done! Vercel will auto-deploy in ~1-2 minutes"
echo "📊 Check status at: https://vercel.com/dashboard"
