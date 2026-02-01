# Developer API エラー修正

## 問題

Developer APIで以下のエラーが発生していました：

```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.
```

## 原因

1. **Google検索グラウンディング機能**: Developer APIでは`googleSearch`ツールが利用できません（Vertex AIでのみ利用可能）
2. **APIバージョン**: `@google/generative-ai`パッケージが`v1beta`を使用しようとしているが、`gemini-1.5-flash`が`v1beta`で利用できない可能性

## 修正内容

1. **`googleSearch`ツールを削除**: Developer APIでは利用できないため、ツール指定を削除しました
2. **プロンプトを調整**: グラウンディングなしでも動作するように、プロンプトを調整しました
3. **フォールバック追加**: `gemini-1.5-flash`が利用できない場合、`gemini-pro`にフォールバックするようにしました

## 変更箇所

### server.js

- **行319-325**: `googleSearch`ツールを削除
- **行327-353**: プロンプトを調整（グラウンディングなしでも動作）
- **行519**: `source`を`gemini-grounding`から`gemini-api`に変更

## 注意事項

- **Developer API**: Google検索グラウンディング機能は利用できません。モデルの知識ベースのみを使用します
- **Vertex AI**: Google検索グラウンディング機能を利用するには、Vertex AIの認証が必要です
- **精度**: グラウンディングなしの場合、モデルの知識ベースに依存するため、最新情報の精度が低下する可能性があります

## 次のステップ

1. サーバーを再起動してください
2. 型番を入力して、AIによる概要が表示されるか確認してください
3. 精度が不十分な場合は、Vertex AIの認証を完了してグラウンディング機能を利用してください
