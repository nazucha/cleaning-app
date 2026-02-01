/**
 * 不明な型番についてAI APIでおそうじ機能の有無を検索するスクリプト
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// データの読み込み
const cleaningFunctionData = require('../data/cleaningFunctionData.json');

// Gemini APIの設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let GoogleGenerativeAI;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (error) {
  console.error('@google/generative-ai パッケージがインストールされていません。');
  console.error('インストール方法: npm install @google/generative-ai');
  process.exit(1);
}

// ローカル判定関数（サーバー側と同じロジック）
function detectCleaningLocal(model, maker) {
  const modelUpper = model.toUpperCase().trim();
  
  // 三菱電機/三菱重工: KXZ, KY, GX, GY, ZX, ZY, SRK-RS- などがお掃除機能付き
  if ((maker === '三菱電機' || maker === '三菱重工') && 
      (/KXZ|KY[0-9]|GX[0-9]|GY[0-9]|ZX[0-9]|ZY[0-9]|MSZ-KXZ|MSZ-KY|MSZ-GX|MSZ-GY|MSZ-ZX|MSZ-ZY/i.test(modelUpper) ||
       /^SRK-RS-/i.test(modelUpper))) {
    return true;
  }
  
  // ダイキン: Fシリーズがお掃除機能付きの場合が多い
  if (maker === 'ダイキン' && /^F[0-9]|FTXZ|FTXP/i.test(modelUpper)) {
    return true;
  }
  
  // パナソニック: CSZ, CSW, CS-A などがお掃除機能付き
  if (maker === 'パナソニック' && /CSZ|CSW|^CS-A/i.test(modelUpper)) {
    return true;
  }
  
  // お掃除機能なしのパターン
  if (maker === '三菱電機' || maker === '三菱重工') {
    if (/KXV|MSZ-KXV|^SRF|SRF-/i.test(modelUpper) && !/^SRK-RS-/i.test(modelUpper)) {
      return false;
    }
  }
  if (maker === 'ダイキン' && /^S[0-9]|^R[0-9]|FTXS|FTXJ/i.test(modelUpper)) {
    return false;
  }
  if (maker === 'パナソニック' && /^CS-[^AZW]|^CU-/i.test(modelUpper)) {
    return false;
  }
  if (maker === '日立' && /RAS-|RAC-/i.test(modelUpper)) {
    return false;
  }
  if (maker === 'シャープ' && /AY-|A2Y-/i.test(modelUpper)) {
    return false;
  }
  if (maker === '東芝' && /RAS-|RAC-/i.test(modelUpper)) {
    return false;
  }
  
  return null; // 判定不能
}

// AI APIからおそうじ機能の有無を検索
async function searchCleaningFunctionWithAI(model, maker) {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEYが設定されていません。ローカル判定のみを使用します。');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `メーカー: ${maker}, 型番: ${model}

このエアコンについて、以下の検索クエリでGoogle検索した結果を、Google検索のAI概要のように自然な日本語で回答してください：
- 「${maker} エアコン ${model}」
- 「${maker} エアコン ${model} おそうじ機能」
- 「${maker} エアコン ${model} フィルター自動お掃除機能」
- 「${maker} ${model} 仕様」

必ず以下を含めて回答してください：
1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）
2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）

重要な注意事項：
- 型番は正確に確認してください（例：CS-A400D2Z、CS--0DAX2Kなど、ハイフンの数や位置、数字の位置が重要）
- 完全な型番で検索し、型番の一部だけで判断しないでください
- パナソニックのCS-Aシリーズ（CS-Aで始まる型番）には「フィルター自動お掃除機能」が搭載されている場合が多いです。正確に確認してください。
- 公式サイトやカタログの情報を優先的に参照してください

回答は簡潔に、以下の形式で回答してください：
- エアコンの種類: [種類]
- おそうじ機能: [あり/なし]`;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();
    
    // 回答からおそうじ機能の有無を抽出
    const hasNoCleaningPattern = 
      response.includes('フィルター自動お掃除機能は搭載されていません') ||
      response.includes('フィルター自動おそうじ機能は搭載されていません') ||
      response.includes('フィルター自動お掃除機能は搭載されていない') ||
      response.includes('フィルター自動おそうじ機能は搭載されていない') ||
      response.includes('フィルターは手動掃除') ||
      response.includes('フィルター自動お掃除機能がない') ||
      response.includes('フィルター自動おそうじ機能がない') ||
      response.includes('フィルターの手動清掃が必要') ||
      response.includes('内部クリーン運転のみ') ||
      response.includes('内部乾燥のみ') ||
      response.includes('内部乾燥機能のみ') ||
      response.includes('おそうじ機能：なし') ||
      response.includes('お掃除機能：なし') ||
      response.includes('おそうじ機能なし') ||
      response.includes('お掃除機能なし') ||
      response.includes('おそうじ機能は「なし」') ||
      response.includes('お掃除機能は「なし」') ||
      response.includes('おそうじ機能は「なし」となります') ||
      response.includes('お掃除機能は「なし」となります') ||
      response.includes('おそうじ機能はなし') ||
      response.includes('お掃除機能はなし') ||
      (response.includes('フィルター自動お掃除機能') && response.includes('搭載されていません')) ||
      (response.includes('フィルター自動おそうじ機能') && response.includes('搭載されていません')) ||
      (response.includes('内部乾燥') && !response.includes('フィルター自動お掃除機能'));
    
    const hasCleaningPattern = 
      (response.includes('フィルター自動お掃除機能') && 
       !response.includes('搭載されていません') && 
       !response.includes('搭載されていない') &&
       !response.includes('は搭載されていません') &&
       !response.includes('は搭載されていない')) ||
      (response.includes('フィルター自動おそうじ機能') && 
       !response.includes('搭載されていません') && 
       !response.includes('搭載されていない') &&
       !response.includes('は搭載されていません') &&
       !response.includes('は搭載されていない')) ||
      (response.includes('自動お掃除機能') && 
       !response.includes('内部乾燥のみ') &&
       !response.includes('搭載されていません') &&
       !response.includes('搭載されていない')) ||
      (response.includes('自動おそうじ機能') && 
       !response.includes('内部乾燥のみ') &&
       !response.includes('搭載されていません') &&
       !response.includes('搭載されていない')) ||
      response.includes('おそうじ機能：あり') ||
      response.includes('お掃除機能：あり') ||
      response.includes('おそうじ機能あり') ||
      response.includes('お掃除機能あり');
    
    // ローカル判定を優先
    const localResult = detectCleaningLocal(model, maker);
    if (localResult !== null) {
      return localResult;
    }
    
    if (hasNoCleaningPattern) {
      return false;
    } else if (hasCleaningPattern) {
      return true;
    }
    
    return null; // 判定不能
  } catch (error) {
    console.error(`[AI検索エラー] ${maker} ${model}:`, error.message);
    return null;
  }
}

// 不明な型番を抽出
const unknownModels = cleaningFunctionData.models.filter(m => m.hasCleaningFunction === null);
console.log(`不明な型番数: ${unknownModels.length}`);

// バッチ処理で検索（レート制限を考慮）
const BATCH_SIZE = 10; // 一度に処理する件数
const DELAY_BETWEEN_BATCHES = 2000; // バッチ間の遅延（ミリ秒）

async function processBatch(batch, startIndex) {
  console.log(`\nバッチ処理開始: ${startIndex + 1} - ${startIndex + batch.length}`);
  
  const results = await Promise.all(
    batch.map(async (item, index) => {
      const globalIndex = startIndex + index;
      console.log(`[${globalIndex + 1}/${unknownModels.length}] 検索中: ${item.maker} ${item.model}`);
      
      const result = await searchCleaningFunctionWithAI(item.model, item.maker);
      
      if (result !== null) {
        item.hasCleaningFunction = result;
        item.source = 'ai';
        console.log(`  → ${result ? 'あり' : 'なし'}`);
      } else {
        console.log(`  → 判定不能`);
      }
      
      // レート制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return item;
    })
  );
  
  return results;
}

// メイン処理
async function main() {
  console.log('AI APIでおそうじ機能を検索開始...\n');
  
  let processed = 0;
  let hasCleaning = 0;
  let noCleaning = 0;
  let stillUnknown = 0;
  
  // バッチ処理
  for (let i = 0; i < unknownModels.length; i += BATCH_SIZE) {
    const batch = unknownModels.slice(i, i + BATCH_SIZE);
    const results = await processBatch(batch, i);
    
    results.forEach(item => {
      if (item.hasCleaningFunction === true) hasCleaning++;
      else if (item.hasCleaningFunction === false) noCleaning++;
      else stillUnknown++;
    });
    
    processed += batch.length;
    console.log(`\n進捗: ${processed}/${unknownModels.length} (あり: ${hasCleaning}, なし: ${noCleaning}, 不明: ${stillUnknown})`);
    
    // バッチ間の待機（レート制限対策）
    if (i + BATCH_SIZE < unknownModels.length) {
      console.log(`\n${DELAY_BETWEEN_BATCHES}ms待機中...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  // データを更新
  cleaningFunctionData.metadata.updatedAt = new Date().toISOString();
  cleaningFunctionData.metadata.aiProcessed = {
    total: unknownModels.length,
    hasCleaning: hasCleaning,
    noCleaning: noCleaning,
    stillUnknown: stillUnknown
  };
  
  // 保存
  const outputPath = path.join(__dirname, '../data/cleaningFunctionData.json');
  fs.writeFileSync(outputPath, JSON.stringify(cleaningFunctionData, null, 2), 'utf8');
  
  console.log(`\n処理完了:`);
  console.log(`- 検索した型番数: ${processed}`);
  console.log(`- あり: ${hasCleaning}`);
  console.log(`- なし: ${noCleaning}`);
  console.log(`- 不明: ${stillUnknown}`);
  console.log(`\nデータを保存しました: ${outputPath}`);
}

// 実行
main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
