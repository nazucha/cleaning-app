# APIキー導入チェックリスト

## ✅ ステップ1: APIキーの取得

- [ ] OpenAI Platformにアクセス: https://platform.openai.com/api-keys
- [ ] ログイン完了
- [ ] 「Create new secret key」をクリック
- [ ] キーに名前を付けた（例：「会社用APIキー」）
- [ ] APIキーをコピーした（`sk-`で始まる長い文字列）

## ✅ ステップ2: .envファイルの作成

- [ ] `.env`ファイルを作成した
- [ ] `OPENAI_API_KEY=sk-...`を設定した
- [ ] ファイルを保存した

## ✅ ステップ3: サーバーの再起動

- [ ] 現在のサーバーを停止した（Ctrl + C）
- [ ] サーバーを再起動した: `node server.js`
- [ ] サーバーが正常に起動したことを確認

## ✅ ステップ4: 動作確認

- [ ] ブラウザをリロードした
- [ ] メーカーを選択した
- [ ] 型番を入力した
- [ ] 「AIによる概要」が表示された
- [ ] エラーメッセージが表示されていない

## ✅ ステップ5: 課金設定（推奨）

- [ ] 支払い方法を設定した: https://platform.openai.com/account/billing
- [ ] 使用量の上限を設定した: https://platform.openai.com/account/billing/limits
  - 推奨: $33（約5,000円）

## トラブルシューティング

### エラー: "OPENAI_API_KEY環境変数が設定されていません"
- `.env`ファイルが正しい場所にあるか確認
- `.env`ファイルに`OPENAI_API_KEY=sk-...`が正しく記入されているか確認
- サーバーを再起動

### エラー: "OpenAI API error: 401"
- APIキーが正しいか確認
- APIキーに課金設定がされているか確認

### エラー: "OpenAI API error: 429"
- APIの使用制限に達している可能性
- 使用量を確認: https://platform.openai.com/usage
