/**
 * Google Sheetsへの送信用バックエンドAPIサーバー
 * 開発用の簡易サーバー
 */

const express = require('express');
const cors = require('cors');
const { LangchainToolSet } = require('composio-core');

const app = express();
const PORT = 3000;

const COMPOSIO_API_KEY = "ak_aWhVHx6ydUMXsYHsckab";
const SPREADSHEET_ID = "1aWMoYwabogOwSP3xo1EreMesqP0JN1yFGWPmCC5wK-E";

const toolSet = new LangchainToolSet({
  apiKey: COMPOSIO_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/submit', async (req, res) => {
  try {
    const { spreadsheetId, sheetName, data } = req.body;
    
    console.log('受信したデータ:', data);
    
    // Google Sheetsにデータを追加
    const response = await toolSet.executeAction({
      action: "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
      params: {
        spreadsheetId: spreadsheetId || SPREADSHEET_ID,
        range: `${sheetName || '畑山'}!A:Z`,
        valueInputOption: "USER_ENTERED",
        values: [data],
      },
      entityId: "default",
    });
    
    res.json({ success: true, message: 'データを送信しました', response });
  } catch (error) {
    console.error('エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📡 APIエンドポイント: http://localhost:${PORT}/api/submit`);
});
