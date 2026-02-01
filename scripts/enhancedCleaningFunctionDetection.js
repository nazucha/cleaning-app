/**
 * 強化されたローカル判定ロジックで全型番のおそうじ機能の有無を判定するスクリプト
 * Web検索結果と型番パターン分析に基づく独自の判定方法
 */

const fs = require('fs');
const path = require('path');

// 型番データの読み込み
const panasonicModelDetails = require('../data/panasonicModelDetails.json');
const daikinModelDetails = require('../data/daikinModelDetails.json');
const mitsubishiModelDetails = require('../data/mitsubishiModelDetails.json');
const hitachiModelDetails = require('../data/hitachiModelDetails.json');
const toshibaModelDetails = require('../data/toshibaModelDetails.json');
const sharpModelDetails = require('../data/sharpModelDetails.json');
const mitsubishiHeavyModelDetails = require('../data/mitsubishiHeavyModelDetails.json');
const fujitsuModelDetails = require('../data/fujitsuModelDetails.json');
const airconModels = require('../data/airconModels.json');

// 強化されたローカル判定関数（Web検索結果と型番パターン分析に基づく）
function detectCleaningEnhanced(model, maker) {
  const modelUpper = model.toUpperCase().trim();
  
  // ===== 三菱電機/三菱重工 =====
  if (maker === '三菱電機' || maker === '三菱重工') {
    // お掃除機能付きのパターン
    // KXZ, KY, GX, GY, ZX, ZY シリーズ
    if (/KXZ|KY[0-9]|GX[0-9]|GY[0-9]|ZX[0-9]|ZY[0-9]|MSZ-KXZ|MSZ-KY|MSZ-GX|MSZ-GY|MSZ-ZX|MSZ-ZY/i.test(modelUpper)) {
      return true;
    }
    // MSZ-GV, MSZ-ZW シリーズ（Web検索結果より）
    if (/MSZ-GV|MSZ-ZW/i.test(modelUpper)) {
      return true;
    }
    // SRK-RS- シリーズ（三菱重工）
    if (/^SRK-RS-/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // KXV, SRF シリーズ（ただしSRK-RS-は除外）
    if (/KXV|MSZ-KXV|^SRF|SRF-/i.test(modelUpper) && !/^SRK-RS-/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== ダイキン =====
  if (maker === 'ダイキン') {
    // お掃除機能付きのパターン
    // Fシリーズ、FTXZ, FTXP
    if (/^F[0-9]|FTXZ|FTXP/i.test(modelUpper)) {
      return true;
    }
    // AN●●R パターン（Web検索結果より）
    if (/^AN\d+R/i.test(modelUpper)) {
      return true;
    }
    // F(S)●●NTRX パターン（Web検索結果より）
    if (/F[S]?\d+NTRX/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // S, Rシリーズ、FTXS, FTXJ
    if (/^S[0-9]|^R[0-9]|FTXS|FTXJ/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== パナソニック =====
  if (maker === 'パナソニック') {
    // お掃除機能付きのパターン
    // CSZ, CSW, CS-A シリーズ
    if (/CSZ|CSW|^CS-A/i.test(modelUpper)) {
      return true;
    }
    // CS-X, CS-WX, CS-EX, CS-GX パターン（Web検索結果より）
    if (/^CS-X|^CS-WX|^CS-EX|^CS-GX/i.test(modelUpper)) {
      return true;
    }
    // CS-で始まり、X, WX, EX, GX が含まれる
    if (/^CS-.*[XWXEXGX]/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // CS-（CS-A, CS-X, CS-WX, CS-EX, CS-GX以外）、CU-
    if (/^CS-[^AXWXEXGXZW]|^CU-/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== 日立 =====
  if (maker === '日立') {
    // お掃除機能付きのパターン
    // RAS-X, RAS-AE, RAS-SE パターン（Web検索結果より）
    if (/RAS-X|RAS-AE|RAS-SE/i.test(modelUpper)) {
      return true;
    }
    // RAS-で始まり、X, AE, SE が含まれる
    if (/^RAS-.*[XAESE]/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // RAS-, RAC- シリーズ（X, AE, SE以外）
    if (/RAS-|RAC-/i.test(modelUpper) && !/RAS-X|RAS-AE|RAS-SE/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== 東芝 =====
  if (maker === '東芝') {
    // お掃除機能付きのパターン
    // RAS-X, RAS-AE パターン（Web検索結果より）
    if (/RAS-X|RAS-AE/i.test(modelUpper)) {
      return true;
    }
    // RAS-で始まり、X, AE が含まれる
    if (/^RAS-.*[XAE]/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // RAS-, RAC- シリーズ（X, AE以外）
    if (/RAS-|RAC-/i.test(modelUpper) && !/RAS-X|RAS-AE/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== シャープ =====
  if (maker === 'シャープ' || maker === 'シャープ（SHARP）') {
    // お掃除機能付きのパターン
    // AY-G, AY-L パターン（Web検索結果より）
    if (/AY-G|AY-L/i.test(modelUpper)) {
      return true;
    }
    // AY-で始まり、G, L が含まれる
    if (/^AY-.*[GL]/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // AY-, A2Y- シリーズ（G, L以外）
    if (/(AY-|A2Y-)/i.test(modelUpper) && !/AY-G|AY-L/i.test(modelUpper)) {
      return false;
    }
  }
  
  // ===== 富士通ゼネラル =====
  if (maker === '富士通ゼネラル' || maker === '富士通') {
    // お掃除機能付きのパターン
    // AS-X, AS-Z パターン（Web検索結果より）
    if (/AS-X|AS-Z/i.test(modelUpper)) {
      return true;
    }
    // AS-で始まり、X, Z が含まれる
    if (/^AS-.*[XZ]/i.test(modelUpper)) {
      return true;
    }
    
    // お掃除機能なしのパターン
    // AS- シリーズ（X, Z以外）
    if (/^AS-/i.test(modelUpper) && !/AS-X|AS-Z/i.test(modelUpper)) {
      return false;
    }
  }
  
  return null; // 判定不能
}

// 型番データを抽出する関数
function extractModels(modelDetails, maker) {
  const models = [];
  if (modelDetails.modelDetails) {
    for (const prefix in modelDetails.modelDetails) {
      const detailModels = modelDetails.modelDetails[prefix];
      if (Array.isArray(detailModels)) {
        detailModels.forEach(model => {
          models.push({ model, maker });
        });
      }
    }
  }
  return models;
}

// 全型番データを収集
const allModels = [];

// 各メーカーの詳細型番データから抽出
allModels.push(...extractModels(panasonicModelDetails, 'パナソニック'));
allModels.push(...extractModels(daikinModelDetails, 'ダイキン'));
allModels.push(...extractModels(mitsubishiModelDetails, '三菱電機'));
allModels.push(...extractModels(hitachiModelDetails, '日立'));
allModels.push(...extractModels(toshibaModelDetails, '東芝'));
allModels.push(...extractModels(sharpModelDetails, 'シャープ'));
allModels.push(...extractModels(mitsubishiHeavyModelDetails, '三菱重工'));
allModels.push(...extractModels(fujitsuModelDetails, '富士通ゼネラル'));

// airconModels.jsonからも取得（詳細型番がない場合のフォールバック）
for (const [manufacturer, data] of Object.entries(airconModels.manufacturers)) {
  if (data.modelPatterns) {
    data.modelPatterns.forEach(pattern => {
      // 既に詳細型番に含まれているかチェック
      const exists = allModels.some(m => m.model === pattern && m.maker === manufacturer);
      if (!exists) {
        allModels.push({ model: pattern, maker: manufacturer });
      }
    });
  }
}

console.log(`総型番数: ${allModels.length}`);

// おそうじ機能の有無を判定
const cleaningFunctionData = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalModels: allModels.length,
    description: "全型番のおそうじ機能の有無を判定したデータ（強化されたローカル判定ロジック使用）",
    method: "enhanced-local-detection"
  },
  models: []
};

let processed = 0;
let hasCleaning = 0;
let noCleaning = 0;
let unknown = 0;

allModels.forEach(({ model, maker }) => {
  const result = detectCleaningEnhanced(model, maker);
  
  cleaningFunctionData.models.push({
    model: model,
    maker: maker,
    hasCleaningFunction: result === true ? true : (result === false ? false : null),
    source: result !== null ? 'enhanced-local' : 'unknown'
  });
  
  processed++;
  if (result === true) hasCleaning++;
  else if (result === false) noCleaning++;
  else unknown++;
  
  if (processed % 1000 === 0) {
    console.log(`処理中: ${processed}/${allModels.length} (あり: ${hasCleaning}, なし: ${noCleaning}, 不明: ${unknown})`);
  }
});

console.log(`\n処理完了:`);
console.log(`- 総数: ${processed}`);
console.log(`- あり: ${hasCleaning}`);
console.log(`- なし: ${noCleaning}`);
console.log(`- 不明: ${unknown}`);
console.log(`- 判定率: ${((hasCleaning + noCleaning) / processed * 100).toFixed(1)}%`);

// JSONファイルに保存
const outputPath = path.join(__dirname, '../data/cleaningFunctionData.json');
fs.writeFileSync(outputPath, JSON.stringify(cleaningFunctionData, null, 2), 'utf8');
console.log(`\nデータを保存しました: ${outputPath}`);

// 統計情報を表示
const makerStats = {};
cleaningFunctionData.models.forEach(({ maker, hasCleaningFunction }) => {
  if (!makerStats[maker]) {
    makerStats[maker] = { total: 0, has: 0, no: 0, unknown: 0 };
  }
  makerStats[maker].total++;
  if (hasCleaningFunction === true) makerStats[maker].has++;
  else if (hasCleaningFunction === false) makerStats[maker].no++;
  else makerStats[maker].unknown++;
});

console.log('\nメーカー別統計:');
for (const [maker, stats] of Object.entries(makerStats)) {
  const rate = ((stats.has + stats.no) / stats.total * 100).toFixed(1);
  console.log(`${maker}: 総数=${stats.total}, あり=${stats.has}, なし=${stats.no}, 不明=${stats.unknown} (判定率: ${rate}%)`);
}
