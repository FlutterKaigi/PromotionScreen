/**
 * =========================
 * サイネージ表示設定
 * =========================
 * 
 * このファイルには、サイネージ表示に関する設定が含まれています。
 * 
 * 設定項目の説明:
 * - API_BASE: Google Apps Scriptの実行URL（サイネージAPIのエンドポイント）
 * - SLIDE_MS: 1枚の画像の表示時間（ミリ秒）
 * - FADE_MS: 画像切り替え時のフェード時間（ミリ秒）
 * - HALF_LIFE_HOURS: 新しさ重み付けの半減期（時間）。短いほど新着画像を強く優遇します
 * - SHUFFLE_BATCH: 一度に候補に乗せる枚数（重み抽選の母集団上限）
 */

// ====== 設定 ======
const API_BASE = 'https://script.google.com/macros/s/REPLACE_WITH_GAS_URL/exec'; // ★GASの実行URL
const SLIDE_MS = 30000;   // 1枚の表示時間
const FADE_MS = 2000;   // フェード時間
const HALF_LIFE_HOURS = 6; // 新しさ重み付けの半減期（短いほど新着を強く優遇）
const SHUFFLE_BATCH = 20; // 一度に候補に乗せる枚数（重み抽選の母集団上限）

