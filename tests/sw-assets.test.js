const test = require('node:test');
const assert = require('node:assert/strict');
const { checkPrecache } = require('../scripts/check-sw-assets.js');
const {
  htmlReferences, inlineModules, cssReferences, localReference, readModuleReferences,
} = require('../scripts/sw-dependencies.js');
const { createAssetFixture, writeAssets, writeFiles } = require('./helpers/sw-assets-fixture.js');

const TEST_TIMEOUT_MS = 60000;

test('页面引用识别兼容引号、属性顺序、ES 模块预载和 manifest', { timeout: TEST_TIMEOUT_MS }, () => {
  const html = [
    '<link href="../css/game.css" rel="stylesheet">',
    "<script defer src='../js/game.js'></script>",
    '<link rel="modulepreload" href="../js/vendor/three.module.js">',
    '<link href="../manifest.json" rel="manifest">',
    '<link rel="preconnect" href="https://cdn.jsdelivr.net">',
    '<!-- <script src="ignored.js"></script> -->',
  ].join('\n');

  assert.deepEqual(htmlReferences(html), [
    '../css/game.css', '../js/game.js', '../js/vendor/three.module.js', '../manifest.json',
  ]);
  assert.equal(localReference('../js/game.js?v=2#main', 'games/level.html'), 'js/game.js?v=2');
  assert.equal(localReference('https://cdn.jsdelivr.net/font.css', 'index.html'), null);
});

test('CSS 依赖包含字体、背景图和导入样式', { timeout: TEST_TIMEOUT_MS }, () => {
  const references = cssReferences(
    "@import './theme.css'; body{background:url('../icons/icon.svg')} @font-face{src:url(../fonts/scene.woff2)}"
  );
  assert.deepEqual(references, ['../icons/icon.svg', '../fonts/scene.woff2', './theme.css']);
});

test('原生模块解析识别压缩 import/export，并忽略注释和普通字符串', { timeout: TEST_TIMEOUT_MS }, () => {
  const references = readModuleReferences([{
    filename: 'js/scene.js',
    source: [
      "const label = \"import './fake.js'\";",
      "/* import './comment.js'; */",
      'import{Scene}from"./vendor/three.core.js";export{Scene};',
      "export{Mesh}from'./vendor/three.module.js';",
    ].join('\n'),
  }]);

  assert.deepEqual(references.get('js/scene.js'), [
    './vendor/three.core.js', './vendor/three.module.js',
  ]);
});

test('完整页面和传递依赖通过，漏掉 Three.js 次级模块时明确失败', { timeout: TEST_TIMEOUT_MS }, (context) => {
  const fixture = createAssetFixture(context);
  const complete = checkPrecache(fixture.root);
  assert.deepEqual(complete.errors, []);
  assert.equal(complete.pageCount, 3);
  writeAssets(fixture.root, fixture.assets.filter((asset) => asset !== './js/vendor/three.core.js'));

  const incomplete = checkPrecache(fixture.root);

  assert.ok(incomplete.errors.includes('资源未加入核心预缓存: js/vendor/three.core.js'));
});

test('内联模块依赖和磁盘缺失文件都会报告，不能仅有清单就算通过', { timeout: TEST_TIMEOUT_MS }, (context) => {
  const fixture = createAssetFixture(context);
  writeFiles(fixture.root, {
    'index.html': '<script type="module">import "./js/extra.js";</script>',
    'js/extra.js': 'export const extra = true;',
  });
  writeAssets(fixture.root, [...fixture.assets, './js/missing.js']);

  const result = checkPrecache(fixture.root);

  assert.ok(result.errors.includes('资源未加入核心预缓存: js/extra.js'));
  assert.ok(result.errors.includes('预缓存清单中的文件不存在: js/missing.js'));
});

test('动态 import 的字面量依赖进入清单，字符串、注释、正则和普通方法不误判', { timeout: TEST_TIMEOUT_MS }, () => {
  const references = readModuleReferences([{
    filename: 'js/entry.js',
    source: [
      "const note = \"import('./fake.js')\";",
      "const pattern = /import\\('regex'\\)/;",
      "// import('./comment.js');",
      "const loader = { import(value) { return value; } }; loader.import('./method.js');",
      "import /* runtime entry */ ('./knife.js').then(() => {});",
    ].join('\n'),
  }]);
  assert.deepEqual(references.get('js/entry.js'), ['./knife.js']);
});

test('SVG data URI 内含标签时不截断属性，工作树页面不混入站点资源', { timeout: TEST_TIMEOUT_MS }, (context) => {
  const fixture = createAssetFixture(context);
  const svg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text>G</text></svg>";
  const html = '<link rel="icon" href="' + svg + '">';
  assert.deepEqual(htmlReferences(html), [svg]);
  writeFiles(fixture.root, {
    'index.html': html,
    '.worktrees/old/index.html': '<script src="missing.js"></script>',
  });
  const result = checkPrecache(fixture.root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.pageCount, 3);
});

test('版本查询参与缓存键，动态入口的版本化依赖必须完整缓存', { timeout: TEST_TIMEOUT_MS }, (context) => {
  const fixture = createAssetFixture(context);
  writeFiles(fixture.root, {
    'index.html': '<script type="module" src="js/entry.js?v=30"></script>',
    'js/entry.js': "import('./scene.js?v=30');",
  });
  const missing = checkPrecache(fixture.root);
  assert.ok(missing.errors.includes('资源未加入核心预缓存: js/entry.js?v=30'));
  assert.ok(missing.errors.includes('资源未加入核心预缓存: js/scene.js?v=30'));
  writeAssets(fixture.root, [
    ...fixture.assets, './js/entry.js?v=30', './js/scene.js?v=30',
  ]);

  assert.deepEqual(checkPrecache(fixture.root).errors, []);
});

test('HTML 查询中的转义符按浏览器语义解码，注释内模块不参与加载', { timeout: TEST_TIMEOUT_MS }, () => {
  const source = [
    '<script src="js/game.js?mode=play&amp;v=30"></script>',
    '<!-- <script type="module">import "./ignored.js";</script> -->',
  ].join('\n');

  assert.deepEqual(htmlReferences(source), ['js/game.js?mode=play&v=30']);
  assert.deepEqual(inlineModules({ filename: 'index.html', source }), []);
});
