#!/bin/bash

# リアルタイム進捗監視スクリプト

cd "$(dirname "$0")"

echo "=========================================="
echo "リアルタイム進捗監視"
echo "=========================================="
echo ""

# 最新のログファイルを特定
LATEST_LOG=$(ls -t logs/all_manufacturers_*.log 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo "❌ ログファイルが見つかりません"
    echo "スクリプトが実行中か確認してください"
    exit 1
fi

echo "📋 監視対象: $LATEST_LOG"
echo ""
echo "リアルタイムで進捗が表示されます..."
echo "停止するには Ctrl+C を押してください"
echo ""
echo "=========================================="
echo ""

# リアルタイムでログを表示
tail -f "$LATEST_LOG"
