/**
 * 完全な詳細型番を生成するスクリプト
 * 「--」を含む不完全な型番から、サイズ番号を補完して完全な型番を生成
 */

const fs = require('fs');
const path = require('path');

// 一般的なエアコンのサイズ番号（kW × 10）
const COMMON_SIZES = [
  '22',   // 2.2kW - 6畳用
  '25',   // 2.5kW - 8畳用
  '28',   // 2.8kW - 10畳用
  '36',   // 3.6kW - 12畳用
  '40',   // 4.0kW - 14畳用
  '50',   // 5.0kW - 16畳用
  '56',   // 5.6kW - 18畳用
  '63',   // 6.3kW - 20畳用
  '71',   // 7.1kW - 23畳用
  '80',   // 8.0kW - 26畳用
  '90',   // 9.0kW - 29畳用
  '100',  // 10.0kW - 31畳用
  '112',  // 11.2kW
  '140',  // 14.0kW
  '160',  // 16.0kW
  '224',  // 22.4kW（業務用）
  '280',  // 28.0kW（業務用）
];

// メーカー別の追加サイズ（特殊なサイズ）
const MAKER_SPECIFIC_SIZES = {
  '三菱電機': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  'パナソニック': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  '日立': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  '東芝': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  'シャープ': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  '三菱重工': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  '富士通ゼネラル': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
  'ダイキン': ['22', '25', '28', '36', '40', '50', '56', '63', '71', '80', '90', '100', '112', '140', '160', '224', '280'],
};

/**
 * 不完全な型番から完全な型番を生成
 * 例: 「MSZ--16B」→「MSZ-2216B」「MSZ-2516B」など
 * 例: 「LV--RE」→「LV-22RE」「LV-25RE」など
 */
function generateFullModelsFromIncomplete(incompleteModel, sizes) {
  const fullModels = [];
  
  // 「--」を含む場合
  if (incompleteModel.includes('--')) {
    for (const size of sizes) {
      // 「--」を「-サイズ」に置換（ハイフンを保持）
      const fullModel = incompleteModel.replace('--', '-' + size);
      fullModels.push(fullModel);
    }
  } else {
    // 「--」を含まない場合はそのまま追加
    fullModels.push(incompleteModel);
  }
  
  return fullModels;
}

/**
 * メーカーの詳細型番ファイルを処理して、完全な型番を生成
 */
function processManufacturerData(inputFile, outputFile, manufacturer) {
  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const sizes = MAKER_SPECIFIC_SIZES[manufacturer] || COMMON_SIZES;
    
    const fullModelDetails = {};
    let totalModels = 0;
    let incompleteCount = 0;
    let completeCount = 0;
    
    for (const [prefix, models] of Object.entries(data.modelDetails)) {
      const allFullModels = new Set();
      
      for (const model of models) {
        if (!model || model.trim() === '' || model.length <= 1) {
          continue;
        }
        
        if (model.includes('--')) {
          // 不完全な型番から完全な型番を生成
          incompleteCount++;
          const generatedModels = generateFullModelsFromIncomplete(model, sizes);
          for (const fullModel of generatedModels) {
            allFullModels.add(fullModel);
          }
        } else {
          // 既に完全な型番
          completeCount++;
          allFullModels.add(model);
        }
      }
      
      if (allFullModels.size > 0) {
        fullModelDetails[prefix] = [...allFullModels].sort();
        totalModels += allFullModels.size;
      }
    }
    
    const output = {
      manufacturer: manufacturer,
      source: data.source || 'Generated from incomplete models',
      lastUpdated: new Date().toISOString().split('T')[0],
      totalFullModels: totalModels,
      note: `Generated ${incompleteCount} incomplete models into ${totalModels - completeCount} full models. ${completeCount} models were already complete.`,
      modelDetails: fullModelDetails
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✓ ${manufacturer}: ${totalModels}件の完全な型番を生成しました`);
    console.log(`  - 不完全な型番: ${incompleteCount}件 → ${totalModels - completeCount}件に展開`);
    console.log(`  - 既に完全な型番: ${completeCount}件`);
    console.log(`  - 出力: ${outputFile}`);
    
    return { totalModels, incompleteCount, completeCount };
  } catch (error) {
    console.error(`✗ ${manufacturer}: エラー - ${error.message}`);
    return null;
  }
}

// メイン処理
function main() {
  const dataDir = path.join(__dirname, '../data');
  const args = process.argv.slice(2);
  const manufacturer = args[0] || 'all';
  
  const manufacturers = {
    'mitsubishi': {
      name: '三菱電機',
      input: 'mitsubishiFullModelDetails.json',
      output: 'mitsubishiFullModelDetails_generated.json'
    },
    'panasonic': {
      name: 'パナソニック',
      input: 'panasonicFullModelDetails.json',
      output: 'panasonicFullModelDetails_generated.json'
    },
    'hitachi': {
      name: '日立',
      input: 'hitachiFullModelDetails.json',
      output: 'hitachiFullModelDetails_generated.json'
    },
    'toshiba': {
      name: '東芝',
      input: 'index-tsbFullModelDetails.json',
      output: 'toshibaFullModelDetails_generated.json'
    },
    'sharp': {
      name: 'シャープ',
      input: 'index-shpFullModelDetails.json',
      output: 'sharpFullModelDetails_generated.json'
    },
    'mitsubishi-heavy': {
      name: '三菱重工',
      input: 'mitsubishi-hindustryFullModelDetails.json',
      output: 'mitsubishiHeavyFullModelDetails_generated.json'
    },
    'fujitsu': {
      name: '富士通ゼネラル',
      input: 'fujitsuFullModelDetails.json',
      output: 'fujitsuFullModelDetails_generated.json'
    }
  };
  
  if (manufacturer === 'all') {
    // 全メーカーを処理
    for (const [key, config] of Object.entries(manufacturers)) {
      console.log(`\n=== ${config.name}の完全な詳細型番を生成 ===`);
      processManufacturerData(
        path.join(dataDir, config.input),
        path.join(dataDir, config.output),
        config.name
      );
    }
  } else if (manufacturers[manufacturer]) {
    const config = manufacturers[manufacturer];
    console.log(`\n=== ${config.name}の完全な詳細型番を生成 ===`);
    processManufacturerData(
      path.join(dataDir, config.input),
      path.join(dataDir, config.output),
      config.name
    );
  } else {
    console.log(`不明なメーカー: ${manufacturer}`);
    console.log(`使用可能なメーカー: ${Object.keys(manufacturers).join(', ')}, all`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateFullModelsFromIncomplete, processManufacturerData };
