# Googleカレンダー連携機能について

## 実装内容

「ご希望日・曜日・時間」のフィールドで、Googleカレンダーの空き情報と照らし合わせて、以下のように動作します：

- **空きがある場合**: 「確定」と表示（緑色のバッジ）
- **空きがない場合**: 「スタッフが随時対応」と表示（赤色のバッジ）

## 実装の詳細

### 1. バックエンドAPI (`server.js`)

`/api/check-availability` エンドポイントを追加しました。

**リクエスト:**
```json
{
  "date": "2024-01-15",
  "time": "14:00",
  "calendarId": "primary" // オプション
}
```

**レスポンス:**
```json
{
  "success": true,
  "available": true,
  "message": "確定" // または "スタッフが随時対応"
}
```

### 2. フロントエンド (`App.tsx`)

- 日時を選択すると、自動的にカレンダーの空きをチェック
- 空き状況が各希望日の下に表示される

### 3. カレンダーサービス (`services/calendarService.ts`)

カレンダー空きチェック用のサービス関数を追加しました。

## セットアップ手順

### 1. Google Calendar APIの有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「ライブラリ」を開く
4. 「Google Calendar API」を検索して有効化

### 2. ComposioでGoogle Calendarを接続

1. [Composio Dashboard](https://app.composio.dev/) にログイン
2. 「Apps」から「Google Calendar」を検索
3. 「Connect」をクリックして認証
4. カレンダーへのアクセス権限を付与

### 3. カレンダーIDの確認

使用するカレンダーのIDを確認します：
- 通常は `primary` でメインカレンダーを指定
- 特定のカレンダーを使用する場合は、カレンダー設定からIDを取得

### 4. バックエンドサーバーの起動

```bash
cd cleaning-app
npm run server
```

## 動作確認

1. フォームで日時を選択
2. 数秒後に空き状況が表示される
3. 「確定」または「スタッフが随時対応」が表示される

## 注意事項

### Google Calendar APIが利用できない場合

Google Calendar APIが利用できない場合（未接続、エラーなど）、デフォルトで「スタッフが随時対応」を返します。これは、サービスを継続して提供するためです。

### パフォーマンス

- カレンダー空きチェックは非同期で実行されます
- 複数の希望日を同時にチェックする場合、少し時間がかかる場合があります
- エラーが発生した場合でも、フォームの送信は可能です

## カスタマイズ

### カレンダーIDの変更

`server.js` の `/api/check-availability` エンドポイントで、デフォルトのカレンダーIDを変更できます：

```javascript
calendarId: calendarId || "your-calendar-id"
```

### チェック時間の範囲

現在は選択した時間から2時間後までをチェックしています。`server.js` で変更可能：

```javascript
const endDateTime = new Date(dateTime.getTime() + 2 * 60 * 60 * 1000); // 2時間
```

### 表示メッセージの変更

`server.js` のレスポンスメッセージを変更できます：

```javascript
message: isAvailable ? '確定' : 'スタッフが随時対応'
```

## トラブルシューティング

### カレンダーAPIエラー

- ComposioでGoogle Calendarが正しく接続されているか確認
- Google Cloud ConsoleでAPIが有効化されているか確認
- カレンダーIDが正しいか確認

### 空き状況が表示されない

- ブラウザのコンソールでエラーを確認
- バックエンドサーバーが起動しているか確認
- ネットワーク接続を確認

### 常に「スタッフが随時対応」と表示される

- カレンダーに予定が入っている可能性
- カレンダーIDが間違っている可能性
- APIの権限設定を確認
