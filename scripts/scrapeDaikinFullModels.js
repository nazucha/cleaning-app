/**
 * ダイキンの完全な詳細型番を取得するスクリプト
 * https://iair-c.com/manual/daikin/index-daikin/ から各型番の詳細ページをスクレイピング
 * 取扱説明書の情報も取得して、お掃除機能の有無を確認
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 既存の詳細型番データを読み込む
const daikinModelDetails = require('../data/daikinModelDetails.json');

// URLからHTMLを取得する関数
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// HTMLから完全な型番を抽出する関数（取扱説明書ページから）
function extractFullModels(html, prefix) {
  const models = [];
  const seen = new Set();
  const prefixUpper = prefix.toUpperCase();
  
  // 型番パターン: プレフィックス + 数字 + アルファベット（例：AJT40SEP、AJT22SEP）
  // より詳細なパターンも検索
  const patterns = [
    // AJT40SEP, AJT22SEP などの形式
    new RegExp(`\\b${prefixUpper}\\d{2,4}[A-Z]{2,6}\\b`, 'g'),
    // AJT-SEP40, AJT-SEP22 などの形式（ハイフンあり）
    new RegExp(`\\b${prefixUpper}[-]?[A-Z]{2,6}\\d{2,4}\\b`, 'g'),
    // AJT40-SEP, AJT22-SEP などの形式
    new RegExp(`\\b${prefixUpper}\\d{2,4}[-][A-Z]{2,6}\\b`, 'g'),
  ];
  
  for (const regex of patterns) {
    const matches = html.match(regex);
    if (matches) {
      for (const match of matches) {
        const model = match.trim().toUpperCase();
        if (model.length >= prefix.length + 3 && model.length <= 20 && !seen.has(model)) {
          if (model.startsWith(prefixUpper)) {
            models.push(model);
            seen.add(model);
          }
        }
      }
    }
  }
  
  // HTMLのテキストコンテンツから型番を抽出
  // <p>, <div>, <li>, <td> などのタグ内の型番を探す
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ');
  
  // 型番らしいパターンを抽出
  const modelPattern = new RegExp(`\\b${prefixUpper}[0-9A-Z\\-]{3,15}\\b`, 'g');
  const textMatches = textContent.match(modelPattern);
  if (textMatches) {
    for (const match of textMatches) {
      const model = match.trim().toUpperCase();
      // 型番として妥当な形式をチェック
      if (model.length >= prefix.length + 3 && model.length <= 20 && !seen.has(model)) {
        if (model.startsWith(prefixUpper)) {
          // 誤検出を除外
          if (!model.includes('INDEX') && 
              !model.includes('CATEGORY') && 
              !model.includes('TAG') &&
              !model.includes('DAIKIN') &&
              !model.includes('MANUAL')) {
            models.push(model);
            seen.add(model);
          }
        }
      }
    }
  }
  
  return [...new Set(models)].sort();
}

// HTMLからお掃除機能の情報を抽出する関数
function extractCleaningFunction(html) {
  const cleaningKeywords = [
    'フィルター自動お掃除機能',
    'フィルター自動おそうじ機能',
    '自動お掃除',
    '自動おそうじ',
    'フィルター自動清掃',
    'フィルター自動清掃機能',
    '内部クリーン',
    '内部乾燥',
  ];
  
  const hasCleaningKeywords = [
    'フィルター自動お掃除機能あり',
    'フィルター自動おそうじ機能あり',
    '自動お掃除機能あり',
    '自動おそうじ機能あり',
    'フィルター自動清掃機能あり',
  ];
  
  const noCleaningKeywords = [
    'フィルター自動お掃除機能なし',
    'フィルター自動おそうじ機能なし',
    '自動お掃除機能なし',
    '自動おそうじ機能なし',
    'フィルター自動清掃機能なし',
    '内部クリーン運転のみ',
    '内部乾燥のみ',
  ];
  
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  
  // 「なし」のパターンを優先的にチェック
  for (const keyword of noCleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase())) {
      return false;
    }
  }
  
  // 「あり」のパターンをチェック
  for (const keyword of hasCleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase())) {
      return true;
    }
  }
  
  // 一般的なキーワードをチェック
  for (const keyword of cleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase())) {
      // 「なし」が含まれていない場合のみ「あり」と判定
      if (!textContent.includes('なし') && !textContent.includes('搭載されていません')) {
        return true;
      }
    }
  }
  
  return null; // 判定不能
}

// メイン処理
async function scrapeDaikinFullModels() {
  const fullModelDetails = {};
  const cleaningFunctionData = {};
  const baseUrl = 'https://iair-c.com';
  
  console.log('ダイキンの完全な詳細型番を取得中...');
  console.log(`処理対象: ${Object.keys(daikinModelDetails.modelDetails).length}個のプレフィックス\n`);
  
  let totalModels = 0;
  let processedPrefixes = 0;
  
  for (const [prefix, models] of Object.entries(daikinModelDetails.modelDetails)) {
    processedPrefixes++;
    console.log(`[${processedPrefixes}/${Object.keys(daikinModelDetails.modelDetails).length}] ${prefix} を処理中...`);
    
    const fullModels = [];
    const prefixLower = prefix.toLowerCase();
    
    // 各型番の詳細ページを取得
    for (const model of models) {
      if (model === prefix) {
        // プレフィックスのみの場合はスキップ
        continue;
      }
      
      try {
        // 型番からURLを生成（例：AJT-SEP → /manual/daikin/daikin-a/ajt-sep/）
        const modelLower = model.toLowerCase().replace(/-/g, '-');
        // カテゴリーを推測（A, C, F, P, R, S, U）
        const categories = ['a', 'c', 'f', 'p', 'r', 's', 'u'];
        
        for (const category of categories) {
          const url = `${baseUrl}/manual/daikin/daikin-${category}/${modelLower}/`;
          
          try {
            const html = await fetchHTML(url);
            
            // 完全な型番を抽出
            const extractedModels = extractFullModels(html, prefix);
            for (const extractedModel of extractedModels) {
              if (!fullModels.includes(extractedModel)) {
                fullModels.push(extractedModel);
              }
            }
            
            // お掃除機能の情報を抽出
            const hasCleaning = extractCleaningFunction(html);
            if (hasCleaning !== null) {
              // 型番とお掃除機能の情報を保存
              if (!cleaningFunctionData[model]) {
                cleaningFunctionData[model] = {};
              }
              cleaningFunctionData[model][extractedModel] = hasCleaning;
            }
            
            // ページが見つかった場合は他のカテゴリーを試さない
            if (html.length > 10000) { // ページが存在する場合（適切なサイズ）
              break;
            }
          } catch (error) {
            // 404エラーなどは無視して次のカテゴリーを試す
            continue;
          }
        }
        
        // サーバーに負荷をかけないように少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`  ${model} の取得エラー:`, error.message);
      }
    }
    
    if (fullModels.length > 0) {
      fullModelDetails[prefix] = fullModels;
      totalModels += fullModels.length;
      console.log(`  ✓ ${prefix}: ${fullModels.length}件の完全な型番を取得: ${fullModels.slice(0, 5).join(', ')}${fullModels.length > 5 ? '...' : ''}`);
    } else {
      // 完全な型番が見つからない場合は、既存の型番を使用
      fullModelDetails[prefix] = models;
      totalModels += models.length;
      console.log(`  - ${prefix}: 完全な型番が見つかりませんでした（既存の型番を使用）`);
    }
  }
  
  // 結果をJSONファイルに保存
  const output = {
    manufacturer: 'ダイキン',
    source: 'https://iair-c.com/manual/daikin/index-daikin/',
    lastUpdated: new Date().toISOString().split('T')[0],
    totalFullModels: totalModels,
    modelDetails: fullModelDetails
  };
  
  const outputPath = path.join(__dirname, '../data/daikinFullModelDetails.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n結果を ${outputPath} に保存しました`);
  console.log(`合計 ${totalModels} 個の完全な型番を取得しました`);
  
  // お掃除機能のデータも保存
  if (Object.keys(cleaningFunctionData).length > 0) {
    const cleaningOutputPath = path.join(__dirname, '../data/daikinCleaningFunctionFromManual.json');
    fs.writeFileSync(cleaningOutputPath, JSON.stringify(cleaningFunctionData, null, 2), 'utf8');
    console.log(`お掃除機能のデータを ${cleaningOutputPath} に保存しました`);
  }
}

// スクリプトを実行
if (require.main === module) {
  scrapeDaikinFullModels().catch(console.error);
}

module.exports = { scrapeDaikinFullModels };
