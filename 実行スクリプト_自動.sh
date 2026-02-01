#!/bin/bash

# 全メーカーの完全な型番データを取得するスクリプト（自動実行版）
# 対話的な確認なしで実行します

cd "$(dirname "$0")"

echo "=========================================="
echo "全メーカーの完全な型番データ取得スクリプト"
echo "=========================================="
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
    echo "開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""
    
    log_file="logs/${script%.js}.log"
    node "scripts/${script}" 2>&1 | tee "$log_file"
    
    exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "【${name}】の処理が完了しました。"
        echo "完了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    else
        echo ""
        echo "【${name}】の処理でエラーが発生しました（終了コード: $exit_code）。"
        echo "ログを確認してください: ${log_file}"
    fi
    
    echo ""
    echo "次のメーカーに進む前に5秒待機します..."
    sleep 5
done

echo ""
echo "=========================================="
echo "すべての処理が完了しました！"
echo "完了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""
echo "取得したデータファイル:"
ls -lh data/*FullModelDetails.json 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "ブラウザでアプリをリロードして、完全な型番が表示されることを確認してください。"
