/**
 * 全型番データからおそうじ機能の有無を判定してデータを生成するスクリプト
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
    // SRK-RS-はお掃除機能付きなので除外
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
    description: "全型番のおそうじ機能の有無を判定したデータ"
  },
  models: []
};

let processed = 0;
let hasCleaning = 0;
let noCleaning = 0;
let unknown = 0;

allModels.forEach(({ model, maker }) => {
  const result = detectCleaningLocal(model, maker);
  const hasCleaningValue = result === true;
  const hasNoCleaningValue = result === false;
  
  cleaningFunctionData.models.push({
    model: model,
    maker: maker,
    hasCleaningFunction: result === true ? true : (result === false ? false : null),
    source: result !== null ? 'local' : 'unknown'
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
  console.log(`${maker}: 総数=${stats.total}, あり=${stats.has}, なし=${stats.no}, 不明=${stats.unknown}`);
}
