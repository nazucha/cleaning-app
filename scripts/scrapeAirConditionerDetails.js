/**
 * エアコンの取扱説明書サイトから詳細情報（エアコンタイプ、おそうじ機能）をスクレイピングするスクリプト
 * https://iair-c.com/manual/index/ から情報を取得
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// メーカー情報
const MANUFACTURERS = [
  { name: 'ダイキン', urlPath: 'daikin', indexPage: 'index-daikin' },
  { name: '三菱電機', urlPath: 'mitsubishielectric', indexPage: 'index-melec' },
  { name: 'パナソニック', urlPath: 'panasonic', indexPage: 'index-pana' },
  { name: '日立', urlPath: 'hitachi', indexPage: 'index-hitachi' },
  { name: '東芝', urlPath: 'toshiba', indexPage: 'index-toshiba' },
  { name: 'シャープ', urlPath: 'sharp', indexPage: 'index-sharp' },
  { name: '三菱重工', urlPath: 'mitsubishiheavy', indexPage: 'index-mhi' },
  { name: '富士通ゼネラル', urlPath: 'fujitsu', indexPage: 'index-fujitsu' },
];

// エアコンタイプのマッピング
const AC_TYPE_PATTERNS = {
  '壁掛形': ['壁掛', '壁掛け', 'ウォールマウント', 'wall'],
  '天井カセット形': ['天井カセット', '天カセ', 'ceiling cassette', '4方向', '2方向'],
  '天井吊下形': ['天井吊', '天井吊り', '天吊り', 'ceiling suspended'],
  '床置形': ['床置', '床置き', 'floor'],
  '天井ビルトイン形': ['天井ビルトイン', 'ビルトイン', 'built-in'],
  '天井隠ぺい形': ['天井隠ぺい', '隠ぺい', 'concealed'],
};

// おそうじ機能のキーワード
const CLEANING_KEYWORDS_POSITIVE = [
  'お掃除', 'おそうじ', 'フィルター自動', '自動クリーニング', 
  '自動お掃除', 'フィルターお掃除', 'オートクリーン',
  'フィルター掃除', '自動おそうじ', 'フィルター清掃',
];

const CLEANING_KEYWORDS_NEGATIVE = [
  'フィルター自動お掃除機能なし', 'お掃除機能なし', 'おそうじ機能なし',
  'お掃除機能非搭載', '自動クリーニングなし',
];

// スクレイピング用のヘルパー関数
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 30000);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      }
    }, (res) => {
      clearTimeout(timeout);
      
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          fetchHTML(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// 遅延関数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTMLからエアコンタイプを判定
function detectAcType(html, pageUrl) {
  const htmlLower = html.toLowerCase();
  const urlLower = pageUrl.toLowerCase();
  
  // URLからタイプを判定
  if (urlLower.includes('ceiling') || urlLower.includes('cassette') || urlLower.includes('-cc') || urlLower.includes('4way')) {
    return '天井カセット形';
  }
  if (urlLower.includes('suspended') || urlLower.includes('-cs') || urlLower.includes('hang')) {
    return '天井吊下形';
  }
  if (urlLower.includes('floor') || urlLower.includes('-fl')) {
    return '床置形';
  }
  if (urlLower.includes('builtin') || urlLower.includes('built-in') || urlLower.includes('-bi')) {
    return '天井ビルトイン形';
  }
  if (urlLower.includes('concealed') || urlLower.includes('-hd')) {
    return '天井隠ぺい形';
  }
  
  // HTMLコンテンツからタイプを判定
  for (const [type, keywords] of Object.entries(AC_TYPE_PATTERNS)) {
    for (const keyword of keywords) {
      if (html.includes(keyword)) {
        return type;
      }
    }
  }
  
  // デフォルトは壁掛形（最も一般的）
  return '壁掛形';
}

// HTMLからおそうじ機能の有無を判定
function detectCleaningFunction(html) {
  const htmlLower = html.toLowerCase();
  
  // 否定的なキーワードを先にチェック
  for (const keyword of CLEANING_KEYWORDS_NEGATIVE) {
    if (html.includes(keyword)) {
      return false;
    }
  }
  
  // 肯定的なキーワードをチェック
  for (const keyword of CLEANING_KEYWORDS_POSITIVE) {
    if (html.includes(keyword)) {
      return true;
    }
  }
  
  // 判定できない場合はnull
  return null;
}

// HTMLから型番リンクを抽出
function extractModelLinks(html, baseUrl) {
  const links = [];
  // <a href="...">...</a> パターンでリンクを抽出
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    
    // 型番ページへのリンクを判定（/manual/で始まるURLで、型番らしい文字列を含む）
    if (href.includes('/manual/') && !href.includes('index') && text.length > 2) {
      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = 'https://iair-c.com' + href;
      } else if (!href.startsWith('http')) {
        fullUrl = baseUrl + '/' + href;
      }
      
      // 型番を抽出（テキストから）
      const modelMatch = text.match(/^([A-Z0-9][\w\-]+)/i);
      if (modelMatch) {
        links.push({
          url: fullUrl,
          model: modelMatch[1].toUpperCase(),
          text: text,
        });
      }
    }
  }
  
  return links;
}

// HTMLから詳細ページの型番情報を抽出
function extractModelDetails(html, pageUrl, manufacturer) {
  const results = [];
  
  // ページタイトルから型番を抽出
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  
  let model = '';
  if (titleMatch) {
    const titleText = titleMatch[1];
    const modelFromTitle = titleText.match(/([A-Z0-9][\w\-]+)/i);
    if (modelFromTitle) {
      model = modelFromTitle[1].toUpperCase();
    }
  }
  
  if (!model && h1Match) {
    const h1Text = h1Match[1];
    const modelFromH1 = h1Text.match(/([A-Z0-9][\w\-]+)/i);
    if (modelFromH1) {
      model = modelFromH1[1].toUpperCase();
    }
  }
  
  if (!model) {
    // URLから型番を抽出
    const urlParts = pageUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
    if (lastPart && !lastPart.includes('index')) {
      model = lastPart.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
    }
  }
  
  if (model && model.length > 2) {
    const acType = detectAcType(html, pageUrl);
    const hasCleaning = detectCleaningFunction(html);
    
    results.push({
      model: model,
      maker: manufacturer,
      type: acType,
      hasCleaningFunction: hasCleaning,
      source: 'manual-scrape',
      url: pageUrl,
    });
  }
  
  return results;
}

// サブカテゴリページからリンクを抽出
function extractSubCategoryLinks(html, baseUrl) {
  const links = [];
  // プレフィックスページへのリンクを探す（例: /manual/daikin/dkn-a/index-dkn-a/）
  const linkPattern = /<a[^>]+href=["']([^"']+index[^"']*)["'][^>]*>/gi;
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    if (href.includes('/manual/') && href !== baseUrl) {
      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = 'https://iair-c.com' + href;
      } else if (!href.startsWith('http')) {
        fullUrl = baseUrl + '/' + href;
      }
      if (!links.includes(fullUrl)) {
        links.push(fullUrl);
      }
    }
  }
  
  return links;
}

// メーカーのデータをスクレイピング
async function scrapeManufacturer(manufacturer, maxModels = 100) {
  console.log(`\n【${manufacturer.name}】のスクレイピングを開始...`);
  
  const results = [];
  const processedUrls = new Set();
  
  try {
    // メインインデックスページを取得
    const indexUrl = `https://iair-c.com/manual/${manufacturer.urlPath}/${manufacturer.indexPage}/`;
    console.log(`  インデックスページ: ${indexUrl}`);
    
    const indexHtml = await fetchHTML(indexUrl);
    await delay(500);
    
    // サブカテゴリページのリンクを抽出
    const subCategoryLinks = extractSubCategoryLinks(indexHtml, indexUrl);
    console.log(`  サブカテゴリページ: ${subCategoryLinks.length}件`);
    
    // 各サブカテゴリから型番リンクを収集
    const allModelLinks = [];
    
    // まずインデックスページから直接型番リンクを抽出
    const directLinks = extractModelLinks(indexHtml, indexUrl);
    allModelLinks.push(...directLinks);
    
    // サブカテゴリページをスクレイピング
    for (const subUrl of subCategoryLinks.slice(0, 10)) { // 最初の10サブカテゴリのみ
      if (processedUrls.has(subUrl)) continue;
      processedUrls.add(subUrl);
      
      try {
        console.log(`    サブカテゴリ: ${subUrl.split('/').slice(-2, -1)[0] || 'unknown'}`);
        const subHtml = await fetchHTML(subUrl);
        const modelLinks = extractModelLinks(subHtml, subUrl);
        allModelLinks.push(...modelLinks);
        await delay(300);
      } catch (error) {
        console.log(`    ✗ サブカテゴリの取得に失敗: ${error.message}`);
      }
      
      if (allModelLinks.length >= maxModels) break;
    }
    
    console.log(`  型番リンク: ${allModelLinks.length}件`);
    
    // 重複を除去
    const uniqueModelLinks = [];
    const seenModels = new Set();
    for (const link of allModelLinks) {
      if (!seenModels.has(link.model)) {
        seenModels.add(link.model);
        uniqueModelLinks.push(link);
      }
    }
    
    console.log(`  ユニーク型番: ${uniqueModelLinks.length}件`);
    
    // 各型番の詳細ページをスクレイピング（サンプルとして最初の20件）
    const samplesToProcess = uniqueModelLinks.slice(0, Math.min(20, maxModels));
    console.log(`  詳細ページをスクレイピング: ${samplesToProcess.length}件`);
    
    for (const link of samplesToProcess) {
      if (processedUrls.has(link.url)) continue;
      processedUrls.add(link.url);
      
      try {
        const detailHtml = await fetchHTML(link.url);
        const details = extractModelDetails(detailHtml, link.url, manufacturer.name);
        
        if (details.length > 0) {
          results.push(...details);
          console.log(`    ✓ ${link.model}: ${details[0].type}, おそうじ: ${details[0].hasCleaningFunction !== null ? (details[0].hasCleaningFunction ? 'あり' : 'なし') : '不明'}`);
        }
        
        await delay(200);
      } catch (error) {
        console.log(`    ✗ ${link.model}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`  エラー: ${error.message}`);
  }
  
  console.log(`  【${manufacturer.name}】完了: ${results.length}件`);
  return results;
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('エアコン詳細情報スクレイピング開始');
  console.log('='.repeat(60));
  
  const allResults = [];
  const targetManufacturers = process.argv[2] 
    ? MANUFACTURERS.filter(m => m.name.includes(process.argv[2]))
    : MANUFACTURERS;
  
  for (const manufacturer of targetManufacturers) {
    const results = await scrapeManufacturer(manufacturer, 30);
    allResults.push(...results);
    await delay(1000); // メーカー間で1秒待機
  }
  
  // 結果を保存
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalModels: allResults.length,
      description: 'エアコンの詳細情報（タイプ、おそうじ機能）',
      source: 'https://iair-c.com/manual/index/',
    },
    models: allResults,
  };
  
  const outputPath = path.join(__dirname, '../data/airConditionerDetails.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log('\n' + '='.repeat(60));
  console.log('スクレイピング完了！');
  console.log('='.repeat(60));
  console.log(`合計: ${allResults.length}件`);
  console.log(`保存先: ${outputPath}`);
  
  // サマリーを表示
  console.log('\nメーカー別集計:');
  const byMaker = {};
  for (const item of allResults) {
    byMaker[item.maker] = (byMaker[item.maker] || 0) + 1;
  }
  for (const [maker, count] of Object.entries(byMaker)) {
    console.log(`  ${maker}: ${count}件`);
  }
}

main().catch(console.error);
