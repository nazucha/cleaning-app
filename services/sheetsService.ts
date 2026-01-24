// React Nativeでは直接composio-coreを使用できないため、
// バックエンドAPI経由で送信します

const API_ENDPOINT = __DEV__ 
  ? "http://192.168.128.186:3000/api/submit"  // 開発環境（実機用）
  : "http://localhost:3000/api/submit";        // ローカル環境

interface FormData {
  inquiryType: string;
  customerName: string;
  customerNameKana: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  numberOfUnits: number;
  airConditioners: any[];
  otherCleaning: string;
  parking: boolean;
  preferredDates: string[];
  notes: string;
}

/**
 * フォームデータをGoogle Sheetsに送信
 * 注意: バックエンドAPIが必要です
 */
export async function submitForm(formData: FormData): Promise<void> {
  try {
    // データをシートの形式に変換
    const rowData = formatFormDataToRow(formData);
    
    // バックエンドAPIに送信
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId: "1aWMoYwabogOwSP3xo1EreMesqP0JN1yFGWPmCC5wK-E",
        sheetName: "畑山",
        data: rowData,
      }),
    });
    
    if (!response.ok) {
      throw new Error('送信に失敗しました');
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    // 開発中はローカルストレージに保存
    console.log("開発モード: データをローカルに保存", formData);
    throw error;
  }
}

/**
 * フォームデータを行データに変換
 */
function formatFormDataToRow(formData: FormData): any[] {
  const row: any[] = [];
  
  // 基本情報
  row.push(formData.inquiryType || "");
  row.push(formData.customerName || "");
  row.push(formData.customerNameKana || "");
  row.push(formData.postalCode || "");
  row.push(formData.address || "");
  row.push(formData.phone || "");
  row.push(formData.email || "");
  row.push(formData.numberOfUnits.toString() || "1");
  
  // エアコン情報（最大4台）
  for (let i = 0; i < 4; i++) {
    const ac = formData.airConditioners[i] || {};
    row.push(ac.maker || "");
    row.push(ac.model || "");
    row.push(ac.type || "");
    row.push(ac.hasCleaningFunction ? "有り" : "無し");
    row.push(ac.height || "");
    row.push(ac.installation || "");
    row.push(ac.options?.join(", ") || "");
  }
  
  // その他
  row.push(formData.otherCleaning || "");
  row.push(formData.parking ? "あり" : "なし");
  row.push(formData.preferredDates[0] || "");
  row.push(formData.preferredDates[1] || "");
  row.push(formData.preferredDates[2] || "");
  row.push(formData.notes || "");
  
  return row;
}
