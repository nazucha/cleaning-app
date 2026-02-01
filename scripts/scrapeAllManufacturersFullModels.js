/**
 * 全メーカーの完全な詳細型番を取得するスクリプト
 * 各メーカーのスクリプトを順次実行
 */

const { scrapeDaikinFullModels } = require('./scrapeDaikinFullModels');
const { scrapeMitsubishiFullModels } = require('./scrapeMitsubishiFullModels');
const { scrapePanasonicFullModels } = require('./scrapePanasonicFullModels');

// 他のメーカーのスクリプトもインポート（作成後）
// const { scrapeHitachiFullModels } = require('./scrapeHitachiFullModels');
// const { scrapeToshibaFullModels } = require('./scrapeToshibaFullModels');
// const { scrapeSharpFullModels } = require('./scrapeSharpFullModels');
// const { scrapeMitsubishiHeavyFullModels } = require('./scrapeMitsubishiHeavyFullModels');
// const { scrapeFujitsuFullModels } = require('./scrapeFujitsuFullModels');

async function scrapeAllManufacturers() {
  console.log('=== 全メーカーの完全な詳細型番を取得開始 ===\n');
  
  const manufacturers = [
    { name: 'ダイキン', func: scrapeDaikinFullModels },
    { name: '三菱電機', func: scrapeMitsubishiFullModels },
    { name: 'パナソニック', func: scrapePanasonicFullModels },
    // 他のメーカーも追加（スクリプト作成後）
  ];
  
  for (const manufacturer of manufacturers) {
    try {
      console.log(`\n【${manufacturer.name}】の処理を開始します...\n`);
      await manufacturer.func();
      console.log(`\n【${manufacturer.name}】の処理が完了しました。\n`);
      console.log('---\n');
      
      // メーカー間で少し待機
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`【${manufacturer.name}】の処理でエラーが発生しました:`, error.message);
    }
  }
  
  console.log('\n=== 全メーカーの処理が完了しました ===');
}

if (require.main === module) {
  scrapeAllManufacturers().catch(console.error);
}

module.exports = { scrapeAllManufacturers };
