// Google Business Profile API クライアント（v1 サブ API）
//
// 必要な OAuth2 スコープ: https://www.googleapis.com/auth/business.manage
//
// 旧 mybusiness.googleapis.com/v4 は非推奨（2023年末に廃止）。
// 現行 sub-API を使用:
//   口コミ: mybusinessreviews.googleapis.com/v1
//   店舗情報: mybusinessbusinessinformation.googleapis.com/v1
//   アカウント: mybusinessaccountmanagement.googleapis.com/v1
//
// 店舗 KV に追加するフィールド:
//   gbpRefreshToken — 店舗オーナーの OAuth refresh_token
//   gbpAccountId    — 例: "accounts/123456789"
//   gbpLocationId   — 例: "locations/987654321"
//
// Worker Secrets（wrangler secret put）:
//   GBP_OAUTH_CLIENT_ID
//   GBP_OAUTH_CLIENT_SECRET

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_REVIEWS_BASE = 'https://mybusinessreviews.googleapis.com/v1';
const GBP_ACCOUNTS_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const GBP_LOCATIONS_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function getGbpAccessToken({ clientId, clientSecret, refreshToken, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const res = await _fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP OAuth 失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function fetchGbpReviews({ accessToken, accountId, locationId, pageSize = 50, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const url = `${GBP_REVIEWS_BASE}/${accountId}/${locationId}/reviews?pageSize=${pageSize}`;
  const res = await _fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP reviews 取得失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.reviews ?? [];
}

export function normalizeGbpReview(raw) {
  return {
    reviewId: raw.reviewId,
    star: GBP_STARS[raw.starRating] ?? 0,
    text: raw.comment ?? '',
    name: raw.reviewer?.displayName,
    createTime: raw.createTime,
    hasReply: Boolean(raw.reviewReply),
    platform: 'gbp',
  };
}

/**
 * GBP アカウント一覧を取得する（OAuth 認証後にどのアカウントが使えるか確認する用）。
 * @returns {Promise<Array<{name:string, accountName:string, type:string}>>}
 */
export async function listGbpAccounts({ accessToken, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const res = await _fetch(`${GBP_ACCOUNTS_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP accounts 取得失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.accounts ?? [];
}

/**
 * GBP ロケーション（店舗）一覧を取得する。
 * @param {object} args
 * @param {string} args.accessToken
 * @param {string} args.accountId  "accounts/123456789" 形式
 * @param {function} [args.fetchImpl]
 * @returns {Promise<Array<{name:string, title:string, storeCode?:string}>>}
 */
export async function listGbpLocations({ accessToken, accountId, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const url = `${GBP_LOCATIONS_BASE}/${accountId}/locations?readMask=name,title,storeCode,regularHours`;
  const res = await _fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP locations 取得失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.locations ?? [];
}

/**
 * 編集可能なフィールドから GBP location.patch 用の { location, updateMask } を組み立てる。
 * @param {object} fields
 * @param {string} [fields.title]         店舗名
 * @param {string} [fields.phoneNumber]   電話番号（例: "+81312345678"）
 * @param {string} [fields.websiteUri]    ウェブサイト URL
 * @param {string} [fields.description]   店舗紹介文（profile.description）
 * @param {Array}  [fields.regularHours]  営業時間 periods 配列（GBP API 形式）
 * @returns {{location: object, updateMask: string}}
 */
export function buildGbpLocationPatch(fields) {
  const location = {};
  const maskParts = [];

  if (fields.title !== undefined) {
    location.title = fields.title;
    maskParts.push('title');
  }
  if (fields.phoneNumber !== undefined) {
    location.phoneNumbers = { primaryPhone: fields.phoneNumber };
    maskParts.push('phoneNumbers');
  }
  if (fields.websiteUri !== undefined) {
    location.websiteUri = fields.websiteUri;
    maskParts.push('websiteUri');
  }
  if (fields.description !== undefined) {
    location.profile = { description: fields.description };
    maskParts.push('profile');
  }
  if (fields.regularHours !== undefined) {
    location.regularHours = { periods: fields.regularHours };
    maskParts.push('regularHours');
  }

  if (!maskParts.length) {
    throw new Error('更新するフィールドがありません（title, phoneNumber, websiteUri, description, regularHours のいずれか必須）');
  }

  return { location, updateMask: maskParts.join(',') };
}

/**
 * GBP 店舗情報を更新する（部分更新 / PATCH）。
 * @param {object} args
 * @param {string} args.accessToken
 * @param {string} args.locationId  "locations/987654321" 形式
 * @param {object} args.location    更新するフィールドのみを含む Location リソース
 * @param {string} args.updateMask  更新するトップレベルフィールド名（カンマ区切り）
 * @param {function} [args.fetchImpl]
 */
export async function updateGbpLocation({ accessToken, locationId, location, updateMask, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const url = `${GBP_LOCATIONS_BASE}/${locationId}?updateMask=${encodeURIComponent(updateMask)}`;
  const res = await _fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(location),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP location 更新失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  return await res.json();
}

export async function postGbpReply({ accessToken, accountId, locationId, reviewId, comment, fetchImpl }) {
  const _fetch = fetchImpl ?? globalThis.fetch;
  const url = `${GBP_REVIEWS_BASE}/${accountId}/${locationId}/reviews/${reviewId}/reply`;
  const res = await _fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP reply 投稿失敗 ${res.status}: ${body.slice(0, 200)}`);
  }
  return { ok: true, reviewId };
}
