/**
 * ダイキンの詳細型番を参考サイトから取得するスクリプト
 * https://iair-c.com/manual/daikin/index-daikin/ から各プレフィックスのページをスクレイピング
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ダイキンのAから始まる型番プレフィックス（参考サイトより）
const daikinPrefixes = [
  'AJT',
  'AN',
  'ANC',
  'ATA',
  'ATC',
  'ATD',
  'ATE',
  'ATN',
  'ATP',
  'ATR',
  'ATS',
  'ATUX',
  'FAP',
  'FARP',
  'FAYJ',
  'FAYP',
  'FAYRP',
  'FBP',
  'FGEAP',
  'FGEVP',
  'FHBP',
  'FHCP',
  'FHCXP',
  'FHGP',
  'FHKP',
  'FHMHP',
  'FHMP',
  'FHNP',
  'FHP',
  'FHTP',
  'FHYBJ',
  'FHYCP',
  'FHYMP',
  'FHYP',
  'FNYAJ',
  'FUP',
  'FUYP',
  'FVP',
  'FVYCP',
  'FXUP',
  'FXYAJ',
  'FXYAP',
  'FXYCP',
  'FXYDP',
  'FXYEP',
  'FXYFP',
  'FXYHP',
  'FXYKP',
  'FXYMP',
  'FXYSP',
  'FXYTP',
  'RTJ',
  'RTYJ',
  'RTZYJ',
  'RZYP',
  'SDH',
  'SSD',
  'SVYCP',
  'SZVCP',
  'SZVYCP',
  'UAV',
  'UAVP'
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

// HTMLから型番を抽出する関数
function extractModels(html, prefix) {
  const models = [];
  const seen = new Set();
  const prefixUpper = prefix.toUpperCase();
  const prefixLower = prefix.toLowerCase();
  
  // HTMLタグを除去してテキストのみを抽出
  const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  // 複数のパターンで型番を抽出（大文字・小文字の両方を検索）
  const patterns = [
    // プレフィックス + ハイフン + アルファベット（例：AJT-SEP、ajt-sep、ATA-SPE3）
    new RegExp(`\\b${prefixUpper}[-][A-Z]+[0-9A-Z]*\\b`, 'gi'),
    new RegExp(`\\b${prefixLower}[-][a-z]+[0-9a-z]*\\b`, 'gi'),
    // プレフィックス + ハイフン + 数字（例：AJT-22）
    new RegExp(`\\b${prefixUpper}[-]\\d+[A-Z]*\\b`, 'gi'),
    new RegExp(`\\b${prefixLower}[-]\\d+[a-z]*\\b`, 'gi'),
    // プレフィックス + 数字 + アルファベット（例：AJT22、AJT25A）
    new RegExp(`\\b${prefixUpper}\\d+[A-Z]*\\b`, 'gi'),
    new RegExp(`\\b${prefixLower}\\d+[a-z]*\\b`, 'gi'),
    // プレフィックス + アルファベット + 数字（例：AJTA22）
    new RegExp(`\\b${prefixUpper}[A-Z]+\\d+[A-Z]*\\b`, 'gi'),
    new RegExp(`\\b${prefixLower}[a-z]+\\d+[a-z]*\\b`, 'gi'),
  ];
  
  for (const regex of patterns) {
    const matches = textOnly.match(regex);
    if (matches) {
      for (const match of matches) {
        const model = match.trim().toUpperCase();
        // 型番として妥当な長さ（3文字以上、30文字以下）で、まだ追加されていないもの
        if (model.length >= 3 && model.length <= 30 && !seen.has(model)) {
          // プレフィックスで始まることを確認
          if (model.startsWith(prefixUpper)) {
            models.push(model);
            seen.add(model);
          }
        }
      }
    }
  }
  
  // HTMLのリンクやリストから型番を抽出
  // <a>タグや<li>タグ内の型番を探す
  const linkPattern = new RegExp(`<[^>]*>([^<]*${prefix}[0-9A-Za-z\\-]+[^<]*)</[^>]*>`, 'gi');
  let linkMatch;
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const text = linkMatch[1].trim();
    const modelMatch = text.match(new RegExp(`\\b${prefix}[0-9A-Za-z\\-]+\\b`, 'i'));
    if (modelMatch) {
      const model = modelMatch[0].trim().toUpperCase();
      if (model.length >= 3 && model.length <= 30 && !seen.has(model)) {
        if (model.startsWith(prefixUpper)) {
          models.push(model);
          seen.add(model);
        }
      }
    }
  }
  
  // URLから型番を抽出（例：/manual/daikin/ajt-sep/、/manual/daikin/ajt22/）
  // より広範囲なURLパターンを検索
  const urlPatterns = [
    new RegExp(`/manual/daikin/${prefixLower}[0-9a-z\\-]+/`, 'gi'),
    new RegExp(`href=["']/manual/daikin/${prefixLower}[0-9a-z\\-]+/["']`, 'gi'),
    new RegExp(`href=["']https://iair-c\\.com/manual/daikin/${prefixLower}[0-9a-z\\-]+/["']`, 'gi'),
  ];
  
  for (const urlPattern of urlPatterns) {
    let urlMatch;
    while ((urlMatch = urlPattern.exec(html)) !== null) {
      const urlPart = urlMatch[0];
      // URLから型番部分を抽出
      const modelMatch = urlPart.match(new RegExp(`${prefixLower}[0-9a-z\\-]+`, 'i'));
      if (modelMatch) {
        const model = modelMatch[0].trim().toUpperCase();
        // 型番として妥当な長さ（プレフィックス + 最低1文字）で、まだ追加されていないもの
        if (model.length >= prefix.length + 1 && model.length <= 30 && !seen.has(model)) {
          if (model.startsWith(prefixUpper)) {
            // 誤検出を除外（index、category、tagなど）
            if (!model.includes('INDEX') && 
                !model.includes('CATEGORY') && 
                !model.includes('TAG') &&
                !model.includes('DAIKIN')) {
              models.push(model);
              seen.add(model);
            }
          }
        }
      }
    }
  }
  
  return models.sort();
}

// メインページから各カテゴリーページのリンクを抽出
async function extractCategoryLinks(html) {
  const categoryLinks = {};
  
  // カテゴリーページのリンクパターン（例：<a href="/manual/daikin/daikin-a/index-a/">）
  const linkPattern = /<a[^>]*href=["']([^"']*\/manual\/daikin\/daikin-([a-z])\/index-[a-z]+\/)["'][^>]*>([^<]*)</gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const category = match[2].toUpperCase(); // A, C, F, P, R, S, U
    const linkText = match[2].trim();
    
    if (url && !categoryLinks[category]) {
      categoryLinks[category] = url;
    }
  }
  
  return categoryLinks;
}

// メイン処理
async function scrapeDaikinModels() {
  const modelDetails = {};
  const baseUrl = 'https://iair-c.com';
  const indexUrl = 'https://iair-c.com/manual/daikin/index-daikin/';
  
  console.log('ダイキンの詳細型番を取得中...');
  console.log('メインページからリンクを取得中...');
  
  try {
    // メインページを取得
    const indexHtml = await fetchHTML(indexUrl);
    console.log(`メインページを取得しました (${indexHtml.length}文字)`);
    
    // メインページから各カテゴリーページのリンクを抽出
    const categoryLinks = await extractCategoryLinks(indexHtml);
    console.log(`${Object.keys(categoryLinks).length}個のカテゴリーページを発見: ${Object.keys(categoryLinks).join(', ')}`);
    
    // 各カテゴリーページから各プレフィックスのリンクを抽出し、型番を取得
    const prefixUrlMap = {}; // プレフィックス -> URLの配列
    
    for (const [category, url] of Object.entries(categoryLinks)) {
      try {
        const fullUrl = url.startsWith('http') ? url : baseUrl + url;
        console.log(`カテゴリー ${category} のページを取得中: ${fullUrl}`);
        const html = await fetchHTML(fullUrl);
        
        // カテゴリーページから各プレフィックスのリンクを抽出
        // URLパターン: /manual/daikin/daikin-a/ajt-sep/
        for (const prefix of daikinPrefixes) {
          const prefixLower = prefix.toLowerCase();
          const linkPattern = new RegExp(`<a[^>]*href=["']([^"']*\/manual\/daikin\/daikin-${category.toLowerCase()}\/${prefixLower}[0-9a-z\\-]+\/)["'][^>]*>`, 'gi');
          let linkMatch;
          while ((linkMatch = linkPattern.exec(html)) !== null) {
            const modelUrl = linkMatch[1];
            if (!prefixUrlMap[prefix]) {
              prefixUrlMap[prefix] = [];
            }
            if (!prefixUrlMap[prefix].includes(modelUrl)) {
              prefixUrlMap[prefix].push(modelUrl);
            }
          }
        }
        
        // サーバーに負荷をかけないように少し待機
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`カテゴリー ${category} の取得エラー:`, error.message);
      }
    }
    
    // 各プレフィックスのリンクから型番を抽出
    for (const prefix of daikinPrefixes) {
      const models = [];
      const prefixLower = prefix.toLowerCase();
      const prefixUpper = prefix.toUpperCase();
      
      // カテゴリーページから直接型番を抽出
      for (const [category, url] of Object.entries(categoryLinks)) {
        try {
          const fullUrl = url.startsWith('http') ? url : baseUrl + url;
          const html = await fetchHTML(fullUrl);
          
          // URLから型番を抽出（例：/manual/daikin/daikin-a/ajt-sep/ → AJT-SEP）
          const urlPattern = new RegExp(`/manual/daikin/daikin-${category.toLowerCase()}/${prefixLower}[0-9a-z\\-]+/`, 'gi');
          let urlMatch;
          while ((urlMatch = urlPattern.exec(html)) !== null) {
            const urlPart = urlMatch[0];
            const modelMatch = urlPart.match(new RegExp(`${prefixLower}[0-9a-z\\-]+`, 'i'));
            if (modelMatch) {
              const model = modelMatch[0].trim().toUpperCase();
              if (model.length >= prefix.length + 1 && model.length <= 30) {
                if (!models.includes(model)) {
                  models.push(model);
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
        'INDEX', 'CATEGORY', 'TAG', 'DAIKIN', 'MANUAL',
        'ANTIALIASED', 'ANCHOR', 'ANIMATION', 'ANUAL'
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
    }
  } catch (error) {
    console.error('メインページの取得に失敗しました:', error.message);
    // フォールバック: 各プレフィックスを直接試す
    console.log('フォールバック: 各プレフィックスを直接試します...');
    for (const prefix of daikinPrefixes) {
      modelDetails[prefix] = [prefix];
    }
  }
  
  // 結果をJSONファイルに保存
  const output = {
    manufacturer: 'ダイキン',
    source: 'https://iair-c.com/manual/daikin/index-daikin/',
    lastUpdated: new Date().toISOString().split('T')[0],
    modelDetails: modelDetails
  };
  
  const outputPath = path.join(__dirname, '../data/daikinModelDetails.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n結果を ${outputPath} に保存しました`);
  console.log(`合計 ${Object.keys(modelDetails).length} 個のプレフィックスから型番を取得しました`);
}

// スクリプトを実行
if (require.main === module) {
  scrapeDaikinModels().catch(console.error);
}

module.exports = { scrapeDaikinModels };
