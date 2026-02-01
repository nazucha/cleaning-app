# gcloud CLI インストール手順

## ステップ3-1: gcloud CLIのインストール

gcloud CLIがインストールされていないため、まずインストールが必要です。

### 方法1: Homebrewを使用（推奨・macOS）

ターミナルで以下を実行：

```bash
brew install --cask google-cloud-sdk
```

**Homebrewがインストールされていない場合**:
```bash
# Homebrewをインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 方法2: 公式インストーラーを使用

1. 以下のURLにアクセス：
   - https://cloud.google.com/sdk/docs/install

2. 「macOS」を選択
3. インストーラーをダウンロード
4. ダウンロードしたファイルを実行してインストール

### インストール確認

インストール後、ターミナルで以下を実行：

```bash
gcloud --version
```

バージョン情報が表示されれば成功です。

## ステップ3-2: 認証の実行

インストールが完了したら、以下を実行：

```bash
# 認証（ブラウザが開きます）
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project ambient-sylph-485519-b4
```

**注意**: `gcloud auth application-default login`を実行すると、ブラウザが開いてGoogleアカウントでログインを求められます。ログイン後、認証が完了します。

## 次のステップ

認証が完了したら、ステップ4（環境変数の設定）に進みます。
