/**
 * 三菱重工の完全な詳細型番を取得するスクリプト
 * https://iair-c.com/manual/mitsubishi-hindustry/index-pnsnc/ から各型番の詳細ページをスクレイピング
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const mitsubishiHeavyModelDetails = require('../data/mitsubishiHeavyModelDetails.json');

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const timeout = 10000;
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
    const timeoutId = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms for ${url}`));
    }, timeout);
  });
}

function extractFullModels(html, prefix) {
  const models = [];
  const seen = new Set();
  const prefixUpper = prefix.toUpperCase();
  
  const patterns = [
    new RegExp(`\\b${prefixUpper}[-]?[A-Z0-9]+\\d{2,4}[A-Z0-9]*\\b`, 'g'),
    new RegExp(`\\b${prefixUpper}\\d{2,4}[A-Z0-9]*\\b`, 'g'),
    new RegExp(`\\b${prefixUpper}[-][A-Z0-9]+[-]\\d{2,4}[A-Z0-9]*\\b`, 'g'),
  ];
  
  for (const regex of patterns) {
    const matches = html.match(regex);
    if (matches) {
      for (const match of matches) {
        const model = match.trim().toUpperCase();
        if (model.length >= prefix.length + 2 && model.length <= 25 && !seen.has(model) && model.startsWith(prefixUpper)) {
          if (!model.includes('INDEX') && !model.includes('CATEGORY') && !model.includes('MITSUBISHI') && !model.includes('MANUAL')) {
            models.push(model);
            seen.add(model);
          }
        }
      }
    }
  }
  
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ');
  
  const modelPattern = new RegExp(`\\b${prefixUpper}[0-9A-Z\\-]{2,20}\\b`, 'g');
  const textMatches = textContent.match(modelPattern);
  if (textMatches) {
    for (const match of textMatches) {
      const model = match.trim().toUpperCase();
      if (model.length >= prefix.length + 2 && model.length <= 25 && !seen.has(model) && model.startsWith(prefixUpper)) {
        if (!model.includes('INDEX') && !model.includes('CATEGORY') && !model.includes('MITSUBISHI') && !model.includes('MANUAL')) {
          models.push(model);
          seen.add(model);
        }
      }
    }
  }
  
  return [...new Set(models)].sort();
}

function extractCleaningFunction(html) {
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  const noCleaningKeywords = ['フィルター自動お掃除機能なし', 'フィルター自動おそうじ機能なし', '自動お掃除機能なし', '自動おそうじ機能なし'];
  const hasCleaningKeywords = ['フィルター自動お掃除機能あり', 'フィルター自動おそうじ機能あり', '自動お掃除機能あり', '自動おそうじ機能あり'];
  const cleaningKeywords = ['フィルター自動お掃除機能', 'フィルター自動おそうじ機能', '自動お掃除', '自動おそうじ'];
  
  for (const keyword of noCleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase())) return false;
  }
  for (const keyword of hasCleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase())) return true;
  }
  for (const keyword of cleaningKeywords) {
    if (textContent.includes(keyword.toUpperCase()) && !textContent.includes('なし') && !textContent.includes('搭載されていません')) {
      return true;
    }
  }
  return null;
}

async function scrapeMitsubishiHeavyFullModels() {
  const fullModelDetails = {};
  const cleaningFunctionData = {};
  const baseUrl = 'https://iair-c.com';
  
  console.log('三菱重工の完全な詳細型番を取得中...');
  console.log(`処理対象: ${Object.keys(mitsubishiHeavyModelDetails.modelDetails).length}個のプレフィックス\n`);
  
  let totalModels = 0;
  let processedPrefixes = 0;
  
  for (const [prefix, models] of Object.entries(mitsubishiHeavyModelDetails.modelDetails)) {
    processedPrefixes++;
    const modelCount = Array.isArray(models) ? models.length : 0;
    console.log(`[${processedPrefixes}/${Object.keys(mitsubishiHeavyModelDetails.modelDetails).length}] ${prefix} を処理中... (${modelCount}件の型番)`);
    
    const fullModels = [];
    const prefixLower = prefix.toLowerCase();
    let processedModels = 0;
    
    for (const model of models) {
      processedModels++;
      if (processedModels % 10 === 0 && modelCount > 10) {
        console.log(`  ${prefix}: ${processedModels}/${modelCount}件処理中...`);
      }
      if (model === prefix || !model || model.trim() === '') continue;
      
      try {
        const modelLower = model.toLowerCase().replace(/--/g, '-').replace(/-/g, '-');
        const categories = ['s'];
        
        for (const category of categories) {
          const url = `${baseUrl}/manual/mitsubishi-hindustry/mitsubishi-hindustry-${category}/${modelLower}/`;
          
          try {
            const html = await fetchHTML(url);
            const extractedModels = extractFullModels(html, prefix);
            for (const extractedModel of extractedModels) {
              if (!fullModels.includes(extractedModel)) {
                fullModels.push(extractedModel);
              }
            }
            
            const hasCleaning = extractCleaningFunction(html);
            if (hasCleaning !== null) {
              if (!cleaningFunctionData[model]) {
                cleaningFunctionData[model] = {};
              }
              cleaningFunctionData[model][extractedModel] = hasCleaning;
            }
            
            if (html.length > 10000) break;
          } catch (error) {
            continue;
          }
        }
        
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
      fullModelDetails[prefix] = models;
      totalModels += models.length;
      console.log(`  - ${prefix}: 完全な型番が見つかりませんでした（既存の型番を使用）`);
    }
  }
  
  const output = {
    manufacturer: '三菱重工',
    source: 'https://iair-c.com/manual/mitsubishi-hindustry/index-pnsnc/',
    lastUpdated: new Date().toISOString().split('T')[0],
    totalFullModels: totalModels,
    modelDetails: fullModelDetails
  };
  
  const outputPath = path.join(__dirname, '../data/mitsubishi-hindustryFullModelDetails.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n結果を ${outputPath} に保存しました`);
  console.log(`合計 ${totalModels} 個の完全な型番を取得しました`);
  
  if (Object.keys(cleaningFunctionData).length > 0) {
    const cleaningOutputPath = path.join(__dirname, '../data/mitsubishi-hindustryCleaningFunctionFromManual.json');
    fs.writeFileSync(cleaningOutputPath, JSON.stringify(cleaningFunctionData, null, 2), 'utf8');
    console.log(`お掃除機能のデータを ${cleaningOutputPath} に保存しました`);
  }
}

if (require.main === module) {
  scrapeMitsubishiHeavyFullModels().catch(console.error);
}

module.exports = { scrapeMitsubishiHeavyFullModels };
