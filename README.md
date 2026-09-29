# OpenMEO

> Googleビジネスプロフィール（GBP）の口コミ返信・投稿・分析を **AIで** 回す、完全オープンソースの店舗運用ツール。
> **MEOチェキ等（月3,278円〜）の0円代替。** Cloudflare 無料枠で動き、サーバー代 **0円**。

![OpenMEO デモ：業種を選ぶと、その店の口コミにAIが返信下書きを出す](https://yosinn1-blip.github.io/yoshiki-apps/assets/meo-harness-demo.gif)

**▶ 触れるデモ（登録不要・架空店舗）: https://yosinn1-blip.github.io/yoshiki-apps/demo.html**

**現ステータス**: 開発中（GBP API 審査待ち。審査完了までは Gmail 監視ブリッジで新着口コミを取得可能）・MIT License

姉妹プロジェクト: **[OpenSEO](https://github.com/net-runners-com/open-seo)** — Web サイト側の SEO（キーワード調査・順位計測・サイト監査）はこちら。

---

## なぜ OpenMEO？

店舗の GBP 運用ツールは「有料が当たり前」です。MEOチェキ（月3,278円〜・契約6ヶ月〜・約7万店舗導入）をはじめ国内外に有料サービスが乱立する一方で、**自動化レイヤーのオープンソースは存在しません**。GBP の公式 API は口コミ・投稿・分析・通知まで**完全無料**なのに、です。

OpenMEO はその空白を埋めます。公式 API の上に AI 返信・通知・投稿予約・分析を載せ、**各店舗が自分の Cloudflare 無料枠で動かす**ことで月額0円を実現します。

## 比較表

| 機能 | MEOチェキ等（有料） | OpenMEO（0円） |
|---|---|---|
| 価格 | 月3,278円〜・契約6ヶ月〜 | **0円**（CF無料枠＋GBP API無料＋AI BYOK） |
| 口コミ一覧・返信 | ○ | ◎ |
| AI返信文の生成 | ○（ChatGPT連携） | ◎ **既定Groq（無料・クレカ不要）／Gemini切替可** |
| 新着口コミ通知 | ○ | ◎ **LINE / WhatsApp / Telegram に流せる** |
| 投稿予約・繰り返し投稿 | ○ | ◎ cronで自動 |
| インサイト（表示／電話／経路検索） | ○（最大2年） | ◎ **D1蓄積で期間無制限** |
| 複数店舗一括管理 | ○（上位プラン） | ◎ 標準搭載 |
| 検索順位計測 | ◎（看板機能） | ✕ 本体には載せない（下記） |

## 実装済み

- **AI 口コミ返信エンジン** — 業種・トーン・言語を考慮した返信下書き。既定 Groq（llama-3.3-70b、無料）／Gemini 切替可
- **オーナー承認フロー** — AI 返信は必ず承認してから投稿（LINE Flex Message 上で承認/編集/却下）
- **通知** — LINE / WhatsApp Business Cloud / Telegram。タイムゾーン対応ダイジェスト
- **Gmail 監視ブリッジ** — GBP API 審査完了前でも、Google からの口コミ通知メールを監視して取り込み
- **Yahoo!プレイス webhook アダプタ** — Yahoo 側の口コミも同じパイプラインへ
- **GBP API v1 クライアント** — 口コミ取得・返信投稿・ロケーション情報・プロフィール編集（location.patch）
- **管理ダッシュボード UI** — 店舗登録・状態確認・返信管理
- **GDPR TTL** — 保存データの自動失効

## 「脱・順位」という方針

順位計測は OpenMEO 本体には載せません。理由は2つ:

1. 順位のスクレイピングは Google の規約グレー領域で、**公式 API に順位は存在しない**
2. 順位は閲覧者の位置で変わる**推測値**にすぎない

OpenMEO は Google が公式提供する**実数（表示回数・電話・経路検索）で成果を測ります**。
それでも順位が見たい場合は、姉妹プロジェクト **OpenSEO** のセルフホスト・ランナー（自分のマシンで動かす計測系）が オーガニック順位とローカルパック順位をカバーします。役割分担: **OpenMEO = GBP 運用（公式データ）／OpenSEO = 検索順位・サイト SEO**。

## やらないこと（ポリシー）

- ❌ 虚偽の口コミ生成・報酬付き依頼（景品表示法のステマ規制違反のため）
- ❌ AI返信の無断投稿（**投稿前に必ずオーナーが承認**する設計）
- ❌ 本体への順位スクレイピング同梱

## 技術スタック / 0円の仕組み

- **Cloudflare Workers + KV + D1 + cron** — 各店舗が自分の無料枠で実行（分散ホストなのでどこも超過せず請求ゼロ）
- **GBP公式API** — 口コミ／投稿／分析／通知まで無料・従量課金なし
- **AI返信＝BYOK** — 既定は **Groq（無料・クレカ不要で超過課金が構造的に起きない）**。品質重視なら **Gemini** に設定で切替可能

> 0円の核心は「集約しない」こと。1,000店を1社のアカウントにまとめると無料枠を超えて課金が発生しますが、各店が自分の無料枠で1軒分だけ処理すればどこも超過しません。

## セットアップ

[docs/setup.md](docs/setup.md) を参照。概要:

```bash
git clone https://github.com/net-runners-com/openmeo
cd openmeo && npm install
cp .dev.vars.example .dev.vars   # シークレットを記入
npx wrangler kv namespace create STORES   # id を wrangler.toml に反映
npm run dev                       # ローカル起動
npm test                          # 158 テスト
npm run deploy                    # 自分の Cloudflare アカウントへ
```

## ロードマップ

- [x] AI返信エンジン・承認フロー・LINE/WhatsApp/Telegram 通知
- [x] Gmail 監視ブリッジ（GBP API 審査前の暫定経路）
- [x] GBP v1 API クライアント・OAuth フロー・プロフィール編集
- [x] 管理ダッシュボード UI
- [ ] GBP API 審査完了 → 公式 API 経路へ全面切替
- [ ] 「Deploy to Cloudflare」ワンクリック配布
- [ ] ランディング／デモ動画

## License

MIT
