#!/bin/bash

echo "🔍 Kiểm tra Deployment Status"
echo "============================="
echo ""

# Production URL
PROD_URL="https://mia-schedule-nvbd38er8-khovan12345s-projects.vercel.app"

echo "📱 Production URL: $PROD_URL"
echo ""

# Check HTTP status
echo "🌐 Checking HTTP status..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL)

if [ $HTTP_STATUS -eq 200 ]; then
    echo "✅ Website is LIVE! (HTTP $HTTP_STATUS)"
else
    echo "❌ Website returned HTTP $HTTP_STATUS"
fi

echo ""
echo "📊 Quick Links:"
echo "- Dashboard: https://vercel.com/khovan12345s-projects/mia-schedule"
echo "- Analytics: https://vercel.com/khovan12345s-projects/mia-schedule/analytics"
echo "- Logs: https://vercel.com/khovan12345s-projects/mia-schedule/logs"

# Show recent git commits
echo ""
echo "📝 Recent commits:"
git log --oneline -5
