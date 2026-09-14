#!/usr/bin/env node
// 校验全部页面、CSS 资源、SW 导入以及本地 ES import/export 的递归依赖。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  listSiteFiles, htmlReferences, inlineModules, cssReferences, manifestReferences,
  workerReferences, localReference, filePath, readModuleReferences,
} = require('./sw-dependencies.js');

function readConfiguration(root) {
  const source = fs.readFileSync(path.join(root, 'sw-assets.js'), 'utf8');
  const assets = vm.runInNewContext(source + '\nPWA_ASSETS.core', {}, { filename: 'sw-assets.js' });
  if (!Array.isArray(assets) || assets.some((asset) => typeof asset !== 'string')) {
    throw new Error('sw-assets.js 的 PWA_ASSETS.core 必须是路径数组');
  }
  return assets.map((asset) => localReference(asset, 'sw.js')).filter((asset) => asset !== null);
}

function collectModules({ root, files, pages }) {
  const sources = files.filter((file) => /^js\/.*\.m?js$/.test(file)).map((filename) => ({
    filename, source: fs.readFileSync(filePath(root, filename), 'utf8'),
  }));
  const inline = pages.flatMap((filename) => inlineModules({
    filename, source: fs.readFileSync(filePath(root, filename), 'utf8'),
  }));
  return readModuleReferences([...sources, ...inline]);
}

function sourceReferences({ filename, source }) {
  if (filename.endsWith('.html')) return htmlReferences(source);
  if (filename.endsWith('.css')) return cssReferences(source);
  if (filename.endsWith('manifest.json')) return manifestReferences(source);
  if (filename === 'sw.js') return workerReferences(source);
  return [];
}

function inspectFile({ root, filename, cached, modules }) {
  if (filename === '') return { errors: [], files: [] };
  const errors = cached.has(filename) ? [] : ['资源未加入核心预缓存: ' + filename];
  const target = filePath(root, filename);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return { errors: [...errors, '依赖文件不存在: ' + filename], files: [] };
  }
  const sourcePath = filename.split(/[?#]/)[0];
  const isSource = /\.(?:html|css|m?js|json)$/.test(sourcePath);
  const source = isSource ? fs.readFileSync(target, 'utf8') : '';
  const imports = modules.get(sourcePath) || [];
  const invalidImports = imports.filter((ref) => !/^(?:\.{1,2}\/|\/|https?:\/\/)/.test(ref));
  errors.push(...invalidImports.map((ref) => '无法解析本地模块导入: ' + sourcePath + ' → ' + ref));
  const validImports = imports.filter((ref) => !invalidImports.includes(ref));
  const references = [...sourceReferences({ filename: sourcePath, source }), ...validImports];
  const files = references.map((ref) => localReference(ref, filename)).filter((ref) => ref !== null);
  return { errors, files };
}

function walkDependencies({ root, pages, cached, modules }) {
  const queue = [...pages, 'sw.js', 'manifest.json'];
  const visited = new Set();
  const errors = [];
  for (let index = 0; index < queue.length; index += 1) {
    const filename = queue[index];
    if (visited.has(filename)) continue;
    visited.add(filename);
    const result = inspectFile({ root, filename, cached, modules });
    errors.push(...result.errors);
    queue.push(...result.files);
  }
  return errors;
}

function checkPrecache(root) {
  const files = listSiteFiles({ root });
  const pages = files.filter((file) => file.endsWith('.html'));
  const assets = readConfiguration(root);
  const cached = new Set(assets);
  const missing = assets.filter((file) => file !== '' && !fs.existsSync(filePath(root, file)));
  const errors = missing.map((file) => '预缓存清单中的文件不存在: ' + file);
  if (cached.size !== assets.length) errors.push('核心预缓存清单含有重复请求路径');
  const modules = collectModules({ root, files, pages });
  errors.push(...walkDependencies({ root, pages, cached, modules }));
  return { errors: [...new Set(errors)], assetCount: cached.size, pageCount: pages.length };
}

function main() {
  const result = checkPrecache(path.resolve(__dirname, '..'));
  if (result.errors.length) {
    console.error('✖ Service Worker 预缓存清单校验失败：');
    for (const error of result.errors) console.error('  - ' + error);
    console.error('修复 sw-assets.js 后，请同步递增 sw.js 中的 CACHE_VERSION。');
    process.exitCode = 1;
    return;
  }
  console.log('✓ 核心预缓存依赖校验通过（' + result.assetCount + ' 个资源，' + result.pageCount + ' 个页面）');
}

if (require.main === module) main();
module.exports = { checkPrecache };
