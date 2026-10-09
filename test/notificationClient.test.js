import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendPromotionNotificationToMainBackend } from '../src/services/mainBackendNotificationClient.js';

test('promotion forwarding preserves payload and reports connection failures', async (t) => {
  const originalUrl = process.env.MAIN_BACKEND_URL;
  const originalToken = process.env.MAIN_BACKEND_INTERNAL_API_TOKEN;
  process.env.MAIN_BACKEND_URL = 'http://main.example.test/';
  process.env.MAIN_BACKEND_INTERNAL_API_TOKEN = 'test-internal-token';
  t.after(() => {
    for (const [key, value] of [['MAIN_BACKEND_URL', originalUrl], ['MAIN_BACKEND_INTERNAL_API_TOKEN', originalToken]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const payload = { title: 'd', body: 'd', notificationType: 'promotion', audience: 'all_users', selectedUserIds: [], selectedCounsellorIds: [], data: {} };
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://main.example.test/api/notification/promotion');
    assert.equal(options.headers.Authorization, 'Bearer test-internal-token');
    assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(JSON.stringify({ success: true, savedCount: 2 }), { status: 200 });
  });
  assert.equal((await sendPromotionNotificationToMainBackend(payload)).success, true);
  mock.mock.mockImplementation(async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
  });
  const refused = await sendPromotionNotificationToMainBackend(payload);
  assert.equal(refused.success, false);
  assert.equal(refused.code, 'ECONNREFUSED');
  assert.match(refused.error, /Start the Main Backend/);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: 'Some notifications could not be saved', savedCount: 1, failedCount: 1 }), { status: 502 }));
  const partial = await sendPromotionNotificationToMainBackend(payload);
  assert.equal(partial.success, false);
  assert.equal(partial.body.savedCount, 1);
  assert.equal(partial.body.failedCount, 1);
});
