import { credentialJSON, loopbackOrigin, optionsFromJSON, validRequest } from './credentials.js';

const status = document.getElementById('status');
const next = document.getElementById('continue');
const cancel = document.getElementById('cancel');
const account = document.getElementById('account');
const controller = new AbortController();
let request = null, parentOrigin = null, done = false;
const parent = window.top === window ? window.opener : null;

function finish(result) {
  if (done || !request) return;
  done = true;
  controller.abort();
  next.hidden = true;
  cancel.hidden = true;
  parent.postMessage({ type: 'voics:result', nonce: request.nonce, result }, parentOrigin);
  status.textContent = result.ok ? 'Passkey checked. Return to the desktop app to finish.' : 'Passkey request ended. Return to the desktop app to retry or use a backup code.';
}

window.addEventListener('message', event => {
  if (!parent || event.source !== parent || !loopbackOrigin(event.origin) || done) return;
  const message = event.data;
  if (message?.type === 'voics:hello' && !request) {
    parent.postMessage({ type: 'voics:ready' }, event.origin);
    return;
  }
  if (request) {
    if (event.origin === parentOrigin && message?.type === 'voics:cancel' && message.nonce === request.nonce) finish({ ok: false, reason: 'cancelled' });
    return;
  }
  if (!validRequest(message, location.hostname)) return;
  request = message;
  parentOrigin = event.origin;
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) {
    finish({ ok: false, reason: 'unavailable' });
    status.textContent = 'This browser cannot use passkeys here. Use a current browser or return to the app for a backup code.';
    return;
  }
  document.getElementById('heading').textContent = request.kind === 'create' ? 'Add your passkey' : 'Use your passkey';
  status.textContent = 'Select Continue to open your browser’s passkey prompt.';
  account.textContent = request.kind === 'create' ? 'Account: ' + String(request.publicKey.user?.displayName ?? request.publicKey.user?.name ?? '') : 'Confirm the sign-in you started in the desktop app.';
  account.hidden = false;
  next.hidden = false;
  cancel.hidden = false;
});

next.addEventListener('click', async () => {
  if (!request || done || next.disabled) return;
  next.disabled = true;
  status.textContent = 'Follow your browser’s passkey prompt.';
  try {
    const options = { publicKey: optionsFromJSON(request.kind, request.publicKey), signal: controller.signal };
    const credential = request.kind === 'create' ? await navigator.credentials.create(options) : await navigator.credentials.get(options);
    if (!credential) throw new DOMException('Cancelled', 'NotAllowedError');
    finish({ ok: true, credential: credentialJSON(credential) });
  } catch (error) {
    finish({ ok: false, reason: ['NotAllowedError', 'AbortError'].includes(error?.name) ? 'cancelled' : 'failed' });
  }
});
cancel.addEventListener('click', () => finish({ ok: false, reason: 'cancelled' }));
window.addEventListener('pagehide', () => finish({ ok: false, reason: 'cancelled' }));
setTimeout(() => finish({ ok: false, reason: 'timeout' }), 240_000);
