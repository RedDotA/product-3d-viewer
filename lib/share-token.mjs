import crypto from 'node:crypto';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

export function createShareToken(payload, secret) {
  const body = encode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyShareToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) {
    throw new Error('invalid_token');
  }

  const [body, signature] = token.split('.');
  if (!body || !signature) {
    throw new Error('invalid_token');
  }

  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error('invalid_signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.aud !== 'private-product-viewer' || payload.v !== 1) {
    throw new Error('invalid_audience');
  }
  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('expired_token');
  }
  if (typeof payload.model !== 'string' || payload.model.length === 0) {
    throw new Error('invalid_model');
  }

  return payload;
}
