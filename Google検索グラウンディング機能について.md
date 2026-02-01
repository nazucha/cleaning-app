# Google検索グラウンディング機能について

## 概要

Google検索の「AIによる概要」と同じ機能を実現するために、Gemini APIの「Google検索によるグラウンディング」機能を有効化しました。

## 実装内容

### Google検索グラウンディング機能
- **機能**: Gemini APIが自動的にGoogle検索を実行し、最新の検索結果を参照して回答を生成
- **メリット**: 
  - Google検索のAI概要と同様の正確な情報を取得
  - 最新の情報にアクセス可能
  - 検索結果の引用元情報も取得可能（`groundingMetadata`）

### 実装方法

```javascript
const geminiModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  tools: [{
    googleSearch: {} // Google検索によるグラウンディングを有効化
  }]
});
```

## 料金

**重要**: Google検索グラウンディング機能は有料です。

- **料金**: 1,000件のグラウンディング付きクエリごとに**35ドル**（約5,250円）
- **無料枠**: Google AI Studioでは無料でテスト可能
- **課金開始**: 2026年1月5日から課金開始

### 料金の見積もり

| リクエスト数/月 | コスト（概算） |
|---------------|-------------|
| 100 | 約$3.5（約525円） |
| 1,000 | 約$35（約5,250円） |
| 10,000 | 約$350（約52,500円） |

## 動作フロー

1. **ユーザーが型番を入力**
2. **ローカル判定を試行**（型番パターンから判定）
3. **ローカル判定で確定できない場合**
   - Gemini APIを呼び出し
   - Google検索グラウンディング機能が自動的に検索を実行
   - 検索結果を基に回答を生成
4. **結果を返す**

## 注意事項

- Google検索グラウンディング機能は有料です
- 無料枠はありません（Google AI Studioでのテストを除く）
- ローカル判定で確定できる型番の場合は、APIを呼ばないためコストは発生しません
- 現在の実装では、ローカル判定を優先するため、APIコール数は最小限に抑えられています

## 無効化する場合

Google検索グラウンディング機能を無効化したい場合は、`tools`パラメータを削除してください：

```javascript
const geminiModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash'
  // toolsパラメータを削除
});
```

この場合、Gemini APIは訓練データに基づいて回答を生成します（Google検索は実行されません）。

## 参考リンク

- [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/grounding)
- [Gemini API と Google AI Studio が Google 検索によるグラウンディングに対応](https://developers.googleblog.com/ja/gemini-api-and-ai-studio-now-offer-grounding-with-google-search/)
