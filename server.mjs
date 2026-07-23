import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyShareToken } from './lib/share-token.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(ROOT, 'dist');
const MODELS_DIR = path.join(ROOT, 'models');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DEVELOPMENT_SECRET = 'development-only-secret-change-before-deploying';
const SHARE_SECRET = process.env.SHARE_SECRET || DEVELOPMENT_SECRET;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function applySecurityHeaders(response) {
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
}

function sendJson(response, status, data) {
  applySecurityHeaders(response);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
  });
  response.end(JSON.stringify(data));
}

function readBearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function authorize(request) {
  return verifyShareToken(readBearerToken(request), SHARE_SECRET);
}

function safeModelPath(filename) {
  if (path.basename(filename) !== filename || !filename.toLowerCase().endsWith('.glb')) {
    throw new Error('invalid_model_path');
  }
  return path.join(MODELS_DIR, filename);
}

function serveModel(request, response) {
  let payload;
  try {
    payload = authorize(request);
  } catch {
    sendJson(response, 401, { message: '访问链接无效或已过期' });
    return;
  }

  const modelPath = safeModelPath(payload.model);
  fs.stat(modelPath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendJson(response, 404, { message: '模型文件尚未上传或已被移除' });
      return;
    }

    applySecurityHeaders(response);
    response.writeHead(200, {
      'Content-Type': 'model/gltf-binary',
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${path.basename(modelPath)}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'Accept-Ranges': 'none',
    });
    fs.createReadStream(modelPath).pipe(response);
  });
}

function serveShareConfig(request, response) {
  try {
    const payload = authorize(request);
    sendJson(response, 200, {
      name: payload.name || '工业产品预览',
      client: payload.client || '授权客户',
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      modelUrl: '/api/model',
    });
  } catch {
    sendJson(response, 401, { message: '访问链接无效或已过期' });
  }
}

function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  let filePath = path.resolve(DIST_DIR, requested);
  if (!filePath.startsWith(`${DIST_DIR}${path.sep}`) && filePath !== path.join(DIST_DIR, 'index.html')) {
    response.writeHead(404);
    response.end();
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        sendJson(response, 503, { message: '网页尚未构建，请先运行 npm run build' });
        return;
      }
      applySecurityHeaders(response);
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      response.end(content);
    });
  });
}

const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    sendJson(response, 405, { message: 'Method not allowed' });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/share') {
    serveShareConfig(request, response);
    return;
  }
  if (url.pathname === '/api/model') {
    serveModel(request, response);
    return;
  }
  serveStatic(request, response, decodeURIComponent(url.pathname));
});

server.listen(PORT, HOST, () => {
  if (SHARE_SECRET === DEVELOPMENT_SECRET) {
    console.warn('警告：当前使用开发密钥，正式部署前请设置 SHARE_SECRET。');
  }
  console.log(`3D 查看器已启动：http://${HOST}:${PORT}`);
});
