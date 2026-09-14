const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function writeFiles(root, files) {
  for (const [filename, content] of Object.entries(files)) {
    const target = path.join(root, filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
}

function writeAssets(root, assets) {
  fs.writeFileSync(path.join(root, 'sw-assets.js'),
    'const PWA_ASSETS = {core: ' + JSON.stringify(assets) + '};', 'utf8');
}

function createAssetFixture(testContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-assets-'));
  const files = {
    'index.html': '<script type="module" src="js/scene.js"></script><link href="css/main.css" rel="stylesheet">',
    'games/level.html': '<script type="module" src="../js/scene.js"></script>',
    'offline.html': '<html><head><title>offline</title></head></html>',
    'manifest.json': JSON.stringify({ start_url: './', icons: [{ src: 'icons/icon.svg' }] }),
    'sw.js': "importScripts('./sw-assets.js');",
    'js/scene.js': "import './vendor/three.module.js';",
    'js/vendor/three.module.js': "export { scene } from './three.core.js';",
    'js/vendor/three.core.js': 'export const scene = 1;',
    'css/main.css': "@font-face{font-family:test;src:url('../fonts/scene.woff2')}",
    'fonts/scene.woff2': 'test fixture',
    'icons/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
  };
  const assets = ['./', './sw-assets.js', ...Object.keys(files).map((file) => './' + file)];
  writeFiles(root, files);
  writeAssets(root, assets);
  testContext.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('sw-assets-'));
    fs.rmSync(root, { recursive: true });
  });
  return { root, assets };
}

module.exports = { createAssetFixture, writeAssets, writeFiles };
