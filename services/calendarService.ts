// Googleカレンダーの空き時間をチェックするサービス

const API_ENDPOINT = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `http://${window.location.hostname}:3000/api/check-availability`  // 実機用（同じネットワーク）
  : "http://localhost:3000/api/check-availability";                    // ローカル環境（Web版・シミュレーター用）

export interface AvailabilityResult {
  success: boolean;
  available: boolean;
  message: string;
  error?: string;
}

/**
 * 指定された日時がカレンダーで空いているかチェック
 * @param date 日付 (YYYY-MM-DD形式)
 * @param time 時間 (HH:mm形式)
 * @param calendarId カレンダーID（オプション、デフォルトは"primary"）
 * @returns 空き状況の結果
 */
export async function checkAvailability(
  date: string,
  time: string,
  calendarId?: string
): Promise<AvailabilityResult> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        time,
        calendarId: calendarId || 'primary',
      }),
    });

    if (!response.ok) {
      throw new Error('空き時間チェックに失敗しました');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking availability:", error);
    // エラー時はデフォルトで「スタッフが随時対応」を返す
    return {
      success: false,
      available: false,
      message: 'スタッフが随時対応',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
