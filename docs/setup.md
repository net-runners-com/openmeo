# OpenMEO セットアップ

自分の Cloudflare アカウント（無料枠）で 1 店舗〜複数店舗を運用する手順。

## 前提

- Node.js 20+ / npm
- Cloudflare アカウント（Workers 無料枠で可）
- AI キー: [Groq](https://console.groq.com)（無料・クレカ不要）または Gemini
- 通知先: LINE 公式アカウント（Messaging API）/ WhatsApp Business Cloud / Telegram Bot のいずれか

## 1. クローンと依存

```bash
git clone https://github.com/net-runners-com/openmeo
cd openmeo
npm install
```

## 2. シークレット

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を編集（最低限 `GROQ_API_KEY` と `ADMIN_KEY`）。各項目の説明はファイル内コメント参照。
本番へは `npx wrangler secret put <NAME>` で同名のシークレットを登録する。

## 3. ストレージ

```bash
npx wrangler kv namespace create STORES
```

出力された id を `wrangler.toml` の `[[kv_namespaces]]` に反映。

## 4. 起動・テスト・デプロイ

```bash
npm run dev      # http://localhost:8787
npm test         # node --test（158 テスト）
npm run deploy   # 自分の Cloudflare アカウントへ
```

## 5. 店舗登録

管理 UI（`/admin`、`ADMIN_KEY` で認証）から登録するか、スクリプトで:

```bash
node scripts/setup-store.mjs        # 店舗レコード作成
node scripts/setup-gbp-oauth.mjs    # GBP OAuth（審査完了後）
node scripts/setup-telegram.mjs     # Telegram 通知を使う場合
```

## GBP API 審査前の運用（Gmail ブリッジ）

GBP API の審査が通るまでは、Google からの「新しいクチコミ」通知メールを Gmail API で監視して取り込めます。
`.dev.vars` の `GMAIL_REFRESH_TOKEN` を設定し、`node scripts/check-review-emails.mjs` で疎通確認。

## 通知チャネル

- **LINE**: Messaging API のチャネルを作成し、店舗レコードに channel token を設定。承認フロー（承認/編集/却下）は LINE Flex Message 上で完結
- **WhatsApp**: Meta の Business Cloud API（`.dev.vars` の `WHATSAPP_*`）
- **Telegram**: `scripts/setup-telegram.mjs` が対話式で設定

## トラブルシュート

- `npm test` は外部 API を呼ばない（全モック）。落ちる場合は Node 20+ か確認
- Worker のログ: `npx wrangler tail`
