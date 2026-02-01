# 完全な型番データ取得について

## 概要

このプロジェクトでは、https://iair-c.com/manual/index/ から各メーカーの完全な型番データ（例：「AJT40SEP」）を取得するスクリプトを用意しています。

## 現在の状況

- ✅ **ダイキン**: 完全な型番データ取得済み（1506件）
- ⏳ **その他のメーカー**: スクリプト準備完了、実行待ち

## 実行方法

### 方法1: 一括実行スクリプト（推奨）

```bash
cd /Users/malove/Desktop/再チャレンジ/cleaning-app
./実行スクリプト.sh
```

このスクリプトは全メーカーを順次実行します（合計で数時間かかります）。

### 方法2: 個別実行

各メーカーごとに個別に実行できます：

```bash
cd /Users/malove/Desktop/再チャレンジ/cleaning-app

# 三菱電機
node scripts/scrapeMitsubishiFullModels.js

# パナソニック
node scripts/scrapePanasonicFullModels.js

# 日立
node scripts/scrapeHitachiFullModels.js

# 東芝
node scripts/scrapeToshibaFullModels.js

# シャープ
node scripts/scrapeSharpFullModels.js

# 三菱重工
node scripts/scrapeMitsubishiHeavyFullModels.js

# 富士通ゼネラル
node scripts/scrapeFujitsuFullModels.js
```

### 方法3: バックグラウンド実行

長時間実行する場合は、バックグラウンドで実行できます：

```bash
# ログディレクトリを作成
mkdir -p logs

# バックグラウンドで実行
nohup node scripts/scrapeMitsubishiFullModels.js > logs/mitsubishi.log 2>&1 &

# ログを確認
tail -f logs/mitsubishi.log
```

## 実行時間の目安

- **三菱電機**: 約30分〜1時間
- **日立**: 約30分〜1時間
- **パナソニック**: 約30分〜1時間
- **東芝**: 約30分〜1時間
- **富士通ゼネラル**: 約10分〜30分
- **シャープ**: 約10分〜30分
- **三菱重工**: 約10分〜30分

**合計**: 約3〜6時間

## 出力ファイル

スクリプト実行後、以下のファイルが作成されます：

```
data/
├── daikinFullModelDetails.json          ✅ 取得済み
├── mitsubishiFullModelDetails.json      ⏳ 実行待ち
├── panasonicFullModelDetails.json       ⏳ 実行待ち
├── hitachiFullModelDetails.json         ⏳ 実行待ち
├── toshibaFullModelDetails.json         ⏳ 実行待ち
├── sharpFullModelDetails.json           ⏳ 実行待ち
├── mitsubishiHeavyFullModelDetails.json ⏳ 実行待ち
└── fujitsuFullModelDetails.json         ⏳ 実行待ち
```

## 実行後の確認

1. **データファイルの確認**
   ```bash
   ls -lh data/*FullModelDetails.json
   ```

2. **アプリの確認**
   - ブラウザでアプリをリロード（Ctrl+Shift+R または Cmd+Shift+R）
   - 各メーカーを選択して、型番フィールドに完全な型番が表示されることを確認
   - 例：ダイキンで「AJT」と入力すると、「AJT40SEP」「AJT56SEP」などが表示される

## トラブルシューティング

### エラーが発生した場合

1. **ネットワークエラー**: インターネット接続を確認してください
2. **404エラー**: 一部の型番ページが存在しない場合があります（無視されます）
3. **タイムアウト**: サーバーの応答が遅い場合、スクリプトは自動的に次の型番に進みます

### 中断した場合

スクリプトを中断（Ctrl+C）しても、既に取得したデータは保存されています。
再度実行すると、既存のデータに追加されます。

## 注意事項

- スクリプトの実行には時間がかかります
- サーバーに負荷をかけないように、各リクエストの間に500msの待機時間を設けています
- 実行中はターミナルを閉じないでください（バックグラウンド実行の場合は除く）
