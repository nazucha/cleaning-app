# Vertex AI（有料プラン）の設定手順

## 概要

現在の実装では、Vertex AI経由のGemini API（有料プラン）とDeveloper API（無料/有料）の両方に対応しています。

## 環境変数の設定

### 方法1: Vertex AIを使用する場合（推奨）

`.env`ファイルに以下を追加：

```env
# Vertex AIを使用する場合
USE_VERTEX_AI=true
GOOGLE_CLOUD_PROJECT=your-project-id

# 認証情報（以下のいずれか）
# 方法A: サービスアカウントキーを使用
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# 方法B: gcloud CLIで認証（推奨）
# gcloud auth application-default login を実行
```

### 方法2: Developer APIを使用する場合

```env
# Developer APIを使用する場合
USE_VERTEX_AI=false
GEMINI_API_KEY=your-gemini-api-key
```

## Vertex AIの認証設定

### 1. Google Cloudプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. プロジェクトIDをメモ

### 2. Vertex AI APIの有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を開く
2. 「Vertex AI API」を検索して有効化

### 3. 認証の設定

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

## パッケージのインストール

Vertex AIを使用する場合は、`@google/genai`パッケージが必要です：

```bash
npm install @google/genai
```

## 動作確認

1. サーバーを起動:
   ```bash
   cd /Users/malove/Desktop/再チャレンジ/cleaning-app
   node server.js
   ```

2. ログを確認:
   - `[サーバー] Gemini API呼び出し: ... (Vertex AI)` と表示されれば成功

## グラウンディング機能

- Google検索によるグラウンディング機能が自動的に有効化されます
- ローカルデータベース（`cleaningFunctionData.json`）と照合して、より正確な判定を行います
- 判定結果は自動的にローカルデータベースに保存されます

## 料金

Vertex AIの料金体系は、Google Cloudの料金に従います。詳細は以下を参照：
- https://cloud.google.com/vertex-ai/pricing

Google検索グラウンディング機能の料金：
- 1,000件のグラウンディング付きクエリごとに35ドル（約5,250円）
