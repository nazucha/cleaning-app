import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { submitForm } from './services/sheetsService';
import { checkAvailability } from './services/calendarService';
import config from './config';
import {
  searchModels,
  getPrefixSuggestions,
  getSuffixSuggestions,
  getAllModels,
} from './services/modelSearchService';

// Web版ではConstantsが正しく動作しない場合があるため、条件付きでインポート
let Constants: any = {};
if (Platform.OS !== 'web') {
  try {
    const expoConstants = require('expo-constants');
    Constants = expoConstants && expoConstants.default ? expoConstants.default : expoConstants;
  } catch (e) {
    // Web版ではConstantsを使用しない
    Constants = {};
  }
} else {
  // Web版では空のオブジェクトを使用
  Constants = {};
}

interface AirConditioner {
  perfectSet: string; // 完璧セット（ベネフィット用）
  perfectSetType: string; // エアコン完璧セットのタイプ
  maker: string;
  model: string;
  type: string;
  hasCleaningFunction: boolean | null;
  chatGPTResponse: string; // ChatGPTの完全な回答
  height: string;
  installation: string;
  options: string[];
  freeOneMoreService: string;
  otherCleaning: string;
  optionsEtc: string;
}

interface FormData {
  cleaningCompany: string;
  inquiryType: string[]; // 複数選択可能
  customerName: string;
  customerNameKana: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  numberOfUnits: number;
  airConditioners: AirConditioner[];
  otherCleaning: string;
  waterArea: string;
  drainPipe: string;
  buildingType: string; // 建物タイプ（戸建てタイプ/マンション・アパートタイプ）
  workLocation: string[]; // 作業箇所（複数選択可能）
  cloggingSymptom: boolean; // つまり症状のご依頼
  bathtubCleaningWork: string; // 風呂釜洗浄の作業内容
  washingMachineType: string; // 洗濯機の種類（8kg未満（縦型）/8kg以上（縦型））
  washingMachineDryingFunction: boolean | null; // 乾燥機能（あり/なし）
  washingMachineCleaningOption: string; // 洗濯機分解洗浄のオプション
  waterAreaSet: string[]; // 水回りセット（複数選択可能）
  bathroomPerfectSet: string; // 浴室完璧セット
  bathroomWork: string; // 浴室の作業内容
  bathroomOptions: string[]; // 浴室のオプション（複数選択可能）
  rangeHoodType: string; // レンジフードのタイプ（フード付き/フード無し(プロペラ)）
  kitchenWork: string[]; // キッチンの作業内容（複数選択可能）
  washroomPerfectSet: boolean; // 洗面所完璧セット
  washroomWork: string; // 洗面所の作業内容
  toiletPerfectSet: boolean; // トイレ完璧セット
  toiletWork: string[]; // トイレの作業内容（複数選択可能）
  floorWork: string; // 床の作業内容
  floorArea: number; // 床の面積（㎡）
  carpetWork: string; // カーペットの作業内容
  carpetArea: number; // カーペットの面積（㎡）
  otherWindowWork: string[]; // その他（窓・ベランダ・換気口・照明）の作業内容（複数選択可能）
  otherWindowQuantities: { [key: string]: number }; // その他（窓・ベランダ・換気口・照明）の各項目の数量
  otherWindowAreas: { [key: string]: number }; // その他（窓・ベランダ・換気口・照明）の各項目の面積
  vacantRoomWork: string; // 空室・引渡し清掃の作業内容
  vacantRoomArea: number; // 空室・引渡し清掃の面積（㎡、25㎡以上用）
  mattressSize: string; // マットレスサイズ
  mattressSide: string; // マットレス施工面（片面/両面/手伝いあり）
  mattressOptions: string[]; // マットレスオプション
  mattressStainCount: number; // シミ抜き数（10cm四方単位）
  // 除菌関連
  disinfectionType: string; // 除菌タイプ（一戸建て・マンション/事務所・店舗/車両）
  disinfectionHouseSize: string; // 一戸建て・マンションのサイズ
  disinfectionOfficeArea: number; // 事務所・店舗の面積
  disinfectionVehicleType: string; // 車両タイプ
  disinfectionVehicleCount: number; // 車両台数
  disinfectionOptions: string[]; // 除菌オプション
  parking: boolean | null;
  visitorParkingRules: string;
  paidParkingConfirmed: boolean;
  preferredDates: string[];
  preferredDatesAvailability: string[]; // 各希望日の空き状況（"確定" or "スタッフが随時対応"）
  notes: string;
  additionalCharge: number; // その他追加料金
  setDiscount: string;
  totalAmount: string;
  cancellationPolicyConfirmed: boolean;
}

export default function App() {

  // お客様用モードかどうかを判定（URLパラメータ ?customer または ?mode=customer で切り替え）
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  
  // URLパラメータからモードを取得
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      // ?customer または ?mode=customer でお客様モードに
      setIsCustomerMode(urlParams.has('customer') || mode === 'customer');
    }
  }, []);

  // Web版でメタディスクリプションタグを追加
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 既存のメタディスクリプションタグを削除
      const existingMeta = document.querySelector('meta[name="description"]');
      if (existingMeta) {
        existingMeta.remove();
      }
      
      // 新しいメタディスクリプションタグを追加
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = '清掃サービス（エアコン清掃など）のお問い合わせフォームです。お客様情報、エアコン情報、希望日時などを入力して送信できます。';
      document.head.appendChild(meta);
      
      // クリーンアップ関数
      return () => {
        const metaTag = document.querySelector('meta[name="description"]');
        if (metaTag) {
          metaTag.remove();
        }
      };
    }
  }, []);

  // Web版で強制的に再マウントするためのキー
  const [formKey, setFormKey] = useState(() => {
    // Web版では初期値を1に設定して、初回から再マウントを促す
    return Platform.OS === 'web' ? 1 : 0;
  });


  // プルダウンの選択肢（スプレッドシートのデータから）
  const inquiryTypeOptionsIsoji = [
    '',
    'エアコン',
    '排水管洗浄',
    '風呂釜洗浄',
    '洗濯機分解洗浄',
    '水回りセット',
    '浴室',
    'レンジフード',
    'キッチン',
    'トイレ',
    '床',
    'カーペット',
    'マットレスクリーニング',
    '除菌',
    'その他(窓・ベランダ・換気口・照明)',
    '空室・引き渡し清掃',
    '上記以外'
  ];
  const inquiryTypeOptionsBenefit = [
    '',
    'エアコン',
    '水回り',
    '排水管'
  ];
  const makerOptions = [
    '',
    'ダイキン',
    '三菱電機',
    '日立',
    'パナソニック',
    '東芝',
    '富士通ゼネラル',
    'シャープ（SHARP）',
    '三菱重工',
    'その他'
  ];
  const airConditionerTypeOptionsIsoji = [
    '',
    '壁掛けおそうじ機能付き',
    '壁掛け一般',
    '大型',
    '天井埋め込みタイプ(住居家庭用1・2方向)',
    '天井埋め込みタイプ(オフィス・店舗・施設用4方向)',
    '天井吊り下げタイプ',
    '壁埋め込み式エアコン',
    '床置きタイプエアコン(小型)',
    '床置きタイプエアコン大型)',
    'その他'
  ];
  const airConditionerTypeOptionsBenefit = [
    '',
    '壁掛一般エアコン1台+防カビ抗菌コートセット',
    '壁掛一般エアコン2台+防カビ抗菌コートセット',
    '壁掛一般エアコン3台+防カビ抗菌コートセット',
    '壁掛お掃除機能付きエアコン+防カビ抗菌コートセット',
    '壁掛お掃除機能付きエアコン2台+防カビ抗菌コートセット',
    '壁掛お掃除機能付きエアコン3台+防カビ抗菌コートセット',
    '一般エアコン完璧セット(エアコン壁掛一般+室外機+防カビ抗菌コート+防虫キャップ)',
    'お掃除機能付きエアコン完璧セット(エアコン壁掛お掃除機能付き+室外機+防カビ抗菌コート+防虫キャップ)'
  ];
  const heightOptions = ['', '2m前後', '3m前後', '3m以上', '不明'];
  const installationOptions = [
    '',
    '上部・右側10cm以上隙間あり',
    '上部・右側10cm以上隙間なし',
    '上部隙間あり・右側隙間なし',
    '上部隙間なし・右側隙間あり',
    '不明'
  ];
  const optionOptionsIsoji = [
    '',
    '防カビ抗菌コート',
    '室外機小型',
    '室外機大型',
    '防虫キャップ',
    'その他'
  ];
  const optionOptionsBenefit = [
    '',
    '室外機小型',
    '防虫キャップの取り付け'
  ];
  const freeOneMoreServiceOptions = [
    '',
    '照明のホコリ取り',
    '注文外のエアコンのフィルター清掃',
    '洗面所orトイレの換気扇フィルター',
    '玄関土間掃除機がけ',
    'キッチンor洗面所or浴室排水口清掃',
    '洗濯機のフィルター清掃',
    '冷蔵庫の上部清掃',
    '乾燥機or洗濯機の上部清掃'
  ];

  const waterAreaOptions = [
    '',
    '水回り2点セット',
    '水回り3点セット',
    '水回り4点セット',
    'キッチン一式',
    'レンジフード',
    '浴室完璧セット(浴室クリーニング+エプロン内部+風呂釜洗浄)',
    '浴室一式',
    '浴室一式+風呂釜クリーニング1つ穴セット',
    '風呂釜クリーニング(1つ穴タイプ)',
    '洗面所一式',
    'トイレー式'
  ];
  // 排水管洗浄の選択肢（Google Sheetsから取得、失敗時はハードコードされた選択肢を使用）
  const [drainPipeOptions, setDrainPipeOptions] = useState<string[]>([
    '',
    '戸建てタイプ-キッチン',
    '戸建てタイプ-洗面所',
    '戸建てタイプ-浴室',
    '戸建てタイプ-防水パン (洗濯機下の排水口)',
    '戸建てタイプ-トイレ内の独立洗面台',
    'マンションアパートタイプ-キッチン',
    'マンションアパートタイプ-洗面所',
    'マンションアパートタイプ-浴室',
    'マンションアパートタイプ-防水パン (洗濯機下の排水口)',
    'マンションアパートタイプ-トイレ内の独立洗面台',
    'つまり症状のご依頼-戸建てタイプ',
    'つまり症状のご依頼-マンションタイプ',
    '排水管完璧セット-空室価格 戸建てタイプ',
    '排水管完璧セット-空室価格 マンションアパートタイプ',
    '排水管完璧セット-在宅価格 戸建てタイプ',
    '排水管完璧セット-在宅価格 マンションアパートタイプ',
    'つまり症状のご依頼-マンションアパートタイプ',
    '法人向けマンション1棟まるごとパック-20戸以上',
    '法人向けマンション1棟まるごとパック-20戸以下'
  ]);
  
  // Google Sheetsから排水管洗浄の選択肢を取得（オプション）
  useEffect(() => {
    const fetchDrainPipeOptions = async () => {
      try {
        const API_ENDPOINT = config.endpoints.drainPipeOptions;
        
        console.log('[排水管洗浄] APIエンドポイント:', API_ENDPOINT);
        
        const response = await fetch(API_ENDPOINT);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[排水管洗浄] 取得したデータ:', data);
        
        if (data.success && data.options && Array.isArray(data.options) && data.options.length > 0) {
          console.log('[排水管洗浄] 選択肢数:', data.options.length);
          console.log('[排水管洗浄] 選択肢:', data.options);
          // 空の選択肢を先頭に追加
          setDrainPipeOptions(['', ...data.options]);
        } else {
          console.warn('[排水管洗浄] データ形式が不正または空:', data);
          // ハードコードされた選択肢をそのまま使用
        }
      } catch (error) {
        console.error('[排水管洗浄] 取得エラー:', error);
        // エラー時はハードコードされた選択肢をそのまま使用
      }
    };
    
    fetchDrainPipeOptions();
  }, []);
  const otherCleaningOptions = [
    '',
    '風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付き換気扇+エプロン内部高圧クリーニング',
    '風呂釜クリーニング(1つ穴タイプ)',
    'ジェットバス・ジャグジークリーニング',
    '風呂釜クリーニング(1つ穴タイプ) +ジェットバスクリーニング',
    '風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付換気扇',
    '風呂釜クリーニング (1つ穴タイプ) +エプロン内部高圧クリーニング',
    '洗濯機分解クリーニング 8kg未満(縦型)',
    '洗濯機分解クリーニング 8kg以上(縦型)',
    '洗濯機分解クリーニング 8kg未満(縦型)乾燥機能付',
    '洗濯機分解クリーニング 8kg以上(縦型)乾燥機能付',
    '日立ビートウォッシュ・白い約束',
    '洗濯パンクリーニング',
    '2点セット (キッチン・浴室)',
    '2点セット(キッチン・レンジフード)',
    '2点セット (キッチン・洗面所+トイレ)',
    '2点セット (キッチン・トイレ2ヶ所)',
    '2点セット(レンジフード×浴室)',
    '2点セット(レンジフード×洗面所+トイレ)',
    '2点セット(レンジフード×トイレ2ヶ所)',
    '2点セット(浴室×洗面所+トイレ)',
    '2点セット(浴室×トイレ2ヶ所)',
    '2点セット(洗面所+トイレ×トイレ2ヶ所)',
    '浴室(便器付き or 洗面ボウル)',
    '浴室3点ユニット',
    'エプロン内部清掃',
    '通常換気扇',
    '乾燥機付き換気扇',
    '鏡 水垢防止コーティング',
    '浴室全体 水垢防止コーティング',
    'キッチンユニット(横幅4mまで)',
    '備え付けオーブンレンジ内部',
    '食洗器内部清掃',
    'シンク水垢防止コーティング',
    '冷蔵庫(中にモノがある状態)',
    '冷蔵庫(中にモノがない状態)',
    '後置き食器棚表面',
    '洗面所クリーニング',
    '洗面ボウル 水垢防止コーティング',
    'トイレクリーニング',
    '便器内 水垢防止コーティング',
    'タンク内クリーニング',
    '拭き清掃+掃除機がけ',
    '清掃+スタンダードワックス',
    '清掃+ハイグレードワックス',
    '剥離洗浄',
    'カーペットクリーニング',
    '防臭抗菌加工',
    '窓ガラス・サッシ / 1箇所',
    'シャッター・雨戸 (内側のみ) / 1枚',
    'シャッター・雨戸 (両面) / 1枚',
    'ベランダ 10㎡未満',
    'ベランダ 10㎡以上、20㎡未満',
    'ベランダ 20㎡以上、30㎡未満',
    'ベランダ 30㎡以上 1㎡あたり',
    'お部屋の換気口・換気扇',
    '照明器具',
    'ガラス外面水垢防止コーティング',
    'ベランダ 雨だれ除去',
    '2点セット',
    '3点セット',
    '4点セット',
    'エアコン完璧セット(一般タイプ) 室内機+室外機+防カビ抗菌コート+防虫キャップ',
    'エアコン完璧セット (お掃除機能付きタイプ) 室内機+室外機+防カビ抗菌コート+防虫キャップ',
    '浴室完璧セット(通常換気扇)',
    '浴室完璧セット (乾燥機付き換気扇)',
    '洗面所完璧セット',
    '2点セット (その他組み合わせ)',
    '3点セット (キッチン+レンジフード+浴室)',
    '3点セット (キッチン+レンジフード+洗面所+トイレ)',
    '3点セット (キッチン+レンジフード+トイレ2ヶ所)',
    '3点セット (キッチン+浴室+洗面所+トイレ)',
    '3点セット (キッチン+浴室+トイレ2ヶ所)',
    '3点セット (キッチン+洗面所+トイレ+トイレ2ヶ所)',
    '3点セット (レンジフード+浴室+洗面所+トイレ)',
    '3点セット (レンジフード+浴室+トイレ2ヶ所)',
    '3点セット (レンジフード+洗面所+トイレ+トイレ2ヶ所)',
    '3点セット (浴室+洗面所+トイレ+トイレ2ヶ所)',
    '3点セット (その他組み合わせ)',
    '4点セット (キッチン+レンジフード+浴室+洗面所+トイレ)',
    '4点セット (キッチン+レンジフード+浴室+トイレ2ヶ所)',
    '4点セット (キッチン+レンジフード+洗面所+トイレ+トイレ2ヶ所)',
    '4点セット (キッチン+浴室+洗面所+トイレ+トイレ2ヶ所)',
    '4点セット (レンジフード+浴室+洗面所+トイレ+トイレ2ヶ所)',
    '4点セット (その他組み合わせ)',
    'レンジフード : フード付きタイプ',
    'レンジフード : フード無しプロペラタイプ',
    '浴室クリーニング',
    'シャワー室',
    '徹底清掃-25㎡未満一律料金',
    '徹底清掃-25㎡以上1㎡あたり',
    '簡易清掃-25㎡未満一律料金',
    '簡易清掃-25㎡以上1㎡あたり',
    '建物タイプ別追加料金-平屋・マンションタイプ',
    '建物タイプ別追加料金-戸建2F建て',
    '建物タイプ別追加料金-戸建3F建て',
    '建物タイプ別追加料金-戸建4F建て',
    '引き渡し清掃-50㎡まで',
    '引き渡し清掃※51㎡以上',
    'トイレ完璧セット',
    '単品メニューやオプションを選んで22,000円以上で10%OFF',
    '排水管洗浄:戸建てタイプ-キッチン',
    '排水管洗浄:戸建てタイプ-洗面所',
    '排水管洗浄:戸建てタイプ-浴室',
    '排水管洗浄:戸建てタイプ-防水パン (洗濯機下の排水口)',
    '排水管洗浄:戸建てタイプ-トイレ内の独立洗面台',
    '排水管洗浄: マンションアパートタイプ-キッチン',
    '排水管洗浄:マンションアパートタイプ-洗面所',
    '排水管洗浄: マンションアパートタイプ-浴室',
    '排水管洗浄:マンションアパートタイプ-防水パン (洗濯機下の排水口)',
    '排水管洗浄:マンションアパートタイプ-トイレ内の独立洗面台',
    '排水管洗浄: つまり症状のご依頼-戸建てタイプ',
    '排水管洗浄: つまり症状のご依頼-マンションタイプ',
    '排水管洗浄:排水管完璧セット-空室価格 戸建てタイプ',
    '排水管洗浄:排水管完璧セット-空室価格 マンションアパートタイプ',
    '排水管洗浄:排水管完璧セット-在宅価格 戸建てタイプ',
    '排水管洗浄:排水管完璧セット-在宅価格 マンションアパートタイプ',
    '排水管洗浄: つまり症状のご依頼-マンションアパートタイプ',
    '排水管洗浄:法人向けマンション1棟まるごとパック-20戸以上',
    '排水管洗浄:法人向けマンション1棟まるごとパック-20戸以下',
    'その他'
  ];

  const optionEtcOptions = [
    '',
    '除菌・消臭',
    'エアコン 分解洗浄',
    '機能付きエアコン 分解洗浄',
    'エアコン 防カビ抗菌コート',
    '風呂釜クリーニング（追い焚き配管クリーニング）',
    'ジェットバス',
    'レンジフード内部 分解清掃',
    '浴室 エプロン内部清掃',
    'キッチン 追加',
    'キッチン シンク内 簡易撥水コーティング',
    'キッチン オーブンレンジ内部清掃',
    'キッチン 食洗器内部清掃',
    'レンジフード プロペラ換気扇内部 分解洗浄',
    '浴室 追加',
    '浴室 鏡親水コーティング',
    '浴室 全体親水コーティング',
    '浴室 換気扇内部（一般タイプ）分解清掃',
    '浴室 乾燥機能付換気扇内部 分解清掃',
    '洗面所 追加',
    '洗面所 洗面ボウル',
    '洗面所 洗面ボウル 親水コーティング',
    '洗面所 換気扇分解清掃',
    'トイレ 追加',
    'トイレ 便器内 親水コーティング',
    'トイレ 換気扇分解清掃',
    'トイレ タンク内部清掃',
    '窓 シャッター・雨戸（内側のみ）',
    '窓 シャッター・雨戸（両面）',
    '窓 2重窓',
    '床 ワックス剥離洗浄',
    '床 ハイグレードワックス',
    'カーペット 洗浄',
  ];

  // オプション等の料金表
  const optionEtcPrices: { [key: string]: number } = {
    '除菌・消臭': 440, // ㎡単価（1回分として計算）
    'エアコン 分解洗浄': 7984,
    '機能付きエアコン 分解洗浄': 14960,
    'エアコン 防カビ抗菌コート': 2200,
    '風呂釜クリーニング（追い焚き配管クリーニング）': 14080,
    'ジェットバス': 0,
    'レンジフード内部 分解清掃': 12320,
    '浴室 エプロン内部清掃': 2464,
    'キッチン 追加': 13200,
    'キッチン シンク内 簡易撥水コーティング': 3080,
    'キッチン オーブンレンジ内部清掃': 8800,
    'キッチン 食洗器内部清掃': 6160,
    'レンジフード プロペラ換気扇内部 分解洗浄': 7920,
    '浴室 追加': 12320,
    '浴室 鏡親水コーティング': 6160,
    '浴室 全体親水コーティング': 7920,
    '浴室 換気扇内部（一般タイプ）分解清掃': 3080,
    '浴室 乾燥機能付換気扇内部 分解清掃': 8800,
    '洗面所 追加': 6600,
    '洗面所 洗面ボウル': 2640,
    '洗面所 洗面ボウル 親水コーティング': 4400,
    '洗面所 換気扇分解清掃': 3080,
    'トイレ 追加': 6600,
    'トイレ 便器内 親水コーティング': 4400,
    'トイレ 換気扇分解清掃': 3080,
    'トイレ タンク内部清掃': 3080,
    '窓 シャッター・雨戸（内側のみ）': 1320,
    '窓 シャッター・雨戸（両面）': 1760,
    '窓 2重窓': 1650,
    '床 ワックス剥離洗浄': 880,
    '床 ハイグレードワックス': 396,
    'カーペット 洗浄': 880,
  };

  const [formData, setFormData] = useState<FormData>({
    cleaningCompany: 'アイソウジ',
    inquiryType: [],
    customerName: '',
    customerNameKana: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    numberOfUnits: 1,
    airConditioners: [{
      perfectSet: '',
      perfectSetType: '',
      maker: '',
      model: '',
      type: '',
      hasCleaningFunction: null,
      chatGPTResponse: '',
      height: '',
      installation: '',
      options: [],
      freeOneMoreService: '',
      otherCleaning: '',
      optionsEtc: '',
    }],
    otherCleaning: '',
    waterArea: '',
    drainPipe: '',
    buildingType: '',
    workLocation: [],
    cloggingSymptom: false,
    bathtubCleaningWork: '',
    washingMachineType: '',
    washingMachineDryingFunction: null,
    washingMachineCleaningOption: '',
    waterAreaSet: [],
    bathroomPerfectSet: '',
    bathroomWork: '',
    bathroomOptions: [],
    rangeHoodType: '',
    kitchenWork: [],
    washroomPerfectSet: false,
    washroomWork: '',
    toiletPerfectSet: false,
    toiletWork: [],
    floorWork: '',
    floorArea: 0,
    carpetWork: '',
    carpetArea: 0,
    otherWindowWork: [],
    otherWindowQuantities: {},
    otherWindowAreas: {},
    vacantRoomWork: '',
    vacantRoomArea: 0,
    mattressSize: '',
    mattressSide: '',
    mattressOptions: [],
    mattressStainCount: 0,
    disinfectionType: '',
    disinfectionHouseSize: '',
    disinfectionOfficeArea: 0,
    disinfectionVehicleType: '',
    disinfectionVehicleCount: 1,
    disinfectionOptions: [],
    parking: null,
    visitorParkingRules: '',
    paidParkingConfirmed: false,
    preferredDates: ['', '', ''],
    preferredDatesAvailability: ['', '', ''],
    notes: '',
    additionalCharge: 0,
    setDiscount: '0',
    totalAmount: '0',
    cancellationPolicyConfirmed: false,
  });

  const airConditionerTypeOptions = useMemo(() => {
    return formData.cleaningCompany === 'ベネフィット' 
      ? airConditionerTypeOptionsBenefit 
      : airConditionerTypeOptionsIsoji;
  }, [formData.cleaningCompany]);

  const optionOptions = useMemo(() => {
    return formData.cleaningCompany === 'ベネフィット' 
      ? optionOptionsBenefit 
      : optionOptionsIsoji;
  }, [formData.cleaningCompany]);

  const inquiryTypeOptions = useMemo(() => {
    return formData.cleaningCompany === 'ベネフィット' 
      ? inquiryTypeOptionsBenefit 
      : inquiryTypeOptionsIsoji;
  }, [formData.cleaningCompany]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<{ [key: number]: Date }>({});
  // 日付入力中のテキストを一時的に保持（各フィールドごと）
  const [dateInputText, setDateInputText] = useState<{ [key: number]: string }>({});
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  // 型番候補リストの表示状態を管理（各エアコンごと）
  const [showModelSuggestions, setShowModelSuggestions] = useState<{ [key: number]: boolean }>({});
  // 型番の自動判定タイマーを管理（各エアコンごと）
  const modelDetectionTimers = useRef<{ [key: number]: NodeJS.Timeout | null }>({});
  // 型番の2段階クリック状態を管理（各エアコン・全メーカー共通）
  const [modelFirstClickState, setModelFirstClickState] = useState<{ [key: number]: string | null }>({});
  // Webでダブルクリックが再レンダー前に処理される問題対策：refで同期的に2回目クリックを検知
  const modelFirstClickRef = useRef<{ [key: number]: string | null }>({});

  // 令和年の計算関数
  const getReiwaYear = (year: number): number => {
    return year - 2018;
  };

  // 日付をYYYY/MM/DD形式にフォーマット（表示用）
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    // YYYY-MM-DD形式の場合はYYYY/MM/DDに変換
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr.replace(/-/g, '/');
    }
    // 既にYYYY/MM/DD形式の場合はそのまま返す
    if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      return dateStr;
    }
    // Dateオブジェクトとして解析を試みる
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
    return dateStr;
  };

  // 入力された日付文字列をYYYY-MM-DD形式に正規化
  const normalizeDateInput = (input: string): string | null => {
    if (!input || input.trim() === '') return null;
    
    // YYYY/MM/DD形式をYYYY-MM-DDに変換
    const dateWithSlash = input.trim().replace(/\//g, '-');
    
    // YYYY-MM-DD形式かチェック
    const datePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const match = dateWithSlash.match(datePattern);
    
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      
      // 日付の妥当性チェック
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          // YYYY-MM-DD形式に正規化
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    return null;
  };

  // カレンダーの日付を生成
  const generateCalendarDays = (year: number, month: number): (Date | null)[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // 週の最初の日（日曜日）
    
    const days: (Date | null)[] = [];
    const currentDate = new Date(startDate);
    
    // 6週分の日付を生成（42日）
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // 30分刻みの時間オプションを生成（9:00から18:00まで）
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  };

  const timeOptions = useMemo(() => generateTimeOptions(), []);
  // 型番のプルダウン選択肢を取得する関数（メーカー別）
  const getModelOptions = useCallback((maker: string): string[] => {
    try {
      let models: string[] = [];
      // デバッグ: どのメーカーが呼び出されたか確認
      console.log('[getModelOptions] メーカー:', maker);
      // 富士通ゼネラルの場合は完全な詳細型番リストを優先的に使用
      if (maker === '富士通ゼネラル') {
        // 富士通ゼネラルの完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            const fujitsuFullModelDetails = require('./data/fujitsuFullModelDetails.json');
            if (fujitsuFullModelDetails.modelDetails) {
              for (const prefix in fujitsuFullModelDetails.modelDetails) {
                const detailModels = fujitsuFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
          } catch (fullError) {
          const fujitsuModelDetails = require('./data/fujitsuModelDetails.json');
          if (fujitsuModelDetails.modelDetails) {
            for (const prefix in fujitsuModelDetails.modelDetails) {
              const detailModels = fujitsuModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            '富士通ゼネラル': '富士通', // データベースでは「富士通」として保存されている
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('富士通ゼネラルの詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            '富士通ゼネラル': '富士通', // データベースでは「富士通」として保存されている
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === 'ダイキン') {
        // ダイキンの完全な詳細型番リストを優先的に使用
        try {
          // まず完全な型番データを試す
          let allDetailModels: string[] = [];
          try {
            // requireのキャッシュをクリア（開発環境で新しいファイルを読み込むため）
            // Web版ではrequire.cacheが存在しない場合があるため、try-catchで囲む
            try {
              if (typeof require !== 'undefined' && require.cache && require.resolve) {
                const fullModelPath = require.resolve('./data/daikinFullModelDetails.json');
                if (require.cache[fullModelPath]) {
                  delete require.cache[fullModelPath];
                  console.log('[ダイキン] requireキャッシュをクリアしました');
                }
              }
            } catch (cacheError) {
              // キャッシュクリアに失敗しても続行
              console.log('[ダイキン] キャッシュクリアをスキップ:', cacheError.message);
            }
            
            const daikinFullModelDetails = require('./data/daikinFullModelDetails.json');
            console.log('[ダイキン] 完全な型番データを読み込みました:', daikinFullModelDetails.totalFullModels || 'N/A', '件');
            console.log('[ダイキン] 最終更新日:', daikinFullModelDetails.lastUpdated || 'N/A');
            
            if (daikinFullModelDetails.modelDetails) {
              for (const prefix in daikinFullModelDetails.modelDetails) {
                const detailModels = daikinFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
            console.log('[ダイキン] 完全な型番の総数:', allDetailModels.length, '件');
            if (allDetailModels.length > 0) {
              console.log('[ダイキン] サンプル型番（最初の10件）:', allDetailModels.slice(0, 10).join(', '));
              // AJTで始まる型番を確認
              const ajtModels = allDetailModels.filter(m => m.startsWith('AJT'));
              console.log('[ダイキン] AJTで始まる型番:', ajtModels.slice(0, 10).join(', '));
            }
          } catch (fullError) {
            // 完全な型番データがない場合は、通常の詳細型番データを使用
            console.log('[ダイキン] 完全な型番データが見つかりません。通常の詳細型番データを使用します。', fullError.message);
          const daikinModelDetails = require('./data/daikinModelDetails.json');
          if (daikinModelDetails.modelDetails) {
            for (const prefix in daikinModelDetails.modelDetails) {
              const detailModels = daikinModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                // 詳細型番がない場合は、プレフィックス自体を追加
                allDetailModels.push(prefix);
              }
            }
          }
          }
          
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            'ダイキン': 'ダイキン',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('ダイキンの詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            'ダイキン': 'ダイキン',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === '三菱電機') {
        // 三菱電機の完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            const mitsubishiFullModelDetails = require('./data/mitsubishiFullModelDetails.json');
            if (mitsubishiFullModelDetails.modelDetails) {
              for (const prefix in mitsubishiFullModelDetails.modelDetails) {
                const detailModels = mitsubishiFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
          } catch (fullError) {
          const mitsubishiModelDetails = require('./data/mitsubishiModelDetails.json');
          if (mitsubishiModelDetails.modelDetails) {
            for (const prefix in mitsubishiModelDetails.modelDetails) {
              const detailModels = mitsubishiModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            '三菱電機': '三菱電機',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('三菱電機の詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            '三菱電機': '三菱電機',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === '日立') {
        // 日立の完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            const hitachiFullModelDetails = require('./data/hitachiFullModelDetails.json');
            if (hitachiFullModelDetails.modelDetails) {
              for (const prefix in hitachiFullModelDetails.modelDetails) {
                const detailModels = hitachiFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
          } catch (fullError) {
          const hitachiModelDetails = require('./data/hitachiModelDetails.json');
          if (hitachiModelDetails.modelDetails) {
            for (const prefix in hitachiModelDetails.modelDetails) {
              const detailModels = hitachiModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            '日立': '日立',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('日立の詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            '日立': '日立',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === 'パナソニック') {
        // パナソニックの完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            const panasonicFullModelDetails = require('./data/panasonicFullModelDetails.json');
            if (panasonicFullModelDetails.modelDetails) {
              for (const prefix in panasonicFullModelDetails.modelDetails) {
                const detailModels = panasonicFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
          } catch (fullError) {
          const panasonicModelDetails = require('./data/panasonicModelDetails.json');
          if (panasonicModelDetails.modelDetails) {
            for (const prefix in panasonicModelDetails.modelDetails) {
              const detailModels = panasonicModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            'パナソニック': 'パナソニック',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('パナソニックの詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            'パナソニック': 'パナソニック',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === '東芝') {
        // 東芝の完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            // 正しいファイル名: index-tsbFullModelDetails.json
            const toshibaFullModelDetails = require('./data/index-tsbFullModelDetails.json');
            console.log('[東芝] 完全な型番データを読み込みました:', toshibaFullModelDetails.totalFullModels || 'N/A', '件');
            if (toshibaFullModelDetails.modelDetails) {
              for (const prefix in toshibaFullModelDetails.modelDetails) {
                const detailModels = toshibaFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
            console.log('[東芝] 完全な型番の総数:', allDetailModels.length, '件');
          } catch (fullError) {
            console.log('[東芝] 完全な型番データが見つかりません。通常の詳細型番データを使用します。');
          const toshibaModelDetails = require('./data/toshibaModelDetails.json');
          if (toshibaModelDetails.modelDetails) {
            for (const prefix in toshibaModelDetails.modelDetails) {
              const detailModels = toshibaModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            '東芝': '東芝',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('東芝の詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            '東芝': '東芝',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === 'シャープ（SHARP）') {
        // シャープの完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            // 正しいファイル名: index-shpFullModelDetails.json
            const sharpFullModelDetails = require('./data/index-shpFullModelDetails.json');
            console.log('[シャープ] 完全な型番データを読み込みました:', sharpFullModelDetails.totalFullModels || 'N/A', '件');
            if (sharpFullModelDetails.modelDetails) {
              for (const prefix in sharpFullModelDetails.modelDetails) {
                const detailModels = sharpFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
            console.log('[シャープ] 完全な型番の総数:', allDetailModels.length, '件');
          } catch (fullError) {
            console.log('[シャープ] 完全な型番データが見つかりません。通常の詳細型番データを使用します。');
          const sharpModelDetails = require('./data/sharpModelDetails.json');
          if (sharpModelDetails.modelDetails) {
            for (const prefix in sharpModelDetails.modelDetails) {
              const detailModels = sharpModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            'シャープ（SHARP）': 'シャープ',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('シャープの詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            'シャープ（SHARP）': 'シャープ',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else if (maker === '三菱重工') {
        // 三菱重工の完全な詳細型番リストを優先的に使用
        try {
          let allDetailModels: string[] = [];
          try {
            // 正しいファイル名: mitsubishi-hindustryFullModelDetails.json
            const mitsubishiHeavyFullModelDetails = require('./data/mitsubishi-hindustryFullModelDetails.json');
            console.log('[三菱重工] 完全な型番データを読み込みました:', mitsubishiHeavyFullModelDetails.totalFullModels || 'N/A', '件');
            if (mitsubishiHeavyFullModelDetails.modelDetails) {
              for (const prefix in mitsubishiHeavyFullModelDetails.modelDetails) {
                const detailModels = mitsubishiHeavyFullModelDetails.modelDetails[prefix];
                if (Array.isArray(detailModels) && detailModels.length > 0) {
                  allDetailModels.push(...detailModels);
                }
              }
            }
            console.log('[三菱重工] 完全な型番の総数:', allDetailModels.length, '件');
          } catch (fullError) {
            console.log('[三菱重工] 完全な型番データが見つかりません。通常の詳細型番データを使用します。');
          const mitsubishiHeavyModelDetails = require('./data/mitsubishiHeavyModelDetails.json');
          if (mitsubishiHeavyModelDetails.modelDetails) {
            for (const prefix in mitsubishiHeavyModelDetails.modelDetails) {
              const detailModels = mitsubishiHeavyModelDetails.modelDetails[prefix];
              if (Array.isArray(detailModels) && detailModels.length > 0) {
                allDetailModels.push(...detailModels);
              } else {
                allDetailModels.push(prefix);
                }
              }
            }
          }
          // 既存のデータベースからも取得（詳細型番がない場合のフォールバック）
          const makerMapping: { [key: string]: string } = {
            '三菱重工': '三菱重工',
          };
          const dbMakerName = makerMapping[maker] || maker;
          const fallbackModels = getAllModels(dbMakerName || undefined);
          
          // 詳細型番を優先し、詳細型番がない場合はフォールバックを使用
          if (allDetailModels.length > 0) {
            models = allDetailModels;
          } else {
            models = fallbackModels;
          }
        } catch (error) {
          // ファイルが存在しない場合は既存のデータベースから取得
          console.warn('三菱重工の詳細型番ファイルが見つかりません。既存のデータベースを使用します。', error);
          const makerMapping: { [key: string]: string } = {
            '三菱重工': '三菱重工',
          };
          const dbMakerName = makerMapping[maker] || maker;
          models = getAllModels(dbMakerName || undefined);
        }
      } else {
        // その他のメーカーの場合は既存のデータベースから取得
        // メーカー名のマッピング（フォームのメーカー名 → データベースのメーカー名）
        const makerMapping: { [key: string]: string } = {
          'ダイキン': 'ダイキン',
          '三菱電機': '三菱電機',
          '日立': '日立',
          'パナソニック': 'パナソニック',
          '東芝': '東芝',
          'シャープ（SHARP）': 'シャープ',
          '三菱重工': '三菱重工',
          '富士通ゼネラル': '富士通', // データベースでは「富士通」として保存されている
        };
        const dbMakerName = makerMapping[maker] || maker;
        const allModels = getAllModels(dbMakerName || undefined);
        
        // 完全な型番（数字を含む型番）を優先的に取得
        // 1. 完全な型番（数字を含む、または長い型番）を優先
        // 2. 不完全なパターン（短い、数字を含まない）は後回し
        models = allModels.sort((a, b) => {
          const aStr = String(a);
          const bStr = String(b);
          const aHasNumbers = /\d/.test(aStr);
          const bHasNumbers = /\d/.test(bStr);
          
          // 数字を含む型番を優先
          if (aHasNumbers && !bHasNumbers) return -1;
          if (!aHasNumbers && bHasNumbers) return 1;
          
          // 長い型番を優先（より詳細な型番）
          if (aStr.length !== bStr.length) {
            return bStr.length - aStr.length;
          }
          
          // アルファベット順
          return aStr.localeCompare(bStr);
        });
      }
      // 空文字列、null、undefined、不完全な型番（「--」を含む）を除外し、文字列型に変換
      return models
        .filter((model) => {
          if (model == null || model === '' || String(model).trim() === '') {
            return false;
          }
          const modelStr = String(model);
          // 「--」を含む不完全な型番を除外
          if (modelStr.includes('--')) {
            return false;
          }
          // 1文字だけの型番を除外（不完全なデータ）
          if (modelStr.length <= 1) {
            return false;
          }
          return true;
        })
        .map((model) => String(model));
    } catch (error) {
      console.error('型番取得エラー:', error);
      return [];
    }
  }, []);

  // 型番の候補を取得する関数（入力値に基づいて絞り込み・全メーカー共通）
  const getModelSuggestions = useCallback((input: string, maker: string): string[] => {
    if (!maker) {
      return [];
    }
    const allModels = getModelOptions(maker);
    console.log('[getModelSuggestions] メーカー:', maker, '入力:', input, '全候補数:', allModels.length);
    
    // 入力が空の場合は全候補を返す（最大20件）
    if (!input || input.trim().length === 0) {
      const suggestions = allModels.slice(0, 20);
      console.log('[getModelSuggestions] 空入力時の候補:', suggestions.slice(0, 5).join(', '));
      return suggestions;
    }
    
    const inputUpper = input.toUpperCase().trim();

    // 全メーカー共通：数字・「-」入力時も候補表示のため柔軟なフィルタリング
    let filtered: string[] = [];
      if (inputUpper.endsWith('-')) {
        filtered = allModels.filter(model => {
          const modelUpper = String(model).toUpperCase();
          return modelUpper.startsWith(inputUpper);
        });
      } else if (/\d/.test(inputUpper)) {
        filtered = allModels.filter(model => {
          const modelUpper = String(model).toUpperCase();
          return modelUpper.startsWith(inputUpper);
        });
      } else {
        filtered = allModels.filter(model => {
          const modelUpper = String(model).toUpperCase();
          return modelUpper.includes(inputUpper) || modelUpper.startsWith(inputUpper);
        });
    }

    const sorted = filtered.sort((a, b) => {
      const aUpper = String(a).toUpperCase();
      const bUpper = String(b).toUpperCase();
      if (aUpper === inputUpper && bUpper !== inputUpper) return -1;
      if (aUpper !== inputUpper && bUpper === inputUpper) return 1;
      const aStarts = aUpper.startsWith(inputUpper);
      const bStarts = bUpper.startsWith(inputUpper);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      const aHasNumbers = /\d/.test(aUpper);
      const bHasNumbers = /\d/.test(bUpper);
      if (aHasNumbers && !bHasNumbers) return -1;
      if (!aHasNumbers && bHasNumbers) return 1;
      if (aUpper.length !== bUpper.length) return bUpper.length - aUpper.length;
      return aUpper.localeCompare(bUpper);
    });
    
    const suggestions = sorted.slice(0, 20);
    console.log('[getModelSuggestions] フィルタ後の候補数:', suggestions.length, 'サンプル:', suggestions.slice(0, 5).join(', '));
    return suggestions;
  }, [getModelOptions]);
  

  // 一般的なエアコンの型番パターン（参考サイトから）
  const commonModelPatterns = [
    // 三菱電機
    'MSZ-KXV', 'MSZ-KXZ', 'MSZ-KY', 'MSZ-GX', 'MSZ-GY', 'MSZ-ZX', 'MSZ-ZY',
    'MSZ-AP', 'MSZ-EF', 'MSZ-FX', 'MSZ-FY', 'MSZ-LN', 'MSZ-LX', 'MSZ-LY',
    // ダイキン
    'S22', 'S25', 'S28', 'S40', 'S50', 'S56', 'S63', 'S71', 'S80', 'S90',
    'R22', 'R25', 'R28', 'R40', 'R50', 'R56', 'R63', 'R71', 'R80', 'R90',
    'F22', 'F25', 'F28', 'F40', 'F50', 'F56', 'F63', 'F71', 'F80', 'F90',
    // パナソニック
    'CS-', 'CU-', 'CSX-', 'CSZ-', 'CSW-', 'CSV-',
    // 日立
    'RAS-', 'RAC-', 'RAP-', 'RAD-',
    // 東芝
    'RAS-', 'RAC-',
    // 富士通
    'AS-', 'AOU-',
    // シャープ
    'AY-', 'A2Y-',
  ];

  // 型番からエアコンタイプを判断する関数（Web検索のパターンも含む）
  const detectAirConditionerTypeFromModel = (model: string, maker: string, cleaningCompany: string): string => {
    if (!model || model.trim().length === 0) return '';
    
    const modelUpper = model.toUpperCase().trim();
    console.log(`[detectType] 型番: ${modelUpper}, メーカー: ${maker}, 会社: ${cleaningCompany}`);
    
    // ベネフィットの場合
    if (cleaningCompany === 'ベネフィット') {
      // お掃除機能付きの判定
      if (/KXZ|KY|GX|GY|ZX|ZY|MSZ-KXZ|MSZ-KY|MSZ-GX|MSZ-GY|MSZ-ZX|MSZ-ZY|FTXZ|FTXP|CSZ|CSW/i.test(modelUpper)) {
        return '壁掛お掃除機能付きエアコン+防カビ抗菌コートセット';
      }
      // 一般エアコンの判定
      if (/KXV|MSZ-KXV|FTXS|FTXJ|CS-|CU-|RAS-|RAC-|AS-|AY-/i.test(modelUpper)) {
        return '壁掛一般エアコン1台+防カビ抗菌コートセット';
      }
      return '';
    }
    
    // アイソウジの場合（選択肢の値と完全一致させる）
    
    // 天井カセット型の判定（4方向 - オフィス・店舗用）
    if (/FXYCP|FXYDP|FXYEP|FXYFP|FXYHP|FXYKP|FXYMP|FXYSP|FXYTP|SZRC|SZYC|AUEA|AURA/i.test(modelUpper)) {
      console.log(`[detectType] 天井埋め込みタイプ(オフィス・店舗・施設用4方向)と判定`);
      return '天井埋め込みタイプ(オフィス・店舗・施設用4方向)';
    }
    
    // 天井カセット型の判定（1・2方向 - 住居家庭用）
    if (/FDT|FDX|FDTN|FDTX|SRC|RCI|RPC|RPI/i.test(modelUpper)) {
      console.log(`[detectType] 天井埋め込みタイプ(住居家庭用1・2方向)と判定`);
      return '天井埋め込みタイプ(住居家庭用1・2方向)';
    }
    
    // 天井吊り下げ型の判定
    if (/FHC|FHA|FHYP|PCH|RPC-H|SRK-H/i.test(modelUpper)) {
      console.log(`[detectType] 天井吊り下げタイプと判定`);
      return '天井吊り下げタイプ';
    }
    
    // 壁埋め込み式の判定
    if (/FDT-V|FDFV|FDKV/i.test(modelUpper)) {
      console.log(`[detectType] 壁埋め込み式エアコンと判定`);
      return '壁埋め込み式エアコン';
    }
    
    // 床置き型の判定
    if (/FDF|FDY|FDFN|FDFX|FLXS|S[0-9].*F$/i.test(modelUpper)) {
      console.log(`[detectType] 床置きタイプエアコン(小型)と判定`);
      return '床置きタイプエアコン(小型)';
    }
    
    // 大型の判定（型番に特定のパターンが含まれる場合）
    // 数字が80以上の場合は大型の可能性（ただし年式番号と区別が必要）
    const sizeMatch = modelUpper.match(/[-]?(\d{2,3})[-]?/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1], 10);
      if (size >= 80 && size <= 999) {
        console.log(`[detectType] 大型と判定（サイズ: ${size}）`);
      return '大型';
      }
    }
    
    // お掃除機能付きの判定（壁掛け）
    // 三菱電機のお掃除機能付きシリーズ
    if (/MSZ-.*[GZRXSWLPFJH][XYZW]|MSZ-[FGZRXSWLPJH]X|MSZ-.*X[0-9]/i.test(modelUpper)) {
      console.log(`[detectType] 三菱電機: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // ダイキンのお掃除機能付きシリーズ（うるさら、リソラなど）
    if (/AN[0-9].*[RXSW]|AN[0-9].*-[RWSF]|F[0-9].*TX[RZSPKV]/i.test(modelUpper)) {
      console.log(`[detectType] ダイキン: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // パナソニックのお掃除機能付きシリーズ（Xシリーズ、EXシリーズなど）
    if (/CS-.*[XZJGF][0-9]|CS-[0-9].*X|CS-.*EX[0-9]|CS-X/i.test(modelUpper)) {
      console.log(`[detectType] パナソニック: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // 日立のお掃除機能付きシリーズ（白くまくんXシリーズ、Wシリーズなど）
    if (/RAS-[XWZSEGVMJPN][0-9]|RAS-.*[XWZSEGVMJPN]$/i.test(modelUpper)) {
      console.log(`[detectType] 日立: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // 東芝のお掃除機能付きシリーズ
    if (/RAS-[GHJK][0-9]|RAS-.*[GHJK]$/i.test(modelUpper)) {
      console.log(`[detectType] 東芝: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // シャープのお掃除機能付きシリーズ（Xシリーズ、Pシリーズなど）
    if (/AY-[NPLXJHGRE][0-9]|AY-.*[XPJHLGRNE]$/i.test(modelUpper)) {
      console.log(`[detectType] シャープ: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // 富士通ゼネラルのお掃除機能付きシリーズ（nocria Xシリーズなど）
    if (/AS-[XZWCSVR][0-9]|AS-.*[XZWCSVR]$/i.test(modelUpper)) {
      console.log(`[detectType] 富士通ゼネラル: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    // 三菱重工のお掃除機能付きシリーズ
    if (/SRK-.*[STZVWMX][0-9]|SRK-.*R[STZV]/i.test(modelUpper)) {
      console.log(`[detectType] 三菱重工: 壁掛けおそうじ機能付きと判定`);
      return '壁掛けおそうじ機能付き';
    }
    
    // 壁掛け一般の判定（デフォルト - 上記に該当しない壁掛けタイプ）
    // ほとんどの家庭用エアコンはこのカテゴリ
    // ダイキン: AJT, AN, ATC, ATD, ATE, ATN, ATP, ATR, ATS, ATUX, S, Fシリーズ
    // 三菱電機: MSZ
    // パナソニック: CS
    // 日立: RAS, RAC
    // 東芝: RAS
    // シャープ: AY, A2Y
    // 富士通: AS
    // 三菱重工: SRK
    if (/^AJT|^AN[0-9]|^ATC|^ATD|^ATE|^ATN|^ATP|^ATR|^ATS|^ATUX|^MSZ-|^CS-|^RAS-|^RAC-|^AY-|^A2Y-|^AS-|^SRK-|^AIC-|^S[0-9]|^F[0-9]/i.test(modelUpper)) {
      console.log(`[detectType] 壁掛け一般と判定`);
        return '壁掛け一般';
    }
    
    // それでも判定できない場合、メーカーが指定されていれば壁掛け一般とする
    if (maker && maker.trim()) {
      console.log(`[detectType] メーカー指定あり、壁掛け一般と判定`);
      return '壁掛け一般';
    }
    
    console.log(`[detectType] 判定結果なし`);
    return '';
  };

  // 型番からお掃除機能の有無を判断する関数（Web検索のパターンも含む）
  // 取扱説明書から取得したお掃除機能データを読み込む（優先的に使用）
  const cleaningFunctionDataFromManual = useMemo(() => {
    try {
      const data = require('./data/cleaningFunctionData.json');
      // 型番をキーとしたマップを作成（高速検索用）
      const dataMap = new Map<string, { hasCleaningFunction: boolean; source: string }>();
      if (data.models && Array.isArray(data.models)) {
        for (const item of data.models) {
          if (item.model && item.maker) {
            const key = `${item.maker}:${item.model.toUpperCase()}`;
            // 取扱説明書のデータ（source: 'manual'）を優先
            if (item.source === 'manual' || !dataMap.has(key)) {
              dataMap.set(key, {
                hasCleaningFunction: item.hasCleaningFunction,
                source: item.source || 'unknown'
              });
            }
          }
        }
      }
      console.log(`[cleaningFunctionData] 取扱説明書データを読み込みました: ${dataMap.size}件`);
      return dataMap;
    } catch (error) {
      console.warn('[cleaningFunctionData] データの読み込みに失敗しました:', error);
      return new Map();
    }
  }, []);

  const detectCleaningFunctionFromModel = (model: string, maker: string): boolean | null => {
    if (!model || model.trim().length === 0) return null;
    
    const modelUpper = model.toUpperCase().trim();
    console.log(`[detectCleaning] 型番: ${modelUpper}, メーカー: ${maker}`);
    
    // 1. 取扱説明書から取得したデータを最優先で確認（完全一致）
    const dataKey = `${maker}:${modelUpper}`;
    const manualData = cleaningFunctionDataFromManual.get(dataKey);
    if (manualData && manualData.hasCleaningFunction !== null) {
      console.log(`[detectCleaning] 取扱説明書データを使用: ${manualData.hasCleaningFunction ? 'あり' : 'なし'} (source: ${manualData.source})`);
      return manualData.hasCleaningFunction;
    }
    
    // 2. 部分一致でも検索（型番の一部が一致する場合）
    for (const [key, value] of cleaningFunctionDataFromManual.entries()) {
      if (value.hasCleaningFunction !== null) {
        const [keyMaker, keyModel] = key.split(':');
        if (keyMaker === maker && (modelUpper.includes(keyModel) || keyModel.includes(modelUpper))) {
          console.log(`[detectCleaning] 取扱説明書データ(部分一致)を使用: ${value.hasCleaningFunction ? 'あり' : 'なし'}`);
          return value.hasCleaningFunction;
        }
      }
    }
    
    // 3. メーカー別のシリーズ判定ロジック（各メーカーの公式情報に基づく）
    
    // === 三菱電機 ===
    if (maker === '三菱電機') {
      // お掃除機能付きシリーズ: Zシリーズ、FZシリーズ、Xシリーズ、ZWシリーズ、Rシリーズ、Sシリーズ、JXV、FLシリーズ
      if (/MSZ-.*[ZXRSWFL][0-9]|MSZ-[ZXRSWFL][0-9]|MSZ-FZ|MSZ-ZW|MSZ-ZXV|MSZ-JXV|MSZ-FL/i.test(modelUpper)) {
        console.log(`[detectCleaning] 三菱電機: お掃除機能ありと判定`);
        return true;
      }
      // お掃除機能なしシリーズ: GVシリーズ、GEシリーズ、AXVシリーズなど
      if (/MSZ-GV|MSZ-GE|MSZ-AXV|MSZ-BXV|MSZ-E|MSZ-L/i.test(modelUpper)) {
        console.log(`[detectCleaning] 三菱電機: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === 三菱重工 ===
    if (maker === '三菱重工') {
      // お掃除機能付きシリーズ: SRKシリーズ の一部（TXシリーズ、ZXシリーズなど）
      if (/SRK.*[TZ]X|SRK.*RS|SRK.*RW/i.test(modelUpper)) {
        console.log(`[detectCleaning] 三菱重工: お掃除機能ありと判定`);
        return true;
      }
      // お掃除機能なしシリーズ
      if (/SRK.*[NSM]E|SRK.*NE|SRK.*SE/i.test(modelUpper)) {
        console.log(`[detectCleaning] 三菱重工: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === ダイキン ===
    if (maker === 'ダイキン') {
      // お掃除機能付きシリーズ: うるさらX(RXシリーズ)、risora(SXシリーズ)、AXシリーズ、MXシリーズ、VXシリーズ
      if (/AN[0-9].*R[XSVKP]|AN[0-9].*S[XK]|AN[0-9].*AX|AN[0-9].*MX|AN[0-9].*VX|AN[0-9].*[RWSM]-/i.test(modelUpper)) {
        console.log(`[detectCleaning] ダイキン: お掃除機能ありと判定`);
        return true;
      }
      // AJTシリーズ（業務用・住宅用）、Eシリーズ、Cシリーズはお掃除機能なし
      if (/^AJT|^ATC|^ATD|^ATE|^ATN|^ATP|^ATR|^ATS|^ATUX|AN[0-9].*E[0-9]|AN[0-9].*C[0-9]|S[0-9].*[EMNTC]|F[0-9].*[EMNTC]/i.test(modelUpper)) {
        console.log(`[detectCleaning] ダイキン: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === パナソニック ===
    if (maker === 'パナソニック') {
      // お掃除機能付きシリーズ: Xシリーズ、EXシリーズ、GXシリーズ、AXシリーズ、Jシリーズ、LXシリーズ
      if (/CS-[0-9]*[XJGALM]X|CS-.*X[0-9]|CS-.*EX[0-9]|CS-.*GX[0-9]|CS-.*AX[0-9]|CS-.*LX[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] パナソニック: お掃除機能ありと判定`);
        return true;
      }
      // Fシリーズ、Jシリーズ（下位）はお掃除機能なし
      if (/CS-[0-9]*F[0-9]|CS-.*F2[0-9]|CS-[0-9]*[BDNMKEHT]/i.test(modelUpper)) {
        console.log(`[detectCleaning] パナソニック: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === 日立 ===
    if (maker === '日立') {
      // お掃除機能付きシリーズ: Xシリーズ、Wシリーズ、Sシリーズ、Gシリーズ、Vシリーズ、Eシリーズ
      if (/RAS-[XWSGVEMJPN][0-9]|RAS-X[0-9]|RAS-W[0-9]|RAS-S[0-9]|RAS-G[0-9]|RAS-V[0-9]|RAS-E[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 日立: お掃除機能ありと判定`);
        return true;
      }
      // Aシリーズ、Dシリーズはお掃除機能なし
      if (/RAS-[ADLK][0-9]|RAS-A[0-9]|RAS-D[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 日立: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === 東芝 ===
    if (maker === '東芝') {
      // お掃除機能付きシリーズ: 大清快シリーズ（J、G、Hシリーズなど）
      if (/RAS-[JGHKNME][0-9]|RAS-.*J[0-9]|RAS-.*G[0-9]|RAS-.*H[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 東芝: お掃除機能ありと判定`);
        return true;
      }
      // Bシリーズ、Fシリーズはお掃除機能なし
      if (/RAS-[BCDEF][0-9]|RAS-B[0-9]|RAS-C[0-9]|RAS-F[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 東芝: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === シャープ ===
    if (maker === 'シャープ') {
      // お掃除機能付きシリーズ: Xシリーズ、Pシリーズ、Hシリーズ、Jシリーズ
      if (/AY-[XPHJNGRL][0-9]|AY-.*X[0-9]|AY-.*P[0-9]|AY-.*H[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] シャープ: お掃除機能ありと判定`);
        return true;
      }
      // Sシリーズ、Dシリーズはお掃除機能なし
      if (/AY-[SDFEBC][0-9]|A2Y-|AY-.*S[0-9]|AY-.*D[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] シャープ: お掃除機能なしと判定`);
        return false;
      }
    }
    
    // === 富士通ゼネラル ===
    if (maker === '富士通ゼネラル' || maker === '富士通') {
      // お掃除機能付きシリーズ: nocria Xシリーズ、Zシリーズ、Wシリーズ、Sシリーズ、Vシリーズ
      if (/AS-[XZWSVRC][0-9]|AS-.*X[0-9]|AS-.*Z[0-9]|AS-.*W[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 富士通ゼネラル: お掃除機能ありと判定`);
        return true;
      }
      // Dシリーズ、Bシリーズはお掃除機能なし
      if (/AS-[DBMN][0-9]|AS-.*D[0-9]|AS-.*B[0-9]/i.test(modelUpper)) {
        console.log(`[detectCleaning] 富士通ゼネラル: お掃除機能なしと判定`);
        return false;
      }
    }
    
    console.log(`[detectCleaning] 判定結果なし（取扱説明書データもローカル判定も該当なし）`);
    return null; // 判断できない場合はnull
  };


  // 全角数字を半角数字に変換する関数
  const convertFullWidthToHalfWidth = (text: string): string => {
    return text.replace(/[０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
  };

  // 型番用：全角を半角に変換し、英字を大文字に変換する関数
  const normalizeModelNumber = (text: string): string => {
    let result = text;
    
    // カタカナをひらがなに変換（ローマ字変換の準備）
    result = result.replace(/[ァ-ヶ]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0x60);
    });
    
    // ひらがなをローマ字に変換
    const kanaToRomaji: { [key: string]: string } = {
      'あ': 'A', 'い': 'I', 'う': 'U', 'え': 'E', 'お': 'O',
      'か': 'KA', 'き': 'KI', 'く': 'KU', 'け': 'KE', 'こ': 'KO',
      'さ': 'SA', 'し': 'SI', 'す': 'SU', 'せ': 'SE', 'そ': 'SO',
      'た': 'TA', 'ち': 'TI', 'つ': 'TU', 'て': 'TE', 'と': 'TO',
      'な': 'NA', 'に': 'NI', 'ぬ': 'NU', 'ね': 'NE', 'の': 'NO',
      'は': 'HA', 'ひ': 'HI', 'ふ': 'HU', 'へ': 'HE', 'ほ': 'HO',
      'ま': 'MA', 'み': 'MI', 'む': 'MU', 'め': 'ME', 'も': 'MO',
      'や': 'YA', 'ゆ': 'YU', 'よ': 'YO',
      'ら': 'RA', 'り': 'RI', 'る': 'RU', 'れ': 'RE', 'ろ': 'RO',
      'わ': 'WA', 'を': 'WO', 'ん': 'N',
      'が': 'GA', 'ぎ': 'GI', 'ぐ': 'GU', 'げ': 'GE', 'ご': 'GO',
      'ざ': 'ZA', 'じ': 'ZI', 'ず': 'ZU', 'ぜ': 'ZE', 'ぞ': 'ZO',
      'だ': 'DA', 'ぢ': 'DI', 'づ': 'DU', 'で': 'DE', 'ど': 'DO',
      'ば': 'BA', 'び': 'BI', 'ぶ': 'BU', 'べ': 'BE', 'ぼ': 'BO',
      'ぱ': 'PA', 'ぴ': 'PI', 'ぷ': 'PU', 'ぺ': 'PE', 'ぽ': 'PO',
      'っ': '', 'ゃ': 'YA', 'ゅ': 'YU', 'ょ': 'YO',
      'ぁ': 'A', 'ぃ': 'I', 'ぅ': 'U', 'ぇ': 'E', 'ぉ': 'O'
    };
    
    // ひらがなを変換
    for (const [kana, romaji] of Object.entries(kanaToRomaji)) {
      result = result.split(kana).join(romaji);
    }
    
    // 全角英字（大文字）を半角に変換
    result = result.replace(/[Ａ-Ｚ]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
    // 全角英字（小文字）を半角に変換
    result = result.replace(/[ａ-ｚ]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
    // 全角数字を半角に変換
    result = result.replace(/[０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
    // 全角ハイフン・長音を半角ハイフンに変換
    result = result.replace(/[ー－―‐]/g, '-');
    // 全角スペースを半角スペースに変換
    result = result.replace(/　/g, ' ');
    // 英字を大文字に変換
    result = result.toUpperCase();
    return result;
  };

  // ひらがな・カタカナをローマ字に変換する関数
  const convertKanaToRomaji = (text: string): string => {
    // カタカナをひらがなに変換（ァ-ヴの範囲）
    let result = text.replace(/[ァ-ヴ]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0x60);
    });
    
    // ひらがなをローマ字に変換（基本的な変換）
    const kanaToRomaji: { [key: string]: string } = {
      // 2文字の組み合わせ（拗音など）- 先に処理する必要がある
      'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
      'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
      'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
      'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
      'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
      'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
      'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
      'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
      'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
      'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
      'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
      // 1文字
      'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
      'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
      'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
      'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
      'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
      'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
      'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
      'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
      'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
      'わ': 'wa', 'を': 'wo', 'ん': 'n',
      'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
      'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
      'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
      'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
      'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
      'っ': '', // 小文字の「っ」は簡易的に削除
      'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 
      'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o'
    };
    
    // 2文字の組み合わせを先に変換（拗音など）
    const twoCharPatterns = Object.keys(kanaToRomaji).filter(key => key.length === 2);
    for (const pattern of twoCharPatterns) {
      result = result.split(pattern).join(kanaToRomaji[pattern]);
    }
    
    // 1文字の変換
    const oneCharPatterns = Object.keys(kanaToRomaji).filter(key => key.length === 1);
    for (const pattern of oneCharPatterns) {
      result = result.split(pattern).join(kanaToRomaji[pattern]);
    }
    
    return result;
  };

  // ひらがな→ローマ字変換マップ（コンポーネント外に定義）
  const kanaToRomajiMap: { [key: string]: string } = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'っ': '', 'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo',
    'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
    // カタカナも追加
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'di', 'ヅ': 'du', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
    'ッ': '', 'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo',
    'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o',
  };

  // 全角記号→半角記号マップ
  const fullToHalfSymbolMap: { [key: string]: string } = {
    '！': '!', '？': '?', '（': '(', '）': ')', '［': '[', '］': ']',
    '｛': '{', '｝': '}', '＠': '@', '＃': '#', '＄': '$', '％': '%',
    '＾': '^', '＆': '&', '＊': '*', '＋': '+', '＝': '=', '－': '-',
    '＿': '_', '｜': '|', '＼': '\\', '；': ';', '：': ':', '＂': '"',
    '＇': "'", '＜': '<', '＞': '>', '，': ',', '．': '.', '／': '/',
    '～': '~', '｀': '`', 'ー': '-', '。': '.', '、': ',',
  };

  // メールアドレス用：完全に半角英数字に変換する関数
  const convertEmailToHalfWidth = (text: string): string => {
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      
      // 全角英大文字（Ａ-Ｚ）→ 半角小文字
      if (code >= 0xFF21 && code <= 0xFF3A) {
        result += String.fromCharCode(code - 0xFEE0 + 32); // 小文字に変換
      }
      // 全角英小文字（ａ-ｚ）→ 半角
      else if (code >= 0xFF41 && code <= 0xFF5A) {
        result += String.fromCharCode(code - 0xFEE0);
      }
      // 全角数字（０-９）→ 半角
      else if (code >= 0xFF10 && code <= 0xFF19) {
        result += String.fromCharCode(code - 0xFEE0);
      }
      // 半角英大文字 → 半角小文字
      else if (code >= 0x41 && code <= 0x5A) {
        result += String.fromCharCode(code + 32);
      }
      // ひらがな・カタカナ → ローマ字
      else if (kanaToRomajiMap[char] !== undefined) {
        result += kanaToRomajiMap[char];
      }
      // 全角記号 → 半角記号
      else if (fullToHalfSymbolMap[char] !== undefined) {
        result += fullToHalfSymbolMap[char];
      }
      // 半角英数字・許可された記号はそのまま
      else if (/^[a-z0-9@._\-+]$/.test(char)) {
        result += char;
      }
      // その他の文字は削除（メールアドレスに使えない文字）
      // ただし、入力中の変換を妨げないよう、そのまま残す
      else {
        result += char;
      }
    }
    
    return result;
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // 問い合わせ内容が変更された場合、チェックが外された項目の関連フィールドをリセット
      if (field === 'inquiryType' && Array.isArray(value) && Array.isArray(prev.inquiryType)) {
        const prevTypes = prev.inquiryType as string[];
        const newTypes = value as string[];
        
        // エアコンのチェックが外された場合
        if (prevTypes.includes('エアコン') && !newTypes.includes('エアコン')) {
          updated.numberOfUnits = 1;
          updated.airConditioners = [{
            perfectSet: '',
            perfectSetType: '',
            maker: '',
            model: '',
            type: '',
            hasCleaningFunction: null,
            chatGPTResponse: '',
            height: '',
            installation: '',
            options: [],
            freeOneMoreService: '',
            otherCleaning: '',
            optionsEtc: '',
          }];
        }
        
        // 水回りのチェックが外された場合
        if (prevTypes.includes('水回り') && !newTypes.includes('水回り')) {
          updated.waterArea = '';
        }
        
        // 排水管のチェックが外された場合
        if (prevTypes.includes('排水管') && !newTypes.includes('排水管')) {
          updated.drainPipe = '';
          updated.buildingType = '';
          updated.workLocation = [];
          updated.cloggingSymptom = false;
        }
        
        // レンジフードのチェックが外された場合
        if (prevTypes.includes('レンジフード') && !newTypes.includes('レンジフード')) {
          updated.rangeHoodType = '';
        }
        
        // 浴室のチェックが外された場合
        if (prevTypes.includes('浴室') && !newTypes.includes('浴室')) {
          updated.bathroomWork = '';
          updated.bathroomPerfectSet = '';
          updated.bathroomOptions = [];
        }
        
        // トイレのチェックが外された場合
        if (prevTypes.includes('トイレ') && !newTypes.includes('トイレ')) {
          updated.toiletWork = [];
          updated.toiletPerfectSet = false;
        }
        
        // 床のチェックが外された場合
        if (prevTypes.includes('床') && !newTypes.includes('床')) {
          updated.floorWork = '';
          updated.floorArea = 0;
        }
        
        // カーペットのチェックが外された場合
        if (prevTypes.includes('カーペット') && !newTypes.includes('カーペット')) {
          updated.carpetWork = '';
          updated.carpetArea = 0;
        }
        
        // その他（窓・ベランダ・換気口・照明）のチェックが外された場合
        if (prevTypes.includes('その他（窓・ベランダ・換気口・照明）') && !newTypes.includes('その他（窓・ベランダ・換気口・照明）')) {
          updated.otherWindowWork = [];
          updated.otherWindowQuantities = {};
          updated.otherWindowAreas = {};
        }
        
        // 空室・引き渡し清掃のチェックが外された場合
        if (prevTypes.includes('空室・引き渡し清掃') && !newTypes.includes('空室・引き渡し清掃')) {
          updated.vacantRoomWork = '';
          updated.vacantRoomArea = 0;
        }
        
        // マットレスクリーニングのチェックが外された場合
        if (prevTypes.includes('マットレスクリーニング') && !newTypes.includes('マットレスクリーニング')) {
          updated.mattressSize = '';
          updated.mattressSide = '';
          updated.mattressOptions = [];
          updated.mattressStainCount = 0;
        }
        
        // 除菌のチェックが外された場合
        if (prevTypes.includes('除菌') && !newTypes.includes('除菌')) {
          updated.disinfectionType = '';
          updated.disinfectionHouseSize = '';
          updated.disinfectionOfficeArea = 0;
          updated.disinfectionVehicleType = '';
          updated.disinfectionVehicleCount = 1;
          updated.disinfectionOptions = [];
        }
        
        // 風呂釜洗浄のチェックが外された場合
        if (prevTypes.includes('風呂釜洗浄') && !newTypes.includes('風呂釜洗浄')) {
          updated.bathtubCleaningWork = '';
        }
        
        // 洗濯機分解洗浄のチェックが外された場合
        if (prevTypes.includes('洗濯機分解洗浄') && !newTypes.includes('洗濯機分解洗浄')) {
          updated.washingMachineType = '';
          updated.washingMachineDryingFunction = null;
        }
        
        // 水回りセットのチェックが外された場合
        if (prevTypes.includes('水回りセット') && !newTypes.includes('水回りセット')) {
          updated.waterAreaSet = [];
        }
      }
      
      // 料金を自動計算
      if (field !== 'setDiscount' && field !== 'totalAmount') {
        const calculatedTotal = calculateTotalAmount(updated);
        updated.totalAmount = calculatedTotal.total.toString();
        updated.setDiscount = calculatedTotal.discount.toString();
      }
      return updated;
    });
  };

  // 料金計算関数
  const calculateTotalAmount = (data: FormData): { total: number; discount: number } => {
    let total = 0;
    let discount = 0;

    // ベネフィットの場合の料金計算
    if (data.cleaningCompany === 'ベネフィット') {
      // ベネフィット料金一覧シートの料金（割引後の価格）
      // 完璧セットの料金
      const benefitPerfectSetPrices: { [key: string]: number } = {
        '一般エアコン完璧セット': 12774,
        'お掃除機能付きエアコン完璧セット': 20592,
      };

      const benefitAirConditionerPrices: { [key: string]: number } = {
        // セット内容（全角＋を使用）
        '壁掛一般エアコン1台＋防カビ抗菌コートセット': 8982,
        '壁掛一般エアコン2台＋防カビ抗菌コートセット': 16164,
        '壁掛一般エアコン3台＋防カビ抗菌コートセット': 23346,
        '壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット': 16830,
        '壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット': 31860,
        '壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット': 46890,
        // 従来のエアコンタイプ（半角+を使用）
        '壁掛一般エアコン1台+防カビ抗菌コートセット': 8982,
        '壁掛一般エアコン2台+防カビ抗菌コートセット': 16164,
        '壁掛一般エアコン3台+防カビ抗菌コートセット': 23346,
        '壁掛お掃除機能付きエアコン+防カビ抗菌コートセット': 16830,
        '壁掛お掃除機能付きエアコン2台+防カビ抗菌コートセット': 31860,
        '壁掛お掃除機能付きエアコン3台+防カビ抗菌コートセット': 46890,
        '一般エアコン完璧セット(エアコン壁掛一般+室外機+防カビ抗菌コート+防虫キャップ)': 12774,
        'お掃除機能付きエアコン完璧セット(エアコン壁掛お掃除機能付き+室外機+防カビ抗菌コート+防虫キャップ)': 20592,
      };

      const benefitOptionPrices: { [key: string]: number } = {
        '室外機小型': 2970,
        '防虫キャップの取り付け': 792,
      };

      const benefitWaterAreaPrices: { [key: string]: number } = {
        '水回り2点セット': 23760,
        '水回り3点セット': 35640,
        '水回り4点セット': 47520,
        'キッチン一式': 14850,
        'レンジフード': 13860,
        '浴室完璧セット(浴室クリーニング+エプロン内部+風呂釜洗浄)': 32472,
        '浴室一式': 13860,
        '浴室一式+風呂釜クリーニング1つ穴セット': 29700,
        '風呂釜クリーニング(1つ穴タイプ)': 15840,
        '洗面所一式': 7425,
        'トイレー式': 7425,
      };

      const benefitDrainPipePrices: { [key: string]: number } = {
        '戸建の排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下、外マスー式)': 44000,
        'マンションまたはアパートの排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下)': 50160,
      };

      // エアコンごとの料金を計算
      data.airConditioners.forEach((ac) => {
        // 完璧セット（perfectSet）の料金を加算
        if (ac.perfectSet && benefitPerfectSetPrices[ac.perfectSet]) {
          total += benefitPerfectSetPrices[ac.perfectSet];
        }
        // セット内容（perfectSetType）の料金を加算
        if (ac.perfectSetType && benefitAirConditionerPrices[ac.perfectSetType]) {
          total += benefitAirConditionerPrices[ac.perfectSetType];
        } else if (ac.type && benefitAirConditionerPrices[ac.type]) {
          // 従来のエアコンタイプの料金を加算
          total += benefitAirConditionerPrices[ac.type];
        }
        // オプションの料金を追加
        if (ac.options && ac.options.length > 0) {
          ac.options.forEach((option) => {
            if (option && benefitOptionPrices[option]) {
              total += benefitOptionPrices[option];
            }
          });
        }
      });

      // 水回りの料金を追加
      if (data.waterArea && benefitWaterAreaPrices[data.waterArea]) {
        total += benefitWaterAreaPrices[data.waterArea];
      }

      // 排水管の料金を追加
      if (data.drainPipe && benefitDrainPipePrices[data.drainPipe]) {
        total += benefitDrainPipePrices[data.drainPipe];
      }

      // ベネフィットの場合、セット割は0（料金に既に含まれている）
      discount = 0;
    } else {
      // アイソウジの場合の料金計算（既存のロジック）
      const airConditionerPrices: { [key: string]: number } = {
        '壁掛け一般': 9980,
        '壁掛けおそうじ機能付き': 18700,
        '大型': 14300,
        'エアコン完璧セット(壁掛け一般)': 15219,
        'エアコン完璧セット(壁掛けおそうじ機能付き)': 23067,
        '天井埋め込みタイプ(住居家庭用1・2方向)': 20900,
        '天井埋め込みタイプ(オフィス・店舗・施設用4方向)': 26400,
        '天井吊り下げタイプ': 26400,
        '壁埋め込み式エアコン': 14300,
        '床置きタイプエアコン(小型)': 14300,
        '床置きタイプエアコン大型)': 26400,
        'その他': 0,
      };

      const optionPrices: { [key: string]: number } = {
        '防カビ抗菌コート': 2750,
        '室外機小型': 3300,
        '室外機大型': 9900,
        '防虫キャップ': 880,
        'その他': 0,
      };

      // エアコン完璧セットの料金を計算
      const perfectSetPrices: { [key: string]: number } = {
        // アイソウジ用
        '一般タイプ': 15219,
        'お掃除機能付きタイプ': 23067,
        // ベネフィット用
        '壁掛一般エアコン1台＋防カビ抗菌コートセット': 8982,
        '壁掛一般エアコン2台＋防カビ抗菌コートセット': 16164,
        '壁掛一般エアコン3台＋防カビ抗菌コートセット': 23346,
        '壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット': 16830,
        '壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット': 31860,
        '壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット': 46890,
      };

      // エアコンごとの料金を計算
      data.airConditioners.forEach((ac) => {
        // エアコン完璧セットの料金を加算
        if (ac.perfectSetType && perfectSetPrices[ac.perfectSetType]) {
          total += perfectSetPrices[ac.perfectSetType];
        } else {
          // エアコン完璧セットが選択されていない場合
          // エアコンタイプの料金を加算
        if (ac.type && airConditionerPrices[ac.type]) {
          total += airConditionerPrices[ac.type];
        }
          // オプションの料金を加算
        if (ac.options && ac.options.length > 0) {
          ac.options.forEach((option) => {
            if (option && optionPrices[option]) {
              total += optionPrices[option];
            }
          });
          }
        }
        // 注意: おそうじ機能、高さ、設置状況は料金に加算しない
        
        // オプション等の料金を加算
        if (ac.optionsEtc && optionEtcPrices[ac.optionsEtc]) {
          total += optionEtcPrices[ac.optionsEtc];
        }
      });

      // セット割の計算（VLOOKUP方式：台数に応じたセット割金額を取得）
      // 料金一覧シートのC列（台数）とD列（セット割金額）の対応関係
      const setDiscountMap: { [key: number]: number } = {
        1: 0,
        2: 2000,
        3: 4000,
        4: 6000,
        5: 8000,
        6: 10000,
        7: 12000,
        8: 14000,
        9: 16000,
        10: 18000,
      };
      
      // 台数に応じたセット割を取得（見つからない場合は0）
      discount = setDiscountMap[data.numberOfUnits] || 0;

      // 排水管洗浄の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('排水管洗浄')) {
        // 作業箇所の料金計算
        if (data.workLocation && Array.isArray(data.workLocation) && data.workLocation.length > 0) {
          // 建物タイプに応じた料金設定
          const drainPipePricesDetached: { [key: string]: number } = {
            'キッチン': 17000,
            '洗面所': 8800,
            '浴室': 15000,
            '防水パン（洗濯機下の排水口）': 9800,
            'トイレ内の独立洗面台': 8800,
          };
          
          const drainPipePricesApartment: { [key: string]: number } = {
            'キッチン': 35700,
            '洗面所': 27500,
            '浴室': 33700,
            '防水パン（洗濯機下の排水口）': 28500,
            'トイレ内の独立洗面台': 27500,
          };
          
          // 建物タイプに応じて料金テーブルを選択
          const priceTable = data.buildingType === 'マンション・アパートタイプ' 
            ? drainPipePricesApartment 
            : drainPipePricesDetached;
          
          // 選択された作業箇所ごとに料金を追加
          data.workLocation.forEach((location) => {
            if (priceTable[location]) {
              total += priceTable[location];
            }
          });
        }
        
        // つまり症状のご依頼の料金
        if (data.cloggingSymptom) {
          if (data.buildingType === '戸建てタイプ') {
            total += 11000; // 外マス一式11,000円
          } else if (data.buildingType === 'マンション・アパートタイプ') {
            total += 18700; // 専用仕様車一律 18,700円
          }
        }
      }

      // 風呂釜洗浄の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('風呂釜洗浄')) {
        // 作業内容の料金（画像の4つの選択肢のみ）
        const bathtubCleaningWorkPrices: { [key: string]: number } = {
          '風呂釜クリーニング(1つ穴タイプ) +ジェットバスクリーニング': 40000,
          '風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付き換気扇+エプロン内部高圧クリーニング': 27200,
          '風呂釜クリーニング (1つ穴タイプ) +浴室乾燥機付換気扇': 24800,
          '風呂釜クリーニング (1つ穴タイプ) +エプロン内部高圧クリーニング': 19200,
        };
        
        if (data.bathtubCleaningWork && bathtubCleaningWorkPrices[data.bathtubCleaningWork]) {
          total += bathtubCleaningWorkPrices[data.bathtubCleaningWork];
        }
      }

      // 洗濯機分解洗浄の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('洗濯機分解洗浄')) {
        // 洗濯機の種類と乾燥機能に基づく料金計算
        if (data.washingMachineType) {
          if (data.washingMachineType === '8kg未満（縦型）') {
            if (data.washingMachineDryingFunction === true) {
              total += 23100; // 8kg未満（縦型）乾燥機能付: 23,100円
            } else {
              total += 17600; // 8kg未満（縦型）: 17,600円
            }
          } else if (data.washingMachineType === '8kg以上（縦型）') {
            if (data.washingMachineDryingFunction === true) {
              total += 26400; // 8kg以上（縦型）乾燥機能付: 26,400円
            } else {
              total += 20900; // 8kg以上（縦型）: 20,900円
            }
          }
        }
        
        // オプションの料金
        const washingMachineCleaningOptionPrices: { [key: string]: number } = {
          '日立ビートウォッシュ・白い約束': 5500,
          '洗濯パンクリーニング': 2750,
        };
        
        if (data.washingMachineCleaningOption && washingMachineCleaningOptionPrices[data.washingMachineCleaningOption]) {
          total += washingMachineCleaningOptionPrices[data.washingMachineCleaningOption];
        }
      }

      // 浴室の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('浴室')) {
        // 浴室完璧セットの料金
        const bathroomPerfectSetPrices: { [key: string]: number } = {
          '通常換気扇': 35937,
          '乾燥機付き換気扇': 42372,
        };
        
        if (data.bathroomPerfectSet && bathroomPerfectSetPrices[data.bathroomPerfectSet]) {
          // 浴室完璧セットが選択されている場合はその料金のみ加算
          total += bathroomPerfectSetPrices[data.bathroomPerfectSet];
        } else {
          // 浴室完璧セットが選択されていない場合のみ浴室タイプの料金を加算
        const bathroomWorkPrices: { [key: string]: number } = {
          '浴室クリーニング': 15400,
          'シャワー室': 11000,
          '浴室(便器付き or 洗面ボウル)': 18700,
          '浴室3点ユニット': 23100,
        };
        
        if (data.bathroomWork && bathroomWorkPrices[data.bathroomWork]) {
          total += bathroomWorkPrices[data.bathroomWork];
          }
        }
        
        // 浴室オプションの料金計算
        if (data.bathroomOptions && Array.isArray(data.bathroomOptions)) {
          const bathroomOptionPrices: { [key: string]: number } = {
            'エプロン内部清掃': 3080,
            '鏡 水垢防止コーティング': 7700,
            '浴室全体 水垢防止コーティング': 11000,
            '通常換気扇': 3850,
            '乾燥機付き換気扇': 11000,
          };
          
          data.bathroomOptions.forEach((option) => {
            if (bathroomOptionPrices[option]) {
              total += bathroomOptionPrices[option];
            }
          });
        }
      }

      // レンジフードの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('レンジフード')) {
        const rangeHoodPrices: { [key: string]: number } = {
          'フード付き': 15400,
          'フード無し(プロペラ)': 9900,
        };
        
        if (data.rangeHoodType && rangeHoodPrices[data.rangeHoodType]) {
          total += rangeHoodPrices[data.rangeHoodType];
        }
      }

      // キッチンの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('キッチン') && data.kitchenWork && Array.isArray(data.kitchenWork)) {
        const kitchenWorkPrices: { [key: string]: number } = {
          'キッチンユニット(横幅4mまで)': 16500,
          '備え付けオーブンレンジ内部': 11000,
          '食洗器内部清掃': 7700,
          'シンク水垢防止コーティング': 3850,
          '冷蔵庫(中にモノがある状態)': 13200,
          '冷蔵庫(中にモノがない状態)': 9900,
          '後置き食器棚表面': 3850,
        };
        
        data.kitchenWork.forEach((work) => {
          if (kitchenWorkPrices[work]) {
            total += kitchenWorkPrices[work];
          }
        });
      }

      // トイレの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('トイレ')) {
        if (data.toiletPerfectSet) {
          // トイレ完璧セットが選択されている場合
          total += 19305;
        } else if (data.toiletWork && Array.isArray(data.toiletWork)) {
          // トイレ完璧セットが選択されていない場合のみ作業内容の料金を加算
        const toiletWorkPrices: { [key: string]: number } = {
          'トイレクリーニング': 8250,
          '通常換気扇': 3850,
          '便器内 水垢防止コーティング': 5500,
          'タンク内クリーニング': 3850,
        };
        
        data.toiletWork.forEach((work) => {
          if (toiletWorkPrices[work]) {
            total += toiletWorkPrices[work];
          }
        });
        }
      }

      // 床の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('床')) {
        const floorWorkPrices: { [key: string]: number } = {
          '拭き清掃+掃除機がけ': 330,
          '清掃+スタンダードワックス': 605,
          '清掃+ハイグレードワックス': 1100,
          '剥離洗浄': 1100,
        };
        
        if (data.floorWork && floorWorkPrices[data.floorWork] && data.floorArea && data.floorArea > 0) {
          total += floorWorkPrices[data.floorWork] * data.floorArea;
        }
      }

      // カーペットの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('カーペット')) {
        const carpetWorkPrices: { [key: string]: number } = {
          'カーペットクリーニング': 1100,
          '防臭抗菌加工': 550,
        };
        
        if (data.carpetWork && carpetWorkPrices[data.carpetWork] && data.carpetArea && data.carpetArea > 0) {
          total += carpetWorkPrices[data.carpetWork] * data.carpetArea;
        }
      }

      // 空室・引渡し清掃の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('空室・引き渡し清掃')) {
        const vacantRoomWorkPrices: { [key: string]: number } = {
          '徹底清掃-25㎡未満一律料金': 24750,
          '簡易清掃-25㎡未満一律料金': 13750,
          '建物タイプ別追加料金-平屋・マンションタイプ': 0,
          '建物タイプ別追加料金-戸建2F建て': 5500,
          '建物タイプ別追加料金-戸建3F建て': 11000,
          '建物タイプ別追加料金-戸建4F建て': 16500,
          '引き渡し清掃-50㎡まで': 25000,
        };
        
        // 面積ベースの料金（1㎡あたり）
        const vacantRoomWorkPricesPerSqm: { [key: string]: number } = {
          '徹底清掃-25㎡以上 1㎡あたり': 1100,
          '簡易清掃-25㎡以上 1㎡あたり': 550,
        };
        
        // 固定料金の計算
        if (data.vacantRoomWork && vacantRoomWorkPrices[data.vacantRoomWork]) {
          total += vacantRoomWorkPrices[data.vacantRoomWork];
        }
        
        // 面積ベースの料金計算（25㎡以上）
        if (data.vacantRoomWork && vacantRoomWorkPricesPerSqm[data.vacantRoomWork] && data.vacantRoomArea && data.vacantRoomArea > 0) {
          total += vacantRoomWorkPricesPerSqm[data.vacantRoomWork] * data.vacantRoomArea;
        }
      }

      // マットレスクリーニングの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('マットレスクリーニング')) {
        // 基本料金（サイズ×施工面）
        const mattressPrices: { [key: string]: { [key: string]: number } } = {
          'シングルサイズ': { '片面': 9980, '両面': 14300 },
          'セミダブルサイズ': { '片面': 11000, '両面': 17600 },
          'ダブルサイズ': { '片面': 12100, '両面': 25300, '手伝いあり': 19800 },
          'クイーンサイズ': { '片面': 14300, '両面': 27500, '手伝いあり': 22000 },
          'キングサイズ': { '片面': 15400 },
        };
        
        if (data.mattressSize && data.mattressSide && mattressPrices[data.mattressSize]?.[data.mattressSide]) {
          total += mattressPrices[data.mattressSize][data.mattressSide];
        }
        
        // オプション料金
        if (data.mattressOptions && Array.isArray(data.mattressOptions)) {
          // ペット消臭
          if (data.mattressOptions.includes('ペット消臭')) {
            total += 3000;
          }
          
          // 防臭抗菌加工（サイズと施工面によって異なる）
          if (data.mattressOptions.includes('防臭抗菌加工') && data.mattressSize && data.mattressSide) {
            const antiOdorPrices: { [key: string]: { [key: string]: number } } = {
              'シングルサイズ': { '片面': 3000, '両面': 4000 },
              'セミダブルサイズ': { '片面': 3500, '両面': 4500 },
              'ダブルサイズ': { '片面': 3500, '両面': 5000, '手伝いあり': 5000 },
              'クイーンサイズ': { '片面': 4000, '両面': 6000, '手伝いあり': 6000 },
              'キングサイズ': { '片面': 4500 },
            };
            const antiOdorPrice = antiOdorPrices[data.mattressSize]?.[data.mattressSide] || 0;
            total += antiOdorPrice;
          }
          
          // シミ抜き（10cm四方×1,000円）
          if (data.mattressOptions.includes('シミ抜き') && data.mattressStainCount > 0) {
            total += data.mattressStainCount * 1000;
          }
        }
      }

      // 除菌の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('除菌')) {
        // 一戸建て・マンションの場合
        if (data.disinfectionType === '一戸建て・マンション' && data.disinfectionHouseSize) {
          const housePrices: { [key: string]: number } = {
            'ワンルーム': 21780,
            '2LDK': 32780,
            '3LDK': 43780,
            '4LDK': 65780,
          };
          if (housePrices[data.disinfectionHouseSize]) {
            total += housePrices[data.disinfectionHouseSize];
          }
        }
        
        // 事務所・店舗の場合
        if (data.disinfectionType === '事務所・店舗' && data.disinfectionOfficeArea > 0) {
          const area = data.disinfectionOfficeArea;
          if (area <= 60) {
            total += 55000;
          } else if (area <= 500) {
            total += area * 660;
          } else if (area <= 999) {
            total += area * 550;
          } else if (area <= 1999) {
            total += area * 440;
          } else if (area <= 2499) {
            total += area * 330;
          } else if (area <= 2999) {
            total += area * 275;
          } else if (area <= 4999) {
            total += area * 220;
          } else {
            total += area * 165;
          }
        }
        
        // 車両の場合
        if (data.disinfectionType === '車両' && data.disinfectionVehicleType) {
          const vehiclePrices: { [key: string]: number } = {
            '普通車': 3300,
            '大型車': 11000,
            '電車': 11000,
            'ロープウェー': 11000,
            '船': 0, // 別途見積もり
          };
          if (vehiclePrices[data.disinfectionVehicleType]) {
            const unitPrice = vehiclePrices[data.disinfectionVehicleType];
            const count = data.disinfectionVehicleCount || 1;
            total += unitPrice * count;
          }
        }
        
        // オプション
        if (data.disinfectionOptions && Array.isArray(data.disinfectionOptions)) {
          if (data.disinfectionOptions.includes('エアコン外側拭き上げ＆フィルター清掃のみ')) {
            total += 1650;
          }
          // 拭き上げ作業、吹付け作業、掃除作業は別途見積もりのため加算しない
        }
      }

      // その他（窓・ベランダ・換気口・照明）の料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('その他(窓・ベランダ・換気口・照明)')) {
        const otherWindowWorkPrices: { [key: string]: number } = {
          '窓ガラス・サッシ': 3850,
          'シャッター・雨戸(内側のみ)': 1650,
          'シャッター・雨戸(両面)': 2200,
          'ベランダ 10㎡未満': 7700,
          'ベランダ 10㎡以上、20㎡未満': 15400,
          'ベランダ 20㎡以上、30㎡未満': 0, // 価格が画像から確認できないため0に設定（必要に応じて後で更新）
          'お部屋の換気口・換気扇': 3850,
          'ガラス外面水垢防止コーティング': 11000,
        };
        
        // 面積ベースの料金（1㎡あたり）
        const otherWindowWorkPricesPerSqm: { [key: string]: number } = {
          'ベランダ 30㎡以上 1㎡あたり': 770,
          'ベランダ 雨だれ除去': 770,
        };
        
        // 複数選択に対応した料金計算
        if (data.otherWindowWork && Array.isArray(data.otherWindowWork)) {
          data.otherWindowWork.forEach((work) => {
            // 固定価格の項目（数量不要）
            if (work === 'ベランダ 10㎡未満' || work === 'ベランダ 10㎡以上、20㎡未満' || work === 'ベランダ 20㎡以上、30㎡未満') {
              if (otherWindowWorkPrices[work]) {
                total += otherWindowWorkPrices[work];
              }
            }
            // 面積ベースの料金（ベランダ30㎡以上と雨だれ除去）
            else if (otherWindowWorkPricesPerSqm[work]) {
              const area = data.otherWindowAreas && data.otherWindowAreas[work] !== undefined && data.otherWindowAreas[work] !== null ? data.otherWindowAreas[work] : 0;
              if (area > 0) {
                total += otherWindowWorkPricesPerSqm[work] * area;
              }
            }
            // 数量ベースの料金計算
            else if (otherWindowWorkPrices[work]) {
              const quantity = data.otherWindowQuantities && data.otherWindowQuantities[work] !== undefined && data.otherWindowQuantities[work] !== null ? data.otherWindowQuantities[work] : 0;
              if (quantity > 0) {
                total += otherWindowWorkPrices[work] * quantity;
              }
            }
          });
        }
      }

      // 水回りセットの料金計算
      if (data.inquiryType && Array.isArray(data.inquiryType) && data.inquiryType.includes('水回りセット') && data.waterAreaSet && Array.isArray(data.waterAreaSet)) {
        // 点数計算ロジック（洗面所とトイレは0.5点、トイレ2ヶ所は1点）
        const calculatePoints = (items: string[]): number => {
          let points = 0;
          items.forEach(item => {
            if (item === '洗面所' || item === 'トイレ') {
              points += 0.5;
            } else if (item === 'トイレ2ヶ所') {
              points += 1; // トイレ2箇所で1点
            } else {
              points += 1; // キッチン、レンジフード、浴室は1点
            }
          });
          return points;
        };
        
        const totalPoints = calculatePoints(data.waterAreaSet);
        
        // 点数に基づいて料金を計算（1点未満または4.5点以上の場合は料金なし）
        if (totalPoints >= 1 && totalPoints < 4.5) {
          if (totalPoints >= 2 && totalPoints < 3) {
            total += 26400; // 2点セット: 26,400円
          } else if (totalPoints >= 3 && totalPoints < 4) {
            total += 39600; // 3点セット: 39,600円
          } else if (totalPoints >= 4 && totalPoints < 4.5) {
            total += 52800; // 4点セット: 52,800円
          }
        }
      }

      // その他おそうじの料金（簡易的な実装、必要に応じて拡張）
      // ここでは基本的な料金のみ計算
    }

    // その他追加料金を加算
    if (data.additionalCharge && data.additionalCharge > 0) {
      total += data.additionalCharge;
    }

    // 既存のセット割を適用
    total = Math.max(0, total - discount);

    // 2万2000円以上で10%オフの計算
    if (total >= 22000) {
      const tenPercentDiscount = Math.floor(total * 0.1);
      discount = tenPercentDiscount; // セット割に10%オフの金額を表示
      total = total - tenPercentDiscount;
    }

    return { total, discount };
  };

  // 郵便番号から住所を取得する関数
  const addAddress = async (postalCode: string): Promise<string> => {
    try {
      // 郵便番号から数字のみを抽出
      const numbers = postalCode.replace(/[^\d]/g, '');
      
      if (numbers.length !== 7) {
        return '';
      }

      // 郵便番号検索APIを使用（日本郵便のAPI）
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${numbers}`);
      const data = await response.json();
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        return `${result.address1}${result.address2}${result.address3}`;
      }
      
      return '';
    } catch (error) {
      console.error('住所取得エラー:', error);
      return '';
    }
  };

  // Web版でHTML5のdate/time inputのイベントリスナーを設定
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      formData.preferredDates.forEach((date, index) => {
        const dateInputId = `date-input-${index}-${formKey}`;
        const timeInputId = `time-input-${index}-${formKey}`;
        
        const dateInput = document.getElementById(dateInputId) as HTMLInputElement;
        const timeInput = document.getElementById(timeInputId) as HTMLInputElement;
        
        if (dateInput) {
          // 既存のイベントリスナーを削除してから新しいものを追加
          const newDateInput = dateInput.cloneNode(true) as HTMLInputElement;
          dateInput.parentNode?.replaceChild(newDateInput, dateInput);
          newDateInput.id = dateInputId;
          newDateInput.value = date.includes(' ') ? date.split(' ')[0] : date || '';
          newDateInput.onchange = (e: any) => {
            const newDatePart = e.target.value;
            const currentDates = [...formData.preferredDates];
            const currentValue = currentDates[index] || '';
            const timePart = currentValue.includes(' ') ? currentValue.split(' ')[1] : '';
            currentDates[index] = timePart ? `${newDatePart} ${timePart}` : newDatePart;
            updateFormData('preferredDates', currentDates);
          };
        }
        
        if (timeInput) {
          // 既存のイベントリスナーを削除してから新しいものを追加
          const newTimeInput = timeInput.cloneNode(true) as HTMLInputElement;
          timeInput.parentNode?.replaceChild(newTimeInput, timeInput);
          newTimeInput.id = timeInputId;
          newTimeInput.value = date.includes(' ') ? date.split(' ')[1] : '';
          newTimeInput.onchange = (e: any) => {
            const newTimePart = e.target.value;
            const currentDates = [...formData.preferredDates];
            const currentValue = currentDates[index] || '';
            const datePart = currentValue.includes(' ') ? currentValue.split(' ')[0] : new Date().toISOString().split('T')[0];
            currentDates[index] = `${datePart} ${newTimePart}`;
            updateFormData('preferredDates', currentDates);
          };
        }
      });
    }
  }, [formKey, formData.preferredDates]);

  // 希望日が変更されたときにカレンダーの空きをチェック
  useEffect(() => {
    formData.preferredDates.forEach(async (date, index) => {
      if (date && date.includes(' ')) {
        const [datePart, timePart] = date.split(' ');
        if (datePart && timePart) {
          try {
            const availability = await checkAvailability(datePart, timePart);
            setFormData(prev => {
              const updatedAvailability = [...prev.preferredDatesAvailability];
              updatedAvailability[index] = availability.message;
              return {
                ...prev,
                preferredDatesAvailability: updatedAvailability
              };
            });
          } catch (error) {
            console.error('空き時間チェックエラー:', error);
          }
        }
      } else {
        // 日時が不完全な場合は空き状況をクリア
        setFormData(prev => {
          const updatedAvailability = [...prev.preferredDatesAvailability];
          updatedAvailability[index] = '';
          return {
            ...prev,
            preferredDatesAvailability: updatedAvailability
          };
        });
      }
    });
  }, [formData.preferredDates]);

  // カレンダーピッカーの外側をクリックしたときに閉じる
  useEffect(() => {
    if (Platform.OS === 'web' && showCalendarPicker !== null && typeof document !== 'undefined') {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const calendarElement = document.querySelector(`[data-calendar-picker-index="${showCalendarPicker}"]`);
        if (calendarElement && !calendarElement.contains(target)) {
          setShowCalendarPicker(null);
        }
      };
      // 少し遅延させて、カレンダーが開いてからイベントリスナーを追加
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCalendarPicker]);

  const updateAirConditioner = (index: number, field: keyof AirConditioner, value: any) => {
    const updated = [...formData.airConditioners];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData('airConditioners', updated);
  };

  // 台数が変更されたときに、エアコン情報を自動的に更新
  const updateNumberOfUnits = (newNumberOfUnits: number) => {
    if (newNumberOfUnits < 0 || newNumberOfUnits > 4) {
      return;
    }
    
    // 台数が0の場合は、エアコン情報を空にする
    if (newNumberOfUnits === 0) {
      setFormData(prev => ({
        ...prev,
        numberOfUnits: 0,
        airConditioners: [],
      }));
      return;
    }
    
    const currentLength = formData.airConditioners.length;
    let updatedAirConditioners = [...formData.airConditioners];
    
    if (newNumberOfUnits > currentLength) {
      // 台数が増えた場合、新しいエアコン情報を追加
      for (let i = currentLength; i < newNumberOfUnits; i++) {
        updatedAirConditioners.push({
          perfectSet: '',
          perfectSetType: '',
          maker: '',
          model: '',
          type: '',
          hasCleaningFunction: null,
          chatGPTResponse: '',
          height: '',
          installation: '',
          options: [],
          freeOneMoreService: '',
          otherCleaning: '',
          optionsEtc: '',
        });
      }
    } else if (newNumberOfUnits < currentLength) {
      // 台数が減った場合、余分なエアコン情報を削除
      updatedAirConditioners = updatedAirConditioners.slice(0, newNumberOfUnits);
    }
    
    setFormData(prev => ({
      ...prev,
      numberOfUnits: newNumberOfUnits,
      airConditioners: updatedAirConditioners,
    }));
  };

  const addAirConditioner = () => {
    if (formData.airConditioners.length < 4) {
      updateFormData('airConditioners', [
        ...formData.airConditioners,
        {
          perfectSet: '',
          perfectSetType: '',
          maker: '',
          model: '',
          type: '',
          hasCleaningFunction: null,
          chatGPTResponse: '',
          height: '',
          installation: '',
          options: [],
          freeOneMoreService: '',
          otherCleaning: '',
          optionsEtc: '',
        }
      ]);
      updateFormData('numberOfUnits', formData.numberOfUnits + 1);
    }
  };

  const removeAirConditioner = (index: number) => {
    if (formData.airConditioners.length > 1) {
      const updated = formData.airConditioners.filter((_, i) => i !== index);
      updateFormData('airConditioners', updated);
      updateFormData('numberOfUnits', updated.length);
    }
  };

  const handleConfirm = () => {
    const errors = new Set<string>();
    
    // 必須項目のチェック
    if (!formData.inquiryType) {
      errors.add('inquiryType');
    }
    if (!formData.customerName) {
      errors.add('customerName');
    }
    if (!formData.customerNameKana) {
      errors.add('customerNameKana');
    }
    if (!formData.postalCode) {
      errors.add('postalCode');
    }
    if (!formData.address) {
      errors.add('address');
    }
    if (!formData.phone) {
      errors.add('phone');
    }
    // お客様モードではメールアドレスも必須
    if (isCustomerMode && !formData.email) {
      errors.add('email');
    }
    if (formData.parking === null || formData.parking === undefined) {
      errors.add('parking');
    }
    // お客様モードで駐車場「なし」の場合、了承が必須
    if (isCustomerMode && formData.parking === false && !formData.paidParkingConfirmed) {
      errors.add('paidParkingConfirmed');
    }
    // ご希望日・曜日・時間のチェック（少なくとも1つは入力されている必要がある）
    if (!formData.preferredDates || formData.preferredDates.every(d => !d || d.trim() === '')) {
      errors.add('preferredDates');
    }
    if (!formData.cancellationPolicyConfirmed) {
      errors.add('cancellationPolicyConfirmed');
    }
    
    // マットレスクリーニングが選択されている場合のバリデーション
    if (formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('マットレスクリーニング')) {
      if (!formData.mattressSize) {
        errors.add('mattressSize');
      }
      if (!formData.mattressSide) {
        errors.add('mattressSide');
      }
      // シミ抜きオプションが選択されている場合、数量も必須
      if (formData.mattressOptions && formData.mattressOptions.includes('シミ抜き') && formData.mattressStainCount <= 0) {
        errors.add('mattressStainCount');
      }
    }
    
    // 洗濯機分解洗浄が選択されている場合のバリデーション
    if (formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('洗濯機分解洗浄')) {
      if (!formData.washingMachineType) {
        errors.add('washingMachineType');
      }
      if (formData.washingMachineDryingFunction === null || formData.washingMachineDryingFunction === undefined) {
        errors.add('washingMachineDryingFunction');
      }
    }
    
    // お客様用フォームでエアコン完璧セットとエアコンタイプ・おそうじ機能の整合性チェック
    if (isCustomerMode) {
      formData.airConditioners.forEach((ac, index) => {
        if (ac.perfectSetType) {
          // お掃除機能付きタイプの場合：エアコンタイプは「壁掛けおそうじ機能付き」、おそうじ機能は「あり」
          if (ac.perfectSetType === 'お掃除機能付きタイプ' && 
              (ac.type !== '壁掛けおそうじ機能付き' || ac.hasCleaningFunction !== true)) {
            errors.add(`airconConsistency_${index}`);
          }
          // 一般タイプの場合：エアコンタイプは「壁掛け一般」、おそうじ機能は「なし」
          if (ac.perfectSetType === '一般タイプ' && 
              (ac.type !== '壁掛け一般' || ac.hasCleaningFunction !== false)) {
            errors.add(`airconConsistency_${index}`);
          }
        }
      });
    }
    
    setValidationErrors(errors);
    
    // エラーがある場合は確認画面を開かない
    if (errors.size > 0) {
      // エラー項目までスクロール（Web版のみ）
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        setTimeout(() => {
          const firstError = Array.from(errors)[0];
          const element = document.getElementById(`field-${firstError}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }
    
    // エラーがない場合のみ確認画面を表示
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitForm({ ...formData, isCustomerMode });
      setShowConfirmation(false);
      Alert.alert('送信完了', 'お問い合わせを受け付けました。ありがとうございます。');
      setFormData({
        cleaningCompany: 'アイソウジ',
        inquiryType: [],
        customerName: '',
        customerNameKana: '',
        postalCode: '',
        address: '',
        phone: '',
        email: '',
        numberOfUnits: 1,
        airConditioners: [{
          perfectSet: '',
          perfectSetType: '',
          maker: '',
          model: '',
          type: '',
          hasCleaningFunction: null,
          chatGPTResponse: '',
          height: '',
          installation: '',
          options: [],
          freeOneMoreService: '',
          otherCleaning: '',
          optionsEtc: '',
        }],
        otherCleaning: '',
        waterArea: '',
        drainPipe: '',
        parking: null,
        visitorParkingRules: '',
        paidParkingConfirmed: false,
        preferredDates: ['', '', ''],
        preferredDatesAvailability: ['', '', ''],
        notes: '',
        setDiscount: '-',
        totalAmount: '0',
        cancellationPolicyConfirmed: false,
      });
    } catch (error) {
      Alert.alert('エラー', '送信に失敗しました。もう一度お試しください。');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // サーバーAPIを使って型番情報を取得する関数（Vertex AI/Gemini使用）
  const analyzeModelWithServer = async (model: string, maker: string): Promise<{ response: string; type: string | null; hasCleaning: boolean | null }> => {
    try {
      const API_ENDPOINT =
        typeof window !== "undefined" && window.location.hostname !== "localhost"
          ? `http://${window.location.hostname}:3002/api/analyze-model`
          : "http://localhost:3002/api/analyze-model";

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, maker }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          response: data.response || '', // AIの完全な回答
          type: data.type || null,
          hasCleaning: data.hasCleaning !== undefined ? data.hasCleaning : null,
        };
      } else {
        // success: falseの場合でも、エラーメッセージを返す（表示用）
        return {
          response: data.response || data.error || "API呼び出しに失敗しました",
          type: data.type || null,
          hasCleaning: data.hasCleaning !== undefined ? data.hasCleaning : null,
        };
      }
    } catch (error) {
      console.error("[サーバーAPI] エラー:", error);
      // エラーが発生した場合は、エラーメッセージを返す
      const errorMessage = error instanceof Error && error.message.includes('Failed to fetch')
        ? 'バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。'
        : `サーバーAPI呼び出しに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      
      // ローカルの判定関数にフォールバック
      const localType = detectAirConditionerTypeFromModel(model, maker, formData.cleaningCompany);
      const localCleaning = detectCleaningFunctionFromModel(model, maker);
      return {
        response: errorMessage, // エラーメッセージを表示
        type: localType || null,
        hasCleaning: localCleaning,
      };
    }
  };

  // 型番が空になった場合のみ、エアコンタイプとお掃除機能をクリア
  // ※自動判定は無効化（ユーザーが手動で選択）
  useEffect(() => {
    formData.airConditioners.forEach((ac, index) => {
      if (!ac.model || !ac.model.trim()) {
        // 型番が空の場合は、エアコンタイプとお掃除機能をクリア
        if (ac.type || ac.hasCleaningFunction !== null) {
          setFormData((prevFormData) => {
            const updated = [...prevFormData.airConditioners];
            updated[index] = {
              ...updated[index],
              type: '',
              hasCleaningFunction: null,
            };
            return { ...prevFormData, airConditioners: updated };
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.airConditioners.map(ac => `${ac.maker}-${ac.model}`).join(',')]);

  // デバッグ用: Web版でコンソールにログを出力
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('App component rendered');
      console.log('Platform.OS:', Platform.OS);
    }
  });

  // エラーハンドリング: レンダリングエラーをキャッチ
  try {
    // デバッグ用: Web版でコンソールにログを出力
    if (Platform.OS === 'web') {
      console.log('App component rendering...');
      console.log('formData:', formData);
    }
  } catch (error) {
    console.error('Error in App component:', error);
  }

  // シンプルなテスト: まず基本的な表示を確認
  if (Platform.OS === 'web') {
    console.log('=== App Component Debug ===');
    console.log('Platform.OS:', Platform.OS);
    console.log('formData:', formData);
    console.log('styles.container:', styles.container);
  }

  // セクションインデックスを追跡するためのref
  const sectionIndexRef = useRef(0);

  // セクションの背景色を取得する関数（交互に色を変える）
  const getSectionStyle = (): any[] => {
    const baseStyle = [styles.section];
      const index = sectionIndexRef.current;
      sectionIndexRef.current += 1;
    
    if (formData.cleaningCompany === 'アイソウジ') {
      // 偶数インデックス: 黄緑、奇数インデックス: 白（デフォルト）
      if (index % 2 === 0) {
        baseStyle.push(styles.sectionGreenAlt);
      }
      // 奇数インデックスの場合は背景色を追加しない（白のまま）
    } else if (formData.cleaningCompany === 'ベネフィット') {
      // 偶数インデックス: 黄色、奇数インデックス: 白（デフォルト）
      if (index % 2 === 0) {
      baseStyle.push(styles.sectionYellow);
      }
      // 奇数インデックスの場合は背景色を追加しない（白のまま）
    }
    return baseStyle;
  };

  // セクションインデックスをリセット（レンダリング開始時に呼び出す）
  sectionIndexRef.current = 0;

  const content = (
    <View style={styles.container} key={`form-container-${formKey}`}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isCustomerMode ? '清掃のご依頼' : '清掃サービス問い合わせ'}</Text>
        <View style={getSectionStyle()} key={`section-customer-${formKey}`}>
          <Text style={styles.sectionTitle}>お客様情報</Text>
          {/* お客様モードでは清掃会社の選択を非表示（アイソウジ固定） */}
          {!isCustomerMode && (
            <>
          <Text style={styles.label}>清掃会社</Text>
          <View style={[styles.input, styles.pickerContainer]}>
            <Picker
              selectedValue={formData.cleaningCompany}
              onValueChange={(value) => updateFormData('cleaningCompany', value)}
            >
              <Picker.Item label="選択してください" value="" />
              <Picker.Item label="アイソウジ" value="アイソウジ" />
              <Picker.Item label="ベネフィット" value="ベネフィット" />
            </Picker>
          </View>
            </>
          )}
          <View {...(Platform.OS === 'web' ? { id: 'field-inquiryType' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('inquiryType') && styles.labelError
            ]}>問い合わせ内容</Text>
            <View style={{ marginBottom: 12 }}>
              {inquiryTypeOptions.filter(option => option !== '').map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.checkboxContainer}
                  onPress={() => {
                  if (validationErrors.has('inquiryType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('inquiryType');
                      return newErrors;
                    });
                  }
                    const currentTypes = formData.inquiryType || [];
                    const isSelected = currentTypes.includes(option);
                    const updatedTypes = isSelected
                      ? currentTypes.filter(i => i !== option)
                      : [...currentTypes, option];
                    updateFormData('inquiryType', updatedTypes);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.inquiryType && formData.inquiryType.includes(option) && styles.checkboxBoxChecked
                  ]}>
                    {formData.inquiryType && formData.inquiryType.includes(option) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View {...(Platform.OS === 'web' ? { id: 'field-customerName' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('customerName') && styles.labelError
            ]}>お客様名（漢字）*</Text>
            <TextInput
              key={`customerName-${formKey}`}
              style={[
                styles.input,
                validationErrors.has('customerName') && styles.inputError
              ]}
              value={formData.customerName}
              onChangeText={(text) => {
                if (validationErrors.has('customerName')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('customerName');
                    return newErrors;
                  });
                }
                updateFormData('customerName', text);
              }}
            placeholder="入力してください"
            placeholderTextColor="#999"
            autoComplete="new-password"
            autoCorrect={false}
            />
          </View>
          <View {...(Platform.OS === 'web' ? { id: 'field-customerNameKana' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('customerNameKana') && styles.labelError
            ]}>お客様名（フリガナ）</Text>
            <TextInput
              key={`customerNameKana-${formKey}`}
              style={[
                styles.input,
                validationErrors.has('customerNameKana') && styles.inputError
              ]}
              value={formData.customerNameKana}
              onChangeText={(text) => {
                if (validationErrors.has('customerNameKana')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('customerNameKana');
                    return newErrors;
                  });
                }
                updateFormData('customerNameKana', text);
              }}
            placeholder="入力してください"
            placeholderTextColor="#999"
            autoComplete="new-password"
            autoCorrect={false}
            />
          </View>
          <View {...(Platform.OS === 'web' ? { id: 'field-postalCode' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('postalCode') && styles.labelError
            ]}>郵便番号</Text>
            <TextInput
              key={`postalCode-${formKey}`}
              style={[
                styles.input,
                validationErrors.has('postalCode') && styles.inputError
              ]}
              value={formData.postalCode}
              onChangeText={async (text) => {
                if (validationErrors.has('postalCode')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('postalCode');
                    return newErrors;
                  });
                }
              // 全角数字を半角数字に変換
              const normalizedText = convertFullWidthToHalfWidth(text);
              // 数字のみを抽出
              const numbers = normalizedText.replace(/[^\d]/g, '');
              
              // 7桁の数字が入力されたら、自動的に「〒」と「-」を追加
              let formatted = '';
              if (numbers.length === 0) {
                formatted = '';
              } else if (numbers.length <= 3) {
                formatted = `〒${numbers}`;
              } else if (numbers.length <= 7) {
                formatted = `〒${numbers.slice(0, 3)}-${numbers.slice(3)}`;
              } else {
                // 7桁を超える場合は、最初の7桁のみを使用
                formatted = `〒${numbers.slice(0, 3)}-${numbers.slice(3, 7)}`;
              }
              
              updateFormData('postalCode', formatted);
              
              // 7桁の数字が入力されたら、住所を自動取得
              if (numbers.length === 7) {
                const address = await addAddress(formatted);
                if (address) {
                  updateFormData('address', address);
                }
              }
            }}
            placeholder="〒"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            autoComplete="new-password"
            autoCorrect={false}
            />
          </View>
          <View {...(Platform.OS === 'web' ? { id: 'field-address' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('address') && styles.labelError
            ]}>住所（作業エリア）</Text>
            <TextInput
              key={`address-${formKey}`}
              style={[
                styles.input,
                styles.textArea,
                validationErrors.has('address') && styles.inputError
              ]}
              value={formData.address}
              onChangeText={(text) => {
                if (validationErrors.has('address')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('address');
                    return newErrors;
                  });
                }
                updateFormData('address', text);
              }}
            placeholder="入力してください"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            autoComplete="new-password"
            autoCorrect={false}
            />
          </View>
          <View {...(Platform.OS === 'web' ? { id: 'field-phone' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('phone') && styles.labelError
            ]}>連絡先*</Text>
            <TextInput
              key={`phone-${formKey}`}
              style={[
                styles.input,
                validationErrors.has('phone') && styles.inputError
              ]}
              value={formData.phone}
              onChangeText={(text) => {
                if (validationErrors.has('phone')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('phone');
                    return newErrors;
                  });
                }
                // 全角数字を半角数字に変換し、数字以外を除去
                const normalizedText = convertFullWidthToHalfWidth(text);
                const digitsOnly = normalizedText.replace(/[^0-9]/g, '');
                
                // 11桁までに制限
                const limitedDigits = digitsOnly.slice(0, 11);
                
                // フォーマット: XXX-XXXX-XXXX
                let formattedPhone = '';
                if (limitedDigits.length > 0) {
                  formattedPhone = limitedDigits.slice(0, 3);
                }
                if (limitedDigits.length > 3) {
                  formattedPhone += '-' + limitedDigits.slice(3, 7);
                }
                if (limitedDigits.length > 7) {
                  formattedPhone += '-' + limitedDigits.slice(7, 11);
                }
                
                updateFormData('phone', formattedPhone);
              }}
            placeholder="080-0000-0000"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoComplete="new-password"
            autoCorrect={false}
            maxLength={13}
            />
          </View>

          <View {...(Platform.OS === 'web' ? { id: 'field-email' } : {})}>
            <Text style={[
              styles.label,
              isCustomerMode && validationErrors.has('email') && styles.labelError
            ]}>{isCustomerMode ? 'メールアドレス*' : 'メールアドレス'}</Text>
          <TextInput
            key={`email-${formKey}`}
              style={[
                styles.input,
                isCustomerMode && validationErrors.has('email') && styles.inputError
              ]}
            value={formData.email}
            onChangeText={(text) => {
                if (validationErrors.has('email')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('email');
                    return newErrors;
                  });
                }
              // 全角文字・ひらがな・カタカナを半角に変換
              const normalizedText = convertEmailToHalfWidth(text);
              updateFormData('email', normalizedText);
            }}
            placeholder="入力してください"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete={isCustomerMode ? "email" : "new-password"}
            autoCorrect={false}
            {...(Platform.OS === 'web' && isCustomerMode ? { 
              name: "email",
              inputMode: "email"
            } : {})}
          />
            {isCustomerMode && validationErrors.has('email') && (
              <Text style={styles.errorMessage}>※メールアドレスを入力してください</Text>
            )}
          </View>
        </View>

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('エアコン') && (
          <View style={getSectionStyle()}>
          <Text style={styles.sectionTitle}>エアコン情報</Text>
          <Text style={styles.label}>台数</Text>
          <View style={[styles.input, styles.pickerContainer]}>
            <Picker
              selectedValue={formData.numberOfUnits === 0 ? '-' : formData.numberOfUnits.toString()}
              onValueChange={(itemValue) => {
                if (itemValue === '-') {
                  updateNumberOfUnits(0);
                } else {
                  updateNumberOfUnits(parseInt(itemValue, 10));
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="-" value="-" />
              <Picker.Item label="1台" value="1" />
              <Picker.Item label="2台" value="2" />
              <Picker.Item label="3台" value="3" />
              <Picker.Item label="4台" value="4" />
            </Picker>
          </View>
          
          {formData.airConditioners.map((ac, index) => (
            <View key={index} style={styles.acCard}>
              <Text style={styles.acTitle}>{`${index + 1}台目`}</Text>
              
              {/* 完璧セット（ベネフィットの場合のみ表示） */}
              {formData.cleaningCompany === 'ベネフィット' && (
                <>
                  <Text style={styles.label}>完璧セット</Text>
                  <View style={[styles.input, styles.pickerContainer]}>
                    <Picker
                      selectedValue={ac.perfectSet}
                      onValueChange={(itemValue) => updateAirConditioner(index, 'perfectSet', itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="選択してください" value="" />
                      <Picker.Item label="一般エアコン(エアコン壁掛一般＋室外機＋防カビ抗菌コート＋防虫キャップ)" value="一般エアコン完璧セット" />
                      <Picker.Item label="お掃除機能付きエアコン(エアコン壁掛お掃除機能付き＋室外機＋防カビ抗菌コート＋防虫キャップ)" value="お掃除機能付きエアコン完璧セット" />
                    </Picker>
                  </View>
                  {ac.perfectSet && (() => {
                    const prices: { [key: string]: number } = {
                      '一般エアコン完璧セット': 12774,
                      'お掃除機能付きエアコン完璧セット': 20592,
                    };
                    const originalPrices: { [key: string]: number } = {
                      '一般エアコン完璧セット': 24200,
                      'お掃除機能付きエアコン完璧セット': 33000,
                    };
                    const price = prices[ac.perfectSet];
                    const originalPrice = originalPrices[ac.perfectSet];
                    return price && originalPrice ? (
                      <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                        {originalPrice.toLocaleString()}円 ⇒ {price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </>
              )}

              <Text style={styles.label}>{formData.cleaningCompany === 'ベネフィット' ? 'その他セット' : 'エアコン完璧セット'}</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.perfectSetType}
                  onValueChange={(itemValue) => updateAirConditioner(index, 'perfectSetType', itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="セットにしない" value="" />
                  {formData.cleaningCompany === 'ベネフィット' ? (
                    <>
                      <Picker.Item label="壁掛一般エアコン1台＋防カビ抗菌コートセット" value="壁掛一般エアコン1台＋防カビ抗菌コートセット" />
                      <Picker.Item label="壁掛一般エアコン2台＋防カビ抗菌コートセット" value="壁掛一般エアコン2台＋防カビ抗菌コートセット" />
                      <Picker.Item label="壁掛一般エアコン3台＋防カビ抗菌コートセット" value="壁掛一般エアコン3台＋防カビ抗菌コートセット" />
                      <Picker.Item label="壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット" value="壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット" />
                      <Picker.Item label="壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット" value="壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット" />
                      <Picker.Item label="壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット" value="壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット" />
                    </>
                  ) : (
                    <>
                      <Picker.Item label="一般タイプ：室内機+室外機+防カビ抗菌コート+防虫キャップ" value="一般タイプ" />
                      <Picker.Item label="お掃除機能付きタイプ：室内機+室外機+防カビ抗菌コート+防虫キャップ" value="お掃除機能付きタイプ" />
                    </>
                  )}
                </Picker>
              </View>
              {ac.perfectSetType && (() => {
                const prices: { [key: string]: number } = {
                  // アイソウジ用
                  '一般タイプ': 15219,
                  'お掃除機能付きタイプ': 23067,
                  // ベネフィット用
                  '壁掛一般エアコン1台＋防カビ抗菌コートセット': 8982,
                  '壁掛一般エアコン2台＋防カビ抗菌コートセット': 16164,
                  '壁掛一般エアコン3台＋防カビ抗菌コートセット': 23346,
                  '壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット': 16830,
                  '壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット': 31860,
                  '壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット': 46890,
                };
                // ベネフィット用の元価格
                const originalPrices: { [key: string]: number } = {
                  '壁掛一般エアコン1台＋防カビ抗菌コートセット': 17600,
                  '壁掛一般エアコン2台＋防カビ抗菌コートセット': 33200,
                  '壁掛一般エアコン3台＋防カビ抗菌コートセット': 48800,
                  '壁掛お掃除機能付きエアコン＋防カビ抗菌コートセット': 26400,
                  '壁掛お掃除機能付きエアコン2台＋防カビ抗菌コートセット': 50800,
                  '壁掛お掃除機能付きエアコン3台＋防カビ抗菌コートセット': 75200,
                };
                const price = prices[ac.perfectSetType];
                const originalPrice = originalPrices[ac.perfectSetType];
                
                if (!price) return null;
                
                // ベネフィットの場合は「元価格 ⇒ 割引価格」の形式で表示
                if (formData.cleaningCompany === 'ベネフィット' && originalPrice) {
                  return (
                    <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                      {originalPrice.toLocaleString()}円 ⇒ {price.toLocaleString()}円
                    </Text>
                  );
                }
                
                return (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                    +{price.toLocaleString()}円
                  </Text>
                );
              })()}

              <Text style={styles.label}>メーカー</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.maker}
                  onValueChange={(itemValue) => {
                    // メーカーが変更されたら型番もリセット（一度の更新で行う）
                    const updated = [...formData.airConditioners];
                    updated[index] = {
                      ...updated[index],
                      maker: itemValue,
                      model: '',
                      type: '',
                      hasCleaningFunction: null,
                      chatGPTResponse: '',
                    };
                    updateFormData('airConditioners', updated);
                  }}
                  style={styles.picker}
                >
                  {makerOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>型番</Text>
              <View style={styles.modelInputWrapper}>
                <TextInput
                  style={[styles.input, styles.modelInput]}
                  value={ac.model}
                  onChangeText={(text) => {
                    console.log('[型番] onChangeText発火, 入力:', text);
                    const normalizedText = normalizeModelNumber(text);
                    const updated = [...formData.airConditioners];
                    updated[index] = {
                      ...updated[index],
                      model: normalizedText,
                      chatGPTResponse: '',
                    };
                    setFormData(prev => ({ ...prev, airConditioners: updated }));
                    
                    // フィールドが空なら候補を非表示、入力があれば候補リストを表示
                    if (!normalizedText.trim()) {
                      setShowModelSuggestions(prev => ({ ...prev, [index]: false }));
                    } else {
                      setShowModelSuggestions(prev => ({ ...prev, [index]: true }));
                    }
                  }}
                  onFocus={() => {
                    // フォーカス時に候補リストを表示（メーカーが選択されていれば）
                    if (ac.maker) {
                      setShowModelSuggestions(prev => ({ ...prev, [index]: true }));
                    }
                  }}
                  onKeyPress={(e) => {
                    // Web版でEnterキーを検知
                    const key = e.nativeEvent?.key || (e as any).key;
                    if (Platform.OS === 'web' && (key === 'Enter' || key === '\n')) {
                      setShowModelSuggestions(prev => ({ ...prev, [index]: false }));
                    }
                  }}
                  placeholder={ac.maker ? "型番を入力（候補から選択も可能、Enterで確定）" : "メーカーを選択してください"}
                  placeholderTextColor="#999"
                  editable={ac.maker ? true : false}
                />
                {/* 候補リスト */}
                {ac.maker && showModelSuggestions[index] && (() => {
                  // 型番が空の場合は全候補を表示、入力がある場合は絞り込み
                  const inputText = ac.model || '';
                  const suggestions = getModelSuggestions(inputText, ac.maker);
                  if (suggestions.length === 0) return null;
                  // 候補クリック後もリストは表示し続ける（Enterで非表示）ため、現在のモデルでフィルタしない
                  return (
                    <View style={[styles.suggestionsContainer, { marginBottom: 0 }]}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                        {suggestions.map((suggestion, sugIndex) => (
                          <TouchableOpacity
                            key={sugIndex}
                            style={styles.suggestionItem}
                            onPress={() => {
                              // 候補をクリック：完全な型番をフィールドに適用し、候補リストを閉じる
                              console.log('[型番候補] クリック:', suggestion);
                                    const updated = [...formData.airConditioners];
                              // 型番のみを設定（エアコンタイプとお掃除機能は手動で選択）
                                  updated[index] = {
                                    ...updated[index],
                                    model: suggestion,
                                  };
                                  setFormData(prev => ({ ...prev, airConditioners: updated }));
                              console.log(`[型番候補] 更新完了: 型番=${suggestion}`);
                              // ワンクリックで候補リストを非表示にする
                                        setShowModelSuggestions(prev => ({ ...prev, [index]: false }));
                            }}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                          </TouchableOpacity>
                      ))}
                      </ScrollView>
                    </View>
                  );
                })()}
              </View>
              {/* 候補リストが表示される場合のスペーサー */}
              {ac.maker && showModelSuggestions[index] && (() => {
                const inputText = ac.model || '';
                const suggestions = getModelSuggestions(inputText, ac.maker);
                return suggestions.length > 0 ? <View style={{ height: 210, marginBottom: 10 }} /> : null;
              })()}

              <Text style={styles.label}>エアコンタイプ</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.type}
                  onValueChange={(itemValue) => updateAirConditioner(index, 'type', itemValue)}
                  style={styles.picker}
                >
                  {airConditionerTypeOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>
              {/* エアコン完璧セットが選択されていない場合のみ金額表示 */}
              {!ac.perfectSetType && ac.type && (() => {
                const prices: { [key: string]: number } = {
                  '壁掛け一般': 9980,
                  '壁掛けおそうじ機能付き': 18700,
                  '大型': 14300,
                  '天井埋め込みタイプ(住居家庭用1・2方向)': 20900,
                  '天井埋め込みタイプ(オフィス・店舗・施設用4方向)': 26400,
                  '天井吊り下げタイプ': 26400,
                  '壁埋め込み式エアコン': 14300,
                  '床置きタイプエアコン(小型)': 14300,
                  '床置きタイプエアコン大型)': 26400,
                };
                const price = prices[ac.type];
                return price ? (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                    +{price.toLocaleString()}円
                  </Text>
                ) : null;
              })()}

              <Text style={styles.label}>おそうじ機能</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    ac.hasCleaningFunction === true && styles.toggleButtonActiveRed
                  ]}
                  onPress={() => updateAirConditioner(index, 'hasCleaningFunction', true)}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    ac.hasCleaningFunction === true && styles.toggleButtonTextActive
                  ]}>
                    あり
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    ac.hasCleaningFunction === false && styles.toggleButtonActive
                  ]}
                  onPress={() => updateAirConditioner(index, 'hasCleaningFunction', false)}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    ac.hasCleaningFunction === false && styles.toggleButtonTextActive
                  ]}>
                    なし
                  </Text>
                </TouchableOpacity>
              </View>

              {/* おそうじ機能確認用のGoogle検索（型番とメーカーが入力されている場合のみ表示） */}
              {ac.maker && ac.model && ac.model.trim() !== '' ? (
                <View style={{ marginTop: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: '#555', fontWeight: '600', marginBottom: 4 }}>
                    おそうじ機能の有無の確認はこちらからも可能です↓
                  </Text>
                  <TouchableOpacity
                    style={styles.googleSearchButton}
                    onPress={() => {
                      const searchQuery = encodeURIComponent(`${ac.maker} ${ac.model} おそうじ機能`);
                      const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
                      if (Platform.OS === 'web') {
                        window.open(googleSearchUrl, '_blank');
                      } else {
                        Linking.openURL(googleSearchUrl);
                      }
                    }}
                  >
                    <Text style={styles.googleSearchButtonText}>🔍 Google検索</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* エアコンタイプとおそうじ機能の整合性エラー（1つだけ表示） */}
              {(() => {
                // 完璧セットが選択されている場合の整合性チェック（スタッフ用・お客様用共通）
                const perfectSetMismatch = ac.perfectSetType && (
                  (ac.perfectSetType === 'お掃除機能付きタイプ' && 
                    (ac.type !== '壁掛けおそうじ機能付き' || ac.hasCleaningFunction !== true)) ||
                  (ac.perfectSetType === '一般タイプ' && 
                    (ac.type !== '壁掛け一般' || ac.hasCleaningFunction !== false))
                );
                // 完璧セットが選択されていない場合のエアコンタイプとおそうじ機能の整合性チェック
                const generalMismatch = !ac.perfectSetType && (
                  (ac.type.includes('おそうじ機能付き') && ac.hasCleaningFunction === false) ||
                  (ac.type.includes('壁掛け一般') && ac.hasCleaningFunction === true)
                );
                // どちらかに該当する場合のみエラーを1つ表示
                if (perfectSetMismatch || generalMismatch) {
                  return (
                    <Text style={{ color: 'red', fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                      エアコンタイプとお掃除機能の内容が一致していません
                    </Text>
                  );
                }
                return null;
              })()}

              {/* エアコン完璧セットが選択されていない場合のみオプションを表示 */}
              {!ac.perfectSetType && (
                <>
              <Text style={styles.label}>オプション</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.options.length > 0 ? ac.options[0] : ''}
                  onValueChange={(itemValue) => {
                    const updatedOptions = itemValue ? [itemValue] : [];
                    updateAirConditioner(index, 'options', updatedOptions);
                  }}
                  style={styles.picker}
                >
                  {optionOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>
                  {ac.options.length > 0 && ac.options[0] && (() => {
                    const prices: { [key: string]: number } = {
                      '防カビ抗菌コート': 2750,
                      '室外機小型': 3300,
                      '室外機大型': 9900,
                      '防虫キャップ': 880,
                    };
                    const price = prices[ac.options[0]];
                    return price ? (
                      <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </>
              )}

              <Text style={styles.label}>高さ</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.height}
                  onValueChange={(itemValue) => updateAirConditioner(index, 'height', itemValue)}
                  style={styles.picker}
                >
                  {heightOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>設置状況</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.installation}
                  onValueChange={(itemValue) => updateAirConditioner(index, 'installation', itemValue)}
                  style={styles.picker}
                >
                  {installationOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>無料ワンモアサービス</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.freeOneMoreService}
                  onValueChange={(itemValue) => updateAirConditioner(index, 'freeOneMoreService', itemValue)}
                  style={styles.picker}
                >
                  {freeOneMoreServiceOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>オプション等</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={ac.optionsEtc}
                  onValueChange={(itemValue) => {
                    updateAirConditioner(index, 'optionsEtc', itemValue);
                  }}
                  style={styles.picker}
                >
                  {optionEtcOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>
              {ac.optionsEtc && optionEtcPrices[ac.optionsEtc] > 0 && (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{optionEtcPrices[ac.optionsEtc].toLocaleString()}円
                </Text>
              )}

              {formData.airConditioners.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeAirConditioner(index)}
                >
                  <Text style={styles.removeButtonText}>この台を削除</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

        </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('排水管洗浄') && formData.cleaningCompany === 'アイソウジ' && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>排水管洗浄</Text>
            
            <Text style={styles.label}>建物タイプ</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.buildingType}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('buildingType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('buildingType');
                      return newErrors;
                    });
                  }
                  updateFormData('buildingType', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="戸建てタイプ" value="戸建てタイプ" />
                <Picker.Item label="マンション・アパートタイプ" value="マンション・アパートタイプ" />
              </Picker>
            </View>

            <View style={styles.checkbox}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  updateFormData('cloggingSymptom', !formData.cloggingSymptom);
                }}
              >
        <View style={[
                  styles.checkboxBox,
                  formData.cloggingSymptom && styles.checkboxBoxChecked
                ]}>
                  {formData.cloggingSymptom && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  つまり症状のご依頼
                </Text>
              </TouchableOpacity>
              {formData.buildingType === '戸建てタイプ' && formData.cloggingSymptom && (
                <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginLeft: 32 }}>
                  外マス一式11,000円
                </Text>
              )}
              {formData.buildingType === 'マンション・アパートタイプ' && formData.cloggingSymptom && (
                <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginLeft: 32 }}>
                  専用仕様車一律 18,700円
                </Text>
              )}
            </View>

            <Text style={styles.label}>作業箇所</Text>
            <View style={{ marginBottom: 12 }}>
              {['キッチン', '洗面所', '浴室', '防水パン（洗濯機下の排水口）', 'トイレ内の独立洗面台'].map((location) => {
                // 建物タイプに応じた料金を取得
                const pricesDetached: { [key: string]: number } = {
                  'キッチン': 17000,
                  '洗面所': 8800,
                  '浴室': 15000,
                  '防水パン（洗濯機下の排水口）': 9800,
                  'トイレ内の独立洗面台': 8800,
                };
                const pricesApartment: { [key: string]: number } = {
                  'キッチン': 35700,
                  '洗面所': 27500,
                  '浴室': 33700,
                  '防水パン（洗濯機下の排水口）': 28500,
                  'トイレ内の独立洗面台': 27500,
                };
                const price = formData.buildingType === 'マンション・アパートタイプ'
                  ? pricesApartment[location]
                  : pricesDetached[location];
                const isSelected = formData.workLocation && formData.workLocation.includes(location);
                
                return (
                  <View key={location}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('workLocation')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('workLocation');
                        return newErrors;
                      });
                    }
                    const currentLocations = formData.workLocation || [];
                        const isCurrentlySelected = currentLocations.includes(location);
                        const updatedLocations = isCurrentlySelected
                      ? currentLocations.filter(l => l !== location)
                      : [...currentLocations, location];
                    updateFormData('workLocation', updatedLocations);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                        isSelected && styles.checkboxBoxChecked
                  ]}>
                        {isSelected && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{location}</Text>
                </TouchableOpacity>
                    {isSelected && price && (
                      <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginLeft: 28, marginTop: -4, marginBottom: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('風呂釜洗浄') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>風呂釜洗浄</Text>
            <Text style={styles.label}>作業内容</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                selectedValue={formData.bathtubCleaningWork}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('bathtubCleaningWork')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('bathtubCleaningWork');
                      return newErrors;
                    });
                  }
                  updateFormData('bathtubCleaningWork', itemValue);
                }}
                  style={styles.picker}
                >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="風呂釜クリーニング(1つ穴タイプ) +ジェットバスクリーニング" value="風呂釜クリーニング(1つ穴タイプ) +ジェットバスクリーニング" />
                <Picker.Item label="風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付き換気扇+エプロン内部高圧クリーニング" value="風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付き換気扇+エプロン内部高圧クリーニング" />
                <Picker.Item label="風呂釜クリーニング (1つ穴タイプ) +浴室乾燥機付換気扇" value="風呂釜クリーニング (1つ穴タイプ) +浴室乾燥機付換気扇" />
                <Picker.Item label="風呂釜クリーニング (1つ穴タイプ) +エプロン内部高圧クリーニング" value="風呂釜クリーニング (1つ穴タイプ) +エプロン内部高圧クリーニング" />
              </Picker>
            </View>
            {formData.bathtubCleaningWork && (() => {
              const prices: { [key: string]: number } = {
                '風呂釜クリーニング(1つ穴タイプ) +ジェットバスクリーニング': 40000,
                '風呂釜クリーニング(1つ穴タイプ) +浴室乾燥機付き換気扇+エプロン内部高圧クリーニング': 27200,
                '風呂釜クリーニング (1つ穴タイプ) +浴室乾燥機付換気扇': 24800,
                '風呂釜クリーニング (1つ穴タイプ) +エプロン内部高圧クリーニング': 19200,
              };
              const price = prices[formData.bathtubCleaningWork];
              return price ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{price.toLocaleString()}円
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('洗濯機分解洗浄') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>洗濯機分解洗浄</Text>
            
            <View nativeID="field-washingMachineType">
              <Text style={[styles.label, validationErrors.has('washingMachineType') && styles.labelError]}>洗濯機の種類</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.washingMachineType === '8kg未満（縦型）' && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('washingMachineType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('washingMachineType');
                      return newErrors;
                    });
                  }
                  updateFormData('washingMachineType', formData.washingMachineType === '8kg未満（縦型）' ? '' : '8kg未満（縦型）');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.washingMachineType === '8kg未満（縦型）' && styles.toggleButtonTextActive
                ]}>
                  8kg未満（縦型）
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.washingMachineType === '8kg以上（縦型）' && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('washingMachineType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('washingMachineType');
                      return newErrors;
                    });
                  }
                  updateFormData('washingMachineType', formData.washingMachineType === '8kg以上（縦型）' ? '' : '8kg以上（縦型）');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.washingMachineType === '8kg以上（縦型）' && styles.toggleButtonTextActive
                ]}>
                  8kg以上（縦型）
                </Text>
              </TouchableOpacity>
              </View>
              {validationErrors.has('washingMachineType') && (
                <Text style={styles.errorMessage}>※ 必須項目です</Text>
              )}
            </View>

            <View nativeID="field-washingMachineDryingFunction">
              <Text style={[styles.label, validationErrors.has('washingMachineDryingFunction') && styles.labelError]}>乾燥機能</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.washingMachineDryingFunction === false && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('washingMachineDryingFunction')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('washingMachineDryingFunction');
                      return newErrors;
                    });
                  }
                  updateFormData('washingMachineDryingFunction', formData.washingMachineDryingFunction === false ? null : false);
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.washingMachineDryingFunction === false && styles.toggleButtonTextActive
                ]}>
                  なし
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.washingMachineDryingFunction === true && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('washingMachineDryingFunction')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('washingMachineDryingFunction');
                      return newErrors;
                    });
                  }
                  updateFormData('washingMachineDryingFunction', formData.washingMachineDryingFunction === true ? null : true);
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.washingMachineDryingFunction === true && styles.toggleButtonTextActive
                ]}>
                  あり
                </Text>
              </TouchableOpacity>
            </View>
              {validationErrors.has('washingMachineDryingFunction') && (
                <Text style={styles.errorMessage}>※ 必須項目です</Text>
              )}
            </View>
            {formData.washingMachineType && formData.washingMachineDryingFunction !== null && (() => {
              let price = 0;
              if (formData.washingMachineType === '8kg未満（縦型）') {
                price = formData.washingMachineDryingFunction ? 23100 : 17600;
              } else if (formData.washingMachineType === '8kg以上（縦型）') {
                price = formData.washingMachineDryingFunction ? 26400 : 20900;
              }
              return price > 0 ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                  +{price.toLocaleString()}円
                </Text>
              ) : null;
            })()}

            <Text style={styles.label}>オプション</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.washingMachineCleaningOption}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('washingMachineCleaningOption')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('washingMachineCleaningOption');
                      return newErrors;
                    });
                  }
                  updateFormData('washingMachineCleaningOption', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="日立ビートウォッシュ・白い約束" value="日立ビートウォッシュ・白い約束" />
                <Picker.Item label="洗濯パンクリーニング" value="洗濯パンクリーニング" />
              </Picker>
            </View>
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('水回りセット') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>水回りセット</Text>
            <Text style={styles.label}>作業箇所（4箇所まで）</Text>
            <Text style={{ fontSize: 12, color: '#333', marginBottom: 8 }}>
              ※洗面所とトイレは、0.5箇所扱いです
            </Text>
            <View style={{ marginBottom: 12 }}>
              {['キッチン', 'レンジフード', '浴室', '洗面所', 'トイレ', 'トイレ2ヶ所'].map((item) => {
                const isSelected = formData.waterAreaSet && formData.waterAreaSet.includes(item);
                return (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('waterAreaSet')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('waterAreaSet');
                        return newErrors;
                      });
                    }
                    const currentItems = formData.waterAreaSet || [];
                      const isCurrentlySelected = currentItems.includes(item);
                      const updatedItems = isCurrentlySelected
                      ? currentItems.filter(i => i !== item)
                      : [...currentItems, item];
                    updateFormData('waterAreaSet', updatedItems);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                      isSelected && styles.checkboxBoxChecked
                  ]}>
                      {isSelected && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{item}</Text>
                </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              // 点数計算ロジック
              const calculatePoints = (items: string[]): number => {
                let points = 0;
                items.forEach(item => {
                  if (item === '洗面所' || item === 'トイレ') {
                    points += 0.5;
                  } else if (item === 'トイレ2ヶ所') {
                    points += 1; // トイレ2箇所で1点
                  } else {
                    points += 1; // キッチン、レンジフード、浴室は1点
                  }
                });
                return points;
              };
              
              const selectedItems = formData.waterAreaSet || [];
              const totalPoints = calculatePoints(selectedItems);
              
              // セット料金の計算
              let setPrice = 0;
              if (totalPoints >= 2 && totalPoints < 3) {
                setPrice = 26400; // 2点セット
              } else if (totalPoints >= 3 && totalPoints < 4) {
                setPrice = 39600; // 3点セット
              } else if (totalPoints >= 4 && totalPoints < 4.5) {
                setPrice = 52800; // 4点セット
              }
              
              if (totalPoints < 1) {
                return (
                  <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginLeft: 0 }}>
                    2つ以上チェックしてください
                  </Text>
                );
              } else if (totalPoints >= 4.5) {
                return (
                  <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginLeft: 0 }}>
                    選択は4点以内にしてください
                  </Text>
                );
              } else if (setPrice > 0) {
                return (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: 8, marginLeft: 0 }}>
                    +{setPrice.toLocaleString()}円（{totalPoints}点セット）
                  </Text>
                );
              }
              return null;
            })()}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('浴室') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>浴室</Text>
            
            <Text style={styles.label}>浴室完璧セット</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.bathroomPerfectSet}
                onValueChange={(itemValue) => updateFormData('bathroomPerfectSet', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="通常換気扇" value="通常換気扇" />
                <Picker.Item label="乾燥機付き換気扇" value="乾燥機付き換気扇" />
              </Picker>
            </View>
            {formData.bathroomPerfectSet && (
              <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                +{formData.bathroomPerfectSet === '通常換気扇' ? '35,937' : '42,372'}円
              </Text>
            )}

            <Text style={styles.label}>浴室タイプ</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.bathroomWork}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('bathroomWork')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('bathroomWork');
                      return newErrors;
                    });
                  }
                  updateFormData('bathroomWork', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="浴室クリーニング" value="浴室クリーニング" />
                <Picker.Item label="シャワー室" value="シャワー室" />
                <Picker.Item label="浴室(便器付き or 洗面ボウル)" value="浴室(便器付き or 洗面ボウル)" />
                <Picker.Item label="浴室3点ユニット" value="浴室3点ユニット" />
                </Picker>
            </View>
            {/* 浴室完璧セットが選択されていない場合のみ金額表示 */}
            {!formData.bathroomPerfectSet && formData.bathroomWork && (() => {
              const prices: { [key: string]: number } = {
                '浴室クリーニング': 15400,
                'シャワー室': 11000,
                '浴室(便器付き or 洗面ボウル)': 18700,
                '浴室3点ユニット': 23100,
              };
              const price = prices[formData.bathroomWork];
              return price ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{price.toLocaleString()}円
                </Text>
              ) : null;
            })()}
            <Text style={styles.label}>オプション</Text>
            <View style={{ marginBottom: 12 }}>
              {['エプロン内部清掃', '鏡 水垢防止コーティング', '浴室全体 水垢防止コーティング', '通常換気扇', '乾燥機付き換気扇'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('bathroomOptions')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('bathroomOptions');
                        return newErrors;
                      });
                    }
                    const currentOptions = formData.bathroomOptions || [];
                    const isSelected = currentOptions.includes(item);
                    const updatedOptions = isSelected
                      ? currentOptions.filter(i => i !== item)
                      : [...currentOptions, item];
                    updateFormData('bathroomOptions', updatedOptions);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.bathroomOptions && formData.bathroomOptions.includes(item) && styles.checkboxBoxChecked
                  ]}>
                    {formData.bathroomOptions && formData.bathroomOptions.includes(item) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{item}</Text>
                  {formData.bathroomOptions && formData.bathroomOptions.includes(item) && (() => {
                    const prices: { [key: string]: number } = {
                      'エプロン内部清掃': 3080,
                      '鏡 水垢防止コーティング': 7700,
                      '浴室全体 水垢防止コーティング': 11000,
                      '通常換気扇': 3850,
                      '乾燥機付き換気扇': 11000,
                    };
                    const price = prices[item];
                    return price ? (
                      <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('レンジフード') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>レンジフード</Text>
            <Text style={styles.label}>タイプ</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.rangeHoodType === 'フード付き' && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('rangeHoodType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('rangeHoodType');
                      return newErrors;
                    });
                  }
                  updateFormData('rangeHoodType', formData.rangeHoodType === 'フード付き' ? '' : 'フード付き');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.rangeHoodType === 'フード付き' && styles.toggleButtonTextActive
                ]}>
                  フード付き
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.rangeHoodType === 'フード無し(プロペラ)' && styles.toggleButtonActive
                ]}
                onPress={() => {
                  if (validationErrors.has('rangeHoodType')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('rangeHoodType');
                      return newErrors;
                    });
                  }
                  updateFormData('rangeHoodType', formData.rangeHoodType === 'フード無し(プロペラ)' ? '' : 'フード無し(プロペラ)');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  formData.rangeHoodType === 'フード無し(プロペラ)' && styles.toggleButtonTextActive
                ]}>
                  フード無し(プロペラ)
                </Text>
              </TouchableOpacity>
            </View>
            {formData.rangeHoodType && (() => {
              const prices: { [key: string]: number } = {
                'フード付き': 16500,
                'フード無し(プロペラ)': 9900,
              };
              const price = prices[formData.rangeHoodType];
              return price ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: 8 }}>
                  +{price.toLocaleString()}円
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('キッチン') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>キッチン</Text>
            <Text style={styles.label}>作業内容</Text>
            <View style={{ marginBottom: 12 }}>
              {[
                'キッチンユニット(横幅4mまで)',
                '備え付けオーブンレンジ内部',
                '食洗器内部清掃',
                'シンク水垢防止コーティング',
                '冷蔵庫(中にモノがある状態)',
                '冷蔵庫(中にモノがない状態)',
                '後置き食器棚表面'
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('kitchenWork')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('kitchenWork');
                        return newErrors;
                      });
                    }
                    const currentWork = formData.kitchenWork || [];
                    const isSelected = currentWork.includes(item);
                    const updatedWork = isSelected
                      ? currentWork.filter(i => i !== item)
                      : [...currentWork, item];
                    updateFormData('kitchenWork', updatedWork);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.kitchenWork && formData.kitchenWork.includes(item) && styles.checkboxBoxChecked
                  ]}>
                    {formData.kitchenWork && formData.kitchenWork.includes(item) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{item}</Text>
                  {formData.kitchenWork && formData.kitchenWork.includes(item) && (() => {
                    const prices: { [key: string]: number } = {
                      'キッチンユニット(横幅4mまで)': 16500,
                      '備え付けオーブンレンジ内部': 11000,
                      '食洗器内部清掃': 7700,
                      'シンク水垢防止コーティング': 3850,
                      '冷蔵庫(中にモノがある状態)': 13200,
                      '冷蔵庫(中にモノがない状態)': 9900,
                      '後置き食器棚表面': 3850,
                    };
                    const price = prices[item];
                    return price ? (
                      <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('トイレ') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>トイレ</Text>
            
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => updateFormData('toiletPerfectSet', !formData.toiletPerfectSet)}
            >
              <View style={[styles.checkboxBox, formData.toiletPerfectSet && styles.checkboxBoxChecked]}>
                {formData.toiletPerfectSet && <Text style={styles.checkboxCheckmark}>✓</Text>}
            </View>
              <Text style={styles.checkboxText}>トイレ完璧セット</Text>
            </TouchableOpacity>
            {formData.toiletPerfectSet && (
              <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginLeft: 28, marginTop: -4, marginBottom: 8 }}>
                +19,305円
              </Text>
            )}

            <Text style={styles.label}>作業内容</Text>
            <View style={{ marginBottom: 12 }}>
              {[
                'トイレクリーニング',
                '通常換気扇',
                '便器内 水垢防止コーティング',
                'タンク内クリーニング'
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('toiletWork')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('toiletWork');
                        return newErrors;
                      });
                    }
                    const currentWork = formData.toiletWork || [];
                    const isSelected = currentWork.includes(item);
                    const updatedWork = isSelected
                      ? currentWork.filter(i => i !== item)
                      : [...currentWork, item];
                    updateFormData('toiletWork', updatedWork);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.toiletWork && formData.toiletWork.includes(item) && styles.checkboxBoxChecked
                  ]}>
                    {formData.toiletWork && formData.toiletWork.includes(item) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{item}</Text>
                  {/* トイレ完璧セットが選択されていない場合のみ金額表示 */}
                  {!formData.toiletPerfectSet && formData.toiletWork && formData.toiletWork.includes(item) && (() => {
                    const prices: { [key: string]: number } = {
                      'トイレクリーニング': 8250,
                      '通常換気扇': 3850,
                      '便器内 水垢防止コーティング': 5500,
                      'タンク内クリーニング': 3850,
                    };
                    const price = prices[item];
                    return price ? (
                      <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('床') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>床</Text>
            <Text style={styles.label}>作業内容</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.floorWork}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('floorWork')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('floorWork');
                      return newErrors;
                    });
                  }
                  updateFormData('floorWork', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="拭き清掃+掃除機がけ" value="拭き清掃+掃除機がけ" />
                <Picker.Item label="清掃+スタンダードワックス" value="清掃+スタンダードワックス" />
                <Picker.Item label="清掃+ハイグレードワックス" value="清掃+ハイグレードワックス" />
                <Picker.Item label="剥離洗浄" value="剥離洗浄" />
              </Picker>
            </View>
            <Text style={styles.label}>面積</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={formData.floorArea > 0 ? formData.floorArea.toString() : ''}
                onChangeText={(text) => {
                  if (validationErrors.has('floorArea')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('floorArea');
                      return newErrors;
                    });
                  }
                  // 全角数字を半角数字に変換
                  const normalizedText = convertFullWidthToHalfWidth(text);
                  const numValue = normalizedText === '' ? 0 : parseFloat(normalizedText);
                  updateFormData('floorArea', isNaN(numValue) ? 0 : numValue);
                }}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 16, color: '#333' }}>㎡</Text>
            </View>
            {/* 床の合計金額表示 */}
            {formData.floorWork && formData.floorArea > 0 && (() => {
              const prices: { [key: string]: number } = {
                '拭き清掃+掃除機がけ': 330,
                '清掃+スタンダードワックス': 605,
                '清掃+ハイグレードワックス': 1100,
                '剥離洗浄': 1100,
              };
              const unitPrice = prices[formData.floorWork];
              const total = unitPrice ? unitPrice * formData.floorArea : 0;
              return total > 0 ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{total.toLocaleString()}円（{unitPrice.toLocaleString()}円/㎡ × {formData.floorArea}㎡）
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('カーペット') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>カーペット</Text>
            <Text style={styles.label}>作業内容</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.carpetWork}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('carpetWork')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('carpetWork');
                      return newErrors;
                    });
                  }
                  updateFormData('carpetWork', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="カーペットクリーニング" value="カーペットクリーニング" />
                <Picker.Item label="防臭抗菌加工" value="防臭抗菌加工" />
              </Picker>
            </View>
            <Text style={styles.label}>面積</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={formData.carpetArea > 0 ? formData.carpetArea.toString() : ''}
                onChangeText={(text) => {
                  if (validationErrors.has('carpetArea')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('carpetArea');
                      return newErrors;
                    });
                  }
                  // 全角数字を半角数字に変換
                  const normalizedText = convertFullWidthToHalfWidth(text);
                  const numValue = normalizedText === '' ? 0 : parseFloat(normalizedText);
                  updateFormData('carpetArea', isNaN(numValue) ? 0 : numValue);
                }}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 16, color: '#333' }}>㎡</Text>
            </View>
            {/* カーペットの合計金額表示 */}
            {formData.carpetWork && formData.carpetArea > 0 && (() => {
              const prices: { [key: string]: number } = {
                'カーペットクリーニング': 1100,
                '防臭抗菌加工': 550,
              };
              const unitPrice = prices[formData.carpetWork];
              const total = unitPrice ? unitPrice * formData.carpetArea : 0;
              return total > 0 ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{total.toLocaleString()}円（{unitPrice.toLocaleString()}円/㎡ × {formData.carpetArea}㎡）
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('その他(窓・ベランダ・換気口・照明)') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>その他（窓・ベランダ・換気口・照明）</Text>
            <Text style={styles.label}>作業内容</Text>
            <View>
              {[
                '窓ガラス・サッシ',
                'シャッター・雨戸(内側のみ)',
                'シャッター・雨戸(両面)',
                'ベランダ 10㎡未満',
                'ベランダ 10㎡以上、20㎡未満',
                'ベランダ 20㎡以上、30㎡未満',
                'ベランダ 30㎡以上 1㎡あたり',
                'ベランダ 雨だれ除去',
                'お部屋の換気口・換気扇',
                'ガラス外面水垢防止コーティング',
                '照明器具'
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    if (validationErrors.has('otherWindowWork')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('otherWindowWork');
                        return newErrors;
                      });
                    }
                    const currentWork = formData.otherWindowWork || [];
                    const isSelected = currentWork.includes(item);
                    const updatedWork = isSelected
                      ? currentWork.filter(i => i !== item)
                      : [...currentWork, item];
                    updateFormData('otherWindowWork', updatedWork);
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.otherWindowWork && formData.otherWindowWork.includes(item) && styles.checkboxBoxChecked
                  ]}>
                    {formData.otherWindowWork && formData.otherWindowWork.includes(item) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>
                    {item === '窓ガラス・サッシ' ? '窓ガラス・サッシ / 1箇所' :
                     item === 'シャッター・雨戸(内側のみ)' ? 'シャッター・雨戸(内側のみ) / 1枚' :
                     item === 'シャッター・雨戸(両面)' ? 'シャッター・雨戸(両面) / 1枚' :
                     item === 'お部屋の換気口・換気扇' ? 'お部屋の換気口・換気扇 / 1箇所' :
                     item === 'ガラス外面水垢防止コーティング' ? 'ガラス外面水垢防止コーティング / 1枠' :
                     item}
                  </Text>
                  {/* 固定価格のベランダ項目に金額表示 */}
                  {formData.otherWindowWork && formData.otherWindowWork.includes(item) && (() => {
                    const fixedPrices: { [key: string]: number } = {
                      'ベランダ 10㎡未満': 7700,
                      'ベランダ 10㎡以上、20㎡未満': 15400,
                    };
                    const price = fixedPrices[item];
                    return price ? (
                      <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                        +{price.toLocaleString()}円
                      </Text>
                    ) : null;
                  })()}
                </TouchableOpacity>
              ))}
            </View>
            {formData.otherWindowWork && Array.isArray(formData.otherWindowWork) && formData.otherWindowWork.includes('照明器具') && (
              <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginBottom: 12 }}>
                ※照明器具：形によって金額応相談
              </Text>
            )}
            {formData.otherWindowWork && Array.isArray(formData.otherWindowWork) && formData.otherWindowWork.length > 0 && (
              <>
                {/* 各項目ごとに個別の入力フィールドを表示 */}
                {formData.otherWindowWork.map((item) => {
                  // 固定価格の項目（数量/面積不要）
                  if (item === 'ベランダ 10㎡未満' || item === 'ベランダ 10㎡以上、20㎡未満' || item === 'ベランダ 20㎡以上、30㎡未満' || item === '照明器具') {
                    return null;
                  }
                  
                  // 面積が必要な項目
                  if (item === 'ベランダ 30㎡以上 1㎡あたり' || item === 'ベランダ 雨だれ除去') {
                    const area = formData.otherWindowAreas && formData.otherWindowAreas[item] !== undefined && formData.otherWindowAreas[item] !== null ? formData.otherWindowAreas[item] : 0;
                    const unitPrice = 770; // 1㎡あたり770円
                    const totalPrice = area * unitPrice;
                    return (
                      <View key={item} style={{ marginBottom: 12 }}>
                        <Text style={styles.label}>{item}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            value={area > 0 ? area.toString() : ''}
                            onChangeText={(text) => {
                              if (validationErrors.has('otherWindowArea')) {
                                setValidationErrors(prev => {
                                  const newErrors = new Set(prev);
                                  newErrors.delete('otherWindowArea');
                                  return newErrors;
                                });
                              }
                              // 全角数字を半角数字に変換
                              const normalizedText = convertFullWidthToHalfWidth(text);
                              const numValue = normalizedText === '' ? 0 : parseFloat(normalizedText);
                              const updatedAreas = { ...(formData.otherWindowAreas || {}) };
                              updatedAreas[item] = isNaN(numValue) ? 0 : numValue;
                              updateFormData('otherWindowAreas', updatedAreas);
                            }}
                            placeholder="0"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                          />
                          <Text style={{ fontSize: 16, color: '#333' }}>㎡</Text>
                        </View>
                        {totalPrice > 0 && (
                          <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
                            +{totalPrice.toLocaleString()}円（770円/㎡ × {area}㎡）
                          </Text>
                        )}
                      </View>
                    );
                  }
                  
                  // 数量が必要な項目
                  let unit = '（枚・箇所）';
                  if (item === '窓ガラス・サッシ' || item === 'お部屋の換気口・換気扇') {
                    unit = '箇所';
                  } else if (item === 'シャッター・雨戸(内側のみ)' || item === 'シャッター・雨戸(両面)') {
                    unit = '枚';
                  } else if (item === 'ガラス外面水垢防止コーティング') {
                    unit = '枠';
                  }
                  
                  const quantity = formData.otherWindowQuantities && formData.otherWindowQuantities[item] !== undefined && formData.otherWindowQuantities[item] !== null ? formData.otherWindowQuantities[item] : 0;
                  const unitPrices: { [key: string]: number } = {
                    '窓ガラス・サッシ': 3850,
                    'シャッター・雨戸(内側のみ)': 1650,
                    'シャッター・雨戸(両面)': 2200,
                    'お部屋の換気口・換気扇': 3850,
                    'ガラス外面水垢防止コーティング': 11000,
                  };
                  const unitPrice = unitPrices[item] || 0;
                  const totalPrice = quantity * unitPrice;
                  
                  return (
                    <View key={item} style={{ marginBottom: 12 }}>
                      <Text style={styles.label}>{item}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, marginRight: 8 }]}
                          value={quantity > 0 ? quantity.toString() : ''}
                          onChangeText={(text) => {
                            if (validationErrors.has('otherWindowQuantity')) {
                              setValidationErrors(prev => {
                                const newErrors = new Set(prev);
                                newErrors.delete('otherWindowQuantity');
                                return newErrors;
                              });
                            }
                            // 全角数字を半角数字に変換
                            const normalizedText = convertFullWidthToHalfWidth(text);
                            const numValue = normalizedText === '' ? 0 : parseFloat(normalizedText);
                            const updatedQuantities = { ...(formData.otherWindowQuantities || {}) };
                            updatedQuantities[item] = isNaN(numValue) ? 0 : numValue;
                            updateFormData('otherWindowQuantities', updatedQuantities);
                          }}
                          placeholder="0"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                        <Text style={{ fontSize: 16, color: '#333' }}>{unit}</Text>
                      </View>
                      {totalPrice > 0 && (
                        <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
                          +{totalPrice.toLocaleString()}円（{unitPrice.toLocaleString()}円 × {quantity}{unit}）
                        </Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('空室・引き渡し清掃') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>空室・引渡し清掃</Text>
            <Text style={styles.label}>作業内容</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.vacantRoomWork}
                onValueChange={(itemValue) => {
                  if (validationErrors.has('vacantRoomWork')) {
                    setValidationErrors(prev => {
                      const newErrors = new Set(prev);
                      newErrors.delete('vacantRoomWork');
                      return newErrors;
                    });
                  }
                  updateFormData('vacantRoomWork', itemValue);
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="徹底清掃-25㎡未満一律料金" value="徹底清掃-25㎡未満一律料金" />
                <Picker.Item label="徹底清掃-25㎡以上 1㎡あたり" value="徹底清掃-25㎡以上 1㎡あたり" />
                <Picker.Item label="簡易清掃-25㎡未満一律料金" value="簡易清掃-25㎡未満一律料金" />
                <Picker.Item label="簡易清掃-25㎡以上 1㎡あたり" value="簡易清掃-25㎡以上 1㎡あたり" />
                <Picker.Item label="建物タイプ別追加料金-戸建2F建て" value="建物タイプ別追加料金-戸建2F建て" />
                <Picker.Item label="建物タイプ別追加料金-戸建3F建て" value="建物タイプ別追加料金-戸建3F建て" />
                <Picker.Item label="建物タイプ別追加料金-戸建4F建て" value="建物タイプ別追加料金-戸建4F建て" />
                <Picker.Item label="引き渡し清掃-50㎡まで" value="引き渡し清掃-50㎡まで" />
                <Picker.Item label="引き渡し清掃-※51㎡以上" value="引き渡し清掃-※51㎡以上" />
              </Picker>
            </View>
            {/* 固定価格の作業内容に金額表示 */}
            {formData.vacantRoomWork && (() => {
              const fixedPrices: { [key: string]: number } = {
                '徹底清掃-25㎡未満一律料金': 24750,
                '簡易清掃-25㎡未満一律料金': 13750,
                '建物タイプ別追加料金-戸建2F建て': 5500,
                '建物タイプ別追加料金-戸建3F建て': 11000,
                '建物タイプ別追加料金-戸建4F建て': 16500,
                '引き渡し清掃-50㎡まで': 25000,
              };
              // 面積ベースの作業内容の場合は単価を表示
              const perSqmPrices: { [key: string]: number } = {
                '徹底清掃-25㎡以上 1㎡あたり': 1100,
                '簡易清掃-25㎡以上 1㎡あたり': 550,
              };
              const fixedPrice = fixedPrices[formData.vacantRoomWork];
              const perSqmPrice = perSqmPrices[formData.vacantRoomWork];
              
              if (fixedPrice) {
                return (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                    +{fixedPrice.toLocaleString()}円
                  </Text>
                );
              } else if (perSqmPrice) {
                return (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                    {perSqmPrice.toLocaleString()}円/㎡
                  </Text>
                );
              }
              return null;
            })()}
            {formData.vacantRoomWork && formData.vacantRoomWork === '引き渡し清掃-※51㎡以上' && (
              <Text style={{ color: '#d32f2f', fontSize: 14, marginTop: 8, marginBottom: 12 }}>
                ※51㎡以上　要お見積り
              </Text>
            )}
            {(formData.vacantRoomWork === '徹底清掃-25㎡以上 1㎡あたり' || formData.vacantRoomWork === '簡易清掃-25㎡以上 1㎡あたり') && (
              <>
                <Text style={styles.label}>面積</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={formData.vacantRoomArea > 0 ? formData.vacantRoomArea.toString() : ''}
                        onChangeText={(text) => {
                          if (validationErrors.has('vacantRoomArea')) {
                            setValidationErrors(prev => {
                              const newErrors = new Set(prev);
                              newErrors.delete('vacantRoomArea');
                              return newErrors;
                            });
                          }
                          // 全角数字を半角数字に変換
                          const normalizedText = convertFullWidthToHalfWidth(text);
                          const numValue = normalizedText === '' ? 0 : parseFloat(normalizedText);
                          updateFormData('vacantRoomArea', isNaN(numValue) ? 0 : numValue);
                        }}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 16, color: '#333' }}>㎡</Text>
                </View>
                {/* 面積ベースの金額表示 */}
                {formData.vacantRoomArea > 0 && (() => {
                  const unitPrice = formData.vacantRoomWork === '徹底清掃-25㎡以上 1㎡あたり' ? 1100 : 550;
                  const total = unitPrice * formData.vacantRoomArea;
                  return (
                    <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                      +{total.toLocaleString()}円（{unitPrice.toLocaleString()}円/㎡ × {formData.vacantRoomArea}㎡）
                    </Text>
                  );
                })()}
              </>
            )}
          </View>
        )}

        {/* マットレスクリーニング */}
        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('マットレスクリーニング') && (
        <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>マットレスクリーニング</Text>
            
            <View {...(Platform.OS === 'web' ? { id: 'field-mattressSize' } : {})}>
              <Text style={[
                styles.label,
                validationErrors.has('mattressSize') && styles.labelError
              ]}>サイズ*</Text>
              <View style={[
                styles.input, 
                styles.pickerContainer,
                validationErrors.has('mattressSize') && styles.inputError
              ]}>
                <Picker
                  selectedValue={formData.mattressSize}
                  onValueChange={(itemValue) => {
                    if (validationErrors.has('mattressSize')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('mattressSize');
                        return newErrors;
                      });
                    }
                    updateFormData('mattressSize', itemValue);
                    // サイズ変更時に施工面をリセット（キングは両面不可など）
                    if (itemValue === 'キングサイズ' && formData.mattressSide === '両面') {
                      updateFormData('mattressSide', '');
                    }
                    // 手伝いありはダブル・クイーンのみ
                    if (!['ダブルサイズ', 'クイーンサイズ'].includes(itemValue) && formData.mattressSide === '手伝いあり') {
                      updateFormData('mattressSide', '');
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="選択してください" value="" />
                  <Picker.Item label="シングルサイズ" value="シングルサイズ" />
                  <Picker.Item label="セミダブルサイズ" value="セミダブルサイズ" />
                  <Picker.Item label="ダブルサイズ" value="ダブルサイズ" />
                  <Picker.Item label="クイーンサイズ" value="クイーンサイズ" />
                  <Picker.Item label="キングサイズ" value="キングサイズ" />
                </Picker>
              </View>
              {validationErrors.has('mattressSize') && (
                <Text style={styles.errorMessage}>※ 必須項目です</Text>
              )}
            </View>

            <View {...(Platform.OS === 'web' ? { id: 'field-mattressSide' } : {})}>
              <Text style={[
                styles.label,
                validationErrors.has('mattressSide') && styles.labelError
              ]}>施工面*</Text>
              <View style={[
                styles.input, 
                styles.pickerContainer,
                validationErrors.has('mattressSide') && styles.inputError
              ]}>
                <Picker
                  selectedValue={formData.mattressSide}
                  onValueChange={(itemValue) => {
                    if (validationErrors.has('mattressSide')) {
                      setValidationErrors(prev => {
                        const newErrors = new Set(prev);
                        newErrors.delete('mattressSide');
                        return newErrors;
                      });
                    }
                    updateFormData('mattressSide', itemValue);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="選択してください" value="" />
                  <Picker.Item label="片面" value="片面" />
                  {formData.mattressSize !== 'キングサイズ' && (
                    <Picker.Item label="両面" value="両面" />
                  )}
                  {['ダブルサイズ', 'クイーンサイズ'].includes(formData.mattressSize) && (
                    <Picker.Item label="手伝いあり" value="手伝いあり" />
                  )}
                </Picker>
              </View>
              {validationErrors.has('mattressSide') && (
                <Text style={styles.errorMessage}>※ 必須項目です</Text>
              )}
            </View>
            {formData.mattressSize === 'キングサイズ' && formData.mattressSide === '' && (
              <Text style={{ color: '#666', fontSize: 12, marginTop: -8, marginBottom: 8 }}>
                ※キングサイズの両面は要相談となります
              </Text>
            )}
            
            {/* 基本料金表示 */}
            {formData.mattressSize && formData.mattressSide && (() => {
              const basePrices: { [key: string]: { [key: string]: number } } = {
                'シングルサイズ': { '片面': 11000, '両面': 15400 },
                'セミダブルサイズ': { '片面': 13200, '両面': 17600 },
                'ダブルサイズ': { '片面': 16500, '両面': 24200, '手伝いあり': 19800 },
                'クイーンサイズ': { '片面': 19800, '両面': 29700, '手伝いあり': 24200 },
                'キングサイズ': { '片面': 24200 },
              };
              const price = basePrices[formData.mattressSize]?.[formData.mattressSide];
              return price ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  +{price.toLocaleString()}円（基本料金）
                </Text>
              ) : null;
            })()}

            <Text style={styles.label}>オプション</Text>
            <View style={{ marginBottom: 12 }}>
              {['シミ抜き', 'ペット消臭', '防臭抗菌加工'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.checkboxContainer}
                  onPress={() => {
                    const currentOptions = formData.mattressOptions || [];
                    const isSelected = currentOptions.includes(option);
                    const updatedOptions = isSelected
                      ? currentOptions.filter(o => o !== option)
                      : [...currentOptions, option];
                    updateFormData('mattressOptions', updatedOptions);
                    // シミ抜きを外した場合は数量をリセット
                    if (option === 'シミ抜き' && isSelected) {
                      updateFormData('mattressStainCount', 0);
                    }
                  }}
                >
                  <View style={[
                    styles.checkboxBox,
                    formData.mattressOptions && formData.mattressOptions.includes(option) && styles.checkboxBoxChecked
                  ]}>
                    {formData.mattressOptions && formData.mattressOptions.includes(option) && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxText}>{option}</Text>
                  {formData.mattressOptions && formData.mattressOptions.includes(option) && (() => {
                    // シミ抜きは数量によるので数量入力後に表示、ペット消臭と防臭抗菌加工は固定
                    if (option === 'シミ抜き' && formData.mattressStainCount > 0) {
                      const stainPrice = formData.mattressStainCount * 1000;
                      return (
                        <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                          +{stainPrice.toLocaleString()}円
                        </Text>
                      );
                    }
                    if (option === 'ペット消臭') {
                      return (
                        <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                          +3,300円
                        </Text>
                      );
                    }
                    if (option === '防臭抗菌加工') {
                      return (
                        <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                          +3,300円
                        </Text>
                      );
                    }
                    return null;
                  })()}
                </TouchableOpacity>
              ))}
            </View>

            {/* シミ抜き数量入力 */}
            {formData.mattressOptions && formData.mattressOptions.includes('シミ抜き') && (
              <View nativeID="field-mattressStainCount" style={{ marginBottom: 12 }}>
                <Text style={[
                  styles.label,
                  validationErrors.has('mattressStainCount') && styles.labelError
                ]}>シミ抜き数量（10cm四方単位）*</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[
                      styles.input, 
                      { width: 100, textAlign: 'center' },
                      validationErrors.has('mattressStainCount') && styles.inputError
                    ]}
                    value={formData.mattressStainCount > 0 ? formData.mattressStainCount.toString() : ''}
                    onChangeText={(text) => {
                      if (validationErrors.has('mattressStainCount')) {
                        setValidationErrors(prev => {
                          const newErrors = new Set(prev);
                          newErrors.delete('mattressStainCount');
                          return newErrors;
                        });
                      }
                      // 全角数字を半角数字に変換
                      const convertedText = text.replace(/[０-９]/g, (s) => {
                        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                      });
                      const num = parseInt(convertedText) || 0;
                      updateFormData('mattressStainCount', num);
                    }}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 16, color: '#333', marginLeft: 8 }}>箇所 × 1,000円</Text>
                </View>
                {validationErrors.has('mattressStainCount') && (
                  <Text style={styles.errorMessage}>※ シミ抜き数量を入力してください</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* 除菌 */}
        {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('除菌') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>除菌（ULTRA SHIELD除菌・抗菌・消臭施工）</Text>
            
            <Text style={styles.label}>施工タイプ</Text>
            <View style={[styles.input, styles.pickerContainer]}>
              <Picker
                selectedValue={formData.disinfectionType}
                onValueChange={(itemValue) => {
                  updateFormData('disinfectionType', itemValue);
                  // タイプ変更時に関連フィールドをリセット
                  updateFormData('disinfectionHouseSize', '');
                  updateFormData('disinfectionOfficeArea', 0);
                  updateFormData('disinfectionVehicleType', '');
                }}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="一戸建て・マンション" value="一戸建て・マンション" />
                <Picker.Item label="事務所・店舗" value="事務所・店舗" />
                <Picker.Item label="車両" value="車両" />
              </Picker>
            </View>

            {/* 一戸建て・マンションの場合 */}
            {formData.disinfectionType === '一戸建て・マンション' && (
              <>
                <Text style={styles.label}>広さ</Text>
                <View style={[styles.input, styles.pickerContainer]}>
                  <Picker
                    selectedValue={formData.disinfectionHouseSize}
                    onValueChange={(itemValue) => updateFormData('disinfectionHouseSize', itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="選択してください" value="" />
                    <Picker.Item label="ワンルーム(1LDK〜2DK) 〜50㎡" value="ワンルーム" />
                    <Picker.Item label="2LDK 〜60㎡" value="2LDK" />
                    <Picker.Item label="3LDK 〜80㎡" value="3LDK" />
                    <Picker.Item label="4LDK 150㎡" value="4LDK" />
                  </Picker>
                </View>
                {formData.disinfectionHouseSize && (() => {
                  const prices: { [key: string]: number } = {
                    'ワンルーム': 21780,
                    '2LDK': 32780,
                    '3LDK': 43780,
                    '4LDK': 65780,
                  };
                  const price = prices[formData.disinfectionHouseSize];
                  return price ? (
                    <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 4 }}>
                      +{price.toLocaleString()}円
                    </Text>
                  ) : null;
                })()}
                <Text style={{ color: '#666', fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  ※陽性患者が出た場合は料金1.5倍〜2倍
                </Text>
              </>
            )}

            {/* 事務所・店舗の場合 */}
            {formData.disinfectionType === '事務所・店舗' && (
              <>
                <Text style={styles.label}>面積（㎡）</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { width: 120, textAlign: 'center' }]}
                    value={formData.disinfectionOfficeArea > 0 ? formData.disinfectionOfficeArea.toString() : ''}
                    onChangeText={(text) => {
                      // 全角数字を半角数字に変換
                      const normalizedText = convertFullWidthToHalfWidth(text);
                      // 数字以外を除去
                      const digitsOnly = normalizedText.replace(/[^0-9]/g, '');
                      const num = parseInt(digitsOnly) || 0;
                      updateFormData('disinfectionOfficeArea', num);
                    }}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 16, color: '#333', marginLeft: 8 }}>㎡</Text>
                </View>
                <View style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: '#333', fontWeight: 'bold', marginBottom: 8 }}>料金表</Text>
                  <Text style={{ fontSize: 12, color: '#666', lineHeight: 20 }}>
                    〜60㎡: 55,000円{'\n'}
                    〜500㎡: 660円/㎡{'\n'}
                    〜999㎡: 550円/㎡{'\n'}
                    〜1999㎡: 440円/㎡{'\n'}
                    〜2499㎡: 330円/㎡{'\n'}
                    〜2999㎡: 275円/㎡{'\n'}
                    〜4999㎡: 220円/㎡{'\n'}
                    5000㎡〜: 165円/㎡
                  </Text>
                </View>
                {formData.disinfectionOfficeArea > 0 && (
                  <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                    +{(() => {
                      const area = formData.disinfectionOfficeArea;
                      if (area <= 60) return '55,000';
                      if (area <= 500) return (area * 660).toLocaleString();
                      if (area <= 999) return (area * 550).toLocaleString();
                      if (area <= 1999) return (area * 440).toLocaleString();
                      if (area <= 2499) return (area * 330).toLocaleString();
                      if (area <= 2999) return (area * 275).toLocaleString();
                      if (area <= 4999) return (area * 220).toLocaleString();
                      return (area * 165).toLocaleString();
                    })()}円
                  </Text>
                )}
                <Text style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                  ※陽性患者が出た場合は料金1.5倍〜2倍
                </Text>
              </>
            )}

            {/* 車両の場合 */}
            {formData.disinfectionType === '車両' && (
              <>
                <Text style={styles.label}>台数</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center' }]}
                    value={formData.disinfectionVehicleCount > 0 ? formData.disinfectionVehicleCount.toString() : ''}
                    onChangeText={(text) => {
                      // 全角数字を半角数字に変換
                      const convertedText = text.replace(/[０-９]/g, (s) => {
                        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                      });
                      // 空文字や非数字の場合は0をセット（表示は空欄になる）
                      const num = parseInt(convertedText);
                      updateFormData('disinfectionVehicleCount', isNaN(num) ? 0 : num);
                    }}
                    onBlur={() => {
                      // フォーカスが外れたときに0以下なら1に補正
                      if (formData.disinfectionVehicleCount <= 0) {
                        updateFormData('disinfectionVehicleCount', 1);
                      }
                    }}
                    placeholder="1"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 16, color: '#333', marginLeft: 8 }}>台</Text>
                </View>

                <Text style={styles.label}>車両タイプ</Text>
                <View style={[styles.input, styles.pickerContainer]}>
                  <Picker
                    selectedValue={formData.disinfectionVehicleType}
                    onValueChange={(itemValue) => updateFormData('disinfectionVehicleType', itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="選択してください" value="" />
                    <Picker.Item label="普通車" value="普通車" />
                    <Picker.Item label="大型車" value="大型車" />
                    <Picker.Item label="電車（1両）" value="電車" />
                    <Picker.Item label="ロープウェー" value="ロープウェー" />
                    <Picker.Item label="船（別途見積もり）" value="船" />
                  </Picker>
                </View>
                {formData.disinfectionVehicleType && formData.disinfectionVehicleType !== '船' && (() => {
                  const prices: { [key: string]: number } = {
                    '普通車': 3300,
                    '大型車': 11000,
                    '電車': 11000,
                    'ロープウェー': 11000,
                  };
                  const unitPrice = prices[formData.disinfectionVehicleType];
                  const count = formData.disinfectionVehicleCount || 1;
                  const totalPrice = unitPrice * count;
                  return unitPrice ? (
                    <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 4 }}>
                      +{totalPrice.toLocaleString()}円{count > 1 ? `（${unitPrice.toLocaleString()}円 × ${count}台）` : ''}
                    </Text>
                  ) : null;
                })()}
                <Text style={{ color: '#666', fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  ※陽性患者が出た場合は料金1.5倍〜2倍
                </Text>
              </>
            )}

            {/* オプション */}
            {formData.disinfectionType && (
              <>
                <Text style={styles.label}>オプション</Text>
                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => {
                      const currentOptions = formData.disinfectionOptions || [];
                      const option = 'エアコン外側拭き上げ＆フィルター清掃のみ';
                      const isSelected = currentOptions.includes(option);
                      const updatedOptions = isSelected
                        ? currentOptions.filter(o => o !== option)
                        : [...currentOptions, option];
                      updateFormData('disinfectionOptions', updatedOptions);
                    }}
                  >
                    <View style={[
                      styles.checkboxBox,
                      formData.disinfectionOptions?.includes('エアコン外側拭き上げ＆フィルター清掃のみ') && styles.checkboxBoxChecked
                    ]}>
                      {formData.disinfectionOptions?.includes('エアコン外側拭き上げ＆フィルター清掃のみ') && (
                        <Text style={styles.checkboxCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxText}>エアコン外側拭き上げ＆フィルター清掃のみ</Text>
                    {formData.disinfectionOptions?.includes('エアコン外側拭き上げ＆フィルター清掃のみ') && (
                      <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>
                        +1,650円
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  {['拭き上げ作業', '吹付け作業', '掃除作業'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.checkboxContainer}
                      onPress={() => {
                        const currentOptions = formData.disinfectionOptions || [];
                        const isSelected = currentOptions.includes(option);
                        const updatedOptions = isSelected
                          ? currentOptions.filter(o => o !== option)
                          : [...currentOptions, option];
                        updateFormData('disinfectionOptions', updatedOptions);
                      }}
                    >
                      <View style={[
                        styles.checkboxBox,
                        formData.disinfectionOptions?.includes(option) && styles.checkboxBoxChecked
                      ]}>
                        {formData.disinfectionOptions?.includes(option) && (
                          <Text style={styles.checkboxCheckmark}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxText}>{option}（別途見積書依頼）</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* 水回り（ベネフィットで問い合わせ内容に「水回り」が選択されている場合のみ表示） */}
        {formData.cleaningCompany === 'ベネフィット' && formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('水回り') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>水回り</Text>
            <Text style={styles.label}>作業内容</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={formData.waterArea}
                  onValueChange={(itemValue) => updateFormData('waterArea', itemValue)}
                  style={styles.picker}
                >
                  {waterAreaOptions.map((option, optIndex) => (
                    <Picker.Item key={optIndex} label={option || '選択してください'} value={option} />
                  ))}
                </Picker>
              </View>
            {formData.waterArea && (() => {
              // 割引後の価格
              const prices: { [key: string]: number } = {
                '水回り2点セット': 23760,
                '水回り3点セット': 35640,
                '水回り4点セット': 47520,
                'キッチン一式': 14850,
                'レンジフード': 13860,
                '浴室完璧セット(浴室クリーニング+エプロン内部+風呂釜洗浄)': 32472,
                '浴室一式': 13860,
                '浴室一式+風呂釜クリーニング1つ穴セット': 29700,
                '風呂釜クリーニング(1つ穴タイプ)': 15840,
                '洗面所一式': 7425,
                'トイレー式': 7425,
              };
              // 元の価格
              const originalPrices: { [key: string]: number } = {
                '水回り2点セット': 26400,
                '水回り3点セット': 39600,
                '水回り4点セット': 52800,
                'キッチン一式': 16500,
                'レンジフード': 15400,
                '浴室完璧セット(浴室クリーニング+エプロン内部+風呂釜洗浄)': 36080,
                '浴室一式': 15400,
                '浴室一式+風呂釜クリーニング1つ穴セット': 33000,
                '風呂釜クリーニング(1つ穴タイプ)': 17600,
                '洗面所一式': 8250,
                'トイレー式': 8250,
              };
              const price = prices[formData.waterArea];
              const originalPrice = originalPrices[formData.waterArea];
              return price && originalPrice ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  {originalPrice.toLocaleString()}円 ⇒ {price.toLocaleString()}円
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {/* 排水管（ベネフィットで問い合わせ内容に「排水管」が選択されている場合のみ表示） */}
        {formData.cleaningCompany === 'ベネフィット' && formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('排水管') && (
          <View style={getSectionStyle()}>
            <Text style={styles.sectionTitle}>排水管</Text>
            <Text style={styles.label}>セット内容</Text>
              <View style={[styles.input, styles.pickerContainer]}>
                <Picker
                  selectedValue={formData.drainPipe}
                  onValueChange={(itemValue) => updateFormData('drainPipe', itemValue)}
                  style={styles.picker}
                >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="戸建の排水管まるごと完璧セット（キッチン、浴室、洗面、洗濯機下、外マス一式）" value="戸建の排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下、外マスー式)" />
                <Picker.Item label="マンションまたはアパートの排水管まるごと完璧セット（キッチン、浴室、洗面、洗濯機下）" value="マンションまたはアパートの排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下)" />
                </Picker>
              </View>
            {formData.drainPipe && (() => {
              // 割引後の価格
              const prices: { [key: string]: number } = {
                '戸建の排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下、外マスー式)': 44000,
                'マンションまたはアパートの排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下)': 50160,
              };
              // 元の価格
              const originalPrices: { [key: string]: number } = {
                '戸建の排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下、外マスー式)': 55000,
                'マンションまたはアパートの排水管まるごと完璧セット(キッチン、浴室、洗面、洗濯機下)': 62700,
              };
              const price = prices[formData.drainPipe];
              const originalPrice = originalPrices[formData.drainPipe];
              return price && originalPrice ? (
                <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: -8, marginBottom: 8 }}>
                  {originalPrice.toLocaleString()}円 ⇒ {price.toLocaleString()}円
                </Text>
              ) : null;
            })()}
          </View>
        )}

        <View style={getSectionStyle()}>
          <Text style={styles.sectionTitle}>その他</Text>

          <View {...(Platform.OS === 'web' ? { id: 'field-parking' } : {})}>
            <Text style={[
              styles.label,
              validationErrors.has('parking') && styles.labelError
            ]}>駐車場の有無</Text>
            <View style={[
              styles.buttonGroup,
              validationErrors.has('parking') && styles.buttonGroupError
            ]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                formData.parking === true && styles.toggleButtonActive
              ]}
              onPress={() => {
                if (validationErrors.has('parking')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('parking');
                    return newErrors;
                  });
                }
                updateFormData('parking', true);
              }}
            >
              <Text style={[
                styles.toggleButtonText,
                formData.parking && styles.toggleButtonTextActive
              ]}>
                あり
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                formData.parking === false && styles.toggleButtonActiveRed
              ]}
              onPress={() => {
                if (validationErrors.has('parking')) {
                  setValidationErrors(prev => {
                    const newErrors = new Set(prev);
                    newErrors.delete('parking');
                    return newErrors;
                  });
                }
                updateFormData('parking', false);
              }}
            >
              <Text style={[
                styles.toggleButtonText,
                formData.parking === false && styles.toggleButtonTextActive
              ]}>
                なし
              </Text>
            </TouchableOpacity>
            </View>
            {validationErrors.has('parking') && (
              <Text style={styles.errorMessage}>※ 必須項目です</Text>
            )}
          </View>

          {formData.parking === true && (
            <>
              <Text style={styles.label}>{isCustomerMode ? '駐車場を利用させていただく場合のルール' : '来客用の場合のルール'}</Text>
              <TextInput
                key={`visitorParkingRules-${formKey}`}
                style={[styles.input, styles.textArea]}
                value={formData.visitorParkingRules}
                onChangeText={(text) => updateFormData('visitorParkingRules', text)}
                placeholder={isCustomerMode ? "駐車位置や利用時間など、決まりがあればご記入ください" : "入力してください"}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                autoComplete="new-password"
                autoCorrect={false}
              />
            </>
          )}

          {formData.parking === false && (
            <View {...(Platform.OS === 'web' ? { id: 'field-paidParkingConfirmed' } : {})}>
              {isCustomerMode ? (
                <>
                  <Text style={{ marginBottom: 8, color: '#333', lineHeight: 20 }}>
                    当日は近隣のコインパーキングを利用させていただきます。{'\n'}恐れ入りますが、駐車料金は当日実費での精算となります。
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (validationErrors.has('paidParkingConfirmed')) {
                        setValidationErrors(prev => {
                          const newErrors = new Set(prev);
                          newErrors.delete('paidParkingConfirmed');
                          return newErrors;
                        });
                      }
                      updateFormData('paidParkingConfirmed', !formData.paidParkingConfirmed);
                    }}
                    style={[
                      styles.toggleButton,
                      { marginTop: 8 },
                      !formData.paidParkingConfirmed 
                        ? styles.toggleButtonActiveRed 
                        : { backgroundColor: '#999', borderColor: '#999' }
                    ]}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      { color: '#fff' }
                    ]}>
                      上記内容に同意する
                    </Text>
                  </TouchableOpacity>
                  {validationErrors.has('paidParkingConfirmed') && (
                    <Text style={styles.errorMessage}>※上記内容へのご同意をお願いいたします</Text>
                  )}
                </>
              ) : (
              <TouchableOpacity
                onPress={() => updateFormData('paidParkingConfirmed', !formData.paidParkingConfirmed)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={styles.checkboxText}>
                  {formData.paidParkingConfirmed ? '✓ ' : '☐ '}
                  有料駐車場を使用させていただく場合、「当日実費精算で案内済み」
                </Text>
              </TouchableOpacity>
              )}
            </View>
          )}

          <View 
            {...(Platform.OS === 'web' ? { id: 'field-preferredDates' } : {})}
            style={Platform.OS === 'web' && showCalendarPicker !== null ? { 
              zIndex: 99999, 
              position: 'relative' as any,
              ...(Platform.OS === 'web' ? { overflow: 'visible' as any } : {})
            } : {}}
          >
            <Text style={[
              styles.label,
              validationErrors.has('preferredDates') && styles.labelError
            ]}>ご希望日・曜日・時間</Text>
            {validationErrors.has('preferredDates') && (
              <Text style={styles.errorMessage}>※ 少なくとも1つの希望日を入力してください</Text>
            )}
            {formData.preferredDates.map((date, index) => {
            const dateValue = date ? (date.includes(' ') ? new Date(`${date.split(' ')[0]}T${date.split(' ')[1]}`) : new Date(date)) : new Date();
            const isWeb = Platform.OS === 'web';
            const datePart = date.includes(' ') ? date.split(' ')[0] : date || '';
            const timePart = date.includes(' ') ? date.split(' ')[1] : '';
            
            // カレンダー表示用の月を取得（初期値は選択された日付または今日）
            const currentDate = datePart ? new Date(datePart) : new Date();
            const calendarDate = calendarMonth[index] || currentDate;
            const calendarYear = calendarDate.getFullYear();
            const calendarMonthIndex = calendarDate.getMonth();
            const calendarDays = generateCalendarDays(calendarYear, calendarMonthIndex);
            const selectedDate = datePart ? new Date(datePart) : null;
            
            // 希望のラベル
            const preferenceLabels = ['第一希望', '第二希望', '第三希望'];
            
            return (
              <View 
                key={`preferredDate-${index}-${formKey}`} 
                style={[
                  { marginBottom: 16 },
                  Platform.OS === 'web' && showCalendarPicker === index ? { zIndex: 99999, position: 'relative' as any } : {},
                  Platform.OS === 'web' ? { position: 'relative' as any } : {}
                ]}
                {...(Platform.OS === 'web' ? { 'data-date-container-index': index.toString() } : {})}
              >
                {/* 希望ラベル */}
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' }}>
                  {preferenceLabels[index]}
                </Text>
                {isWeb ? (
                  <>
                    {/* 日付・時間フィールド（駐車場ボタンと同じ幅に揃える） */}
                    <View style={styles.buttonGroup}>
                      <View 
                        style={{ 
                          flex: 1, 
                          position: 'relative' as any, 
                          overflow: 'visible' as any, 
                          zIndex: showCalendarPicker === index ? 99999 : 1 
                        }}
                        {...(Platform.OS === 'web' ? { 'data-calendar-picker-index': index.toString() } : {})}
                      >
                      <TextInput
                        style={[styles.input, { flex: 1, paddingRight: 40 }]}
                        value={dateInputText[index] !== undefined ? dateInputText[index] : (datePart ? formatDateForDisplay(datePart) : '')}
                        placeholder="年 / 月 / 日"
                        placeholderTextColor="#999"
                        autoComplete="off"
                        autoCorrect={false}
                        editable={true}
                        onChangeText={(text) => {
                          // 入力中のテキストを一時的に保持
                          setDateInputText({ ...dateInputText, [index]: text });
                          
                          // 入力されたテキストを正規化
                          const normalizedDate = normalizeDateInput(text);
                          if (normalizedDate) {
                            // 正しい形式の日付の場合のみ更新
                          const updated = [...formData.preferredDates];
                          const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                            updated[index] = currentTimePart ? `${normalizedDate} ${currentTimePart}` : normalizedDate;
                          updateFormData('preferredDates', updated);
                            
                            // カレンダーの表示月も更新
                            const selectedDate = new Date(normalizedDate);
                            setCalendarMonth({ ...calendarMonth, [index]: selectedDate });
                            
                            // 正規化された日付を表示用テキストとして設定
                            setDateInputText({ ...dateInputText, [index]: formatDateForDisplay(normalizedDate) });
                          } else if (text === '') {
                            // 空文字の場合は日付部分をクリア
                                    const updated = [...formData.preferredDates];
                                    const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                            updated[index] = currentTimePart || '';
                                    updateFormData('preferredDates', updated);
                            setDateInputText({ ...dateInputText, [index]: '' });
                          }
                          // 無効な形式の場合は入力は許可するが、保存はしない
                        }}
                        onBlur={() => {
                          // フォーカスが外れたときに、入力されたテキストを再検証
                          const currentText = dateInputText[index] || '';
                          if (currentText && currentText.trim() !== '') {
                            const normalizedDate = normalizeDateInput(currentText);
                            if (normalizedDate) {
                              const updated = [...formData.preferredDates];
                              const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                              updated[index] = currentTimePart ? `${normalizedDate} ${currentTimePart}` : normalizedDate;
                              updateFormData('preferredDates', updated);
                              // 正規化された日付を表示用テキストとして設定
                              setDateInputText({ ...dateInputText, [index]: formatDateForDisplay(normalizedDate) });
                              } else {
                              // 無効な形式の場合は、保存されている日付を表示
                              setDateInputText({ ...dateInputText, [index]: datePart ? formatDateForDisplay(datePart) : '' });
                              }
                                    } else {
                            // 空の場合は、保存されている日付を表示
                            setDateInputText({ ...dateInputText, [index]: datePart ? formatDateForDisplay(datePart) : '' });
                          }
                        }}
                        onFocus={() => {
                          // フォーカスが当たったときに、現在の日付を表示用テキストとして設定
                          if (!dateInputText[index] && datePart) {
                            setDateInputText({ ...dateInputText, [index]: formatDateForDisplay(datePart) });
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.calendarPickerButton, { 
                          position: 'absolute',
                          right: 8,
                          top: 0,
                          bottom: 0,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: 'transparent',
                          zIndex: 10,
                        }]}
                        onPress={() => {
                          setShowCalendarPicker(showCalendarPicker === index ? null : index);
                          if (!calendarMonth[index]) {
                            const initialDate = datePart ? new Date(datePart) : new Date();
                            setCalendarMonth({ ...calendarMonth, [index]: initialDate });
                          }
                        }}
                      >
                        <Text style={styles.calendarPickerButtonText}>📅</Text>
                      </TouchableOpacity>
                      {showCalendarPicker === index && (
                        <View 
                          style={[
                            styles.calendarDropdown,
                            { zIndex: 99999 }
                          ]}
                          {...(Platform.OS === 'web' ? { 'data-calendar-picker-index': index.toString() } : {})}
                        >
                          <View style={styles.calendarHeader}>
                            <TouchableOpacity
                              onPress={() => {
                                const newDate = new Date(calendarDate);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setCalendarMonth({ ...calendarMonth, [index]: newDate });
                              }}
                              style={styles.calendarNavButton}
                            >
                              <Text style={styles.calendarNavArrow}>↑</Text>
                            </TouchableOpacity>
                            <Text style={styles.calendarMonthYear}>
                              {calendarYear}年(令和{getReiwaYear(calendarYear)}年){calendarMonthIndex + 1}月
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newDate = new Date(calendarDate);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setCalendarMonth({ ...calendarMonth, [index]: newDate });
                              }}
                              style={styles.calendarNavButton}
                            >
                              <Text style={styles.calendarNavArrow}>↓</Text>
                      </TouchableOpacity>
                    </View>
                          <View style={styles.calendarWeekDays}>
                            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                              <Text key={i} style={styles.calendarWeekDay}>{day}</Text>
                            ))}
                          </View>
                          <View style={styles.calendarGrid}>
                            {calendarDays.map((day, dayIndex) => {
                              if (!day) return <View key={dayIndex} style={styles.calendarDay} />;
                              const isCurrentMonth = day.getMonth() === calendarMonthIndex;
                              const isSelected = selectedDate && 
                                day.getDate() === selectedDate.getDate() &&
                                day.getMonth() === selectedDate.getMonth() &&
                                day.getFullYear() === selectedDate.getFullYear();
                              const isToday = day.toDateString() === new Date().toDateString();
                              
                              return (
                                <TouchableOpacity
                                  key={dayIndex}
                                  style={[
                                    styles.calendarDay,
                                    isSelected && styles.calendarDaySelected,
                                    !isCurrentMonth && styles.calendarDayOtherMonth
                                  ]}
                                  onPress={() => {
                                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                    const updated = [...formData.preferredDates];
                                    const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                                    updated[index] = currentTimePart ? `${dateStr} ${currentTimePart}` : dateStr;
                                    updateFormData('preferredDates', updated);
                                    // カレンダーで選択した日付を表示用テキストとして設定
                                    setDateInputText({ ...dateInputText, [index]: formatDateForDisplay(dateStr) });
                                    setShowCalendarPicker(null);
                                  }}
                                >
                                  <Text style={[
                                    styles.calendarDayText,
                                    isSelected && styles.calendarDayTextSelected,
                                    !isCurrentMonth && styles.calendarDayTextOtherMonth,
                                    isToday && !isSelected && styles.calendarDayTextToday
                                  ]}>
                                    {day.getDate()}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <View style={styles.calendarFooter}>
                            <TouchableOpacity
                              style={styles.calendarFooterButton}
                              onPress={() => {
                                const updated = [...formData.preferredDates];
                                const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                                updated[index] = currentTimePart || '';
                                updateFormData('preferredDates', updated);
                                // 削除ボタンを押したときは入力テキストもクリア
                                setDateInputText({ ...dateInputText, [index]: '' });
                                setShowCalendarPicker(null);
                              }}
                            >
                              <Text style={styles.calendarFooterButtonText}>削除</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.calendarFooterButton}
                              onPress={() => {
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                const updated = [...formData.preferredDates];
                                const currentTimePart = updated[index].includes(' ') ? updated[index].split(' ')[1] : '';
                                updated[index] = currentTimePart ? `${dateStr} ${currentTimePart}` : dateStr;
                                updateFormData('preferredDates', updated);
                                // 今日ボタンを押したときは入力テキストも更新
                                setDateInputText({ ...dateInputText, [index]: formatDateForDisplay(dateStr) });
                                setShowCalendarPicker(null);
                              }}
                            >
                              <Text style={styles.calendarFooterButtonText}>今日</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                      {/* 時間フィールド（駐車場ボタンと同じflex: 1） */}
                      <View 
                        style={{ flex: 1 }}
                        {...(Platform.OS === 'web' ? { 'data-time-field-index': index.toString() } : {})}
                      >
                        <View style={[styles.input, styles.pickerContainer]}>
                          <Picker
                            selectedValue={timePart || ''}
                            onValueChange={(value) => {
                        const updated = [...formData.preferredDates];
                        const currentDatePart = updated[index].includes(' ') ? updated[index].split(' ')[0] : new Date().toISOString().split('T')[0];
                              updated[index] = value ? `${currentDatePart} ${value}` : currentDatePart;
                        updateFormData('preferredDates', updated);
                      }}
                            style={styles.picker}
                          >
                            <Picker.Item label="時間を選択" value="" />
                            {timeOptions.map((time) => (
                              <Picker.Item key={time} label={time} value={time} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>
                    {/* 空き状況の表示（フィールドの下に左揃え） */}
                    {formData.preferredDatesAvailability[index] && (
                      <View style={[
                        styles.availabilityBadge,
                        formData.preferredDatesAvailability[index] === '確定' && styles.availabilityBadgeAvailable,
                        {
                          marginTop: 4,
                          alignSelf: 'flex-start',
                        }
                      ]}>
                        <Text 
                          style={[
                            styles.availabilityText,
                            formData.preferredDatesAvailability[index] === '確定' && styles.availabilityTextAvailable
                          ]}
                          numberOfLines={1}
                        >
                          {isCustomerMode && formData.preferredDatesAvailability[index] === 'スタッフが随時対応' 
                            ? '日程調整後、スタッフよりご連絡差し上げます。' 
                            : formData.preferredDatesAvailability[index]}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {/* モバイル版: 日付・時間フィールドを横並びに */}
                    <View style={styles.buttonGroup}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                      value={date || ''}
                      onChangeText={(text) => {
                        const updated = [...formData.preferredDates];
                        updated[index] = text;
                        updateFormData('preferredDates', updated);
                      }}
                        placeholder="日付"
                      autoComplete="new-password"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={[styles.toggleButton, { flex: 0.5 }]}
                      onPress={() => setShowDatePicker(index)}
                    >
                        <Text style={styles.toggleButtonText}>📅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, { flex: 0.5 }]}
                      onPress={() => setShowTimePicker(index)}
                    >
                        <Text style={styles.toggleButtonText}>🕐</Text>
                    </TouchableOpacity>
                    </View>
                    {showDatePicker === index && (
                      <DateTimePicker
                        value={dateValue}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(null);
                          if (selectedDate) {
                            const dateStr = selectedDate.toISOString().split('T')[0];
                            const updated = [...formData.preferredDates];
                            updated[index] = timePart ? `${dateStr} ${timePart}` : dateStr;
                            updateFormData('preferredDates', updated);
                          }
                        }}
                      />
                    )}
                    {showTimePicker === index && (
                      <DateTimePicker
                        value={dateValue}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowTimePicker(null);
                          if (selectedTime) {
                            const timeStr = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
                            const updated = [...formData.preferredDates];
                            const currentDatePart = updated[index].includes(' ') ? updated[index].split(' ')[0] : new Date().toISOString().split('T')[0];
                            updated[index] = `${currentDatePart} ${timeStr}`;
                            updateFormData('preferredDates', updated);
                          }
                        }}
                      />
                    )}
                    {/* モバイル版: 空き状況の表示 */}
                {formData.preferredDatesAvailability[index] && (
                  <View style={[
                    styles.availabilityBadge,
                        formData.preferredDatesAvailability[index] === '確定' && styles.availabilityBadgeAvailable,
                        { marginTop: 4, alignSelf: 'flex-start' }
                  ]}>
                        <Text 
                          style={[
                      styles.availabilityText,
                      formData.preferredDatesAvailability[index] === '確定' && styles.availabilityTextAvailable
                          ]}
                          numberOfLines={1}
                        >
                          {isCustomerMode && formData.preferredDatesAvailability[index] === 'スタッフが随時対応' 
                            ? '日程調整後、スタッフよりご連絡差し上げます。' 
                            : formData.preferredDatesAvailability[index]}
                    </Text>
                  </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
          </View>

          <Text style={styles.label}>備考</Text>
          <TextInput
            key={`notes-${formKey}`}
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => updateFormData('notes', text)}
            placeholder="その他のご要望など"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            autoComplete="new-password"
            autoCorrect={false}
          />

          {/* お客様モードではその他追加料金を非表示 */}
          {!isCustomerMode && (
            <>
              <Text style={styles.label}>その他追加料金</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TextInput
                  key={`additionalCharge-${formKey}`}
                  style={[styles.input, { flex: 1, marginBottom: 0, textAlign: 'right' }]}
                  value={formData.additionalCharge > 0 ? formData.additionalCharge.toString() : ''}
                  onChangeText={(text) => {
                    // 全角数字を半角数字に変換
                    const convertedText = text.replace(/[０-９]/g, (s) => {
                      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                    });
                    const num = parseInt(convertedText);
                    updateFormData('additionalCharge', isNaN(num) ? 0 : num);
                  }}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  autoComplete="off"
                  autoCorrect={false}
                />
                <Text style={{ fontSize: 16, color: '#333', marginLeft: 8 }}>円</Text>
              </View>
            </>
          )}

          <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>
            ※22,000円以上で10%オフ
          </Text>
          <Text style={styles.labelRed}>セット割</Text>
          <TextInput
            key={`setDiscount-${formKey}`}
            style={[styles.input, styles.amountInput]}
            value={formData.setDiscount && formData.setDiscount !== '-' ? `-${parseInt(formData.setDiscount).toLocaleString()}円` : '0円'}
            editable={false}
            placeholder="0円"
            autoComplete="off"
            autoCorrect={false}
          />

          <Text style={styles.labelRed}>合計金額(税込)</Text>
          <TextInput
            key={`totalAmount-${formKey}`}
            style={[styles.input, styles.amountInput]}
            value={formData.totalAmount ? `${parseInt(formData.totalAmount).toLocaleString()}円` : '0円'}
            editable={false}
            placeholder="0円"
            autoComplete="off"
            autoCorrect={false}
          />
        </View>

        <View {...(Platform.OS === 'web' ? { id: 'field-cancellationPolicyConfirmed' } : {})}>
          <TouchableOpacity
            style={[
              styles.cancellationPolicyButton,
              formData.cancellationPolicyConfirmed && styles.cancellationPolicyButtonActive,
              validationErrors.has('cancellationPolicyConfirmed') && styles.cancellationPolicyButtonError
            ]}
            onPress={() => {
              if (validationErrors.has('cancellationPolicyConfirmed')) {
                setValidationErrors(prev => {
                  const newErrors = new Set(prev);
                  newErrors.delete('cancellationPolicyConfirmed');
                  return newErrors;
                });
              }
              updateFormData('cancellationPolicyConfirmed', !formData.cancellationPolicyConfirmed);
            }}
          >
            <Text style={[
              styles.cancellationPolicyButtonText,
              formData.cancellationPolicyConfirmed && styles.cancellationPolicyButtonTextActive,
              validationErrors.has('cancellationPolicyConfirmed') && styles.cancellationPolicyButtonTextError
            ]}>
              {isCustomerMode ? 'キャンセルポリシーに同意する' : 'キャンセルポリシーについての説明をしました'}
            </Text>
          </TouchableOpacity>
          {validationErrors.has('cancellationPolicyConfirmed') && (
            <Text style={styles.errorMessage}>{isCustomerMode ? '※キャンセルポリシーへ同意をお願いします' : '※ 必須項目です'}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            確認する
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 確認画面 */}
      {showConfirmation && (
        <View style={styles.confirmationOverlay}>
          <ScrollView style={styles.confirmationContainer} contentContainerStyle={styles.confirmationContent}>
            <Text style={styles.confirmationTitle}>入力内容の確認</Text>
            {/* お客様情報 */}
            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationSectionTitle}>お客様情報</Text>
              {!isCustomerMode && (
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>清掃会社:</Text>
                <Text style={styles.confirmationValue}>{formData.cleaningCompany || '未入力'}</Text>
              </View>
              )}
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>問い合わせ内容:</Text>
                <Text style={styles.confirmationValue}>
                  {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.length > 0
                    ? formData.inquiryType.join('、')
                    : '未選択'}
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>お客様名（漢字）:</Text>
                <Text style={styles.confirmationValue}>{formData.customerName || '未入力'}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>お客様名（フリガナ）:</Text>
                <Text style={styles.confirmationValue}>{formData.customerNameKana || '未入力'}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>郵便番号:</Text>
                <Text style={styles.confirmationValue}>{formData.postalCode || '未入力'}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>住所:</Text>
                <Text style={styles.confirmationValue}>{formData.address || '未入力'}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>連絡先:</Text>
                <Text style={styles.confirmationValue}>{formData.phone || '未入力'}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>メールアドレス:</Text>
                <Text style={styles.confirmationValue}>{formData.email || '未入力'}</Text>
              </View>
            </View>
            {/* エアコン情報 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('エアコン') && (
            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationSectionTitle}>エアコン情報</Text>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>台数:</Text>
                <Text style={styles.confirmationValue}>{formData.numberOfUnits === 0 ? '-' : `${formData.numberOfUnits}台`}</Text>
              </View>
              {formData.airConditioners.map((ac, index) => (
                <View key={index} style={styles.confirmationSubSection}>
                  <Text style={styles.confirmationSubTitle}>{`${index + 1}台目`}</Text>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>エアコン完璧セット:</Text>
                    <Text style={styles.confirmationValue}>
                      {ac.perfectSetType === '一般タイプ' 
                        ? '一般タイプ：室内機+室外機+防カビ抗菌コート+防虫キャップ' 
                        : ac.perfectSetType === 'お掃除機能付きタイプ'
                        ? 'お掃除機能付きタイプ：室内機+室外機+防カビ抗菌コート+防虫キャップ'
                        : '未選択'}
                    </Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>メーカー:</Text>
                    <Text style={styles.confirmationValue}>{ac.maker || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>型番:</Text>
                    <Text style={styles.confirmationValue}>{ac.model || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>エアコンタイプ:</Text>
                    <Text style={styles.confirmationValue}>{ac.type || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>おそうじ機能:</Text>
                    <Text style={styles.confirmationValue}>
                      {ac.hasCleaningFunction === true ? 'あり' : ac.hasCleaningFunction === false ? 'なし' : '未選択'}
                    </Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>オプション:</Text>
                    <Text style={styles.confirmationValue}>{ac.options && ac.options.length > 0 ? ac.options.join(', ') : 'なし'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>高さ:</Text>
                    <Text style={styles.confirmationValue}>{ac.height || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>設置状況:</Text>
                    <Text style={styles.confirmationValue}>{ac.installation || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>無料ワンモアサービス:</Text>
                    <Text style={styles.confirmationValue}>{ac.freeOneMoreService || '未入力'}</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>オプション等:</Text>
                    <Text style={styles.confirmationValue}>{ac.optionsEtc || '未入力'}</Text>
                  </View>
                </View>
              ))}
            </View>
            )}

            {/* 排水管洗浄 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('排水管洗浄') && formData.cleaningCompany === 'アイソウジ' && (
            <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>排水管洗浄</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>つまり症状のご依頼:</Text>
                  <Text style={styles.confirmationValue}>{formData.cloggingSymptom ? 'あり' : 'なし'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>建物タイプ:</Text>
                  <Text style={styles.confirmationValue}>{formData.buildingType || '未入力'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業箇所:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.workLocation && formData.workLocation.length > 0
                      ? formData.workLocation.join('、')
                      : '未選択'}
                  </Text>
                </View>
                </View>
              )}

            {/* 風呂釜洗浄 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('風呂釜洗浄') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>風呂釜洗浄</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.bathtubCleaningWork || '未入力'}</Text>
                </View>
              </View>
            )}

            {/* 洗濯機分解洗浄 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('洗濯機分解洗浄') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>洗濯機分解洗浄</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>洗濯機の種類:</Text>
                  <Text style={styles.confirmationValue}>{formData.washingMachineType || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>乾燥機能:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.washingMachineDryingFunction === true ? 'あり' : formData.washingMachineDryingFunction === false ? 'なし' : '未選択'}
                  </Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>オプション:</Text>
                  <Text style={styles.confirmationValue}>{formData.washingMachineCleaningOption || '未選択'}</Text>
                </View>
              </View>
            )}

            {/* 水回りセット */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('水回りセット') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>水回りセット</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>水回りセット:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.waterAreaSet && formData.waterAreaSet.length > 0
                      ? formData.waterAreaSet.join('、')
                      : '未選択'}
                  </Text>
                </View>
              </View>
            )}

            {/* 浴室 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('浴室') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>浴室</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>浴室完璧セット:</Text>
                  <Text style={styles.confirmationValue}>{formData.bathroomPerfectSet || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>浴室タイプ:</Text>
                  <Text style={styles.confirmationValue}>{formData.bathroomWork || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>オプション:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.bathroomOptions && formData.bathroomOptions.length > 0
                      ? formData.bathroomOptions.join('、')
                      : 'なし'}
                  </Text>
                </View>
              </View>
            )}

            {/* レンジフード */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('レンジフード') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>レンジフード</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>タイプ:</Text>
                  <Text style={styles.confirmationValue}>{formData.rangeHoodType || '未選択'}</Text>
                </View>
              </View>
            )}

            {/* キッチン */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('キッチン') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>キッチン</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.kitchenWork && formData.kitchenWork.length > 0
                      ? formData.kitchenWork.join('、')
                      : '未選択'}
                  </Text>
                </View>
              </View>
            )}

            {/* トイレ */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('トイレ') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>トイレ</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>トイレ完璧セット:</Text>
                  <Text style={styles.confirmationValue}>{formData.toiletPerfectSet ? 'あり' : 'なし'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.toiletWork && formData.toiletWork.length > 0
                      ? formData.toiletWork.join('、')
                      : '未選択'}
                  </Text>
                </View>
              </View>
            )}

            {/* 床 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('床') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>床</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.floorWork || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>面積:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.floorArea > 0 ? `${formData.floorArea}㎡` : '未入力'}
                  </Text>
                </View>
              </View>
            )}

            {/* カーペット */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('カーペット') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>カーペット</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.carpetWork || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>面積:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.carpetArea > 0 ? `${formData.carpetArea}㎡` : '未入力'}
                  </Text>
                </View>
              </View>
            )}

            {/* その他（窓・ベランダ・換気口・照明） */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('その他(窓・ベランダ・換気口・照明)') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>その他（窓・ベランダ・換気口・照明）</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.otherWindowWork && Array.isArray(formData.otherWindowWork) && formData.otherWindowWork.length > 0
                      ? formData.otherWindowWork.join('、')
                      : '未選択'}
                  </Text>
                </View>
                {/* 各項目の数量と面積を表示 */}
                {formData.otherWindowWork && Array.isArray(formData.otherWindowWork) && formData.otherWindowWork.map((item) => {
                  // 固定価格の項目は表示しない
                  if (item === 'ベランダ 10㎡未満' || item === 'ベランダ 10㎡以上、20㎡未満' || item === 'ベランダ 20㎡以上、30㎡未満' || item === '照明器具') {
                    return null;
                  }
                  
                  // 面積が必要な項目
                  if (item === 'ベランダ 30㎡以上 1㎡あたり' || item === 'ベランダ 雨だれ除去') {
                    const area = formData.otherWindowAreas && formData.otherWindowAreas[item] ? formData.otherWindowAreas[item] : 0;
                    return (
                      <View key={item} style={styles.confirmationRow}>
                        <Text style={styles.confirmationLabel}>{item} 面積:</Text>
                        <Text style={styles.confirmationValue}>
                          {area > 0 ? `${area}㎡` : '未入力'}
                        </Text>
                      </View>
                    );
                  }
                  
                  // 数量が必要な項目
                  const quantity = formData.otherWindowQuantities && formData.otherWindowQuantities[item] ? formData.otherWindowQuantities[item] : 0;
                  let unit = '（枚・箇所）';
                  if (item === '窓ガラス・サッシ' || item === 'お部屋の換気口・換気扇') {
                    unit = '箇所';
                  } else if (item === 'シャッター・雨戸(内側のみ)' || item === 'シャッター・雨戸(両面)') {
                    unit = '枚';
                  } else if (item === 'ガラス外面水垢防止コーティング') {
                    unit = '枠';
                  }
                  
                  return (
                    <View key={item} style={styles.confirmationRow}>
                      <Text style={styles.confirmationLabel}>{item} 数量:</Text>
                      <Text style={styles.confirmationValue}>
                        {quantity > 0 ? `${quantity}${unit}` : '未入力'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 空室・引渡し清掃 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('空室・引き渡し清掃') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>空室・引渡し清掃</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.vacantRoomWork || '未選択'}</Text>
                </View>
                {(formData.vacantRoomWork === '徹底清掃-25㎡以上 1㎡あたり' || formData.vacantRoomWork === '簡易清掃-25㎡以上 1㎡あたり') && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>面積:</Text>
                    <Text style={styles.confirmationValue}>
                      {formData.vacantRoomArea > 0 ? `${formData.vacantRoomArea}㎡` : '未入力'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* マットレスクリーニング */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('マットレスクリーニング') && (
            <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>マットレスクリーニング</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>サイズ:</Text>
                  <Text style={styles.confirmationValue}>{formData.mattressSize || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>施工面:</Text>
                  <Text style={styles.confirmationValue}>{formData.mattressSide || '未選択'}</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>オプション:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.mattressOptions && formData.mattressOptions.length > 0
                      ? formData.mattressOptions.join('、')
                      : 'なし'}
                  </Text>
                </View>
                {formData.mattressOptions && formData.mattressOptions.includes('シミ抜き') && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>シミ抜き数量:</Text>
                    <Text style={styles.confirmationValue}>
                      {formData.mattressStainCount > 0 ? `${formData.mattressStainCount}箇所` : '未入力'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 除菌 */}
            {formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('除菌') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>除菌（ULTRA SHIELD）</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>施工タイプ:</Text>
                  <Text style={styles.confirmationValue}>{formData.disinfectionType || '未選択'}</Text>
                </View>
                {formData.disinfectionType === '一戸建て・マンション' && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>広さ:</Text>
                    <Text style={styles.confirmationValue}>{formData.disinfectionHouseSize || '未選択'}</Text>
                  </View>
                )}
                {formData.disinfectionType === '事務所・店舗' && (
                  <View style={styles.confirmationRow}>
                    <Text style={styles.confirmationLabel}>面積:</Text>
                    <Text style={styles.confirmationValue}>
                      {formData.disinfectionOfficeArea > 0 ? `${formData.disinfectionOfficeArea}㎡` : '未入力'}
                    </Text>
                  </View>
                )}
                {formData.disinfectionType === '車両' && (
                <>
                  <View style={styles.confirmationRow}>
                      <Text style={styles.confirmationLabel}>台数:</Text>
                      <Text style={styles.confirmationValue}>{formData.disinfectionVehicleCount || 1}台</Text>
                  </View>
                  <View style={styles.confirmationRow}>
                      <Text style={styles.confirmationLabel}>車両タイプ:</Text>
                      <Text style={styles.confirmationValue}>{formData.disinfectionVehicleType || '未選択'}</Text>
                  </View>
                </>
              )}
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>オプション:</Text>
                  <Text style={styles.confirmationValue}>
                    {formData.disinfectionOptions && formData.disinfectionOptions.length > 0
                      ? formData.disinfectionOptions.join('、')
                      : 'なし'}
                  </Text>
                </View>
              </View>
            )}

            {/* 水回り（ベネフィットで問い合わせ内容に「水回り」が選択されている場合） */}
            {formData.cleaningCompany === 'ベネフィット' && formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('水回り') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>水回り</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>作業内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.waterArea || '未選択'}</Text>
                </View>
              </View>
            )}

            {/* 排水管（ベネフィットで問い合わせ内容に「排水管」が選択されている場合） */}
            {formData.cleaningCompany === 'ベネフィット' && formData.inquiryType && Array.isArray(formData.inquiryType) && formData.inquiryType.includes('排水管') && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationSectionTitle}>排水管</Text>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>セット内容:</Text>
                  <Text style={styles.confirmationValue}>{formData.drainPipe || '未選択'}</Text>
                </View>
              </View>
            )}

            {/* その他 */}
            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationSectionTitle}>その他</Text>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>駐車場の有無:</Text>
                <Text style={styles.confirmationValue}>
                  {formData.parking === null ? '未選択' : formData.parking ? 'あり' : 'なし'}
                </Text>
              </View>
              {formData.parking === true && formData.visitorParkingRules && (
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{isCustomerMode ? '駐車場を利用させていただく場合のルール:' : '来客用の場合のルール:'}</Text>
                  <Text style={styles.confirmationValue}>{formData.visitorParkingRules}</Text>
                </View>
              )}
              {formData.parking === false && (
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>{isCustomerMode ? '駐車料金について:' : '有料駐車場確認:'}</Text>
                  <Text style={styles.confirmationValue}>{formData.paidParkingConfirmed ? '同意済み' : '未確認'}</Text>
                </View>
              )}
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>ご希望日・曜日・時間:</Text>
                <Text style={styles.confirmationValue}>
                  {formData.preferredDates.filter(d => d).length > 0 
                    ? formData.preferredDates.map((d, i) => {
                        const labels = ['第一希望', '第二希望', '第三希望'];
                        if (!d) return null;
                        const availability = formData.preferredDatesAvailability[i];
                        const displayAvailability = isCustomerMode && availability === 'スタッフが随時対応' 
                          ? '日程調整後、スタッフよりご連絡差し上げます。' 
                          : availability;
                        return `${labels[i]}: ${d}${displayAvailability ? ` (${displayAvailability})` : ''}`;
                      }).filter(Boolean).join('\n')
                    : '未入力'}
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>備考:</Text>
                <Text style={styles.confirmationValue}>{formData.notes || '未入力'}</Text>
              </View>
            </View>
            {/* 料金情報 */}
            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationSectionTitle}>料金</Text>
              {!isCustomerMode && formData.additionalCharge > 0 && (
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>その他追加料金:</Text>
                  <Text style={styles.confirmationValue}>{formData.additionalCharge.toLocaleString()}円</Text>
                </View>
              )}
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>セット割:</Text>
                <Text style={styles.confirmationValue}>{formData.setDiscount === '-' || formData.setDiscount === '0' ? '-' : `-${parseInt(formData.setDiscount).toLocaleString()}円`}</Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={[styles.confirmationLabel, styles.confirmationLabelRed]}>合計金額(税込):</Text>
                <Text style={[styles.confirmationValue, styles.confirmationValueRed]}>
                  {parseInt(formData.totalAmount) > 0 ? `${parseInt(formData.totalAmount).toLocaleString()}円` : '0円'}
                </Text>
              </View>
            </View>
            {/* ボタン */}
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmationButtonCancel]}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.confirmationButtonText}>戻る</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmationButtonSubmit, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmationButtonText}>
                  {isSubmitting ? '送信中...' : '送信する'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  // Web版ではSafeAreaProviderを使わない
  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <SafeAreaProvider>
      {content}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  sectionGreen: {
    backgroundColor: '#E8F5E9', // パステルグリーン
  },
  sectionGreenAlt: {
    backgroundColor: '#C8E6C9', // 黄緑
  },
  sectionYellow: {
    backgroundColor: '#FFF9C4', // パステルイエロー
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#555',
  },
  labelRed: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#f44336',
  },
  amountInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modelInputWrapper: {
    position: 'relative' as const,
    zIndex: 1000,
    backgroundColor: '#FFF9C4', // 型番フィールド用パステルイエロー
    borderRadius: 6,
  },
  modelInput: {
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    ...(Platform.OS === 'web' ? {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 6,
      backgroundColor: '#fff',
    } : {}),
  },
  picker: {
    ...(Platform.OS === 'web' ? {
      height: 40,
    } : {}),
  },
  acCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  acTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#f44336',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  checkbox: {
    padding: 12,
    backgroundColor: '#FFF9C4', // パステルイエロー
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleButtonActiveRed: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#333',
  },
  toggleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      position: 'relative' as any,
    } : {}),
  },
  datePickerButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarPickerButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 0,
    minWidth: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  calendarPickerButtonText: {
    fontSize: 20,
    color: '#333',
  },
  calendarDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 99999,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 10,
    }),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    minWidth: 300,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calendarNavButton: {
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  calendarNavArrow: {
    fontSize: 16,
    color: '#666',
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarDayTextOtherMonth: {
    color: '#999',
  },
  calendarDayTextToday: {
    fontWeight: '600',
    color: '#2196F3',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  calendarFooterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
    alignItems: 'center',
  },
  calendarFooterButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancellationPolicyButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  cancellationPolicyButtonActive: {
    backgroundColor: '#999',
  },
  cancellationPolicyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancellationPolicyButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  availabilityBadge: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
    alignSelf: 'flex-start',
  },
  availabilityBadgeAvailable: {
    backgroundColor: '#e8f5e9',
  },
  availabilityText: {
    fontSize: 14,
    color: '#c62828',
    fontWeight: '600',
  },
  availabilityTextAvailable: {
    color: '#2e7d32',
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
    } : {}),
  },
  confirmationContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      maxWidth: 800,
      marginHorizontal: 'auto',
      marginVertical: 20,
      maxHeight: '90vh',
    } : {}),
  },
  confirmationContent: {
    padding: 20,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  confirmationSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  confirmationSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 8,
  },
  confirmationSubSection: {
    marginTop: 12,
    marginLeft: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  confirmationSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  confirmationRow: {
    flexDirection: 'row',
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      flexWrap: 'wrap',
    } : {}),
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 120,
    marginRight: 8,
  },
  confirmationValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  confirmationLabelRed: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  confirmationValueRed: {
    color: '#f44336',
    fontWeight: 'bold',
    fontSize: 18,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationButtonCancel: {
    backgroundColor: '#999',
  },
  confirmationButtonSubmit: {
    backgroundColor: '#2196F3',
  },
  confirmationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  labelError: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  cancellationPolicyButtonError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  cancellationPolicyButtonTextError: {
    color: '#fff',
  },
  errorMessage: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  buttonGroupError: {
    borderWidth: 2,
    borderColor: '#f44336',
    borderRadius: 8,
    padding: 4,
  },
  suggestionContainer: {
    ...(Platform.OS === 'web' ? {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      zIndex: 1000,
    } : {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
    }),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    maxHeight: 200,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
      overflowY: 'auto' as const,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 200,
    zIndex: 10000,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
      position: 'absolute',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 10,
    }),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  aiSummaryContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  aiSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  aiSummaryContent: {
    gap: 6,
  },
  aiSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginRight: 8,
    minWidth: 100,
  },
  aiSummaryValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  aiSummaryText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  googleSearchButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  googleSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
