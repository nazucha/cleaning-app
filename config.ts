/**
 * アプリケーション設定
 * デプロイ時はAPI_BASE_URLを本番サーバーのURLに変更してください
 */

// 環境に応じたAPI URLを取得
const getApiBaseUrl = (): string => {
  // Webの場合
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // 本番環境（Vercel等でデプロイされた場合）
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // 本番のバックエンドURL（Railwayでデプロイ後に更新）
      return process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.railway.app';
    }
  }
  
  // ローカル開発環境
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

export const config = {
  API_BASE_URL,
  endpoints: {
    submit: `${API_BASE_URL}/api/submit`,
    drainPipeOptions: `${API_BASE_URL}/api/get-drain-pipe-options`,
    analyzeModel: `${API_BASE_URL}/api/analyze-model`,
  },
};

export default config;
