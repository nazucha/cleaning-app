# エアコン型番データベース

## 概要

このデータベースは、https://iair-c.com/manual/index/ に掲載されている全メーカーの全型番を網羅した検索システムです。

## データ構造

`airconModels.json` には以下の情報が含まれています：

- **メーカー別の型番総数**
- **カテゴリー別の型番数**（アルファベットで始まる型番の分類）
- **共通プレフィックス**（型番の先頭部分）
- **型番パターン**（実際の型番例）

## 対応メーカー

1. **三菱電機** (738型番)
   - L: 3型番
   - M: 617型番
   - P: 112型番
   - V: 5型番

2. **三菱重工** (200型番)
   - S: 199型番

3. **ダイキン** (927型番)
   - A: 336型番
   - C: 17型番
   - F: 193型番
   - P: 3型番
   - R: 75型番
   - S: 299型番
   - U: 3型番

4. **パナソニック** (598型番)
   - C: 597型番

5. **日立** (1,003型番)
   - R: 1,002型番

6. **東芝** (493型番)
   - A: 51型番
   - H: 2型番
   - M: 22型番
   - R: 415型番
   - V: 2型番

7. **シャープ** (163型番)
   - A: 160型番
   - J: 2型番

8. **富士通** (197型番)
   - A: 196型番

**合計: 4,323型番**

## 使用方法

### 検索サービスのインポート

```typescript
import {
  searchModels,
  getPrefixSuggestions,
  getSuffixSuggestions,
  getManufacturers,
  getModelCount,
} from '../services/modelSearchService';
```

### 型番検索

```typescript
// 基本的な検索
const results = searchModels('MSZ-KXV');

// メーカーを指定して検索
const results = searchModels('MSZ', { manufacturer: '三菱電機' });

// 検索結果数を制限
const results = searchModels('MSZ', { limit: 10 });
```

### プレフィックス候補の取得

```typescript
// プレフィックス候補を取得
const prefixes = getPrefixSuggestions('MSZ', '三菱電機');
```

### サフィックス候補の取得

```typescript
// サフィックス候補を取得
const suffixes = getSuffixSuggestions('S', '三菱電機', 'MSZ-KXV');
```

### メーカー一覧の取得

```typescript
// 全メーカーを取得
const manufacturers = getManufacturers();
```

### 型番総数の取得

```typescript
// 特定メーカーの型番総数を取得
const count = getModelCount('三菱電機');
```

## データの拡張

iair-c.comから追加の型番データを取得した場合は、`airconModels.json`の`modelPatterns`配列に追加してください。

## 注意事項

- 現在のデータベースは基本的な型番パターンのみを含んでいます
- より詳細な型番データが必要な場合は、iair-c.comからスクレイピングして追加する必要があります
- 型番の総数は、iair-c.comの統計情報に基づいています
