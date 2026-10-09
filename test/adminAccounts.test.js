import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AdminAccount from '../src/models/AdminAccount.js';
import authRoutes from '../src/routes/simpleAuthRoutes.js';

test('admin creation, authentication, validation and independent password changes', async (t) => {
  const originalEnv = { ...process.env };
  process.env.ADMIN_EMAIL = 'owner@example.test';
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('owner-password', 4);
  process.env.ADMIN_JWT_SECRET = 'test-only-admin-secret';
  const accounts = new Map();
  t.mock.method(AdminAccount, 'exists', async ({ email }) => accounts.has(email));
  t.mock.method(AdminAccount, 'findOne', ({ email }) => ({ select: async () => accounts.get(email) || null }));
  t.mock.method(AdminAccount, 'create', async (data) => {
    const account = { ...data, id: 'test-admin-id', save: async () => {} };
    accounts.set(data.email, account);
    return account;
  });
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    for (const key of ['ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'ADMIN_JWT_SECRET']) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });
  const request = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/auth${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const input = { name: 'New Admin', email: 'NEW@example.test', password: 'new-password', confirmPassword: 'new-password' };
  assert.equal((await request('/create-admin', input)).status, 401);
  assert.equal((await request('/create-admin', input, 'invalid')).status, 401);
  const owner = await request('/login', { email: 'owner@example.test', password: 'owner-password' });
  assert.equal(owner.status, 200);
  assert.equal(owner.body.admin.role, 'superadmin');
  const ownerToken = owner.body.token;
  assert.equal((await request('/create-admin', { ...input, confirmPassword: 'mismatch' }, ownerToken)).status, 400);
  assert.equal((await request('/create-admin', { ...input, email: 'invalid' }, ownerToken)).status, 400);
  assert.equal((await request('/create-admin', { ...input, password: 'short', confirmPassword: 'short' }, ownerToken)).status, 400);
  assert.equal((await request('/create-admin', { ...input, email: 'OWNER@example.test' }, ownerToken)).status, 409);
  const created = await request('/create-admin', input, ownerToken);
  assert.equal(created.status, 201);
  assert.equal(created.body.admin.email, 'new@example.test');
  assert.equal(created.body.admin.passwordHash, undefined);
  assert.notEqual(accounts.get('new@example.test').passwordHash, input.password);
  assert.equal(await bcrypt.compare(input.password, accounts.get('new@example.test').passwordHash), true);
  assert.equal((await request('/create-admin', input, ownerToken)).status, 409);
  assert.equal((await request('/login', { email: input.email, password: 'wrong-password' })).status, 401);
  const login = await request('/login', { email: input.email, password: input.password });
  assert.equal(login.status, 200);
  assert.equal(login.body.admin.role, 'admin');
  assert.equal((await request('/create-admin', { ...input, email: 'another@example.test' }, login.body.token)).status, 403);
  const forgedRoleToken = jwt.sign({ email: 'new@example.test', role: 'superadmin' }, process.env.ADMIN_JWT_SECRET);
  assert.equal((await request('/create-admin', { ...input, email: 'another@example.test' }, forgedRoleToken)).status, 403);
  const legacyOwnerToken = jwt.sign({ email: process.env.ADMIN_EMAIL }, process.env.ADMIN_JWT_SECRET);
  assert.equal((await request('/profile', undefined, legacyOwnerToken)).body.admin.role, 'superadmin');
  assert.equal((await request('/profile', undefined, login.body.token)).body.admin.role, 'admin');
  assert.equal((await request('/profile', undefined, ownerToken)).body.admin.role, 'superadmin');
  assert.equal((await request('/profile', undefined, login.body.token)).body.admin.email, 'new@example.test');
  assert.equal((await request('/change-password', { currentPassword: input.password, newPassword: 'changed-password', confirmPassword: 'changed-password' }, login.body.token)).status, 200);
  assert.equal((await request('/login', { email: input.email, password: input.password })).status, 401);
  assert.equal((await request('/login', { email: input.email, password: 'changed-password' })).status, 200);
  assert.equal((await request('/login', { email: 'owner@example.test', password: 'owner-password' })).status, 200);
});
