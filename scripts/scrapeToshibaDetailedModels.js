/**
 * 東芝の完全な詳細型番を取得するスクリプト
 * https://iair-c.com/manual/toshiba/ から各型番の詳細ページをスクレイピング
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// URLからHTMLを取得する関数
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const timeout = 15000;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
    
    const timeoutId = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    }, timeout);
  });
}

// HTMLから型番リンクを抽出
function extractModelLinks(html, baseUrl) {
  const links = [];
  // href属性から型番ページへのリンクを抽出
  const linkPattern = /href="([^"]*\/toshiba\/[^"]*\/[^"]+)"/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const link = match[1];
    if (!links.includes(link) && !link.includes('#') && !link.includes('index-tsb')) {
      links.push(link.startsWith('http') ? link : baseUrl + link);
    }
  }
  return links;
}

// HTMLから完全な型番を抽出
function extractFullModels(html) {
  const models = new Set();
  
  // 東芝の型番パターン（例：RAS-H221DT, AIC-AP800PH, RAS-2513T）
  const patterns = [
    // RAS-H221DT, RAS-2513T 形式
    /\b(RAS-[A-Z]*\d{3,4}[A-Z0-9]*)\b/gi,
    // AIC-AP800PH, AIU-AP1401H 形式
    /\b(AI[A-Z]-[A-Z]+\d{3,4}[A-Z0-9]*)\b/gi,
    // MCY-MAP801H 形式
    /\b(MCY-[A-Z]+\d{3,4}[A-Z0-9]*)\b/gi,
    // 一般的な型番パターン（数字を含む）
    /\b([A-Z]{2,4}-[A-Z]*\d{3,4}[A-Z0-9-]*)\b/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        const model = match.trim().toUpperCase();
        // 有効な型番かチェック
        if (model.length >= 8 && model.length <= 20 && /\d{3,4}/.test(model)) {
          // 除外パターン
          if (!model.includes('INDEX') && 
              !model.includes('TOSHIBA') && 
              !model.includes('MANUAL') &&
              !model.includes('HTTP') &&
              !model.includes('WWW')) {
            models.add(model);
          }
        }
      }
    }
  }
  
  return [...models];
}

// メイン処理
async function scrapeToshibaDetailedModels() {
  const baseUrl = 'https://iair-c.com';
  const allModels = {};
  const processedUrls = new Set();
  
  console.log('東芝の完全な詳細型番を取得中...\n');
  
  // 各カテゴリーページから型番を取得
  const categoryUrls = [
    '/manual/toshiba/tsb-a/index-tsb-a/',
    '/manual/toshiba/tsb-r/index-tsb-r/',
    '/manual/toshiba/tsb-m/index-tsb-m/',
    '/manual/toshiba/tsb-h/index-tsb-h/',
    '/manual/toshiba/tsb-v/index-tsb-v/',
  ];
  
  for (const categoryPath of categoryUrls) {
    const categoryUrl = baseUrl + categoryPath;
    console.log(`カテゴリー: ${categoryUrl}`);
    
    try {
      const categoryHtml = await fetchHTML(categoryUrl);
      
      // カテゴリーページから型番を抽出
      const modelsFromCategory = extractFullModels(categoryHtml);
      for (const model of modelsFromCategory) {
        const prefix = model.split('-')[0];
        if (!allModels[prefix]) {
          allModels[prefix] = new Set();
        }
        allModels[prefix].add(model);
      }
      
      // 詳細ページへのリンクを取得
      const detailLinks = extractModelLinks(categoryHtml, baseUrl);
      console.log(`  - ${detailLinks.length}件の詳細ページを発見`);
      
      // 詳細ページから型番を取得（最初の20件のみ処理してテスト）
      let processedCount = 0;
      for (const link of detailLinks.slice(0, 50)) {
        if (processedUrls.has(link)) continue;
        processedUrls.add(link);
        
        try {
          const detailHtml = await fetchHTML(link);
          const modelsFromDetail = extractFullModels(detailHtml);
          
          for (const model of modelsFromDetail) {
            const prefix = model.split('-')[0];
            if (!allModels[prefix]) {
              allModels[prefix] = new Set();
            }
            allModels[prefix].add(model);
          }
          
          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`    ${processedCount}件処理完了...`);
          }
          
          // サーバーに負荷をかけないように待機
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          // エラーは無視して続行
        }
      }
      
      console.log(`  - カテゴリー処理完了\n`);
      
    } catch (error) {
      console.error(`  エラー: ${error.message}`);
    }
  }
  
  // 結果を整形
  const modelDetails = {};
  let totalModels = 0;
  
  for (const [prefix, models] of Object.entries(allModels)) {
    const sortedModels = [...models].sort();
    if (sortedModels.length > 0) {
      modelDetails[prefix] = sortedModels;
      totalModels += sortedModels.length;
      console.log(`${prefix}: ${sortedModels.length}件 (例: ${sortedModels.slice(0, 3).join(', ')})`);
    }
  }
  
  // 結果をJSONファイルに保存
  const output = {
    manufacturer: '東芝',
    source: 'https://iair-c.com/manual/toshiba/',
    lastUpdated: new Date().toISOString().split('T')[0],
    totalFullModels: totalModels,
    modelDetails: modelDetails
  };
  
  const outputPath = path.join(__dirname, '../data/toshibaFullModelDetails_scraped.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n結果を ${outputPath} に保存しました`);
  console.log(`合計 ${totalModels} 個の完全な型番を取得しました`);
  
  return output;
}

if (require.main === module) {
  scrapeToshibaDetailedModels().catch(console.error);
}

module.exports = { scrapeToshibaDetailedModels };
