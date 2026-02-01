/**
 * 判定が分からない型番のリストを抽出するスクリプト
 */

const fs = require('fs');
const path = require('path');

// データの読み込み
const cleaningFunctionData = require('../data/cleaningFunctionData.json');

// 不明な型番を抽出
const unknownModels = cleaningFunctionData.models.filter(m => m.hasCleaningFunction === null);

console.log(`判定が分からない型番数: ${unknownModels.length}\n`);

// メーカー別にグループ化
const unknownByMaker = {};
unknownModels.forEach(({ model, maker }) => {
  if (!unknownByMaker[maker]) {
    unknownByMaker[maker] = [];
  }
  unknownByMaker[maker].push(model);
});

// メーカー別の統計を表示
console.log('メーカー別の不明型番数:');
for (const [maker, models] of Object.entries(unknownByMaker)) {
  console.log(`- ${maker}: ${models.length}件`);
}

// CSV形式で出力
const csvLines = ['メーカー,型番'];
unknownModels.forEach(({ model, maker }) => {
  // CSVの特殊文字をエスケープ
  const escapedMaker = maker.replace(/"/g, '""');
  const escapedModel = model.replace(/"/g, '""');
  csvLines.push(`"${escapedMaker}","${escapedModel}"`);
});

const csvPath = path.join(__dirname, '../data/unknownModels.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
console.log(`\nCSVファイルを保存しました: ${csvPath}`);

// JSON形式でも出力（メーカー別に整理）
const unknownModelsByMaker = {};
unknownModels.forEach(({ model, maker }) => {
  if (!unknownModelsByMaker[maker]) {
    unknownModelsByMaker[maker] = [];
  }
  unknownModelsByMaker[maker].push(model);
});

const jsonPath = path.join(__dirname, '../data/unknownModels.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  metadata: {
    generatedAt: new Date().toISOString(),
    totalUnknown: unknownModels.length,
    description: "判定が分からない型番のリスト"
  },
  byMaker: unknownModelsByMaker,
  all: unknownModels
}, null, 2), 'utf8');
console.log(`JSONファイルを保存しました: ${jsonPath}`);

// テキスト形式でも出力（読みやすい形式）
const textLines = [`判定が分からない型番リスト（全${unknownModels.length}件）\n`];
textLines.push('='.repeat(50));
textLines.push('');

for (const [maker, models] of Object.entries(unknownModelsByMaker)) {
  textLines.push(`【${maker}】(${models.length}件)`);
  textLines.push('-'.repeat(30));
  models.forEach(model => {
    textLines.push(`  ${model}`);
  });
  textLines.push('');
}

const textPath = path.join(__dirname, '../data/unknownModels.txt');
fs.writeFileSync(textPath, textLines.join('\n'), 'utf8');
console.log(`テキストファイルを保存しました: ${textPath}`);

// 最初の20件を表示
console.log('\n最初の20件:');
unknownModels.slice(0, 20).forEach(({ model, maker }, index) => {
  console.log(`${index + 1}. ${maker}: ${model}`);
});

if (unknownModels.length > 20) {
  console.log(`\n... 他 ${unknownModels.length - 20}件`);
}
