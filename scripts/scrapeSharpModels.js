/**
 * シャープの詳細型番を参考サイトから取得するスクリプト
 * https://iair-c.com/manual/sharp/index-shp/ から各プレフィックスのページをスクレイピング
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// シャープの型番プレフィックス（参考サイトより）
const sharpPrefixes = [
  'AC',
  'AY',
  'JH'
];

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

// メイン処理
async function scrapeSharpModels() {
  const modelDetails = {};
  const baseUrl = 'https://iair-c.com';
  const indexUrl = 'https://iair-c.com/manual/sharp/index-shp/';
  
  console.log('シャープの詳細型番を取得中...');
  console.log('メインページからリンクを取得中...');
  
  try {
    // メインページを取得
    const indexHtml = await fetchHTML(indexUrl);
    console.log(`メインページを取得しました (${indexHtml.length}文字)`);
    
    // カテゴリーページのURLを直接構築（A, J）
    const categories = ['A', 'J'];
    const categoryLinks = {};
    for (const category of categories) {
      categoryLinks[category] = `/manual/sharp/shp-${category.toLowerCase()}/index-shp-${category.toLowerCase()}/`;
    }
    console.log(`${Object.keys(categoryLinks).length}個のカテゴリーページを発見: ${Object.keys(categoryLinks).join(', ')}`);
    
    // 各カテゴリーページから各プレフィックスのリンクを抽出し、型番を取得
    for (const prefix of sharpPrefixes) {
      const models = [];
      const prefixLower = prefix.toLowerCase();
      const prefixUpper = prefix.toUpperCase();
      
      // カテゴリーページから直接型番を抽出
      for (const [category, url] of Object.entries(categoryLinks)) {
        try {
          const fullUrl = url.startsWith('http') ? url : baseUrl + url;
          const html = await fetchHTML(fullUrl);
          
          // URLから型番を抽出（例：/manual/sharp/shp-a/ac-22/ → AC-22）
          // シャープのURL構造: /manual/sharp/shp-a/ac-22/
          // matchメソッドを使用してすべてのURLを一度に抽出
          const urlPattern = new RegExp(`/manual/sharp/shp-${category.toLowerCase()}/([a-z0-9\\-]+)/`, 'gi');
          const allMatches = html.match(urlPattern);
          
          if (allMatches) {
            // 各マッチから型番部分を抽出
            for (const match of allMatches) {
              // URLから型番部分を抽出（例：/manual/sharp/shp-a/ac-22/ → ac-22）
              const modelMatch = match.match(new RegExp(`shp-${category.toLowerCase()}/([^/]+)/`, 'i'));
              if (modelMatch && modelMatch[1]) {
                const modelStr = modelMatch[1].trim().toUpperCase();
                
                // 型番として妥当な長さで、プレフィックスで始まることを確認
                if (modelStr.length >= prefix.length + 1 && modelStr.length <= 30) {
                  if (modelStr.startsWith(prefixUpper)) {
                    if (!models.includes(modelStr)) {
                      models.push(modelStr);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          // エラーは無視して続行
        }
      }
      
      // 誤検出を除外
      const invalidPatterns = [
        'INDEX', 'CATEGORY', 'TAG', 'SHARP', 'MANUAL',
        'ANTIALIASED', 'ANCHOR', 'ANIMATION'
      ];
      
      const validModels = [...new Set(models)].filter(model => {
        if (!model.startsWith(prefixUpper)) {
          return false;
        }
        
        // 誤検出パターンをチェック
        for (const invalid of invalidPatterns) {
          if (model.includes(invalid)) {
            return false;
          }
        }
        
        // 型番として妥当な長さ
        if (model.length < prefix.length + 1 || model.length > 30) {
          return false;
        }
        
        // プレフィックスの直後にハイフン、数字、またはアルファベットが続くことを確認
        const afterPrefix = model.substring(prefix.length);
        if (afterPrefix.length === 0) {
          return false;
        }
        
        // 最初の文字がハイフン、数字、またはアルファベットであることを確認
        const firstChar = afterPrefix[0];
        if (!['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(firstChar) &&
            !/[A-Z]/.test(firstChar)) {
          return false;
        }
        
        return true;
      }).sort();
      
      if (validModels.length > 0) {
        modelDetails[prefix] = validModels;
        console.log(`  ✓ ${prefix}: ${validModels.length}件の型番を取得: ${validModels.slice(0, 5).join(', ')}${validModels.length > 5 ? '...' : ''}`);
      } else {
        // プレフィックス自体を追加（フォールバック）
        modelDetails[prefix] = [prefix];
        console.log(`  ✗ ${prefix}: 型番が見つかりませんでした（プレフィックスのみ追加）`);
      }
      
      // サーバーに負荷をかけないように少し待機
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } catch (error) {
    console.error('メインページの取得に失敗しました:', error.message);
    // フォールバック: 各プレフィックスを直接試す
    console.log('フォールバック: 各プレフィックスを直接試します...');
    for (const prefix of sharpPrefixes) {
      modelDetails[prefix] = [prefix];
    }
  }
  
  // 結果をJSONファイルに保存
  const output = {
    manufacturer: 'シャープ',
    source: 'https://iair-c.com/manual/sharp/index-shp/',
    lastUpdated: new Date().toISOString().split('T')[0],
    modelDetails: modelDetails
  };
  
  const outputPath = path.join(__dirname, '../data/sharpModelDetails.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n結果を ${outputPath} に保存しました`);
  console.log(`合計 ${Object.keys(modelDetails).length} 個のプレフィックスから型番を取得しました`);
}

// スクリプトを実行
if (require.main === module) {
  scrapeSharpModels().catch(console.error);
}

module.exports = { scrapeSharpModels };
