const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SITE_ORIGIN = 'https://precache.invalid/';
const CHECK_TIMEOUT_MS = 60000;
const EXCLUDED_DIRECTORIES = new Set(['.git', '.agents', '.codex', '.worktrees', '.tmp', 'node_modules', 'tests', 'docs']);
const RESOURCE_LINKS = new Set(['stylesheet', 'icon', 'apple-touch-icon', 'manifest', 'preload', 'modulepreload']);

function listSiteFiles({ root, directory = '' }) {
  const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filename = path.posix.join(directory, entry.name);
    if (!entry.isDirectory()) return [filename];
    if (EXCLUDED_DIRECTORIES.has(entry.name)) return [];
    return listSiteFiles({ root, directory: filename });
  });
}

function attribute(tag, name) {
  const pattern = new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>\\x22\\x27]+))', 'i');
  const match = tag.match(pattern);
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

function htmlReferences(source) {
  const html = source.replace(/<!--[\s\S]*?-->/g, '');
  const references = [];
  for (const match of html.matchAll(/<(script|link|img|audio|video|source)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)) {
    const tagName = match[1].toLowerCase();
    if (tagName === 'link') {
      const rel = (attribute(match[0], 'rel') || '').toLowerCase().split(/\s+/);
      if (!rel.some((value) => RESOURCE_LINKS.has(value))) continue;
    }
    const reference = attribute(match[0], tagName === 'link' ? 'href' : 'src');
    if (reference) references.push(reference.replaceAll('&amp;', '&'));
    const poster = attribute(match[0], 'poster');
    if (poster) references.push(poster.replaceAll('&amp;', '&'));
  }
  return references;
}

function inlineModules({ filename, source }) {
  const html = source.replace(/<!--[\s\S]*?-->/g, '');
  const modules = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attribute(match[1], 'type') !== 'module' || attribute(match[1], 'src')) continue;
    modules.push({ filename, source: match[2] });
  }
  return modules;
}

function cssReferences(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const urls = [...css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)];
  const imports = [...css.matchAll(/@import\s+(?:"([^"]+)"|'([^']+)')/gi)];
  return [...urls, ...imports].map((match) => match[1] || match[2] || match[3]);
}

function manifestReferences(source) {
  const manifest = JSON.parse(source);
  const images = [...(manifest.icons || []), ...(manifest.screenshots || [])];
  const shortcuts = (manifest.shortcuts || []).flatMap((item) => [
    item.url, ...(item.icons || []).map((icon) => icon.src),
  ]);
  return [manifest.start_url, ...images.map((image) => image.src), ...shortcuts].filter(Boolean);
}

function workerReferences(source) {
  return [...source.matchAll(/\bimportScripts\s*\(([^)]*)\)/g)].flatMap((call) => (
    [...call[1].matchAll(/(['"])([^'"]+)\1/g)].map((match) => match[2])
  ));
}

function localReference(reference, filename) {
  const url = new URL(reference, new URL(filename, SITE_ORIGIN));
  if (url.origin !== new URL(SITE_ORIGIN).origin) return null;
  return decodeURIComponent(url.pathname.slice(1)) + url.search;
}

function filePath(root, filename) {
  const target = path.resolve(root, filename.split(/[?#]/)[0]);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('资源路径超出站点目录: ' + filename);
  }
  return target;
}

function readModuleReferences(sources) {
  if (sources.length === 0) return new Map();
  const result = spawnSync(process.execPath, [
    '--experimental-vm-modules', path.join(__dirname, 'sw-module-refs.js'),
  ], { input: JSON.stringify(sources), encoding: 'utf8', timeout: CHECK_TIMEOUT_MS });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || '模块语法解析失败');
  const references = new Map();
  for (const entry of JSON.parse(result.stdout)) {
    references.set(entry.filename, [...(references.get(entry.filename) || []), ...entry.references]);
  }
  return references;
}

module.exports = {
  listSiteFiles, htmlReferences, inlineModules, cssReferences, manifestReferences,
  workerReferences, localReference, filePath, readModuleReferences,
};
