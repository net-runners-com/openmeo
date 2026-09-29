// GET /admin — 管理ダッシュボード（店舗登録・GBP接続・GBPプロフィール編集・保留中レビュー承認）
//
// このファイルはサーバー側で一切の値を埋め込まない静的 HTML を返す。
// Admin Key / Store ID の入力とすべての API 呼び出しはブラウザ側 JS が同一オリジンに対して行う。
//
// 注意: このファイル内では絶対にバッククォート(`)や ${ を使わないこと。
// renderAdminDashboard() の戻り値自体がテンプレートリテラルで書かれているため、
// 内側でバッククォートや ${ を使うと外側のリテラルが壊れる。

export function renderAdminDashboard() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MEO Harness 管理ダッシュボード</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif;
    max-width: 880px; margin: 0 auto; padding: 24px 16px 80px;
    line-height: 1.6; color: #1a1a1a; background: #fafafa;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #eee; background: #16181c; }
    .card { background: #1f2329 !important; border-color: #2c3038 !important; }
    input, select, textarea { background: #14161a !important; color: #eee !important; border-color: #3a3f47 !important; }
    .muted { color: #9aa0a8 !important; }
    #log { background: #0b0c0e !important; }
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 0 0 12px; }
  .muted { color: #666; font-size: 13px; }
  .card {
    background: #fff; border: 1px solid #e2e2e2; border-radius: 10px;
    padding: 16px 18px; margin-bottom: 16px;
  }
  .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  label { font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; }
  input, select, textarea {
    border: 1px solid #ccc; border-radius: 6px; padding: 7px 9px; font-size: 14px;
    font-family: inherit; width: 100%;
  }
  textarea { resize: vertical; min-height: 60px; }
  .field { flex: 1; min-width: 160px; margin-bottom: 8px; }
  button {
    border: none; border-radius: 6px; padding: 8px 14px; font-size: 14px;
    cursor: pointer; background: #2563eb; color: #fff; font-weight: 600;
  }
  button.secondary { background: #6b7280; }
  button.danger { background: #dc2626; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.ok { background: #dcfce7; color: #166534; }
  .badge.no { background: #fee2e2; color: #991b1b; }
  .review-card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
  .stars { color: #f59e0b; }
  #log {
    font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap;
    background: #111; color: #9be89b; padding: 10px 12px; border-radius: 8px;
    max-height: 220px; overflow: auto; margin: 0;
  }
  .hours-row { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; font-size: 13px; }
  .hours-row span.day { width: 28px; font-weight: 600; }
  .hours-row input[type=time] { width: 110px; }
  .hours-row input[type=checkbox] { width: auto; }
  .toast {
    position: fixed; top: 16px; right: 16px; max-width: 320px; z-index: 1000;
    background: #16a34a; color: #fff; padding: 10px 14px; border-radius: 8px;
    font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,.2);
    opacity: 0; transform: translateY(-8px); pointer-events: none;
    transition: opacity .2s, transform .2s;
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.error { background: #dc2626; }
</style>
</head>
<body>
  <div id="toast" class="toast"></div>
  <h1>MEO Harness 管理ダッシュボード</h1>
  <p class="muted">店舗設定・GBP接続・GBPプロフィール編集・保留中レビューの承認をまとめて操作します。</p>

  <div class="card">
    <div class="row">
      <div class="field"><label>Admin Key</label><input id="adminKey" type="password" placeholder="X-Admin-Key"></div>
      <div class="field"><label>Store ID</label><input id="storeId" placeholder="store-id"></div>
    </div>
    <button id="btnLoad">読み込み</button>
    <span id="loadStatus" class="muted"></span>
  </div>

  <div class="card">
    <h2>ステータス</h2>
    <div id="statusBox" class="muted">未読み込み</div>
  </div>

  <div class="card">
    <h2>店舗設定</h2>
    <div class="grid2">
      <div class="field"><label>店舗名</label><input id="f_businessName"></div>
      <div class="field"><label>業種</label><input id="f_businessType"></div>
    </div>
    <div class="grid2">
      <div class="field"><label>APIキー（口コミ投稿用・必須）</label><input id="f_apiKey"></div>
      <div class="field"><label>通知チャネル</label>
        <select id="f_channel">
          <option value="line">LINE</option>
          <option value="telegram">Telegram</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
    </div>
    <div id="channelFields"></div>
    <div class="grid2">
      <div class="field"><label>通知モード</label>
        <select id="f_notifyMode"><option value="immediate">即時</option><option value="daily-digest">日次ダイジェスト</option></select>
      </div>
      <div class="field"><label>UTCオフセット（例: 9 = JST）</label><input id="f_utcOffset" type="number"></div>
    </div>
    <div class="field"><label>Webhook Secret（任意）</label><input id="f_webhookSecret"></div>
    <div class="row" style="margin-top:4px">
      <button id="btnSaveStore">店舗設定を保存</button>
      <button id="btnTestNotify" class="secondary">テスト通知を送信</button>
      <button id="btnDeleteStore" class="danger">店舗を削除</button>
    </div>
  </div>

  <div class="card">
    <h2>GBP接続</h2>
    <div class="row">
      <button id="btnOauthStart">Google認証を開始</button>
      <button id="btnLoadLocations" class="secondary">ロケーション一覧を取得</button>
    </div>
    <div id="locationsBox"></div>
  </div>

  <div class="card">
    <h2>GBPプロフィール編集</h2>
    <p class="muted">空欄のまま保存すると、そのフィールドは変更されません。</p>
    <div class="grid2">
      <div class="field"><label>店舗名（title）</label><input id="g_title"></div>
      <div class="field"><label>電話番号</label><input id="g_phone" placeholder="+81312345678"></div>
    </div>
    <div class="field"><label>ウェブサイトURL</label><input id="g_website" placeholder="https://example.com"></div>
    <div class="field"><label>紹介文（description）</label><textarea id="g_description"></textarea></div>
    <div class="field">
      <label>営業時間</label>
      <div id="hoursEditor"></div>
    </div>
    <button id="btnSaveGbp" style="margin-top:4px">GBPに保存</button>
  </div>

  <div class="card">
    <h2>保留中レビュー（承認待ち）</h2>
    <button id="btnLoadPending">保留中レビューを取得</button>
    <div id="pendingBox" style="margin-top:12px"></div>
  </div>

  <div class="card">
    <h2>ログ</h2>
    <pre id="log">（ここに直近のAPI応答が表示されます）</pre>
  </div>

<script>
(function () {
  'use strict';

  var DAYS = [
    ['MONDAY', '月'], ['TUESDAY', '火'], ['WEDNESDAY', '水'], ['THURSDAY', '木'],
    ['FRIDAY', '金'], ['SATURDAY', '土'], ['SUNDAY', '日']
  ];

  var CHANNEL_FIELDS = {
    line: [['lineChannelToken', 'LINEチャネルアクセストークン'], ['lineUserId', 'LINE userId']],
    telegram: [['telegramBotToken', 'Telegram Botトークン'], ['telegramChatId', 'Telegram Chat ID']],
    whatsapp: [['whatsappRecipient', 'WhatsApp 送信先番号'], ['whatsappTemplateName', 'テンプレート名（任意）'], ['whatsappTemplateLang', '言語コード（任意）']]
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) { return String(n == null ? 0 : n).padStart(2, '0'); }

  // ── トースト通知（alert() の代わり。ブロッキングしない） ───────────────
  var toastTimer = null;
  function showToast(message, isError) {
    var el = $('toast');
    el.textContent = message;
    el.className = 'toast show' + (isError ? ' error' : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 4000);
  }

  // ── 破壊的操作の確認（confirm() の代わり。2回クリックで確定） ───────────
  function armConfirm(btn, confirmLabel, onConfirm) {
    var originalLabel = btn.textContent;
    var armed = false;
    var resetTimer = null;
    btn.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        btn.textContent = confirmLabel;
        resetTimer = setTimeout(function () { armed = false; btn.textContent = originalLabel; }, 3000);
        return;
      }
      clearTimeout(resetTimer);
      armed = false;
      btn.textContent = originalLabel;
      onConfirm();
    });
  }

  function log(label, data) {
    var el = $('log');
    var time = new Date().toLocaleTimeString('ja-JP');
    el.textContent = '[' + time + '] ' + label + '\\n' + JSON.stringify(data, null, 2) + '\\n\\n' + el.textContent;
  }

  function adminKey() { return $('adminKey').value.trim(); }
  function currentStoreId() { return $('storeId').value.trim(); }

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'X-Admin-Key': adminKey(), 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, Object.assign({}, opts, { headers: headers })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        log((opts.method || 'GET') + ' ' + path + ' → ' + res.status, data);
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        return data;
      });
    });
  }

  // ── 永続化（ブラウザローカルのみ・サーバーには送られない） ─────────────
  $('adminKey').value = localStorage.getItem('meo_admin_key') || '';
  $('storeId').value = localStorage.getItem('meo_store_id') || '';
  $('adminKey').addEventListener('change', function () { localStorage.setItem('meo_admin_key', adminKey()); });
  $('storeId').addEventListener('change', function () { localStorage.setItem('meo_store_id', currentStoreId()); });

  // ── 営業時間エディタ ─────────────────────────────────────────────
  function renderHoursEditor(periods) {
    var openByDay = {};
    (periods || []).forEach(function (p) { openByDay[p.openDay] = p; });
    var html = DAYS.map(function (pair) {
      var key = pair[0], label = pair[1];
      var p = openByDay[key];
      var openTime = p ? (pad2(p.openTime.hours) + ':' + pad2(p.openTime.minutes)) : '09:00';
      var closeTime = p ? (pad2(p.closeTime.hours) + ':' + pad2(p.closeTime.minutes)) : '18:00';
      return '<div class="hours-row" data-day="' + key + '">' +
        '<input type="checkbox" class="hours-enabled"' + (p ? ' checked' : '') + '>' +
        '<span class="day">' + label + '</span>' +
        '<input type="time" class="hours-open" value="' + openTime + '">' +
        '<span>〜</span>' +
        '<input type="time" class="hours-close" value="' + closeTime + '">' +
        '</div>';
    }).join('');
    $('hoursEditor').innerHTML = html;
  }
  renderHoursEditor([]);

  function collectHours() {
    var rows = document.querySelectorAll('.hours-row');
    var periods = [];
    rows.forEach(function (row) {
      if (!row.querySelector('.hours-enabled').checked) return;
      var day = row.dataset.day;
      var openParts = row.querySelector('.hours-open').value.split(':').map(Number);
      var closeParts = row.querySelector('.hours-close').value.split(':').map(Number);
      periods.push({
        openDay: day, openTime: { hours: openParts[0], minutes: openParts[1] },
        closeDay: day, closeTime: { hours: closeParts[0], minutes: closeParts[1] }
      });
    });
    return periods;
  }

  // ── チャネル別フィールド ─────────────────────────────────────────
  function renderChannelFields(values) {
    values = values || {};
    var ch = $('f_channel').value;
    var html = CHANNEL_FIELDS[ch].map(function (pair) {
      var id = pair[0], label = pair[1];
      return '<div class="field"><label>' + escapeHtml(label) + '</label>' +
        '<input id="cf_' + id + '" value="' + escapeHtml(values[id] || '') + '"></div>';
    }).join('');
    $('channelFields').innerHTML = html;
  }
  $('f_channel').addEventListener('change', function () { renderChannelFields(); });
  renderChannelFields();

  // ── ステータス読み込み ───────────────────────────────────────────
  function loadStatus() {
    return api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/status').then(function (data) {
      var html =
        '<div class="row">' +
        '<span class="badge ' + (data.hasGbpConfig ? 'ok' : 'no') + '">GBP接続: ' + (data.hasGbpConfig ? '済' : '未') + '</span>' +
        '<span class="badge ' + (data.hasPending ? 'ok' : 'no') + '">保留中: ' + data.pendingCount + '件</span>' +
        '<span class="badge ' + (data.hasWebhookSecret ? 'ok' : 'no') + '">Webhook: ' + (data.hasWebhookSecret ? '設定済' : '未設定') + '</span>' +
        '</div>' +
        '<p class="muted">店舗名: ' + escapeHtml(data.businessName || '(未設定)') +
        ' / チャネル: ' + escapeHtml(data.notificationChannel) +
        ' / 通知モード: ' + escapeHtml(data.notifyMode) +
        ' / 最終GBPポーリング: ' + escapeHtml(data.lastGbpPoll || '(なし)') + '</p>';
      $('statusBox').innerHTML = html;

      $('f_businessName').value = data.businessName || '';
      $('f_businessType').value = data.businessType || '';
      $('f_channel').value = data.notificationChannel || 'line';
      $('f_notifyMode').value = data.notifyMode || 'immediate';
      $('f_utcOffset').value = data.utcOffset != null ? data.utcOffset : 9;
      renderChannelFields();
      return data;
    });
  }

  $('btnLoad').addEventListener('click', function () {
    if (!adminKey() || !currentStoreId()) {
      $('loadStatus').textContent = 'Admin Key と Store ID を入力してください';
      return;
    }
    $('loadStatus').textContent = '読み込み中…';
    loadStatus().then(function () {
      $('loadStatus').textContent = '✅ 読み込み完了';
    }).catch(function (err) {
      $('loadStatus').textContent = '❌ ' + err.message;
    });
  });

  // ── 店舗設定の保存 ───────────────────────────────────────────────
  $('btnSaveStore').addEventListener('click', function () {
    var ch = $('f_channel').value;
    var body = {
      businessName: $('f_businessName').value,
      businessType: $('f_businessType').value,
      apiKey: $('f_apiKey').value,
      notificationChannel: ch,
      notifyMode: $('f_notifyMode').value,
      utcOffset: Number($('f_utcOffset').value || 9),
      webhookSecret: $('f_webhookSecret').value || undefined
    };
    CHANNEL_FIELDS[ch].forEach(function (pair) { body[pair[0]] = $('cf_' + pair[0]).value; });

    api('/admin/stores/' + encodeURIComponent(currentStoreId()), { method: 'PUT', body: JSON.stringify(body) })
      .then(function () { showToast('店舗設定を保存しました'); return loadStatus(); })
      .catch(function (err) { showToast('保存に失敗しました: ' + err.message, true); });
  });

  $('btnTestNotify').addEventListener('click', function () {
    api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/notify/test', { method: 'POST' })
      .then(function () { showToast('テスト通知を送信しました'); })
      .catch(function (err) { showToast('送信に失敗しました: ' + err.message, true); });
  });

  armConfirm($('btnDeleteStore'), 'もう一度クリックで削除確定', function () {
    api('/admin/stores/' + encodeURIComponent(currentStoreId()), { method: 'DELETE' })
      .then(function () { showToast('店舗を削除しました'); $('statusBox').textContent = '未読み込み'; })
      .catch(function (err) { showToast('削除に失敗しました: ' + err.message, true); });
  });

  // ── GBP接続 ─────────────────────────────────────────────────────
  $('btnOauthStart').addEventListener('click', function () {
    api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/gbp/oauth/start', { method: 'POST' })
      .then(function (data) { window.open(data.oauthUrl, '_blank'); })
      .catch(function (err) { showToast('開始に失敗しました: ' + err.message, true); });
  });

  $('btnLoadLocations').addEventListener('click', function () {
    api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/gbp/locations')
      .then(function (data) { renderLocations(data.locationsByAccount || []); })
      .catch(function (err) { showToast('取得に失敗しました: ' + err.message, true); });
  });

  function renderLocations(locationsByAccount) {
    if (!locationsByAccount.length) {
      $('locationsBox').innerHTML = '<p class="muted">アカウントが見つかりません</p>';
      return;
    }
    var html = locationsByAccount.map(function (entry) {
      var account = entry.account, locations = entry.locations || [];
      var accountLabel = escapeHtml(account.accountName || account.name);
      var rows = locations.map(function (loc) {
        return '<div class="row">' +
          '<span>' + escapeHtml(loc.title || '(無題)') + ' <span class="muted">' + escapeHtml(loc.name) + '</span></span>' +
          '<button class="secondary use-location" data-account="' + escapeHtml(account.name) + '" data-location="' + escapeHtml(loc.name) + '">この店舗に設定</button>' +
          '</div>';
      }).join('');
      return '<div class="muted" style="margin-top:8px">' + accountLabel + '</div>' + rows;
    }).join('');
    $('locationsBox').innerHTML = html;

    document.querySelectorAll('.use-location').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ch = $('f_channel').value;
        var body = {
          apiKey: $('f_apiKey').value || crypto.randomUUID(),
          businessName: $('f_businessName').value,
          businessType: $('f_businessType').value,
          notificationChannel: ch,
          gbpAccountId: btn.dataset.account,
          gbpLocationId: btn.dataset.location
        };
        CHANNEL_FIELDS[ch].forEach(function (pair) { body[pair[0]] = $('cf_' + pair[0]).value; });

        api('/admin/stores/' + encodeURIComponent(currentStoreId()), { method: 'PUT', body: JSON.stringify(body) })
          .then(function () { showToast('この店舗のGBPロケーションとして設定しました'); return loadStatus(); })
          .catch(function (err) { showToast('設定に失敗しました: ' + err.message, true); });
      });
    });
  }

  // ── GBPプロフィール編集 ─────────────────────────────────────────
  $('btnSaveGbp').addEventListener('click', function () {
    var body = {};
    if ($('g_title').value) body.title = $('g_title').value;
    if ($('g_phone').value) body.phoneNumber = $('g_phone').value;
    if ($('g_website').value) body.websiteUri = $('g_website').value;
    if ($('g_description').value) body.description = $('g_description').value;
    var hours = collectHours();
    if (hours.length) body.regularHours = hours;

    if (!Object.keys(body).length) { showToast('更新するフィールドを入力してください', true); return; }

    api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/gbp/location', { method: 'PATCH', body: JSON.stringify(body) })
      .then(function () { showToast('GBPプロフィールを更新しました'); })
      .catch(function (err) { showToast('更新に失敗しました: ' + err.message, true); });
  });

  // ── 保留中レビュー ───────────────────────────────────────────────
  $('btnLoadPending').addEventListener('click', function () {
    api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/pending')
      .then(function (data) { renderPending(data.pending || []); })
      .catch(function (err) { showToast('取得に失敗しました: ' + err.message, true); });
  });

  function renderPending(list) {
    if (!list.length) {
      $('pendingBox').innerHTML = '<p class="muted">保留中のレビューはありません</p>';
      return;
    }
    var html = list.map(function (r) {
      var star = r.star || 0;
      var stars = '★'.repeat(star) + '☆'.repeat(5 - star);
      var actions = r.replyId
        ? '<button class="approve-btn">承認してGoogleに投稿</button><button class="secondary skip-btn">却下</button>'
        : '<span class="muted">（Google返信対象外のレビューです）</span>';
      return '<div class="review-card" data-reply-id="' + escapeHtml(r.replyId || '') + '">' +
        '<div class="row"><span class="stars">' + stars + '</span><strong>' + escapeHtml(r.name || '匿名') + '</strong></div>' +
        '<p>' + escapeHtml(r.text || '') + '</p>' +
        '<label>返信下書き</label>' +
        '<textarea class="draft-text">' + escapeHtml(r.draft || '') + '</textarea>' +
        '<div class="row" style="margin-top:8px">' + actions + '</div>' +
        '</div>';
    }).join('');
    $('pendingBox').innerHTML = html;

    document.querySelectorAll('.approve-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.review-card');
        var replyId = card.dataset.replyId;
        var comment = card.querySelector('.draft-text').value;
        api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/pending/' + encodeURIComponent(replyId) + '/approve',
          { method: 'POST', body: JSON.stringify({ comment: comment }) })
          .then(function () { showToast('Googleに返信を投稿しました'); card.remove(); })
          .catch(function (err) { showToast('承認に失敗しました: ' + err.message, true); });
      });
    });
    document.querySelectorAll('.skip-btn').forEach(function (btn) {
      armConfirm(btn, 'もう一度クリックで却下確定', function () {
        var card = btn.closest('.review-card');
        var replyId = card.dataset.replyId;
        api('/admin/stores/' + encodeURIComponent(currentStoreId()) + '/pending/' + encodeURIComponent(replyId) + '/skip', { method: 'POST' })
          .then(function () { showToast('レビューを却下しました'); card.remove(); })
          .catch(function (err) { showToast('却下に失敗しました: ' + err.message, true); });
      });
    });
  }
})();
</script>
</body>
</html>`;
}
