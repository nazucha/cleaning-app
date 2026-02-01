#!/bin/bash
# 東芝
sed -i '' 's/panasonicModelDetails/toshibaModelDetails/g' scrapeToshibaFullModels.js
sed -i '' 's/パナソニック/東芝/g' scrapeToshibaFullModels.js
sed -i '' 's/panasonic/index-tsb/g' scrapeToshibaFullModels.js
sed -i '' 's/PANASONIC/TOSHIBA/g' scrapeToshibaFullModels.js
sed -i '' 's/scrapePanasonicFullModels/scrapeToshibaFullModels/g' scrapeToshibaFullModels.js
sed -i '' "s/'c'/'a', 'h', 'm', 'r', 'v'/g" scrapeToshibaFullModels.js
sed -i '' 's/panasonic/toshiba/g' scrapeToshibaFullModels.js
sed -i '' 's/panasonicFullModelDetails/toshibaFullModelDetails/g' scrapeToshibaFullModels.js
sed -i '' 's/panasonicCleaningFunctionFromManual/toshibaCleaningFunctionFromManual/g' scrapeToshibaFullModels.js

# シャープ
sed -i '' 's/panasonicModelDetails/sharpModelDetails/g' scrapeSharpFullModels.js
sed -i '' 's/パナソニック/シャープ/g' scrapeSharpFullModels.js
sed -i '' 's/panasonic/index-shp/g' scrapeSharpFullModels.js
sed -i '' 's/PANASONIC/SHARP/g' scrapeSharpFullModels.js
sed -i '' 's/scrapePanasonicFullModels/scrapeSharpFullModels/g' scrapeSharpFullModels.js
sed -i '' "s/'c'/'a', 'j'/g" scrapeSharpFullModels.js
sed -i '' 's/panasonic/sharp/g' scrapeSharpFullModels.js
sed -i '' 's/panasonicFullModelDetails/sharpFullModelDetails/g' scrapeSharpFullModels.js
sed -i '' 's/panasonicCleaningFunctionFromManual/sharpCleaningFunctionFromManual/g' scrapeSharpFullModels.js

# 三菱重工
sed -i '' 's/panasonicModelDetails/mitsubishiHeavyModelDetails/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/パナソニック/三菱重工/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/panasonic/mitsubishi-hindustry/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/PANASONIC/MITSUBISHI/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/scrapePanasonicFullModels/scrapeMitsubishiHeavyFullModels/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' "s/'c'/'s'/g" scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/panasonic/mitsubishi-hindustry/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/panasonicFullModelDetails/mitsubishiHeavyFullModelDetails/g' scrapeMitsubishiHeavyFullModels.js
sed -i '' 's/panasonicCleaningFunctionFromManual/mitsubishiHeavyCleaningFunctionFromManual/g' scrapeMitsubishiHeavyFullModels.js
