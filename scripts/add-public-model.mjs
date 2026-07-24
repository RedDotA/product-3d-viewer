import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS_DIR = path.join(ROOT, 'public', 'models');
const CATALOG_PATH = path.join(ROOT, 'public', 'models.json');
const DEFAULT_BASE_URL = 'https://reddota.github.io/product-3d-viewer/';
const MAX_GITHUB_FILE_SIZE = 100 * 1024 * 1024;

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function showHelp() {
  console.log(`
添加一个公开 GLB 模型并生成客户链接：

  npm run add-model -- \\
    --file /path/to/model.glb \\
    --name "产品名称" \\
    --client "客户公司"

可选参数：
  --id <id>             自定义分享 ID，只允许小写字母、数字和连字符
  --watermark <text>    自定义页面水印
  --base-url <url>      覆盖 GitHub Pages 基础地址
  --default             将这个模型设为不带参数时显示的默认模型
`);
}

function validateGlb(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error('--file 必须指向一个文件');
  }
  if (stat.size > MAX_GITHUB_FILE_SIZE) {
    throw new Error('模型超过 GitHub 单文件 100 MB 限制，请先压缩或减面');
  }

  const handle = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    if (fs.readSync(handle, header, 0, header.length, 0) !== header.length) {
      throw new Error('文件过短，不是有效 GLB');
    }
    if (header.toString('ascii', 0, 4) !== 'glTF' || header.readUInt32LE(4) !== 2) {
      throw new Error('仅支持 glTF 2.0 的 .glb 文件');
    }
    if (header.readUInt32LE(8) !== stat.size) {
      throw new Error('GLB 声明长度与文件大小不一致');
    }
  } finally {
    fs.closeSync(handle);
  }

  return stat.size;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

const sourceArg = readArg('file');
if (!sourceArg) {
  showHelp();
  throw new Error('缺少必填参数 --file');
}

const sourcePath = path.resolve(sourceArg);
const size = validateGlb(sourcePath);
const customId = readArg('id');
const id = customId || `share-${crypto.randomBytes(4).toString('hex')}`;
if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id)) {
  throw new Error('--id 只能包含 3–64 个小写字母、数字和连字符');
}

const name = readArg('name', path.basename(sourcePath, path.extname(sourcePath)));
const client = readArg('client');
const watermark = readArg('watermark', client ? `${client} · Glowing Disk` : 'Glowing Disk');
const baseUrl = readArg('base-url', process.env.VIEWER_BASE_URL || DEFAULT_BASE_URL);
const destinationName = `${id}.glb`;
const destinationPath = path.join(MODELS_DIR, destinationName);

fs.mkdirSync(MODELS_DIR, { recursive: true });
if (fs.existsSync(destinationPath)) {
  throw new Error(`模型 ID 已存在：${id}`);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
if (!catalog.models || typeof catalog.models !== 'object') {
  throw new Error('public/models.json 格式不正确');
}

fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
catalog.models[id] = {
  name,
  modelUrl: `models/${destinationName}`,
  client,
  watermark,
};
if (process.argv.includes('--default')) {
  catalog.default = id;
}
fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

const shareUrl = new URL(baseUrl);
shareUrl.searchParams.set('model', id);

console.log(`\n模型已添加：${name}`);
console.log(`分享 ID：${id}`);
console.log(`文件大小：${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(`客户链接：${shareUrl.toString()}`);
console.log('\n提交并发布：git add public && git commit -m "Add customer model" && git push');
