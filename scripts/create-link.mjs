import path from 'node:path';
import { createShareToken } from '../lib/share-token.mjs';

const DEVELOPMENT_SECRET = 'development-only-secret-change-before-deploying';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const model = readArg('model', 'product.glb');
const name = readArg('name', '工业产品预览');
const client = readArg('client', '授权客户');
const hours = Number(readArg('hours', '72'));
const baseUrl = readArg('base-url', 'http://localhost:4173').replace(/\/$/, '');
const secret = process.env.SHARE_SECRET || DEVELOPMENT_SECRET;

if (path.basename(model) !== model || !model.toLowerCase().endsWith('.glb')) {
  throw new Error('--model 必须是 models 目录内的 .glb 文件名');
}
if (!Number.isFinite(hours) || hours <= 0) {
  throw new Error('--hours 必须是大于 0 的数字');
}
if (secret === DEVELOPMENT_SECRET) {
  console.warn('警告：当前使用开发密钥，正式部署前请设置 SHARE_SECRET。');
}

const payload = {
  aud: 'private-product-viewer',
  v: 1,
  model,
  name,
  client,
  exp: Math.floor(Date.now() / 1000) + Math.round(hours * 60 * 60),
};
const token = createShareToken(payload, secret);

console.log(`${baseUrl}/#token=${token}`);
