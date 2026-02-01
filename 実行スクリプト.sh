#!/bin/bash

# 全メーカーの完全な型番データを取得するスクリプト
# 実行には時間がかかります（各メーカーで30分〜1時間程度）

cd "$(dirname "$0")"

echo "=========================================="
echo "全メーカーの完全な型番データ取得スクリプト"
echo "=========================================="
echo ""
echo "このスクリプトは各メーカーの完全な型番データを取得します。"
echo "実行には時間がかかります（合計で数時間）。"
echo ""
read -p "実行を開始しますか？ (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "実行をキャンセルしました。"
    exit 1
fi

echo ""
echo "実行を開始します..."
echo ""

# ログディレクトリを作成
mkdir -p logs

# 各メーカーのスクリプトを実行
manufacturers=(
    "三菱電機:scrapeMitsubishiFullModels.js"
    "パナソニック:scrapePanasonicFullModels.js"
    "日立:scrapeHitachiFullModels.js"
    "東芝:scrapeToshibaFullModels.js"
    "シャープ:scrapeSharpFullModels.js"
    "三菱重工:scrapeMitsubishiHeavyFullModels.js"
    "富士通ゼネラル:scrapeFujitsuFullModels.js"
)

for manufacturer_info in "${manufacturers[@]}"; do
    IFS=':' read -r name script <<< "$manufacturer_info"
    echo ""
    echo "=========================================="
    echo "【${name}】の処理を開始します..."
    echo "=========================================="
    echo ""
    
    log_file="logs/${script%.js}.log"
    node "scripts/${script}" 2>&1 | tee "$log_file"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo ""
        echo "【${name}】の処理が完了しました。"
    else
        echo ""
        echo "【${name}】の処理でエラーが発生しました。ログを確認してください: ${log_file}"
    fi
    
    echo ""
    echo "次のメーカーに進む前に5秒待機します..."
    sleep 5
done

echo ""
echo "=========================================="
echo "すべての処理が完了しました！"
echo "=========================================="
echo ""
echo "取得したデータファイル:"
ls -lh data/*FullModelDetails.json 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "ブラウザでアプリをリロードして、完全な型番が表示されることを確認してください。"
