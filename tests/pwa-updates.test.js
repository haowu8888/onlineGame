const test = require('node:test');
const assert = require('node:assert/strict');
const { createUpdateHarness } = require('./helpers/pwa-updates-harness.js');

const TEST_TIMEOUT_MS = 60000;

test('直接访问游戏页也通过脚本位置登记站点根 SW，等待更新不会立即刷新', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness();

  assert.equal(app.state.registrations.length, 1);
  assert.equal(app.state.registrations[0].url.href, 'https://example.test/app/sw.js');
  assert.equal(app.state.registrations[0].config.updateViaCache, 'none');
  assert.ok(app.button('更新并刷新'));
  assert.equal(app.worker.messages.length, 0);
  assert.equal(app.state.reloads, 0);
});

test('用户点击更新时先保存，收到新 controller 后才刷新一次', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness();
  let saved = false;
  app.document.addEventListener('pwa:before-update', () => { saved = true; });

  app.button('更新并刷新').dispatchEvent(new Event('click'));

  assert.equal(saved, true);
  assert.deepEqual(app.worker.messages, ['SKIP_WAITING']);
  assert.equal(app.state.reloads, 0);
  app.serviceWorker.dispatchEvent(new Event('controllerchange'));
  app.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(app.state.reloads, 1);
});

test('存档失败取消更新事件后不会激活 worker 或禁用更新按钮', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness();
  app.document.addEventListener('pwa:before-update', (event) => event.preventDefault());

  app.button('更新并刷新').dispatchEvent(new Event('click'));

  assert.equal(app.worker.messages.length, 0);
  assert.equal(app.state.reloads, 0);
  assert.notEqual(app.button('更新并刷新').disabled, true);
});

test('其他标签页确认更新不会刷新当前游戏，用户之后可自行刷新', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness();

  app.serviceWorker.dispatchEvent(new Event('controllerchange'));

  assert.equal(app.state.reloads, 0);
  assert.ok(app.button('刷新页面'));
  app.button('刷新页面').dispatchEvent(new Event('click'));
  assert.equal(app.state.reloads, 1);
  assert.deepEqual(app.worker.messages, []);
});

test('稍后更新只关闭提示，不激活等待中的新版本', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness();

  app.button('稍后').dispatchEvent(new Event('click'));

  assert.equal(app.notice(), undefined);
  assert.equal(app.worker.messages.length, 0);
  assert.equal(app.state.reloads, 0);
});

test('首次安装不会显示更新提示或重载初始页面', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness({ waiting: false, firstInstall: true, installing: true });

  app.worker.changeState('installed');
  app.serviceWorker.dispatchEvent(new Event('controllerchange'));

  assert.equal(app.notice(), undefined);
  assert.equal(app.state.reloads, 0);
});

test('新 worker 安装完成后提示更新，注册失败保留明确错误日志', { timeout: TEST_TIMEOUT_MS }, async () => {
  const app = await createUpdateHarness({ waiting: false, installing: true });
  app.worker.changeState('installed');
  assert.ok(app.button('更新并刷新'));
  const error = new Error('service worker registration denied');

  const failed = await createUpdateHarness({ registerError: error });

  assert.equal(failed.state.errors.length, 1);
  assert.equal(failed.state.errors[0][1], error);
  assert.equal(failed.notice(), undefined);
});
