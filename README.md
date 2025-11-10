# PromotionScreen

サイネージ表示（iPhone Safari想定）と、画像アップロード/審査（OK/NG）を行うワークフローを、GitHub Pages + Google Apps Script(GAS) + Google Drive + Slack で構築したプロジェクトです。

- フロントエンド: GitHub Pages（`public/index.html`, `public/upload.html`）
- バックエンド: Google Apps Script（`Code.gs`）
- 設定: GAS 側は `Code.gs` の先頭で定義（Script Properties から値を取得）、フロント側は `public/assets/js/config.js`
- 画像保管: Google Drive（INBOX/OK/NG フォルダ）
- 審査通知/操作: Slack（画像投稿 + OK/NG ボタン、NG理由モーダル、監査ログ）
- メール通知: 審査結果を投稿者にメール送信（メールアドレスが登録されている場合）

## 構成

```
PromotionScreen/
  ├─ Code.gs                   # GAS 本体（設定定義、アップロード/審査API、Slack連携、サイネージAPI、メール送信）
  ├─ appsscript.json           # GAS マニフェスト
  ├─ public/
  │   ├─ index.html            # サイネージ表示ページ
  │   ├─ upload.html           # 画像アップロードページ
  │   └─ assets/
  │       ├─ js/
  │       │   ├─ config.js     # フロント用設定（GAS URL など）
  │       │   └─ main.js       # アップロードフォーム処理
  │       ├─ css/style.css
  │       └─ img/
  │           ├─ logo.svg
  │           └─ upload-icon.svg
  ├─ index.html                # GitHub Pages ルート用リダイレクト
  └─ upload.html               # GitHub Pages ルート用リダイレクト
```

## 事前準備

### 1) Google Drive フォルダ
- 画像格納用に 3 フォルダを用意します。
  - INBOX（アップロード直後の置き場）
  - OK（承認済みの公開フォルダ：サイネージはここを参照）
  - NG（非承認の保管フォルダ）
- それぞれのフォルダIDを控えます。

### 2) Slack App
- Bot Token（`SLACK_BOT_TOKEN`）と Signing Secret（`SLACK_SIGNING_SECRET`）を取得
- Bot Scopes の目安
  - `chat:write`（メッセージ投稿）
  - `files:write`（ファイルアップロード v2/External）
- Interactivity を有効化して、Request URL を GAS の Web アプリ URL（`doPost`）に設定
- 通知先のチャンネルID（`SLACK_CHANNEL_ID`）を控える

### 3) GAS（Google Apps Script）
- このプロジェクトの `Code.gs` を使って Web アプリを作成
- デプロイ → 新しいデプロイ → 種類: Web アプリ
- 誰にアクセスを許可するかは要件に合わせて設定（一般公開でサイネージを使う場合は匿名アクセスを想定）
- デプロイ後の URL を控えます（サイネージ用 API のベースURL）

## 設定

### GAS 側: Script Properties（Code.gs の先頭で定義・参照）
- 必須
  - `INBOX_FOLDER_ID`: INBOX フォルダID
  - `OK_FOLDER_ID`: OK フォルダID
  - `NG_FOLDER_ID`: NG フォルダID
- 任意（Slack 連携する場合は必須）
  - `SLACK_BOT_TOKEN`: Slack Bot Token
  - `SLACK_SIGNING_SECRET`: Slack Signing Secret
  - `SLACK_CHANNEL_ID`: 投稿チャンネルID
- 任意（その他）
  - `SIGNAGE_FOLDER_ID`: サイネージ参照用フォルダID（未設定なら `OK_FOLDER_ID` を使用）
  - `SHARED_SECRET`: サイネージAPI署名用キー（未設定時は `TEMP_SECRET`）
  - `AUDIT_SHEET_ID`: 監査ログ記録用スプレッドシートID
  - `DEBUG_SHEET_ID`: デバッグログ用スプレッドシートID
  - `DEBUG_MODE`: `true` のとき、紙ログ（`paperLog`）をスプレッドシートにも出力

Code.gs には検証関数 `validateConfig()` も用意しています。必要に応じて呼び出して不足設定を検知できます。

### フロント側: `public/assets/js/config.js`
- `API_BASE`: GAS Web アプリの実行URL（例: `https://script.google.com/macros/s/xxx/exec`）
- `SLIDE_MS`: 1枚の表示時間（ms）
- `FADE_MS`: フェード時間（ms）
- `HALF_LIFE_HOURS`: 新しさの重み半減期（時間）
- `SHUFFLE_BATCH`: 抽選母集団の上限枚数

## 機能概要

### アップロード（POST）
- エンドポイント: `doPost`
- 期待するJSONボディ（例）
  - `photoBase64`: 画像のBase64（ヘッダ無し）
  - `mimeType`: 画像のMIMEタイプ（例: `image/jpeg`）
  - `filename`: 元ファイル名
  - `timestamp`: ISO8601 文字列（任意）
  - `comment`: 審査者へのメッセージ（任意）
  - `email`: メールアドレス（任意、審査結果の通知先）
- 動作
  - INBOX へ保存（メールアドレスがある場合はメタデータに保存） → Slack に画像 + ボタン投稿

### 審査（Slack）
- 画像投稿後、ボタン投稿（OK/NG）
- OK: Drive の OK フォルダへ移動、スレッド/メッセージ更新、監査ログ、メール送信（メールアドレスがある場合）
- NG: モーダルで理由入力 → Drive の NG フォルダへ移動、スレッド/メッセージ更新、監査ログ、メール送信（メールアドレスがある場合）
  - NG理由をメールに含めるかどうかをチェックボックスで選択可能（デフォルト: 含めない）
  - チェックがついていない場合、NG理由は監査ログにのみ記録され、メールには含まれない

### メール通知
- アップロード時にメールアドレスが登録されている場合、審査結果（OK/NG）を自動的にメール送信
- OKの場合: 承認通知メールを送信
- NGの場合: 非承認通知メールを送信
  - NG理由をメールに含めるかどうかは、SlackのNG処理時にチェックボックスで選択可能
  - チェックがついていない場合、NG理由は監査ログにのみ記録され、メールには含まれない
- メール送信の詳細ログは `paperLog` で記録される

### サイネージ API（GET）
- `?fn=list`: 表示候補の一覧（新しい順）、各アイテムに期限付き署名URL（`img64`用）を付与
- `?fn=img64&id=...&exp=...&sig=...`: Base64 を JSON で返却（`{ mime, data }`）
- `?fn=image&id=...&exp=...&sig=...`: バイナリ返却（必要な場合）

CORS は `CONFIG.signageAllowOrigin`（デフォルト `*`）で許可。署名は `SHARED_SECRET` を用いた HMAC による簡易署名を使用しています。

## デプロイ

### GitHub Pages
- ブランチ: `gh-pages`
- 反映手順（本リポジトリの運用）
  1. `main` に変更をコミット
  2. `gh-pages` にチェックアウト
  3. `git checkout main -- public/ index.html upload.html`（必要ファイルを取り込み）
  4. `public/` の内容をルートに移動: `cp -r public/* . && rm -rf public`
  5. コミットして `git push origin gh-pages`

GitHub Pages の設定（Settings → Pages）で `gh-pages` ブランチを公開対象にし、**ソースを `/` (root)** に設定します。

### GAS（Apps Script）
- `clasp` を使う場合は、`clasp push` → デプロイの更新
- デプロイ後の Web アプリ URL を `public/assets/js/config.js` の `API_BASE` に設定

## ログ/デバッグ
- `paperLog(...)` でログ出力
  - 常に Apps Script の実行ログには出力
  - `DEBUG_MODE=true` のときのみスプレッドシートにも追記（`DEBUG_SHEET_ID`）
- 監査ログ: `AUDIT_SHEET_ID` を設定すると OK/NG のアクションを「監査ログ」シートに記録

## よくある設定項目変更
- サイネージの表示フォルダを変えたい → `SIGNAGE_FOLDER_ID`（未設定時は `OK_FOLDER_ID` を参照）
- GAS URL を変えたい → `public/assets/js/config.js` の `API_BASE` を更新
- スライドの速度/演出を調整 → `SLIDE_MS`, `FADE_MS`, `HALF_LIFE_HOURS`, `SHUFFLE_BATCH`

## ライセンス
- 本リポジトリのライセンスは、プロジェクト要件に応じて設定してください（未指定）。
