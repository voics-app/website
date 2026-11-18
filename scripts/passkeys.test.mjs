import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64url, bytes, loopbackOrigin, optionsFromJSON, validRequest } from '../src/passkeys/credentials.js';

test('accepts only literal IPv4 loopback origins with an explicit port', () => {
  assert.equal(loopbackOrigin('http://127.0.0.1:51342'), true);
  for (const origin of ['null', 'file:///', 'https://127.0.0.1:51342', 'http://127.0.0.1', 'http://localhost:51342', 'http://127.0.0.1.evil.test:51342', 'http://2130706433:51342', 'http://user@127.0.0.1:51342', 'http://127.0.0.1:51342/path']) assert.equal(loopbackOrigin(origin), false, origin);
});

test('requires a bound request nonce and compatible RP', () => {
  const request = { type: 'voics:request', nonce: 'a'.repeat(43), kind: 'get', publicKey: { challenge: 'challenge', rpId: 'example.test' } };
  assert.equal(validRequest(request, 'keys.example.test'), true);
  assert.equal(validRequest({ ...request, nonce: '' }, 'keys.example.test'), false);
  assert.equal(validRequest(request, 'example.test.evil.test'), false);
  assert.equal(validRequest({ ...request, kind: 'delete' }, 'keys.example.test'), false);
});

test('converts binary WebAuthn fields without altering verification requirements', () => {
  const binary = Uint8Array.from([0, 127, 128, 255]);
  assert.deepEqual(bytes(base64url(binary)), binary);
  const input = { challenge: base64url(binary), user: { id: 'dXNlcg', name: 'account' }, rp: { id: 'example.test' }, authenticatorSelection: { userVerification: 'required' }, excludeCredentials: [{ id: 'a2V5', type: 'public-key', transports: ['usb'] }] };
  const result = optionsFromJSON('create', input);
  assert.deepEqual(result.challenge, binary);
  assert.equal(new TextDecoder().decode(result.user.id), 'user');
  assert.equal(new TextDecoder().decode(result.excludeCredentials[0].id), 'key');
  assert.equal(result.authenticatorSelection.userVerification, 'required');
  assert.equal(input.challenge, base64url(binary));
  const assertion = optionsFromJSON('get', { challenge: 'Y2hhbGxlbmdl', rpId: 'example.test', userVerification: 'required', allowCredentials: [{ id: 'a2V5', type: 'public-key' }] });
  assert.equal(new TextDecoder().decode(assertion.allowCredentials[0].id), 'key');
  assert.equal(assertion.userVerification, 'required');
});
