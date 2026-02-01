/**
 * Google Sheets 送信用 API サーバー
 * フォームデータを受け取り、「畑山」シートの末尾に1行追加します。
 */

// 環境変数を.envファイルから読み込む（ローカル用、本番では環境変数を直接使用）
try { require('dotenv').config(); } catch (e) { /* dotenvがなくても本番では問題なし */ }

const express = require("express");
const cors = require("cors");
const { LangchainToolSet } = require("composio-core");
const nodemailer = require("nodemailer");

const app = express();
// Railway等の本番環境では process.env.PORT を使用、ローカルでは3000
const PORT = process.env.PORT || 3000;

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || "ak_aWhVHx6ydUMXsYHsckab";
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1aWMoYwabogOwSP3xo1EreMesqP0JN1yFGWPmCC5wK-E";
const CALENDAR_ID = process.env.CALENDAR_ID || "primary";

// Google Chat Webhook URL（清掃注文通知スペース）
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAQA551auBw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=OWmyp-cG-pCS8DIBJzi7R3Foh2H1PhGnHTxPgIMY15I";

// メール送信設定（Gmail用）
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "アイソウジ";

// メール送信用のトランスポーター
let emailTransporter = null;
if (EMAIL_USER && EMAIL_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
  console.log('📧 メール送信機能: 有効');
} else {
  console.log('📧 メール送信機能: 無効（環境変数 EMAIL_USER, EMAIL_PASSWORD が未設定）');
}

// お客様への自動返信メールを送信する関数
const sendAutoReplyEmail = async (formData) => {
  if (!emailTransporter) {
    console.log('[メール] トランスポーターが設定されていないため、送信をスキップ');
    return { success: false, skipped: true, error: 'メール設定が未完了' };
  }

  if (!formData.email) {
    console.log('[メール] メールアドレスが未入力のため、送信をスキップ');
    return { success: false, skipped: true, error: 'メールアドレスが未入力' };
  }

  try {
    const inquiryTypeText = Array.isArray(formData.inquiryType) 
      ? formData.inquiryType.join('、') 
      : formData.inquiryType || '未選択';

    const preferredDatesText = [
      formData.preferredDate1 ? `第一希望: ${formData.preferredDate1}` : null,
      formData.preferredDate2 ? `第二希望: ${formData.preferredDate2}` : null,
      formData.preferredDate3 ? `第三希望: ${formData.preferredDate3}` : null,
    ].filter(Boolean).join('\n');

    const mailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: formData.email,
      subject: '【アイソウジ】清掃のご依頼を受け付けました',
      text: `${formData.customerName || 'お客'}様

この度は清掃サービスへのご依頼、誠にありがとうございます。
以下の内容でお申し込みを受け付けました。

━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ご依頼内容
━━━━━━━━━━━━━━━━━━━━━━━━━━
ご依頼内容: ${inquiryTypeText}

■ お客様情報
お名前: ${formData.customerName || '未入力'}
フリガナ: ${formData.customerNameKana || '未入力'}
電話番号: ${formData.phone || '未入力'}
メールアドレス: ${formData.email || '未入力'}
住所: ${formData.postalCode ? formData.postalCode + ' ' : ''}${formData.address || '未入力'}

■ ご希望日時
${preferredDatesText || '未入力'}

■ 料金（税込）
合計金額: ${formData.totalAmount ? Number(formData.totalAmount).toLocaleString() + '円' : '未計算'}
${formData.setDiscount && formData.setDiscount !== '-' && formData.setDiscount !== '0' ? `セット割: ${formData.setDiscount}円` : ''}

${formData.notes ? `■ 備考\n${formData.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━

担当者より、ご希望日時の確認のためご連絡させていただきます。
今しばらくお待ちくださいませ。

ご不明な点がございましたら、お気軽にお問い合わせください。
お急ぎの場合は、お電話でも承っております。

お電話：0120-910-132
（受付時間：平日9:00〜18:00）

━━━━━━━━━━━━━━━━━━━━━━━━━━
アイソウジ
━━━━━━━━━━━━━━━━━━━━━━━━━━

※このメールは自動送信されています。
※このメールに心当たりがない場合は、お手数ですが削除してください。
`,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('[メール] 自動返信送信成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[メール] 自動返信送信エラー:', error.message);
    return { success: false, error: error.message };
  }
};

const toolSet = new LangchainToolSet({ apiKey: COMPOSIO_API_KEY });

// Google Chatに通知を送信する関数
const sendGoogleChatNotification = async (formData) => {
  try {
    // フォームデータから通知メッセージを作成
    const sourceLabel = formData.isCustomerMode ? '📱 *お客様用フォームから送信*' : '💼 *スタッフ用フォームから送信*';
    const message = {
      text: `🧹 *新しい清掃注文が入りました*\n${sourceLabel}\n\n` +
        `📋 *清掃会社*: ${formData.cleaningCompany || '未選択'}\n` +
        `📝 *問い合わせ内容*: ${Array.isArray(formData.inquiryType) ? formData.inquiryType.join('、') : formData.inquiryType || '未選択'}\n\n` +
        `👤 *お客様情報*\n` +
        `・お名前: ${formData.customerName || '未入力'}\n` +
        `・フリガナ: ${formData.customerNameKana || '未入力'}\n` +
        `・電話番号: ${formData.phone || '未入力'}\n` +
        `・メール: ${formData.email || '未入力'}\n` +
        `・住所: ${formData.postalCode ? formData.postalCode + ' ' : ''}${formData.address || '未入力'}\n\n` +
        `📅 *希望日時*\n` +
        `・第一希望: ${formData.preferredDate1 || '未入力'}${formData.preferredDateAvailability1 ? ' (' + formData.preferredDateAvailability1 + ')' : ''}\n` +
        `・第二希望: ${formData.preferredDate2 || '未入力'}${formData.preferredDateAvailability2 ? ' (' + formData.preferredDateAvailability2 + ')' : ''}\n` +
        `・第三希望: ${formData.preferredDate3 || '未入力'}${formData.preferredDateAvailability3 ? ' (' + formData.preferredDateAvailability3 + ')' : ''}\n\n` +
        `💰 *料金*\n` +
        `・合計金額: ${formData.totalAmount ? Number(formData.totalAmount).toLocaleString() + '円' : '未計算'}\n` +
        `・セット割: ${formData.setDiscount && formData.setDiscount !== '-' && formData.setDiscount !== '0' ? formData.setDiscount + '円' : 'なし'}\n\n` +
        `📝 *備考*: ${formData.notes || 'なし'}\n\n` +
        `---\n` +
        `送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
    };

    const response = await fetch(GOOGLE_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Chat] 通知送信エラー:', response.status, errorText);
      return { success: false, error: errorText };
    }

    console.log('[Google Chat] 通知送信成功');
    return { success: true };
  } catch (error) {
    console.error('[Google Chat] 通知送信エラー:', error.message);
    return { success: false, error: error.message };
  }
};

app.use(cors());
app.use(express.json());

app.post("/api/submit", async (req, res) => {
  try {
    const { spreadsheetId, sheetName, data, formData } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "data は配列である必要があります",
      });
    }

    const sid = spreadsheetId || SPREADSHEET_ID;
    const name = sheetName || "畑山";
    const range = `${name}!A:Z`;

    const response = await toolSet.executeAction({
      action: "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
      params: {
        spreadsheetId: sid,
        range,
        valueInputOption: "USER_ENTERED",
        values: [data],
      },
      entityId: "default",
    });

    // Google Sheetsへの送信成功後、Google Chatに通知を送信
    let chatNotificationResult = { success: false, skipped: true };
    if (formData) {
      console.log('[Google Chat] 通知送信開始...');
      chatNotificationResult = await sendGoogleChatNotification(formData);
    }

    // お客様への自動返信メールを送信（メールアドレスがある場合のみ）
    let emailResult = { success: false, skipped: true };
    if (formData && formData.email) {
      console.log('[メール] 自動返信送信開始...');
      emailResult = await sendAutoReplyEmail(formData);
    }

    res.json({
      success: true,
      message: "データを送信しました",
      response,
      chatNotification: chatNotificationResult,
      emailNotification: emailResult,
    });
  } catch (error) {
    console.error("送信エラー:", error);
    res.status(500).json({
      success: false,
      error: error?.message ?? "送信に失敗しました",
    });
  }
});

app.post("/api/check-availability", async (req, res) => {
  try {
    const { date, time, calendarId } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        error: "日付と時間が必要です",
      });
    }

    const dateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(dateTime.getTime() + 2 * 60 * 60 * 1000);

    try {
      const response = await toolSet.executeAction({
        action: "GOOGLECALENDAR_CALENDARS_FREEBUSY_QUERY",
        params: {
          calendarId: calendarId || CALENDAR_ID,
          timeMin: dateTime.toISOString(),
          timeMax: endDateTime.toISOString(),
        },
        entityId: "default",
      });

      const isAvailable =
        !response.calendars ||
        Object.values(response.calendars).every(
          (cal) => !cal.busy || cal.busy.length === 0
        );

      res.json({
        success: true,
        available: isAvailable,
        message: isAvailable ? "確定" : "スタッフが随時対応",
      });
    } catch (calendarError) {
      console.warn("カレンダーAPI:", calendarError.message);
      res.json({
        success: true,
        available: false,
        message: "スタッフが随時対応",
      });
    }
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({
      success: false,
      error: error?.message ?? "エラーが発生しました",
      available: false,
      message: "スタッフが随時対応",
    });
  }
});

app.post("/api/analyze-model", async (req, res) => {
  try {
    const { model, maker } = req.body;

    if (!model || !maker) {
      return res.status(400).json({
        success: false,
        error: "型番とメーカーが必要です",
      });
    }

    // まず、ローカル判定を試行（最も確実）
    const modelUpper = model.toUpperCase().trim();
    let localHasCleaning = null;
    let localType = null;
    
    // ローカル判定関数（フロントエンドと同じロジック）
    const detectCleaningLocal = (model, maker) => {
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
      // CS-Aで始まる型番（CS-A400D2Z、CS-A-0D2Zなど）はお掃除機能付き
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
    };
    
    localHasCleaning = detectCleaningLocal(model, maker);
    if (localHasCleaning !== null) {
      console.log(`[サーバー] ローカル判定: ${maker} ${model} → おそうじ機能${localHasCleaning ? 'あり' : 'なし'}`);
      // ローカル判定で確定できる場合は、AI APIを呼ばずに返す
      // エアコンタイプもローカル判定で取得
      if (/床置き|床置形|床置型|FDF|FDY|FDFN|FDFX/i.test(modelUpper)) {
        localType = '床置き';
      } else if (/天井埋め込み|天井|SRF|SRK|SRC|FDT|FDX|FDTN|FDTX/i.test(modelUpper)) {
        localType = '天井埋め込み';
      } else if (/壁掛け|KXV|MSZ-KXV|FTXS|FTXJ|CS-|CU-|RAS-|RAC-|AS-|AY-/i.test(modelUpper)) {
        localType = '壁掛け一般';
      }
      
      // ローカル判定でおそうじ機能が確定している場合は、タイプがなくても返す
      // （タイプはAI APIで取得できる可能性があるため）
      if (localHasCleaning !== null) {
        // タイプも確定している場合は即座に返す
        if (localType) {
          console.log(`[サーバー] ローカル判定で確定: 種類=${localType}, おそうじ機能=${localHasCleaning ? 'あり' : 'なし'}`);
          return res.json({
            success: true,
            response: `${maker}のエアコン「${model}」について：\n- エアコンの種類: ${localType}\n- おそうじ機能: ${localHasCleaning ? 'あり' : 'なし'}`,
            type: localType,
            hasCleaning: localHasCleaning,
            source: 'local', // ローカル判定であることを示す
          });
        }
        // タイプが確定していない場合は、AI APIを呼んでタイプを取得する
        // ただし、おそうじ機能はローカル判定を優先する
        console.log(`[サーバー] ローカル判定でおそうじ機能確定: ${localHasCleaning ? 'あり' : 'なし'}、タイプはAI APIで取得`);
      }
    }
    
    // ローカル判定で確定できない場合、Gemini APIを試行（Google検索の結果をより正確に反映）
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
    const USE_VERTEX_AI = process.env.USE_VERTEX_AI === 'true' && !!GOOGLE_CLOUD_PROJECT;
    
    if (GEMINI_API_KEY || USE_VERTEX_AI) {
      try {
        console.log(`[サーバー] Gemini API呼び出し: メーカー=${maker}, 型番=${model} (${USE_VERTEX_AI ? 'Vertex AI' : 'Developer API'})`);
        
        // ローカルデータを読み込んで照合に使用
        let localCleaningData = null;
        try {
          const cleaningFunctionData = require('./data/cleaningFunctionData.json');
          localCleaningData = cleaningFunctionData.models.find(m => 
            m.model === model && m.maker === maker
          );
          if (localCleaningData) {
            console.log(`[サーバー] ローカルデータを発見: おそうじ機能=${localCleaningData.hasCleaningFunction !== null ? (localCleaningData.hasCleaningFunction ? 'あり' : 'なし') : '不明'}`);
          }
        } catch (error) {
          console.warn(`[サーバー] ローカルデータの読み込みに失敗:`, error.message);
        }
        
        let geminiModel;
        let geminiResponse;
        let useVertexAI = USE_VERTEX_AI;
        
        // Vertex AI経由（有料プラン）を使用する場合
        if (useVertexAI) {
          try {
            // @google/genai SDKを使用（Vertex AI経由）
            const { GoogleGenAI } = require('@google/genai');
            const ai = new GoogleGenAI({
              vertexai: true,
              project: GOOGLE_CLOUD_PROJECT,
              location: 'us-central1' // または 'global' (Gemini 3の場合)
            });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-pro', // グラウンディング無料枠が大きい（1日10,000件まで）
              contents: `メーカー: ${maker}, 型番: ${model}

このエアコンについて、Google検索のAI概要のように、実際の検索結果を基に自然な日本語で回答してください。

以下の検索クエリで検索して、最新の情報を取得してください：
- "${maker} ${model} おそうじ機能"
- "${maker} ${model} フィルター自動お掃除機能"
- "${maker} ${model} カタログ"
- "${maker} ${model} 仕様"

${localCleaningData && localCleaningData.hasCleaningFunction !== null ? 
  `【重要】ローカルデータベースには以下の情報があります：
- おそうじ機能: ${localCleaningData.hasCleaningFunction ? 'あり' : 'なし'}（${localCleaningData.source}）
この情報とGoogle検索の結果を照合して、より正確な情報を提供してください。検索結果が異なる場合は、検索結果を優先してください。` : ''}

必ず以下を含めて回答してください：
1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）
2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）
   - 「あり」の場合は、「フィルター自動お掃除機能あり」または「フィルター自動おそうじ機能あり」と明記してください
   - 「なし」の場合は、「フィルター自動お掃除機能なし」または「おそうじ機能なし」と明記してください

重要な注意事項：
- 型番は正確に確認してください（例：CS-A400D2Z、AJT-SEPなど、ハイフンの数や位置、数字の位置が重要）
- 完全な型番で検索し、型番の一部だけで判断しないでください
- 公式サイトやカタログの情報を優先的に参照してください
- Google検索の最新の情報を参照してください
- 検索結果に「おそうじ機能あり」や「フィルター自動お掃除機能」と記載されている場合は、必ず「あり」と回答してください`,
              config: {
                tools: [{ googleSearch: {} }] // Google検索によるグラウンディングを有効化
              }
            });
            
            geminiResponse = response.text;
            console.log(`[サーバー] Vertex AIレスポンス（最初の200文字）:`, geminiResponse.substring(0, 200));
          } catch (vertexError) {
            console.warn(`[サーバー] Vertex AI接続エラー:`, vertexError.message);
            // Vertex AIの認証エラーの場合、Developer APIにフォールバック
            if (vertexError.message && (vertexError.message.includes('default credentials') || vertexError.message.includes('Could not load'))) {
              console.warn(`[サーバー] Vertex AI認証エラーのため、Developer APIにフォールバックします`);
              if (!GEMINI_API_KEY) {
                throw new Error('VERTEX_AI_AUTH_ERROR_NO_FALLBACK');
              }
              useVertexAI = false; // Developer APIを使用するようにフラグを変更
            } else {
              throw vertexError;
            }
          }
        }
        
        // Vertex AI認証エラーでフォールバック、またはUSE_VERTEX_AI=falseの場合、Developer APIを使用
        if (!useVertexAI) {
          // Developer APIを使用する場合（REST APIを直接使用してv1エンドポイントを指定）
          if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEYが設定されていません');
          }
          
          // REST APIを直接使用してv1エンドポイントを指定
          const prompt = `メーカー: ${maker}, 型番: ${model}

このエアコンについて、あなたの知識と推論能力を活用して、自然な日本語で回答してください。

${localCleaningData && localCleaningData.hasCleaningFunction !== null ? 
  `【重要】ローカルデータベースには以下の情報があります：
- おそうじ機能: ${localCleaningData.hasCleaningFunction ? 'あり' : 'なし'}（${localCleaningData.source}）
この情報を参考にしてください。` : ''}

必ず以下を含めて回答してください：
1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）
2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）
   - 「あり」の場合は、「フィルター自動お掃除機能あり」または「フィルター自動おそうじ機能あり」と明記してください
   - 「なし」の場合は、「フィルター自動お掃除機能なし」または「おそうじ機能なし」と明記してください

重要な注意事項：
- 型番は正確に確認してください（例：CS-A400D2Z、AJT-SEPなど、ハイフンの数や位置、数字の位置が重要）
- 完全な型番で判断し、型番の一部だけで判断しないでください
- 一般的な知識と型番パターンから推論してください
- 不明な場合は「不明」と明記してください`;

          // 利用可能なモデルをリストアップして確認（v1betaエンドポイントを使用）
          let availableModels = [];
          try {
            console.log(`[サーバー] 利用可能なモデルを確認中（v1beta）...`);
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const listResponse = await fetch(listUrl);
            if (listResponse.ok) {
              const listData = await listResponse.json();
              if (listData.models) {
                availableModels = listData.models
                  .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                  .map(m => m.name.replace('models/', ''));
                console.log(`[サーバー] 利用可能なモデル:`, availableModels);
              }
            } else {
              const errorText = await listResponse.text();
              console.warn(`[サーバー] モデルリスト取得エラー: HTTP ${listResponse.status} - ${errorText}`);
            }
          } catch (listError) {
            console.warn(`[サーバー] モデルリストの取得に失敗:`, listError.message);
          }
          
          // 利用可能なモデルがない場合、v1betaエンドポイントで一般的なモデル名を試す
          const modelNames = availableModels.length > 0 
            ? availableModels 
            : ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];
          let lastError = null;
          
          // v1betaエンドポイントを使用（v1では利用できないモデルが多いため）
          for (const modelName of modelNames) {
            try {
              console.log(`[サーバー] REST APIでモデル ${modelName} (v1beta) を試行中...`);
              const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
              
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: prompt
                    }]
                  }]
                })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
              
              const data = await response.json();
              
              if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                geminiResponse = data.candidates[0].content.parts[0].text;
                console.log(`[サーバー] モデル ${modelName} (v1beta) で成功`);
                break; // 成功したらループを抜ける
              } else {
                throw new Error('予期しないレスポンス形式');
              }
            } catch (modelError) {
              console.warn(`[サーバー] モデル ${modelName} (v1beta) でエラー:`, modelError.message);
              lastError = modelError;
              // 次のモデルを試す
              continue;
            }
          }
          
          // すべてのモデルで失敗した場合
          if (!geminiResponse && lastError) {
            throw lastError;
          }
        }
        
        console.log(`[サーバー] Gemini APIレスポンス受信（全長: ${geminiResponse.length}文字）`);
        console.log(`[サーバー] レスポンス内容:`, geminiResponse);
        
        // Geminiの回答から情報を抽出（ChatGPTと同じロジック）
        let type = null;
        let hasCleaning = null;
        
        // エアコンタイプの抽出
        if (geminiResponse.includes('床置き') || geminiResponse.includes('床置形') || geminiResponse.includes('床置型')) {
          type = '床置き';
        } else if (geminiResponse.includes('天井埋め込み') || geminiResponse.includes('天井')) {
          type = '天井埋め込み';
        } else if (geminiResponse.includes('壁掛けおそうじ機能付き') || geminiResponse.includes('壁掛けお掃除機能付き')) {
          type = '壁掛けおそうじ機能付き';
        } else if (geminiResponse.includes('壁掛け一般') || geminiResponse.includes('壁掛け')) {
          type = '壁掛け一般';
        } else if (geminiResponse.includes('大型')) {
          type = '大型';
        }
        
        // おそうじ機能の有無の抽出（優先順位: ローカル判定 > ローカルデータ > Geminiの回答）
        // まず、ローカル判定を確認
        if (localHasCleaning !== null) {
          hasCleaning = localHasCleaning;
          console.log(`[サーバー] ローカル判定を優先: ${hasCleaning}`);
        } 
        // 次に、ローカルデータベースを確認
        else if (localCleaningData && localCleaningData.hasCleaningFunction !== null) {
          hasCleaning = localCleaningData.hasCleaningFunction;
          console.log(`[サーバー] ローカルデータベースから取得: ${hasCleaning} (${localCleaningData.source})`);
        } 
        // 最後に、Geminiの回答から抽出
        else {
          // Geminiの回答から抽出
          const hasNoCleaningPattern = 
            geminiResponse.includes('フィルター自動お掃除機能は搭載されていません') ||
            geminiResponse.includes('フィルター自動おそうじ機能は搭載されていません') ||
            geminiResponse.includes('フィルター自動お掃除機能は搭載されていない') ||
            geminiResponse.includes('フィルター自動おそうじ機能は搭載されていない') ||
            geminiResponse.includes('フィルターは手動掃除') ||
            geminiResponse.includes('フィルター自動お掃除機能がない') ||
            geminiResponse.includes('フィルター自動おそうじ機能がない') ||
            geminiResponse.includes('フィルターの手動清掃が必要') ||
            geminiResponse.includes('内部クリーン運転のみ') ||
            geminiResponse.includes('内部乾燥のみ') ||
            geminiResponse.includes('内部乾燥機能のみ') ||
            geminiResponse.includes('おそうじ機能：なし') ||
            geminiResponse.includes('お掃除機能：なし') ||
            geminiResponse.includes('おそうじ機能なし') ||
            geminiResponse.includes('お掃除機能なし') ||
            geminiResponse.includes('おそうじ機能は「なし」') ||
            geminiResponse.includes('お掃除機能は「なし」') ||
            geminiResponse.includes('おそうじ機能は「なし」となります') ||
            geminiResponse.includes('お掃除機能は「なし」となります') ||
            geminiResponse.includes('おそうじ機能はなし') ||
            geminiResponse.includes('お掃除機能はなし') ||
            (geminiResponse.includes('フィルター自動お掃除機能') && geminiResponse.includes('搭載されていません')) ||
            (geminiResponse.includes('フィルター自動おそうじ機能') && geminiResponse.includes('搭載されていません')) ||
            (geminiResponse.includes('内部乾燥') && !geminiResponse.includes('フィルター自動お掃除機能'));
          
          const hasCleaningPattern = 
            (geminiResponse.includes('フィルター自動お掃除機能あり') ||
             geminiResponse.includes('フィルター自動おそうじ機能あり') ||
             geminiResponse.includes('おそうじ機能あり') ||
             geminiResponse.includes('お掃除機能あり') ||
             (geminiResponse.includes('フィルター自動お掃除機能') && 
              !geminiResponse.includes('搭載されていません') && 
              !geminiResponse.includes('搭載されていない') &&
              !geminiResponse.includes('は搭載されていません') &&
              !geminiResponse.includes('は搭載されていない') &&
              !geminiResponse.includes('なし'))) ||
            (geminiResponse.includes('フィルター自動おそうじ機能') && 
             !geminiResponse.includes('搭載されていません') && 
             !geminiResponse.includes('搭載されていない') &&
             !geminiResponse.includes('は搭載されていません') &&
             !geminiResponse.includes('は搭載されていない') &&
             !geminiResponse.includes('なし')) ||
            (geminiResponse.includes('自動お掃除機能') && 
             !geminiResponse.includes('内部乾燥のみ') &&
             !geminiResponse.includes('搭載されていません') &&
             !geminiResponse.includes('搭載されていない') &&
             !geminiResponse.includes('なし')) ||
            (geminiResponse.includes('自動おそうじ機能') && 
             !geminiResponse.includes('内部乾燥のみ') &&
             !geminiResponse.includes('搭載されていません') &&
             !geminiResponse.includes('搭載されていない') &&
             !geminiResponse.includes('なし'));
          
          if (hasNoCleaningPattern) {
            hasCleaning = false;
          } else if (hasCleaningPattern) {
            hasCleaning = true;
          }
        }
        
        // 最終的な判定結果（優先順位: ローカル判定 > Geminiの回答 > ローカルデータ）
        // グラウンディングを使用している場合は、Geminiの回答を優先
        const finalHasCleaning = localHasCleaning !== null 
          ? localHasCleaning 
          : (hasCleaning !== null 
              ? hasCleaning 
              : (localCleaningData && localCleaningData.hasCleaningFunction !== null 
                  ? localCleaningData.hasCleaningFunction 
                  : null));
        
        console.log(`[サーバー] 判定結果まとめ:`);
        console.log(`  - ローカル判定: ${localHasCleaning !== null ? (localHasCleaning ? 'あり' : 'なし') : '不明'}`);
        console.log(`  - ローカルデータ: ${localCleaningData && localCleaningData.hasCleaningFunction !== null ? (localCleaningData.hasCleaningFunction ? 'あり' : 'なし') : '不明'}`);
        console.log(`  - Gemini判定: ${hasCleaning !== null ? (hasCleaning ? 'あり' : 'なし') : '不明'}`);
        console.log(`  - 最終判定: ${finalHasCleaning !== null ? (finalHasCleaning ? 'あり' : 'なし') : '不明'}`);
        
        // グラウンディングの結果をローカルデータベースに保存（更新または追加）
        if (finalHasCleaning !== null && (!localCleaningData || localCleaningData.hasCleaningFunction !== finalHasCleaning)) {
          try {
            const fs = require('fs');
            const path = require('path');
            const cleaningDataPath = path.join(__dirname, 'data/cleaningFunctionData.json');
            const cleaningData = require(cleaningDataPath);
            
            // 既存のデータを更新、または新規追加
            const existingIndex = cleaningData.models.findIndex(m => 
              m.model === model && m.maker === maker
            );
            
            if (existingIndex >= 0) {
              // 既存データを更新
              cleaningData.models[existingIndex].hasCleaningFunction = finalHasCleaning;
              cleaningData.models[existingIndex].source = 'ai-grounding';
              cleaningData.models[existingIndex].updatedAt = new Date().toISOString();
              console.log(`[サーバー] ローカルデータベースを更新: ${maker} ${model} → ${finalHasCleaning ? 'あり' : 'なし'}`);
            } else {
              // 新規追加
              cleaningData.models.push({
                model: model,
                maker: maker,
                hasCleaningFunction: finalHasCleaning,
                source: 'ai-grounding',
                createdAt: new Date().toISOString()
              });
              cleaningData.metadata.totalModels = cleaningData.models.length;
              console.log(`[サーバー] ローカルデータベースに追加: ${maker} ${model} → ${finalHasCleaning ? 'あり' : 'なし'}`);
            }
            
            cleaningData.metadata.lastUpdated = new Date().toISOString();
            fs.writeFileSync(cleaningDataPath, JSON.stringify(cleaningData, null, 2), 'utf8');
          } catch (saveError) {
            console.warn(`[サーバー] ローカルデータベースの保存に失敗:`, saveError.message);
          }
        }
        
        // ローカル判定でタイプが取得できなかった場合、Geminiの結果を使用
        if (!localType && type) {
          localType = type;
        }
        
        return res.json({
          success: true,
          response: geminiResponse,
          type: localType || type,
          hasCleaning: finalHasCleaning,
          source: useVertexAI ? 'vertex-ai-grounding' : 'gemini-api',
        });
      } catch (geminiError) {
        console.error(`[サーバー] Gemini API エラー（詳細）:`, geminiError);
        console.error(`[サーバー] エラーメッセージ:`, geminiError?.message);
        console.error(`[サーバー] エラースタック:`, geminiError?.stack);
        
        // Gemini APIが失敗した場合、ローカル判定の結果があれば返す
        if (localHasCleaning !== null || localType) {
          console.log(`[サーバー] Gemini APIエラーだが、ローカル判定で返す: 種類=${localType || null}, おそうじ機能=${localHasCleaning !== null ? (localHasCleaning ? 'あり' : 'なし') : null}`);
          return res.json({
            success: true,
            response: `Gemini API呼び出しに失敗しましたが、型番から判定しました。\n${maker}のエアコン「${model}」について：\n${localType ? `- エアコンの種類: ${localType}\n` : ''}${localHasCleaning !== null ? `- おそうじ機能: ${localHasCleaning ? 'あり' : 'なし'}` : ''}`,
            type: localType || null,
            hasCleaning: localHasCleaning,
            source: 'local-fallback',
            error: geminiError?.message ?? "Gemini API呼び出しに失敗しました",
          });
        }
        // ローカル判定もできない場合、エラーを返す（ChatGPT APIへのフォールバックは無効化）
        const errorMessage = geminiError?.message || "Gemini API呼び出しに失敗しました";
        return res.json({
          success: false,
          response: `判定できませんでした。Gemini API呼び出しに失敗し、ローカル判定もできませんでした。\nエラー詳細: ${errorMessage}`,
          type: null,
          hasCleaning: null,
          source: 'error',
          error: errorMessage,
        });
      }
    }
    
    // Gemini APIが使用できない場合、エラーを返す
    if (!GEMINI_API_KEY && !USE_VERTEX_AI) {
      return res.json({
        success: false,
        response: `判定できませんでした。Gemini APIキーが設定されていません。`,
        type: null,
        hasCleaning: null,
        source: 'error',
        error: "Gemini APIキーが設定されていません",
      });
    }
    
    // ChatGPT APIへのフォールバックは無効化（判定が不正確なため）
    // 以下のコードはコメントアウト
    /*
    // Gemini APIがない場合、ChatGPT APIを使用（無効化）
    // ChatGPT APIを使って型番情報を取得
    // OpenAI APIを直接呼び出す（環境変数OPENAI_API_KEYが必要）
    try {
      console.log(`[サーバー] ChatGPT API呼び出し: メーカー=${maker}, 型番=${model}`);
      
      // OpenAI APIキーを環境変数から取得
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        // OpenAI APIキーがない場合、エラーメッセージを返す
        throw new Error("OPENAI_API_KEY環境変数が設定されていません。OpenAI APIキーを設定するか、Composio経由でOpenAIを使用する場合は、ComposioアカウントでOpenAI統合を設定してください。");
      }
      
      // OpenAI APIを直接呼び出す
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "あなたはエアコンの専門家です。指定されたメーカーと型番について、Google検索のAI概要のように、実際の製品情報を基に回答してください。\n\n重要な注意事項：\n- 型番は正確に確認してください（例：CS-A400D2Z、CS--0DAX2Kなど、ハイフンの数や位置、数字の位置が重要）\n- 完全な型番で検索し、型番の一部だけで判断しないでください\n- エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）を明確に記載してください\n- おそうじ機能については、以下の区別を明確にしてください：\n  * 「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」がある場合 → 「おそうじ機能：あり」\n  * 「内部クリーン運転」や「内部乾燥機能」のみの場合 → 「おそうじ機能：なし（内部乾燥のみ）」\n  * 「フィルター自動お掃除機能」がない場合 → 「おそうじ機能：なし」\n- パナソニックのCS-Aシリーズ（CS-Aで始まる型番、例：CS-A400D2Z、CS-A-0D2Zなど）には「フィルター自動お掃除機能」が搭載されている場合が多いです。正確に確認してください。\n- 公式サイトやカタログの情報を優先的に参照してください\n- 自然な日本語で、Google検索のAI概要のように簡潔に回答してください"
            },
            {
              role: "user",
              content: `メーカー: ${maker}, 型番: ${model}\n\nこのエアコンについて、以下の検索クエリでGoogle検索した結果を、Google検索のAI概要のように自然な日本語で回答してください：\n- 「${maker} エアコン ${model}」\n- 「${maker} エアコン ${model} おそうじ機能」\n- 「${maker} エアコン ${model} フィルター自動お掃除機能」\n- 「${maker} ${model} 仕様」\n\n必ず以下を含めて回答してください：\n1. エアコンの種類（壁掛け一般/壁掛けおそうじ機能付き/天井埋め込み/床置き/大型など）\n2. おそうじ機能の有無（「フィルター自動お掃除機能」または「フィルター自動おそうじ機能」があるかどうか）\n\n重要な注意事項：\n- 型番は正確に確認してください（例：CS-A400D2Z、CS--0DAX2Kなど、ハイフンの数や位置、数字の位置が重要）\n- 完全な型番で検索し、型番の一部だけで判断しないでください\n- パナソニックのCS-Aシリーズ（CS-Aで始まる型番）には「フィルター自動お掃除機能」が搭載されている場合が多いです。正確に確認してください。\n- 公式サイトやカタログの情報を優先的に参照してください`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorText}`);
      }

      const response = await openaiResponse.json();
      
      console.log(`[サーバー] ChatGPT APIレスポンス受信:`, response);

      // ChatGPTの完全な回答を取得
      // OpenAI APIの標準形式（choices配列）を処理
      let chatGPTResponse = "";
      let type = null;
      let hasCleaning = null;

      // OpenAI APIの標準形式（choices配列）を確認
      if (response && response.choices && response.choices[0] && response.choices[0].message) {
        chatGPTResponse = response.choices[0].message.content || "";
      } else {
        // 予期しない形式の場合、JSON文字列化して表示
        chatGPTResponse = JSON.stringify(response);
      }
      
      // 回答からエアコンタイプとお掃除機能の有無を抽出（自動入力用）
      try {
        // JSON形式の回答をパース（もし含まれていれば）
        const jsonMatch = chatGPTResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          type = parsed.type || null;
          hasCleaning = parsed.hasCleaning !== undefined ? parsed.hasCleaning : null;
        } else {
          // JSON形式でない場合、テキストから情報を抽出
          // エアコンタイプの抽出
          if (chatGPTResponse.includes('床置き') || chatGPTResponse.includes('床置形') || chatGPTResponse.includes('床置型')) {
            type = '床置き';
          } else if (chatGPTResponse.includes('天井埋め込み') || chatGPTResponse.includes('天井')) {
            type = '天井埋め込み';
          } else if (chatGPTResponse.includes('壁掛けおそうじ機能付き') || chatGPTResponse.includes('壁掛けお掃除機能付き')) {
            type = '壁掛けおそうじ機能付き';
          } else if (chatGPTResponse.includes('壁掛け一般') || chatGPTResponse.includes('壁掛け')) {
            type = '壁掛け一般';
          } else if (chatGPTResponse.includes('大型')) {
            type = '大型';
          }
          
          // おそうじ機能の有無の抽出
          // ローカル判定を優先（既に上で実行済み）
          // ChatGPTの回答から抽出
          // まず、「なし」のパターンを確認（優先度を高く）
          const hasNoCleaningPattern = 
            chatGPTResponse.includes('フィルター自動お掃除機能は搭載されていません') ||
            chatGPTResponse.includes('フィルター自動おそうじ機能は搭載されていません') ||
            chatGPTResponse.includes('フィルター自動お掃除機能は搭載されていない') ||
            chatGPTResponse.includes('フィルター自動おそうじ機能は搭載されていない') ||
            chatGPTResponse.includes('フィルターは手動掃除') ||
            chatGPTResponse.includes('フィルター自動お掃除機能がない') ||
            chatGPTResponse.includes('フィルター自動おそうじ機能がない') ||
            chatGPTResponse.includes('フィルターの手動清掃が必要') ||
            chatGPTResponse.includes('内部クリーン運転のみ') ||
            chatGPTResponse.includes('内部乾燥のみ') ||
            chatGPTResponse.includes('内部乾燥機能のみ') ||
            chatGPTResponse.includes('おそうじ機能：なし') ||
            chatGPTResponse.includes('お掃除機能：なし') ||
            chatGPTResponse.includes('おそうじ機能なし') ||
            chatGPTResponse.includes('お掃除機能なし') ||
            chatGPTResponse.includes('おそうじ機能は「なし」') ||
            chatGPTResponse.includes('お掃除機能は「なし」') ||
            chatGPTResponse.includes('おそうじ機能は「なし」となります') ||
            chatGPTResponse.includes('お掃除機能は「なし」となります') ||
            chatGPTResponse.includes('おそうじ機能はなし') ||
            chatGPTResponse.includes('お掃除機能はなし') ||
            (chatGPTResponse.includes('フィルター自動お掃除機能') && chatGPTResponse.includes('搭載されていません')) ||
            (chatGPTResponse.includes('フィルター自動おそうじ機能') && chatGPTResponse.includes('搭載されていません')) ||
            (chatGPTResponse.includes('内部乾燥') && !chatGPTResponse.includes('フィルター自動お掃除機能'));
          
          // 次に、「あり」のパターンを確認
          const hasCleaningPattern = 
            (chatGPTResponse.includes('フィルター自動お掃除機能') && 
             !chatGPTResponse.includes('搭載されていません') && 
             !chatGPTResponse.includes('搭載されていない') &&
             !chatGPTResponse.includes('は搭載されていません') &&
             !chatGPTResponse.includes('は搭載されていない')) ||
            (chatGPTResponse.includes('フィルター自動おそうじ機能') && 
             !chatGPTResponse.includes('搭載されていません') && 
             !chatGPTResponse.includes('搭載されていない') &&
             !chatGPTResponse.includes('は搭載されていません') &&
             !chatGPTResponse.includes('は搭載されていない')) ||
            (chatGPTResponse.includes('自動お掃除機能') && 
             !chatGPTResponse.includes('内部乾燥のみ') &&
             !chatGPTResponse.includes('搭載されていません') &&
             !chatGPTResponse.includes('搭載されていない')) ||
            (chatGPTResponse.includes('自動おそうじ機能') && 
             !chatGPTResponse.includes('内部乾燥のみ') &&
             !chatGPTResponse.includes('搭載されていません') &&
             !chatGPTResponse.includes('搭載されていない'));
          
          // 判定（優先順位：ローカル判定 > なし > あり）
          // ローカル判定を最優先（AIの回答が間違っていても正しく判定）
          if (localHasCleaning !== null) {
            // ローカル判定がある場合はそれを優先
            hasCleaning = localHasCleaning;
            console.log(`[サーバー] ローカル判定を優先（ChatGPT）: ${hasCleaning}`);
          } else if (hasNoCleaningPattern) {
            hasCleaning = false;
          } else if (hasCleaningPattern) {
            hasCleaning = true;
          }
          // どちらも該当しない場合は、デフォルトでnullのまま（判定不能）
          
          // ローカル判定でタイプが取得できなかった場合、ChatGPTの結果を使用
          if (!localType && type) {
            localType = type;
          }
        }
      } catch (parseError) {
        console.warn("情報抽出エラー:", parseError);
      }

      res.json({
        success: true,
        response: chatGPTResponse, // ChatGPTの完全な回答
        type: localType || type, // 自動入力用のエアコンタイプ（ローカル判定を優先）
        hasCleaning: localHasCleaning !== null ? localHasCleaning : hasCleaning, // 自動入力用のお掃除機能の有無（ローカル判定を優先）
        source: 'chatgpt', // ChatGPT APIであることを示す
      });
    } catch (openaiError) {
      // ChatGPT APIへのフォールバックは無効化されているため、このコードは実行されない
      console.error("[サーバー] OpenAI API エラー:", openaiError);
      console.error("[サーバー] エラー詳細:", JSON.stringify(openaiError, null, 2));
      
      // エラー時でもローカル判定の結果があれば返す
      if (localHasCleaning !== null || localType) {
        console.log(`[サーバー] AI APIエラーだが、ローカル判定で返す: 種類=${localType || null}, おそうじ機能=${localHasCleaning !== null ? (localHasCleaning ? 'あり' : 'なし') : null}`);
        return res.json({
          success: true,
          response: `AI API呼び出しに失敗しましたが、型番から判定しました。\n${maker}のエアコン「${model}」について：\n${localType ? `- エアコンの種類: ${localType}\n` : ''}${localHasCleaning !== null ? `- おそうじ機能: ${localHasCleaning ? 'あり' : 'なし'}` : ''}`,
          type: localType || null,
          hasCleaning: localHasCleaning,
          source: 'local-fallback',
          error: openaiError?.message ?? "ChatGPT API呼び出しに失敗しました",
        });
      }
      
      // ローカル判定もできない場合はエラーメッセージを返す
      res.json({
        success: false,
        response: `エラーが発生しました: ${openaiError?.message ?? "ChatGPT API呼び出しに失敗しました"}`,
        type: null,
        hasCleaning: null,
        error: openaiError?.message ?? "ChatGPT API呼び出しに失敗しました",
      });
    }
    */
    
    // Gemini APIが使用できない場合、エラーを返す
    if (!GEMINI_API_KEY && !USE_VERTEX_AI) {
      return res.json({
        success: false,
        response: `判定できませんでした。Gemini APIキーが設定されていません。`,
        type: null,
        hasCleaning: null,
        source: 'error',
        error: "Gemini APIキーが設定されていません",
      });
    }
  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({
      success: false,
      error: error?.message ?? "エラーが発生しました",
    });
  }
});

app.get("/api/get-drain-pipe-options", async (req, res) => {
  try {
    const sid = SPREADSHEET_ID;
    const sheetName = "料金一覧";
    // 110行目から128行目までのA列を取得
    const range = `${sheetName}!A110:A128`;

    console.log(`[排水管洗浄オプション] 取得範囲: ${range}`);

    const response = await toolSet.executeAction({
      action: "GOOGLESHEETS_SPREADSHEETS_VALUES_GET",
      params: {
        spreadsheetId: sid,
        range: range,
      },
      entityId: "default",
    });

    console.log(`[排水管洗浄オプション] レスポンスタイプ:`, typeof response);
    console.log(`[排水管洗浄オプション] レスポンスキー:`, response ? Object.keys(response) : 'null');
    if (response && response.values) {
      console.log(`[排水管洗浄オプション] response.valuesの型:`, Array.isArray(response.values) ? '配列' : typeof response.values);
      console.log(`[排水管洗浄オプション] response.valuesの長さ:`, Array.isArray(response.values) ? response.values.length : 'N/A');
    }
    console.log(`[排水管洗浄オプション] レスポンス（最初の500文字）:`, JSON.stringify(response, null, 2).substring(0, 500));

    // レスポンスの形式を確認（ComposioのGoogle Sheets APIのレスポンス形式に対応）
    let values = null;
    
    // パターン1: response.valuesが直接配列
    if (Array.isArray(response.values)) {
      values = response.values;
    }
    // パターン2: response.data.valuesが配列
    else if (response.data && Array.isArray(response.data.values)) {
      values = response.data.values;
    }
    // パターン3: response.dataが配列
    else if (response.data && Array.isArray(response.data)) {
      values = response.data;
    }
    // パターン4: response自体が配列
    else if (Array.isArray(response)) {
      values = response;
    }
    // パターン5: response.result.valuesが配列（Composioの一部のレスポンス形式）
    else if (response.result && Array.isArray(response.result.values)) {
      values = response.result.values;
    }
    // パターン6: response.resultが配列
    else if (response.result && Array.isArray(response.result)) {
      values = response.result;
    }
    // パターン7: response.output.valuesが配列
    else if (response.output && Array.isArray(response.output.values)) {
      values = response.output.values;
    }
    // パターン8: response.outputが配列
    else if (response.output && Array.isArray(response.output)) {
      values = response.output;
    }

    if (!values || !Array.isArray(values)) {
      console.error(`[排水管洗浄オプション] データ形式が不正`);
      console.error(`[排水管洗浄オプション] レスポンス全体:`, JSON.stringify(response, null, 2));
      return res.status(500).json({
        success: false,
        error: "データの取得に失敗しました（形式が不正）",
        debug: { 
          responseType: typeof response, 
          responseKeys: response ? Object.keys(response) : [],
          hasValues: !!response.values,
          hasData: !!response.data,
          hasResult: !!response.result,
          hasOutput: !!response.output
        },
      });
    }

    console.log(`[排水管洗浄オプション] 取得した行数: ${values.length}`);

    // A列の値を取得し、「排水管洗浄：」というプレフィックスを削除
    const options = values
      .map((row, index) => {
        // 行が配列の場合、最初の要素（A列）を取得
        const cellValue = Array.isArray(row) ? row[0] : row;
        if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
          const value = String(cellValue).trim();
          console.log(`[排水管洗浄オプション] 行${110 + index}: "${value}"`);
          // 「排水管洗浄：」または「排水管洗浄:」を削除
          const cleanedValue = value.replace(/^排水管洗浄[：:]\s*/, '');
          return cleanedValue;
        }
        return null;
      })
      .filter((value) => value !== null && value !== '');

    console.log(`[排水管洗浄オプション] フィルタリング後の選択肢数: ${options.length}`);
    console.log(`[排水管洗浄オプション] 選択肢:`, options);

    res.json({
      success: true,
      options: options,
    });
  } catch (error) {
    console.error("排水管洗浄オプション取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error?.message ?? "データの取得に失敗しました",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ========================================
// Google Calendar API 連携（サービスアカウント認証）
// ========================================

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// サービスアカウント認証の設定
let calendarClient = null;
const GOOGLE_CALENDAR_KEY_PATH = path.join(__dirname, 'google-calendar-key.json');
const TARGET_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'c_f1491b1c047bc589a668760a48708b97c0af813f80f52fe7e3145c35ec55a7b4@group.calendar.google.com';

// Google Calendar クライアントの初期化
const initCalendarClient = () => {
  if (calendarClient) return calendarClient;
  
  try {
    if (!fs.existsSync(GOOGLE_CALENDAR_KEY_PATH)) {
      console.warn('[カレンダー] サービスアカウントキーファイルが見つかりません:', GOOGLE_CALENDAR_KEY_PATH);
      return null;
    }
    
    const keyFile = require(GOOGLE_CALENDAR_KEY_PATH);
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    calendarClient = google.calendar({ version: 'v3', auth });
    console.log('[カレンダー] Google Calendar クライアント初期化成功');
    return calendarClient;
  } catch (error) {
    console.error('[カレンダー] クライアント初期化エラー:', error.message);
    return null;
  }
};

// 空き状況確認API
app.post("/api/calendar/check-availability", async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: "日付が必要です",
      });
    }
    
    const calendar = initCalendarClient();
    if (!calendar) {
      return res.json({
        success: true,
        available: null,
        message: "カレンダー連携が設定されていません",
      });
    }
    
    // 日付の範囲を設定（指定された日の終日、または時間帯）
    let timeMin, timeMax;
    if (startTime && endTime) {
      timeMin = new Date(`${date}T${startTime}:00+09:00`).toISOString();
      timeMax = new Date(`${date}T${endTime}:00+09:00`).toISOString();
    } else {
      // 終日の空き状況を確認（8:00〜20:00）
      timeMin = new Date(`${date}T08:00:00+09:00`).toISOString();
      timeMax = new Date(`${date}T20:00:00+09:00`).toISOString();
    }
    
    console.log(`[カレンダー] 空き確認: ${date} ${startTime || '08:00'}〜${endTime || '20:00'}`);
    
    // freebusy APIで空き状況を確認
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'Asia/Tokyo',
        items: [{ id: TARGET_CALENDAR_ID }],
      },
    });
    
    const busySlots = response.data.calendars[TARGET_CALENDAR_ID]?.busy || [];
    const isAvailable = busySlots.length === 0;
    
    console.log(`[カレンダー] 結果: ${isAvailable ? '空き' : '予定あり'} (${busySlots.length}件の予定)`);
    
    res.json({
      success: true,
      available: isAvailable,
      busySlots: busySlots.map(slot => ({
        start: slot.start,
        end: slot.end,
      })),
      message: isAvailable ? "空いています" : "この時間帯は予約があります",
    });
  } catch (error) {
    console.error('[カレンダー] 空き確認エラー:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      available: null,
    });
  }
});

// 複数日の空き状況を一括確認API
app.post("/api/calendar/check-availability-batch", async (req, res) => {
  try {
    const { dates } = req.body; // [{ date: "2026-02-01", startTime: "09:00", endTime: "12:00" }, ...]
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "日付の配列が必要です",
      });
    }
    
    const calendar = initCalendarClient();
    if (!calendar) {
      return res.json({
        success: true,
        results: dates.map(d => ({ ...d, available: null, message: "カレンダー連携が設定されていません" })),
      });
    }
    
    const results = [];
    
    for (const dateInfo of dates) {
      const { date, startTime, endTime } = dateInfo;
      if (!date) {
        results.push({ ...dateInfo, available: null, message: "日付が指定されていません" });
        continue;
      }
      
      try {
        let timeMin, timeMax;
        if (startTime && endTime) {
          timeMin = new Date(`${date}T${startTime}:00+09:00`).toISOString();
          timeMax = new Date(`${date}T${endTime}:00+09:00`).toISOString();
        } else {
          timeMin = new Date(`${date}T08:00:00+09:00`).toISOString();
          timeMax = new Date(`${date}T20:00:00+09:00`).toISOString();
        }
        
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            timeZone: 'Asia/Tokyo',
            items: [{ id: TARGET_CALENDAR_ID }],
          },
        });
        
        const busySlots = response.data.calendars[TARGET_CALENDAR_ID]?.busy || [];
        const isAvailable = busySlots.length === 0;
        
        results.push({
          ...dateInfo,
          available: isAvailable,
          message: isAvailable ? "空いています" : "予約があります",
        });
      } catch (error) {
        results.push({
          ...dateInfo,
          available: null,
          message: `確認エラー: ${error.message}`,
        });
      }
    }
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[カレンダー] 一括空き確認エラー:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 仮予約作成API
app.post("/api/calendar/create-reservation", async (req, res) => {
  try {
    const {
      date,
      startTime,
      endTime,
      customerName,
      customerPhone,
      address,
      cleaningType,
      notes,
    } = req.body;
    
    if (!date || !customerName) {
      return res.status(400).json({
        success: false,
        error: "日付とお客様名が必要です",
      });
    }
    
    const calendar = initCalendarClient();
    if (!calendar) {
      return res.json({
        success: false,
        error: "カレンダー連携が設定されていません",
      });
    }
    
    // イベントの開始・終了時刻を設定
    let startDateTime, endDateTime;
    if (startTime && endTime) {
      startDateTime = `${date}T${startTime}:00+09:00`;
      endDateTime = `${date}T${endTime}:00+09:00`;
    } else {
      // デフォルト: 9:00〜12:00（3時間）
      startDateTime = `${date}T09:00:00+09:00`;
      endDateTime = `${date}T12:00:00+09:00`;
    }
    
    // イベントの説明文を作成
    const description = [
      `【仮予約】`,
      ``,
      `■ お客様名: ${customerName}`,
      customerPhone ? `■ 電話番号: ${customerPhone}` : null,
      address ? `■ 住所: ${address}` : null,
      cleaningType ? `■ 清掃内容: ${cleaningType}` : null,
      notes ? `■ 備考: ${notes}` : null,
      ``,
      `※ この予約は仮予約です。確定後に更新してください。`,
    ].filter(Boolean).join('\n');
    
    // カレンダーイベントを作成
    const event = {
      summary: `【仮予約】${customerName}様 - ${cleaningType || '清掃'}`,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Tokyo',
      },
      colorId: '5', // 黄色（仮予約を示す）
    };
    
    console.log(`[カレンダー] 仮予約作成: ${date} ${customerName}様`);
    
    const response = await calendar.events.insert({
      calendarId: TARGET_CALENDAR_ID,
      requestBody: event,
    });
    
    console.log(`[カレンダー] 仮予約作成成功: イベントID=${response.data.id}`);
    
    res.json({
      success: true,
      message: "仮予約を作成しました",
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error('[カレンダー] 仮予約作成エラー:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// カレンダー接続テストAPI
app.get("/api/calendar/test", async (req, res) => {
  try {
    const calendar = initCalendarClient();
    if (!calendar) {
      return res.json({
        success: false,
        message: "カレンダークライアントが初期化されていません",
        keyFileExists: fs.existsSync(GOOGLE_CALENDAR_KEY_PATH),
      });
    }
    
    // カレンダー情報を取得してテスト
    const response = await calendar.calendars.get({
      calendarId: TARGET_CALENDAR_ID,
    });
    
    res.json({
      success: true,
      message: "カレンダー接続成功",
      calendarName: response.data.summary,
      calendarId: TARGET_CALENDAR_ID,
    });
  } catch (error) {
    console.error('[カレンダー] 接続テストエラー:', error.message);
    res.json({
      success: false,
      message: `接続エラー: ${error.message}`,
      keyFileExists: fs.existsSync(GOOGLE_CALENDAR_KEY_PATH),
    });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 サーバー: http://localhost:${PORT}`);
  console.log(`📡 送信API: http://localhost:${PORT}/api/submit`);
  console.log(`📅 空き確認: http://localhost:${PORT}/api/check-availability`);
  console.log(`🤖 型番分析: http://localhost:${PORT}/api/analyze-model`);
  console.log(`💧 排水管洗浄オプション: http://localhost:${PORT}/api/get-drain-pipe-options`);
  console.log(`📆 カレンダー空き確認: http://localhost:${PORT}/api/calendar/check-availability`);
  console.log(`📆 カレンダー仮予約: http://localhost:${PORT}/api/calendar/create-reservation`);
  console.log(`📆 カレンダー接続テスト: http://localhost:${PORT}/api/calendar/test`);
  
  // カレンダー接続をテスト
  initCalendarClient();
});
