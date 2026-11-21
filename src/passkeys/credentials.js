/** WebAuthn JSON conversion, including browsers predating the JSON convenience methods. */
export function bytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid credential data');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function base64url(value) {
  return btoa(Array.from(new Uint8Array(value), byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function optionsFromJSON(kind, json) {
  const options = { ...json, challenge: bytes(json.challenge) };
  const descriptors = list => list.map(item => ({ ...item, id: bytes(item.id) }));
  if (kind === 'create') {
    options.user = { ...json.user, id: bytes(json.user.id) };
    if (json.excludeCredentials) options.excludeCredentials = descriptors(json.excludeCredentials);
  } else if (json.allowCredentials) options.allowCredentials = descriptors(json.allowCredentials);
  return options;
}

export function credentialJSON(credential) {
  const response = credential.response;
  const result = {
    id: credential.id,
    rawId: base64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: { clientDataJSON: base64url(response.clientDataJSON) },
  };
  if ('attestationObject' in response) {
    result.response.attestationObject = base64url(response.attestationObject);
    result.response.transports = response.getTransports?.() ?? [];
  } else {
    result.response.authenticatorData = base64url(response.authenticatorData);
    result.response.signature = base64url(response.signature);
    result.response.userHandle = response.userHandle ? base64url(response.userHandle) : null;
  }
  return result;
}

export function loopbackOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === value && url.protocol === 'http:' && url.hostname === '127.0.0.1' && Boolean(url.port) && !url.username && !url.password;
  } catch { return false; }
}

export function validRequest(value, hostname) {
  if (!value || value.type !== 'voics:request' || !/^[A-Za-z0-9_-]{43}$/.test(value.nonce) || !['create', 'get'].includes(value.kind)) return false;
  if (JSON.stringify(value).length > 65536 || !value.publicKey || typeof value.publicKey.challenge !== 'string') return false;
  const rp = value.kind === 'create' ? value.publicKey.rp?.id : value.publicKey.rpId;
  return typeof rp === 'string' && rp.length > 0 && (hostname === rp || hostname.endsWith('.' + rp));
}
