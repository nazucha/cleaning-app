/**
 * エアコン型番検索サービス
 * https://iair-c.com/manual/index/ の全メーカーの全型番を網羅した検索機能を提供
 */

// JSONファイルのインポート（型安全性のため）
const airconModelsData = require('../data/airconModels.json');

export interface ModelSearchResult {
  model: string;
  manufacturer: string;
  prefix?: string;
  suffix?: string;
  category?: string;
}

export interface ModelSearchOptions {
  manufacturer?: string;
  prefix?: string;
  suffix?: string;
  limit?: number;
}

/**
 * 型番の検索を行う
 * @param query 検索クエリ（型番の一部）
 * @param options 検索オプション
 * @returns 検索結果の配列
 */
export function searchModels(
  query: string,
  options: ModelSearchOptions = {}
): ModelSearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const queryUpper = query.toUpperCase().trim();
  const results: ModelSearchResult[] = [];
  const seen = new Set<string>();
  const limit = options.limit || 50;

  // 全メーカーを検索
  for (const [manufacturer, data] of Object.entries(airconModelsData.manufacturers)) {
    // メーカーフィルターが指定されている場合はスキップ
    if (options.manufacturer && options.manufacturer !== manufacturer) {
      continue;
    }

    // 型番パターンを検索
    if (data.modelPatterns) {
      for (const pattern of data.modelPatterns) {
        const patternUpper = pattern.toUpperCase();
        
        // 完全一致または前方一致
        if (patternUpper === queryUpper || patternUpper.startsWith(queryUpper)) {
          const key = `${manufacturer}-${pattern}`;
          if (!seen.has(key)) {
            results.push({
              model: pattern,
              manufacturer: manufacturer,
            });
            seen.add(key);
            if (results.length >= limit) break;
          }
        }
      }
    }

    // 共通プレフィックスを検索
    if (data.commonPrefixes) {
      for (const prefix of data.commonPrefixes) {
        const prefixUpper = prefix.toUpperCase();
        
        // プレフィックスがクエリで始まる、またはクエリがプレフィックスで始まる
        if (prefixUpper.startsWith(queryUpper) || queryUpper.startsWith(prefixUpper)) {
          const key = `${manufacturer}-${prefix}`;
          if (!seen.has(key)) {
            results.push({
              model: prefix,
              manufacturer: manufacturer,
              prefix: prefix,
            });
            seen.add(key);
            if (results.length >= limit) break;
          }
        }
      }
    }

    if (results.length >= limit) break;
  }

  // 結果をソート（完全一致を優先、その後アルファベット順）
  results.sort((a, b) => {
    const aMatch = a.model.toUpperCase() === queryUpper;
    const bMatch = b.model.toUpperCase() === queryUpper;
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return a.model.localeCompare(b.model);
  });

  return results.slice(0, limit);
}

/**
 * 型番のプレフィックス候補を取得
 * @param query 検索クエリ
 * @param manufacturer メーカー（オプション）
 * @returns プレフィックス候補の配列
 */
export function getPrefixSuggestions(
  query: string,
  manufacturer?: string
): string[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const queryUpper = query.toUpperCase().trim();
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const [maker, data] of Object.entries(airconModelsData.manufacturers)) {
    if (manufacturer && manufacturer !== maker) {
      continue;
    }

    if (data.commonPrefixes) {
      for (const prefix of data.commonPrefixes) {
        const prefixUpper = prefix.toUpperCase();
        if (prefixUpper.startsWith(queryUpper) && !seen.has(prefix)) {
          suggestions.push(prefix);
          seen.add(prefix);
        }
      }
    }
  }

  return suggestions.sort().slice(0, 20);
}

/**
 * 型番のサフィックス候補を取得
 * @param query 検索クエリ
 * @param manufacturer メーカー（オプション）
 * @param prefix 既に確定しているプレフィックス（オプション）
 * @returns サフィックス候補の配列
 */
export function getSuffixSuggestions(
  query: string,
  manufacturer?: string,
  prefix?: string
): string[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const queryUpper = query.toUpperCase().trim();
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const [maker, data] of Object.entries(airconModelsData.manufacturers)) {
    if (manufacturer && manufacturer !== maker) {
      continue;
    }

    if (data.modelPatterns) {
      for (const pattern of data.modelPatterns) {
        const patternUpper = pattern.toUpperCase();
        
        // プレフィックスが指定されている場合は、そのプレフィックスで始まるパターンのみ
        if (prefix) {
          const prefixUpper = prefix.toUpperCase();
          if (!patternUpper.startsWith(prefixUpper)) {
            continue;
          }
          // プレフィックスを除いた部分をサフィックスとして扱う
          const suffix = patternUpper.substring(prefixUpper.length);
          if (suffix.startsWith(queryUpper) && !seen.has(suffix)) {
            suggestions.push(suffix);
            seen.add(suffix);
          }
        } else {
          // プレフィックスが指定されていない場合は、パターン全体からサフィックスを抽出
          // 数字部分の後をサフィックスとして扱う
          const numberMatch = patternUpper.match(/\d+/);
          if (numberMatch) {
            const numberIndex = patternUpper.indexOf(numberMatch[0]);
            const suffix = patternUpper.substring(numberIndex + numberMatch[0].length);
            if (suffix.startsWith(queryUpper) && suffix.length > 0 && !seen.has(suffix)) {
              suggestions.push(suffix);
              seen.add(suffix);
            }
          }
        }
      }
    }
  }

  return suggestions.sort().slice(0, 20);
}

/**
 * メーカー一覧を取得
 * @returns メーカー名の配列
 */
export function getManufacturers(): string[] {
  return Object.keys(airconModelsData.manufacturers);
}

/**
 * メーカー別の型番総数を取得
 * @param manufacturer メーカー名
 * @returns 型番総数
 */
export function getModelCount(manufacturer: string): number {
  const data = airconModelsData.manufacturers[manufacturer];
  return data ? data.totalModels : 0;
}

/**
 * すべての型番を取得（メーカー別にフィルタリング可能）
 * @param manufacturer メーカー名（オプション、指定するとそのメーカーの型番のみ）
 * @returns 型番の配列
 */
export function getAllModels(manufacturer?: string): string[] {
  const allModels: string[] = [];
  const seen = new Set<string>();

  for (const [maker, data] of Object.entries(airconModelsData.manufacturers)) {
    // メーカーフィルターが指定されている場合はスキップ
    if (manufacturer && manufacturer !== maker) {
      continue;
    }

    // 型番パターンを追加
    if (data.modelPatterns) {
      for (const pattern of data.modelPatterns) {
        if (!seen.has(pattern)) {
          allModels.push(pattern);
          seen.add(pattern);
        }
      }
    }

    // 共通プレフィックスも追加（型番として扱う）
    if (data.commonPrefixes) {
      for (const prefix of data.commonPrefixes) {
        if (!seen.has(prefix)) {
          allModels.push(prefix);
          seen.add(prefix);
        }
      }
    }
  }

  // アルファベット順にソート
  return allModels.sort();
}
