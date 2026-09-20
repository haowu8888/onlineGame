const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime, plain, BrowserEvent } = require('./fixtures/shared-runtime.js');

test('导入覆盖旧 pending，其他待保存条目一并落盘后再重载', () => {
  const { api, data, context } = createSharedRuntime({ cultivation_save: '{"level":1}' });
  api.Storage.set('cultivation_save', { level: 2 });
  api.Storage.set('player_profile', { name: '新昵称' });
  const count = api.GameSaveTransfer.applySnapshot({ __save_version: 1, cultivation_save: '{"level":9}' });
  assert.equal(count, 1);
  assert.equal(api.GameSaveTransfer.isReloading, true);
  assert.equal(context.reloads, 1);
  assert.equal(data.get('cultivation_save'), '{"level":9}');
  assert.equal(data.get('player_profile'), '{"name":"新昵称"}');
  api.Storage.flush();
  assert.equal(data.get('cultivation_save'), '{"level":9}');
});

test('导入失败回滚磁盘且保留原 pending，不重载也不禁用后续保存', () => {
  const { api, data, control, context } = createSharedRuntime({ cultivation_save: '{"level":1}' });
  api.Storage.set('cultivation_save', { level: 2 });
  control.onWrite = key => { if (key === 'second') throw new Error('quota'); };
  assert.throws(() => api.GameSaveTransfer.applySnapshot({ cultivation_save: '{"level":9}', second: '1' }), /已恢复/);
  assert.equal(data.get('cultivation_save'), '{"level":1}');
  assert.deepEqual(plain(api.Storage.get('cultivation_save')), { level: 2 });
  assert.equal(context.reloads, 0);
  assert.equal(api.GameSaveTransfer.isReloading, false);
});

test('导出包含尚未保存的最新快照，即使存储已满也能恢复这些数据', () => {
  const { api, control } = createSharedRuntime({ save: '{"level":1}' });
  api.Storage.set('save', { level: 8 });
  control.onWrite = () => { throw new Error('quota'); };
  assert.equal(api.Storage.flush(), false);
  const exported = api.GameSaveTransfer.createSnapshot();
  assert.equal(exported.save, '{"level":8}');
  assert.equal(exported.__save_version, 1);
  assert.ok(exported.__export_time);
});

test('导入格式或版本无效时不开始写入', () => {
  const { api, data } = createSharedRuntime();
  assert.throws(() => api.GameSaveTransfer.applySnapshot([]), /JSON 对象/);
  assert.throws(() => api.GameSaveTransfer.applySnapshot({ save: '{oops' }), /有效 JSON/);
  assert.throws(() => api.GameSaveTransfer.applySnapshot({ save: 3 }), /JSON 字符串/);
  assert.throws(() => api.GameSaveTransfer.applySnapshot({ __save_version: 999, save: '1' }), /版本过新/);
  assert.equal(data.size, 0);
});

test('PWA 更新前存储失败会取消更新，重试成功后允许更新', () => {
  const { api, control, document } = createSharedRuntime();
  api.Storage.set('save', { level: 8 });
  control.onWrite = () => { throw new Error('quota'); };
  const failed = new BrowserEvent('pwa:before-update', { cancelable: true });
  document.dispatchEvent(failed);
  assert.equal(failed.defaultPrevented, true);
  control.onWrite = null;
  const retried = new BrowserEvent('pwa:before-update', { cancelable: true });
  document.dispatchEvent(retried);
  assert.equal(retried.defaultPrevented, false);
});

test('导入预览区分新增、替换与相同数据，读取最新 pending 且不写盘或重载', () => {
  const { api, control, context } = createSharedRuntime({ save: '1', settings: 'false' });
  api.Storage.set('save', 2);
  const summary = api.GameSaveTransfer.inspectSnapshot({
    __save_version: 1, save: '2', settings: 'true', new_game: '{"level":1}',
  });
  assert.deepEqual(plain(summary), { added: 1, replaced: 1, unchanged: 1, total: 3 });
  assert.equal(control.writes.length, 0);
  assert.equal(context.reloads, 0);
  assert.equal(api.Storage.pending.size, 1);
});

test('采集最新游戏进度异常时导出明确失败，并阻止 PWA 更新', () => {
  const { api, document, errors } = createSharedRuntime();
  api.GameSaveCheckpoints.register('broken', () => { throw new Error('capture failed'); });
  assert.throws(() => api.GameSaveTransfer.createSnapshot(), /capture failed/);
  const update = new BrowserEvent('pwa:before-update', { cancelable: true });
  assert.equal(document.dispatchEvent(update), false);
  assert.ok(errors.some(entry => entry[0].includes('采集最新进度')));
});
