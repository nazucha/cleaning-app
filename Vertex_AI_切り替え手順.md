# Vertex AIへの切り替え手順

## 完了した作業

✅ **コードの更新**
- `server.js`: Vertex AI対応済み（Gemini 2.5 Proを使用）
- `scripts/verifyDataConsistency.js`: Vertex AI対応済み
- モデルを`gemini-2.5-pro`に設定（グラウンディング無料枠: 1日10,000件まで）

✅ **パッケージのインストール**
- `@google/genai`パッケージをインストール

## 次に必要な作業

### ステップ1: Google Cloudプロジェクトの設定

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/

2. **プロジェクトを作成（または既存プロジェクトを使用）**
   - プロジェクト名: 任意（例: `aircon-cleaning-app`）
   - プロジェクトIDをメモ（例: `aircon-cleaning-app-123456`）

3. **Vertex AI APIを有効化**
   - 「APIとサービス」→「ライブラリ」を開く
   - 「Vertex AI API」を検索して有効化

### ステップ2: 認証の設定

#### 方法A: gcloud CLIを使用（推奨）

```bash
# gcloud CLIをインストール（未インストールの場合）
# https://cloud.google.com/sdk/docs/install

# 認証
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project YOUR-PROJECT-ID
```

#### 方法B: サービスアカウントキーを使用

1. Google Cloud Consoleで「IAMと管理」→「サービスアカウント」を開く
2. サービスアカウントを作成
3. 「Vertex AI User」ロールを付与
4. キーを作成してJSONファイルをダウンロード
5. `.env`に`GOOGLE_APPLICATION_CREDENTIALS`を設定

### ステップ3: 環境変数の設定

`.env`ファイルを編集：

```env
# Vertex AIを使用
USE_VERTEX_AI=true
GOOGLE_CLOUD_PROJECT=your-project-id

# 認証方法A（gcloud CLI）を使用する場合、以下は不要
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Developer APIの設定は削除またはコメントアウト
# GEMINI_API_KEY=...
```

**重要**: `GOOGLE_CLOUD_PROJECT`には、Google Cloud Consoleで確認したプロジェクトIDを設定してください。

### ステップ4: 動作確認

1. **サーバーを起動**
   ```bash
   cd /Users/malove/Desktop/再チャレンジ/cleaning-app
   node server.js
   ```

2. **ログを確認**
   - `[サーバー] Gemini API呼び出し: ... (Vertex AI)` と表示されれば成功
   - エラーが表示される場合は、認証設定を確認

3. **テスト実行**
   - アプリで型番を入力して、AIによる概要が表示されるか確認

## トラブルシューティング

### エラー: "Project not found"
- `GOOGLE_CLOUD_PROJECT`に正しいプロジェクトIDが設定されているか確認
- Google Cloud Consoleでプロジェクトが存在するか確認

### エラー: "Permission denied"
- Vertex AI APIが有効化されているか確認
- 認証が正しく設定されているか確認（`gcloud auth application-default login`）

### エラー: "Module not found: @google/genai"
- `npm install @google/genai`を実行

## 切り替え後の確認事項

- ✅ Vertex AIが使用されているか（ログで確認）
- ✅ グラウンディング機能が動作しているか
- ✅ コストが削減されているか（Google Cloud Consoleの請求を確認）

## 参考リンク

- [Vertex AI 設定手順](./Vertex_AI_設定手順.md)
- [Vertex AI 料金見積もり](./Vertex_AI_料金見積もり.md)
- [Developer API vs Vertex AI 比較](./Developer_API_vs_Vertex_AI_比較.md)
