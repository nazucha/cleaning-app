/**
 * データベース整合性確認スクリプト
 * グラウンディング機能を使って、既存データの整合性を確認し、必要に応じて更新
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ローカル判定関数（server.jsと同じロジック）
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
  
  return null; // 判定不能
}

// Gemini API呼び出し関数
async function callGeminiAPI(maker, model, localCleaningData) {
  const USE_VERTEX_AI = process.env.USE_VERTEX_AI === 'true' || !!process.env.GOOGLE_CLOUD_PROJECT;
  const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  try {
    let geminiResponse;
    
    if (USE_VERTEX_AI) {
      // Vertex AI経由
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({
        vertexai: true,
        project: GOOGLE_CLOUD_PROJECT,
        location: 'us-central1'
      });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // グラウンディング無料枠が大きい（1日10,000件まで）
        contents: `メーカー: ${maker}, 型番: ${model}

このエアコンについて、Google検索のAI概要のように、実際の検索結果を基に自然な日本語で回答してください。

${localCleaningData && localCleaningData.hasCleaningFunction !== null ? 
  `【重要】ローカルデータベースには以下の情報があります：
- おそうじ機能: ${localCleaningData.hasCleaningFunction ? 'あり' : 'なし'}（${localCleaningData.source}）
この情報とGoogle検索の結果を照合して、より正確な情報を提供してください。` : ''}

必ず以下を含めて回答してください：
1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）
2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）

重要な注意事項：
- 型番は正確に確認してください
- 完全な型番で検索し、型番の一部だけで判断しないでください
- 公式サイトやカタログの情報を優先的に参照してください
- Google検索の最新の情報を参照してください`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      geminiResponse = response.text;
    } else {
      // Developer API経由
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} }]
      });
      
      const prompt = `メーカー: ${maker}, 型番: ${model}

このエアコンについて、Google検索のAI概要のように、実際の検索結果を基に自然な日本語で回答してください。

${localCleaningData && localCleaningData.hasCleaningFunction !== null ? 
  `【重要】ローカルデータベースには以下の情報があります：
- おそうじ機能: ${localCleaningData.hasCleaningFunction ? 'あり' : 'なし'}（${localCleaningData.source}）
この情報とGoogle検索の結果を照合して、より正確な情報を提供してください。` : ''}

必ず以下を含めて回答してください：
1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）
2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）

重要な注意事項：
- 型番は正確に確認してください
- 完全な型番で検索し、型番の一部だけで判断しないでください
- 公式サイトやカタログの情報を優先的に参照してください
- Google検索の最新の情報を参照してください`;

      const result = await geminiModel.generateContent(prompt);
      geminiResponse = result.response.text();
    }
    
    // おそうじ機能の有無を抽出
    const hasNoCleaningPattern = 
      geminiResponse.includes('フィルター自動お掃除機能は搭載されていません') ||
      geminiResponse.includes('フィルター自動おそうじ機能は搭載されていません') ||
      geminiResponse.includes('フィルター自動お掃除機能は搭載されていない') ||
      geminiResponse.includes('フィルター自動おそうじ機能は搭載されていない') ||
      geminiResponse.includes('内部乾燥のみ') ||
      geminiResponse.includes('おそうじ機能：なし') ||
      geminiResponse.includes('お掃除機能：なし') ||
      geminiResponse.includes('おそうじ機能なし') ||
      geminiResponse.includes('お掃除機能なし') ||
      geminiResponse.includes('おそうじ機能は「なし」') ||
      geminiResponse.includes('おそうじ機能は「なし」となります');
    
    const hasCleaningPattern = 
      (geminiResponse.includes('フィルター自動お掃除機能') && 
       !geminiResponse.includes('搭載されていません') && 
       !geminiResponse.includes('搭載されていない')) ||
      (geminiResponse.includes('フィルター自動おそうじ機能') && 
       !geminiResponse.includes('搭載されていません') && 
       !geminiResponse.includes('搭載されていない'));
    
    let hasCleaning = null;
    if (hasNoCleaningPattern) {
      hasCleaning = false;
    } else if (hasCleaningPattern) {
      hasCleaning = true;
    }
    
    return {
      response: geminiResponse,
      hasCleaning: hasCleaning
    };
  } catch (error) {
    console.error(`[エラー] ${maker} ${model}:`, error.message);
    throw error;
  }
}

// メイン処理
async function main() {
  console.log('=== データベース整合性確認スクリプト ===\n');
  
  // データの読み込み
  const cleaningDataPath = path.join(__dirname, '../data/cleaningFunctionData.json');
  const cleaningData = JSON.parse(fs.readFileSync(cleaningDataPath, 'utf8'));
  
  console.log(`総型番数: ${cleaningData.models.length}件\n`);
  
  // バックアップを作成
  const backupPath = path.join(__dirname, `../data/cleaningFunctionData.backup.${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(cleaningData, null, 2), 'utf8');
  console.log(`バックアップを作成: ${backupPath}\n`);
  
  const stats = {
    total: cleaningData.models.length,
    skipped: 0, // 既に確定している型番（スキップ）
    verified: 0, // APIで確認した型番
    updated: 0, // 更新した型番
    errors: 0, // エラーが発生した型番
    unchanged: 0 // 変更なし
  };
  
  const report = {
    updated: [],
    errors: [],
    unchanged: []
  };
  
  // 各型番を処理
  for (let i = 0; i < cleaningData.models.length; i++) {
    const modelData = cleaningData.models[i];
    const { model, maker, hasCleaningFunction: dbHasCleaning, source } = modelData;
    
    console.log(`[${i + 1}/${cleaningData.models.length}] ${maker} ${model}`);
    
    // ローカル判定
    const localHasCleaning = detectCleaningLocal(model, maker);
    
    // スキップ条件: ローカル判定とデータベースが一致し、信頼度が高い場合
    const isHighConfidence = 
      localHasCleaning !== null && 
      dbHasCleaning !== null && 
      localHasCleaning === dbHasCleaning &&
      (source === 'enhanced-local' || source === 'local-detection');
    
    if (isHighConfidence) {
      console.log(`  → スキップ（高信頼度: ローカル判定とDBが一致）`);
      stats.skipped++;
      continue;
    }
    
    // APIで確認
    try {
      stats.verified++;
      console.log(`  → APIで確認中...`);
      
      const result = await callGeminiAPI(maker, model, modelData);
      
      // 判定結果の比較
      const finalHasCleaning = localHasCleaning !== null 
        ? localHasCleaning 
        : (result.hasCleaning !== null ? result.hasCleaning : dbHasCleaning);
      
      // データベースを更新
      const needsUpdate = dbHasCleaning !== finalHasCleaning;
      
      if (needsUpdate) {
        cleaningData.models[i].hasCleaningFunction = finalHasCleaning;
        cleaningData.models[i].source = 'ai-grounding-verified';
        cleaningData.models[i].updatedAt = new Date().toISOString();
        cleaningData.models[i].previousValue = dbHasCleaning;
        cleaningData.models[i].previousSource = source;
        
        stats.updated++;
        report.updated.push({
          model,
          maker,
          old: dbHasCleaning,
          new: finalHasCleaning,
          local: localHasCleaning,
          ai: result.hasCleaning
        });
        
        console.log(`  → 更新: ${dbHasCleaning !== null ? (dbHasCleaning ? 'あり' : 'なし') : '不明'} → ${finalHasCleaning !== null ? (finalHasCleaning ? 'あり' : 'なし') : '不明'}`);
      } else {
        stats.unchanged++;
        console.log(`  → 変更なし`);
      }
      
      // レート制限を考慮して待機（5リクエスト/秒程度）
      if (i < cleaningData.models.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      stats.errors++;
      report.errors.push({
        model,
        maker,
        error: error.message
      });
      console.log(`  → エラー: ${error.message}`);
    }
    
    // 進捗を表示（100件ごと）
    if ((i + 1) % 100 === 0) {
      console.log(`\n[進捗] 処理済み: ${i + 1}/${cleaningData.models.length}`);
      console.log(`  スキップ: ${stats.skipped}, 確認: ${stats.verified}, 更新: ${stats.updated}, エラー: ${stats.errors}\n`);
    }
  }
  
  // データを保存
  cleaningData.metadata.lastVerified = new Date().toISOString();
  cleaningData.metadata.verificationStats = stats;
  fs.writeFileSync(cleaningDataPath, JSON.stringify(cleaningData, null, 2), 'utf8');
  
  // レポートを出力
  const reportPath = path.join(__dirname, `../data/verification-report.${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // 結果を表示
  console.log('\n=== 処理完了 ===');
  console.log(`総数: ${stats.total}件`);
  console.log(`スキップ: ${stats.skipped}件（高信頼度のためAPI呼び出し不要）`);
  console.log(`確認: ${stats.verified}件（APIで確認）`);
  console.log(`更新: ${stats.updated}件`);
  console.log(`変更なし: ${stats.unchanged}件`);
  console.log(`エラー: ${stats.errors}件`);
  console.log(`\nレポート: ${reportPath}`);
  console.log(`バックアップ: ${backupPath}`);
}

// 実行
main().catch(console.error);
