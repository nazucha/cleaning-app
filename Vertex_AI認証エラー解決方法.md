# Vertex AI認証エラー解決方法

## エラー内容

```
Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.
```

このエラーは、gcloud CLIの認証が完了していないか、正しく設定されていないことを示しています。

## 解決方法

### 方法1: gcloud CLIで認証を実行（推奨）

ターミナルで以下を実行：

```bash
# 認証（ブラウザが開きます）
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project ambient-sylph-485519-b4

# 認証状態を確認
gcloud auth application-default print-access-token
```

**注意**: `gcloud auth application-default login`を実行すると、ブラウザが開いてGoogleアカウントでログインを求められます。ログイン後、認証が完了します。

### 方法2: Developer APIに一時的に切り替える

Vertex AIの認証が完了するまでの間、Developer APIを使用することもできます。

`.env`ファイルを編集：

```env
# Vertex AIを無効化（一時的）
USE_VERTEX_AI=false
GEMINI_API_KEY=AIzaSyB2QaG-_8r_euOsf0EQXzD0WjrlnfQwULU

# Vertex AIの設定はコメントアウト
# USE_VERTEX_AI=true
# GOOGLE_CLOUD_PROJECT=ambient-sylph-485519-b4
```

**注意**: Developer APIはグラウンディング無料枠がないため、コストが高くなります。Vertex AIの認証が完了したら、再度切り替えることをお勧めします。

## 認証確認

認証が完了したら、以下で確認：

```bash
gcloud auth application-default print-access-token
```

アクセストークンが表示されれば成功です。

## サーバー再起動

認証が完了したら、サーバーを再起動：

```bash
cd /Users/malove/Desktop/再チャレンジ/cleaning-app
node server.js
```

## トラブルシューティング

### "command not found: gcloud" エラー

gcloud CLIがインストールされていません。インストール手順を参照：
- `gcloud_CLI_インストール_詳細.md`

### 認証後もエラーが続く場合

1. 認証情報をクリアして再認証：
   ```bash
   gcloud auth application-default revoke
   gcloud auth application-default login
   ```

2. プロジェクトIDを確認：
   ```bash
   gcloud config get-value project
   ```
   正しく設定されていない場合：
   ```bash
   gcloud config set project ambient-sylph-485519-b4
   ```
