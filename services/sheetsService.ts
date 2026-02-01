/**
 * Google Sheets 送信サービス
 * フォームデータをスプレッドシート「畑山」のデータ領域に1行として追加します。
 */

import config from '../config';

const API_ENDPOINT = config.endpoints.submit;

const SPREADSHEET_ID = "1aWMoYwabogOwSP3xo1EreMesqP0JN1yFGWPmCC5wK-E";
const SHEET_NAME = "畑山";

/** アプリのFormData（型は緩めに受け付ける） */
interface FormDataLike {
  inquiryType?: string | string[];
  customerName?: string;
  customerNameKana?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  numberOfUnits?: number;
  airConditioners?: Array<{
    maker?: string;
    modelNumber?: string;
    model?: string;
    type?: string;
    hasCleaningFunction?: boolean | null;
    height?: string;
    installation?: string;
    options?: string[];
    freeOneMoreService?: string;
    optionsEtc?: string;
  }>;
  otherCleaning?: string;
  waterArea?: string;
  drainPipe?: string;
  buildingType?: string;
  workLocation?: string[];
  cloggingSymptom?: boolean;
  bathtubCleaningWork?: string;
  washingMachineType?: string;
  washingMachineDryingFunction?: boolean | null;
  washingMachineCleaningOption?: string;
  waterAreaSet?: string[];
  bathroomWork?: string;
  bathroomOptions?: string[];
  rangeHoodType?: string;
  kitchenWork?: string[];
  washroomWork?: string;
  toiletWork?: string[];
  floorWork?: string;
  floorArea?: number;
  carpetWork?: string;
  carpetArea?: number;
  otherWindowWork?: string | string[];
  otherWindowQuantities?: { [key: string]: number };
  otherWindowAreas?: { [key: string]: number };
  vacantRoomWork?: string;
  vacantRoomArea?: number;
  parking?: boolean | null;
  visitorParkingRules?: string;
  preferredDates?: string[];
  notes?: string;
  setDiscount?: string;
  totalAmount?: string;
}

/**
 * フォームデータをGoogle Sheetsに送信
 * データは「畑山」シートの末尾に1行として追加されます。
 */
export async function submitForm(formData: FormDataLike): Promise<void> {
  const rowData = formatFormDataToRow(formData);

  // Google Chat通知用にformDataも送信
  const chatFormData = {
    cleaningCompany: (formData as any).cleaningCompany || '',
    inquiryType: formData.inquiryType,
    customerName: formData.customerName,
    customerNameKana: formData.customerNameKana,
    phone: formData.phone,
    email: formData.email,
    postalCode: formData.postalCode,
    address: formData.address,
    preferredDate1: formData.preferredDates?.[0] || '',
    preferredDate2: formData.preferredDates?.[1] || '',
    preferredDate3: formData.preferredDates?.[2] || '',
    preferredDateAvailability1: (formData as any).preferredDatesAvailability?.[0] || '',
    preferredDateAvailability2: (formData as any).preferredDatesAvailability?.[1] || '',
    preferredDateAvailability3: (formData as any).preferredDatesAvailability?.[2] || '',
    notes: formData.notes,
    setDiscount: formData.setDiscount,
    totalAmount: formData.totalAmount,
    isCustomerMode: (formData as any).isCustomerMode || false,
  };

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
      data: rowData,
      formData: chatFormData, // Google Chat通知用
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err?.error || "送信に失敗しました");
  }
}

/**
 * 列マッピング（追加される1行の並び）
 * スプレッドシートのデータ領域の列順（A→B→C…）と一致させてください。
 *
 * 基本: A=問い合わせ内容, B=お客様名, C=フリガナ, D=郵便番号, E=住所, F=連絡先, G=メール, H=台数
 * 1台目: I=メーカー, J=型番数字, K=型番, L=種類, M=おそうじ, N=高さ, O=設置, P=オプション, Q=無料ワンモア, R=オプション等
 * 2〜4台目: 同様に各10列
 * その他: その他おそうじ, 水回り, 排水管, 駐車場, 来客用ルール, 希望日1〜3, 備考, セット割, 合計
 */
function formatFormDataToRow(form: FormDataLike): (string | number)[] {
  const row: (string | number)[] = [];

  row.push(Array.isArray(form.inquiryType) ? form.inquiryType.join('、') : (form.inquiryType ?? ""));
  row.push(form.customerName ?? "");
  row.push(form.customerNameKana ?? "");
  row.push(form.postalCode ?? "");
  row.push(form.address ?? "");
  row.push(form.phone ?? "");
  row.push(form.email ?? "");
  row.push(String(form.numberOfUnits ?? 1));

  for (let i = 0; i < 4; i++) {
    const ac = form.airConditioners?.[i] ?? {};
    row.push(ac.maker ?? "");
    row.push(ac.modelNumber ?? "");
    row.push(ac.model ?? "");
    row.push(ac.type ?? "");
    row.push(ac.hasCleaningFunction ? "有り" : "無し");
    row.push(ac.height ?? "");
    row.push(ac.installation ?? "");
    row.push(Array.isArray(ac.options) ? ac.options.join(", ") : "");
    row.push(ac.freeOneMoreService ?? "");
    row.push(ac.optionsEtc ?? "");
  }

  row.push(form.otherCleaning ?? "");
  row.push(form.waterArea ?? "");
  row.push(form.drainPipe ?? "");
  row.push(form.buildingType ?? "");
  row.push(Array.isArray(form.workLocation) ? form.workLocation.join('、') : "");
  row.push(form.cloggingSymptom === true ? "あり" : "なし");
  row.push(form.bathtubCleaningWork ?? "");
  row.push(form.washingMachineType ?? "");
  row.push(form.washingMachineDryingFunction === true ? "あり" : form.washingMachineDryingFunction === false ? "なし" : "");
  row.push(form.washingMachineCleaningOption ?? "");
  row.push(Array.isArray(form.waterAreaSet) ? form.waterAreaSet.join('、') : "");
  row.push(form.bathroomWork ?? "");
  row.push(Array.isArray(form.bathroomOptions) ? form.bathroomOptions.join('、') : "");
  row.push(form.rangeHoodType ?? "");
  row.push(Array.isArray(form.kitchenWork) ? form.kitchenWork.join('、') : "");
  row.push(form.washroomWork ?? "");
  row.push(Array.isArray(form.toiletWork) ? form.toiletWork.join('、') : "");
  row.push(form.floorWork ?? "");
  row.push(form.floorArea && form.floorArea > 0 ? `${form.floorArea}㎡` : "");
  row.push(form.carpetWork ?? "");
  row.push(form.carpetArea && form.carpetArea > 0 ? `${form.carpetArea}㎡` : "");
  row.push(Array.isArray(form.otherWindowWork) ? form.otherWindowWork.join('、') : (form.otherWindowWork ?? ""));
  // 各項目の数量を文字列として結合
  const quantities: string[] = [];
  if (form.otherWindowQuantities) {
    Object.entries(form.otherWindowQuantities).forEach(([key, value]) => {
      if (value > 0) {
        let unit = '（枚・箇所）';
        if (key === '窓ガラス・サッシ' || key === 'お部屋の換気口・換気扇') {
          unit = '箇所';
        } else if (key === 'シャッター・雨戸(内側のみ)' || key === 'シャッター・雨戸(両面)') {
          unit = '枚';
        } else if (key === 'ガラス外面水垢防止コーティング') {
          unit = '枠';
        }
        quantities.push(`${key}: ${value}${unit}`);
      }
    });
  }
  row.push(quantities.length > 0 ? quantities.join('、') : "");
  // 各項目の面積を文字列として結合
  const areas: string[] = [];
  if (form.otherWindowAreas) {
    Object.entries(form.otherWindowAreas).forEach(([key, value]) => {
      if (value > 0) {
        areas.push(`${key}: ${value}㎡`);
      }
    });
  }
  row.push(areas.length > 0 ? areas.join('、') : "");
  row.push(form.vacantRoomWork ?? "");
  row.push(form.vacantRoomArea && form.vacantRoomArea > 0 ? `${form.vacantRoomArea}㎡` : "");
  row.push(form.parking === true ? "あり" : form.parking === false ? "なし" : "");
  row.push(form.visitorParkingRules ?? "");
  row.push(form.preferredDates?.[0] ?? "");
  row.push(form.preferredDates?.[1] ?? "");
  row.push(form.preferredDates?.[2] ?? "");
  row.push(form.notes ?? "");
  row.push(form.setDiscount ?? "");
  row.push(form.totalAmount ?? "");

  return row;
}
