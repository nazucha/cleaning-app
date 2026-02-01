/**
 * 取扱説明書から取得したお掃除機能データをcleaningFunctionData.jsonに統合するスクリプト
 * 取扱説明書のデータを優先的に使用
 */

const fs = require('fs');
const path = require('path');

// メーカー名のマッピング（ファイル名 → メーカー名）
const manufacturerMapping = {
  'daikinCleaningFunctionFromManual.json': 'ダイキン',
  'mitsubishiCleaningFunctionFromManual.json': '三菱電機',
  'panasonicCleaningFunctionFromManual.json': 'パナソニック',
  'hitachiCleaningFunctionFromManual.json': '日立',
  'toshibaCleaningFunctionFromManual.json': '東芝',
  'sharpCleaningFunctionFromManual.json': 'シャープ',
  'mitsubishiHeavyCleaningFunctionFromManual.json': '三菱重工',
  'fujitsuCleaningFunctionFromManual.json': '富士通ゼネラル',
};

// 既存のcleaningFunctionData.jsonを読み込む
const existingDataPath = path.join(__dirname, '../data/cleaningFunctionData.json');
let existingData = { metadata: {}, models: [] };

if (fs.existsSync(existingDataPath)) {
  try {
    existingData = JSON.parse(fs.readFileSync(existingDataPath, 'utf8'));
    console.log(`既存データを読み込みました: ${existingData.models.length}件`);
  } catch (error) {
    console.warn('既存データの読み込みに失敗しました。新規作成します。', error.message);
    existingData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalModels: 0,
        description: '全型番のおそうじ機能の有無を判定したデータ（取扱説明書データ優先）',
        method: 'manual-priority',
        lastUpdated: new Date().toISOString()
      },
      models: []
    };
  }
}

// 取扱説明書から取得したデータを読み込む
const manualDataPath = path.join(__dirname, '../data');
const manualDataFiles = fs.readdirSync(manualDataPath)
  .filter(file => file.includes('CleaningFunctionFromManual.json'));

console.log(`\n取扱説明書データファイル: ${manualDataFiles.length}件見つかりました\n`);

const manualDataMap = new Map(); // 型番 -> { maker, hasCleaningFunction, source }

for (const file of manualDataFiles) {
  const filePath = path.join(manualDataPath, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const manufacturer = manufacturerMapping[file] || file.replace('CleaningFunctionFromManual.json', '');
    
    console.log(`【${manufacturer}】のデータを処理中...`);
    
    let count = 0;
    // データ構造: { "AJT-SEP": { "AJT40SEP": true, "AJT56SEP": true }, ... }
    for (const [baseModel, fullModels] of Object.entries(data)) {
      if (typeof fullModels === 'object' && fullModels !== null) {
        for (const [fullModel, hasCleaning] of Object.entries(fullModels)) {
          if (typeof hasCleaning === 'boolean') {
            manualDataMap.set(fullModel.toUpperCase(), {
              maker: manufacturer,
              hasCleaningFunction: hasCleaning,
              source: 'manual'
            });
            count++;
          }
        }
      }
    }
    
    console.log(`  ✓ ${count}件の型番データを読み込みました`);
  } catch (error) {
    console.warn(`  ✗ ${file} の読み込みに失敗:`, error.message);
  }
}

console.log(`\n取扱説明書から取得したデータ: ${manualDataMap.size}件\n`);

// 既存データを更新（取扱説明書のデータを優先）
const updatedModels = [];
const existingModelMap = new Map();

// 既存データをマップに変換（重複チェック用）
for (const model of existingData.models || []) {
  const key = model.model.toUpperCase();
  if (!existingModelMap.has(key)) {
    existingModelMap.set(key, model);
  }
}

// 取扱説明書のデータを優先的に追加
for (const [model, data] of manualDataMap.entries()) {
  updatedModels.push({
    model: model,
    maker: data.maker,
    hasCleaningFunction: data.hasCleaningFunction,
    source: data.source
  });
}

// 既存データで取扱説明書にない型番を追加（取扱説明書のデータを優先）
for (const [model, data] of existingModelMap.entries()) {
  if (!manualDataMap.has(model)) {
    updatedModels.push({
      model: data.model,
      maker: data.maker,
      hasCleaningFunction: data.hasCleaningFunction,
      source: data.source || 'enhanced-local'
    });
  }
}

// 結果を保存
const output = {
  metadata: {
    generatedAt: existingData.metadata?.generatedAt || new Date().toISOString(),
    totalModels: updatedModels.length,
    description: '全型番のおそうじ機能の有無を判定したデータ（取扱説明書データ優先）',
    method: 'manual-priority',
    lastUpdated: new Date().toISOString(),
    manualDataCount: manualDataMap.size,
    existingDataCount: existingModelMap.size
  },
  models: updatedModels.sort((a, b) => {
    // メーカー順、その後型番順でソート
    if (a.maker !== b.maker) {
      return a.maker.localeCompare(b.maker);
    }
    return a.model.localeCompare(b.model);
  })
};

const outputPath = path.join(__dirname, '../data/cleaningFunctionData.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n==========================================`);
console.log(`統合完了！`);
console.log(`==========================================`);
console.log(`取扱説明書データ: ${manualDataMap.size}件`);
console.log(`既存データ（取扱説明書にない型番）: ${existingModelMap.size - manualDataMap.size}件`);
console.log(`合計: ${updatedModels.length}件`);
console.log(`\n結果を ${outputPath} に保存しました`);
