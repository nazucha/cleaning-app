# Gemini APIキー取得手順

## 概要
Google Gemini APIを使用することで、Google検索の結果をより正確に反映したエアコン情報を取得できます。

## APIキーの取得方法

1. **Google AI Studioにアクセス**
   - https://aistudio.google.com/apikey にアクセス
   - Googleアカウントでログイン

2. **APIキーを作成**
   - 「Create API Key」ボタンをクリック
   - プロジェクトを選択（新規作成も可能）
   - APIキーが生成されます

3. **APIキーをコピー**
   - 生成されたAPIキーをコピー
   - **重要**: このキーは一度しか表示されないため、必ず保存してください

## 環境変数の設定

`.env`ファイルに以下を追加：

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## パッケージのインストール

ターミナルで以下のコマンドを実行：

```bash
cd /Users/malove/Desktop/再チャレンジ/cleaning-app
npm install @google/generative-ai
```

もし権限エラーが発生する場合は、以下を実行：

```bash
sudo chown -R $(whoami) ~/.npm
npm install @google/generative-ai
```

## 動作確認

1. サーバーを再起動
2. ブラウザでアプリを開く
3. 型番を入力して確認
   - メーカー: パナソニック
   - 型番: CS-A-0D2Z
4. 「AIによる概要」が正しく表示されることを確認

## 優先順位

判定の優先順位は以下の通りです：

1. **ローカル判定**（型番ベース）- 最も確実
2. **Gemini API**（Google検索の結果を反映）- より正確
3. **ChatGPT API**（フォールバック）

ローカル判定で確定できる場合は、AI APIを呼ばずに即座に結果を返します。

## 料金

Gemini APIは無料枠がありますが、使用量に応じて課金される場合があります。詳細は以下を確認してください：
- https://ai.google.dev/pricing
