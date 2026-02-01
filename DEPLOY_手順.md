# ウェブ公開の手順

## 準備完了したこと
- ✅ GitHub へのコードアップロード
- ✅ Railway 用の設定（PORT対応・Procfile）

---

## ステップ1: Railway でバックエンドをデプロイ

1. **https://railway.app** を開く
2. **「Start a New Project」** をクリック
3. **「Login with GitHub」** でログイン
4. **「Deploy from GitHub repo」** を選択
5. 初回なら **「Configure GitHub App」** → GitHub で **nazucha/cleaning-app** を許可
6. 一覧から **「cleaning-app」** を選ぶ
7. デプロイが始まる（2〜5分ほど）
8. 完了したら **「Settings」** → **「Networking」** → **「Generate Domain」** をクリック
9. 表示されたURL（例: `https://cleaning-app-production-xxxx.up.railway.app`）をメモする  
   → これが **バックエンドのURL** です

### 環境変数（任意・後からでも可）
- **Variables** タブで以下を追加できます：
  - `EMAIL_USER` = 送信用Gmailアドレス
  - `EMAIL_PASSWORD` = Gmailのアプリパスワード

---

## ステップ2: Vercel でフロントエンドをデプロイ

1. **https://vercel.com** を開く
2. **「Sign Up」** → **「Continue with GitHub」** でログイン
3. **「Add New…」** → **「Project」** をクリック
4. **「Import」** で **nazucha/cleaning-app** を選択
5. **Framework Preset**: **Other** のまま
6. **Root Directory**: そのまま（`./`）
7. **Environment Variables** に以下を追加：
   - **Name**: `EXPO_PUBLIC_API_URL`  
   - **Value**: ステップ1でメモした Railway のURL（`https://...` のみ、末尾の`/`なし）
8. **「Deploy」** をクリック
9. 完了後、表示されるURL（例: `https://cleaning-app-xxx.vercel.app`）が **お客様用フォームのURL** です

### お客様用フォームのURL
- 通常: `https://あなたのURL.vercel.app`
- お客様用: `https://あなたのURL.vercel.app?customer`

---

## 変更を反映したいとき

1. コードを編集して保存
2. ターミナルで：
   ```bash
   cd /Users/malove/Desktop/再チャレンジ/cleaning-app
   git add -A
   git commit -m "変更内容"
   git push
   ```
3. Railway と Vercel が自動で再デプロイします（1〜3分）

---

不明なところがあれば、どのステップで止まったか教えてください。
