# MCP Registry Viewer

Model Context Protocol (MCP) のサーバーレジストリを閲覧するための、軽量なシングルページ・ビューアです。UI は静的ファイルだけで動作し、レジストリのデータは「ビルド時」に取得して `data/` に保存します。実行時は `data/` を読み込むだけなので、GitHub Pages などの静的ホスティングでもプロキシ不要で運用できます。

## 特長

- 静的 HTML + バニラ JS（ダーク/ライト切替、ローカルフィルター、無限スクロール、詳細モーダル）
- ビルド時にデータ取得（実行時の CORS/プロキシ対策が不要）
- `data/manifest.json` と `data/page-*.json` による分割保存
- GitHub Actions による定期更新ワークフローを同梱（任意）

## プロジェクト構成

```
.
├─ index.html                 # UI（./data から読み込み）
├─ scripts/
│  └─ fetch-registry.mjs      # ビルド時に全ページを取得して ./data に保存
├─ data/                      # 生成された JSON（Pages で配信するためコミット対象）
├─ package.json               # npm scripts
└─ .github/workflows/refresh.yml（任意） # データ定期更新用ワークフロー
```

## 前提

- Node.js 20 以上（Node のネイティブ `fetch` を使用）

## データ生成（プロキシ不要）

レジストリの全ページを取得し、`data/` に分割保存します。

```bash
npm run build:data
```

生成物の例:

- `data/manifest.json` – ページ数、ページサイズ、件数、ファイル一覧など
- `data/page-1.json`, `data/page-2.json`, ... – 各ページの `servers` 配列

`index.html` は `manifest.json` を読み込み、スクロールに応じて `page-*.json` を順次読み込みます。

## ローカルで使う

1. 上記のデータ生成を実行
2. ローカルサーバで配信（`file://` 直開きは CORS で失敗するため）

   ```bash
   npm run dev
   # → http://localhost:8787 を開く
   ```

   もしくは Python 内蔵サーバでも可:

   ```bash
   python3 -m http.server 8787
   # → http://localhost:8787 を開く
   ```

3. ヘッダーのフィルターで名前/説明/リポジトリ/パッケージを部分一致で絞り込み
4. カードをクリックすると詳細（パッケージ、リモート、環境変数など）を表示

## GitHub Pages への公開

1. リポジトリを GitHub に push
2. 事前に `npm run build:data` を実行し、`data/` をコミット
3. Settings → Pages で公開元を「リポジトリルート」に設定

同一オリジンの `./data` から JSON を読み込むため、ランタイムのプロキシは不要です。

## データの定期更新（任意）

同梱のワークフローで自動更新できます:

- `.github/workflows/refresh.yml` は毎日 03:00 UTC に実行
- `npm run build:data` を実行し、`data/` に差分があればコミット・プッシュ
- 「Run workflow」で手動実行も可能

スケジュールはワークフロー内の cron を変更してください。

## なぜビルド時取得方式なのか

公式レジストリ API は、任意オリジンのブラウザから直接呼び出す用途の CORS ヘッダーを提供していません。ビルド時（Node 実行環境）にデータを取得して静的配信することで、CORS を回避しつつ純粋な静的サイトとして運用できます。

## カスタマイズ

- ページサイズ: `scripts/fetch-registry.mjs` の引数 `--limit`（既定 100、最大 100）
- テーマ: ヘッダーの切替ボタンでダーク/ライト。CSS 変数は `index.html` 冒頭に定義
- フィルター: 名前・説明・リポジトリ URL・パッケージ（識別子/種別）を対象に部分一致

## 注意

- `data/` は GitHub Pages で配信するため、`.gitignore` に入れないでください
- スキーマ変更があっても、`index.html` の表示ロジックを更新すればパイプラインはそのまま使えます

## ライセンス

（未指定）公開・配布する場合は必要に応じてライセンスを追加してください。
