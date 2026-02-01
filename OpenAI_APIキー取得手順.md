# OpenAI APIキー取得手順

## 重要：APIキーはChatGPTの画面ではなく、OpenAI Platformで取得します

OpenAI APIキーは、ChatGPTのウェブサイト（chat.openai.com）ではなく、**OpenAI Platform**（platform.openai.com）で取得する必要があります。

## 手順

### 1. OpenAI Platformにアクセス

1. ブラウザで以下のURLにアクセス：
   **https://platform.openai.com/api-keys**

2. または、以下の手順でアクセス：
   - https://platform.openai.com にアクセス
   - 右上の「Sign in」または「Log in」をクリック
   - アカウントにログイン（ChatGPTと同じアカウントでログインできます）

### 2. APIキーを作成

1. ログイン後、左側のメニューから「API keys」をクリック
   - または、直接 https://platform.openai.com/api-keys にアクセス

2. 「Create new secret key」ボタンをクリック

3. キーに名前を付けます（例：「会社用APIキー」）
   - オプションですが、後で管理しやすくなります

4. 「Create secret key」ボタンをクリック

5. **重要**: 生成されたAPIキーが表示されます
   - このキーは**一度しか表示されません**
   - 必ずコピーして安全な場所に保存してください
   - 形式: `sk-`で始まる長い文字列（例: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 3. APIキーを.envファイルに設定

1. プロジェクトの`cleaning-app`フォルダに`.env`ファイルを作成（まだ作成していない場合）

2. `.env`ファイルを開いて、以下のように設定：
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   （`sk-`の後の部分を、実際に取得したAPIキーに置き換えてください）

3. ファイルを保存

### 4. サーバーを再起動

```bash
cd /Users/malove/Desktop/再チャレンジ/cleaning-app
node server.js
```

## 注意事項

### 課金設定

OpenAI APIは従量課金です。会社で使用する場合は、以下の設定を確認してください：

1. **Billing（請求）設定**:
   - https://platform.openai.com/account/billing にアクセス
   - 「Payment method」で支払い方法を設定
   - 「Usage limits」で使用量の上限を設定できます（推奨）

2. **使用量の監視**:
   - https://platform.openai.com/usage で使用量を確認できます
   - 定期的に確認して、予想外の使用がないかチェックしてください

### セキュリティ

- ✅ APIキーは`.env`ファイルに保存し、Gitにコミットしないでください（`.gitignore`に含まれています）
- ✅ APIキーを他人と共有する場合は、安全な方法を使用してください
- ✅ 定期的にAPIキーをローテーション（更新）することを推奨します
- ❌ APIキーをコードに直接書かないでください
- ❌ APIキーを公開の場所に投稿しないでください

## トラブルシューティング

### 「API keys」メニューが見つからない

- アカウントが正しくログインされているか確認してください
- ブラウザのキャッシュをクリアして、再度ログインしてみてください
- 直接 https://platform.openai.com/api-keys にアクセスしてみてください

### APIキーが表示されない

- 一度作成したAPIキーは再表示できません
- 新しいAPIキーを作成する必要があります
- 既存のAPIキーを削除してから、新しいキーを作成することもできます

### エラー: "Invalid API key"

- APIキーが正しくコピーされているか確認してください（前後の空白がないか）
- `.env`ファイルの`OPENAI_API_KEY=`の後に、`sk-`で始まるキーが正しく設定されているか確認してください
- サーバーを再起動してください

## 参考リンク

- OpenAI Platform: https://platform.openai.com
- API Keys管理: https://platform.openai.com/api-keys
- 使用量確認: https://platform.openai.com/usage
- 請求設定: https://platform.openai.com/account/billing
- ドキュメント: https://platform.openai.com/docs
