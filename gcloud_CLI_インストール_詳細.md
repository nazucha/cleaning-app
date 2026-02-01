# gcloud CLI インストール詳細手順

## 現在の状況

- `brew`コマンドが見つからない（Homebrewがインストールされていない）
- `gcloud`コマンドが見つからない

## インストール方法

### 方法1: Homebrewを使用（推奨）

#### ステップ1: Homebrewをインストール

ターミナルで以下を実行：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**インストール中**:
- パスワードの入力が求められる場合があります（Macのログインパスワード）
- インストールには数分かかります

#### ステップ2: PATHを設定

インストール後、表示される指示に従ってPATHを設定：

```bash
# 通常は以下のコマンドを実行（表示される指示に従う）
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

#### ステップ3: gcloud CLIをインストール

```bash
brew install --cask google-cloud-sdk
```

### 方法2: 公式インストーラーを使用（Homebrewを使わない場合）

1. **公式サイトにアクセス**:
   - https://cloud.google.com/sdk/docs/install

2. **macOS用インストーラーをダウンロード**:
   - 「macOS」タブを選択
   - 「64-bit (x86_64)」または「Apple Silicon (arm64)」を選択（Macの種類に応じて）

3. **インストーラーを実行**:
   - ダウンロードした`.pkg`ファイルをダブルクリック
   - インストールウィザードに従ってインストール

4. **PATHを設定**:
   ターミナルで以下を実行：

   ```bash
   echo 'export PATH="$PATH:/usr/local/bin"' >> ~/.zshrc
   source ~/.zshrc
   ```

## インストール確認

インストール後、以下で確認：

```bash
gcloud --version
```

バージョン情報が表示されれば成功です。

## 認証の実行

インストールが完了したら、以下を実行：

```bash
# 認証（ブラウザが開きます）
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project ambient-sylph-485519-b4
```

## トラブルシューティング

### "command not found: brew" エラー

- Homebrewがインストールされていない、またはPATHが設定されていない
- 上記の「方法1」のステップ1と2を実行

### "command not found: gcloud" エラー

- gcloud CLIがインストールされていない、またはPATHが設定されていない
- 上記のインストール手順を実行
