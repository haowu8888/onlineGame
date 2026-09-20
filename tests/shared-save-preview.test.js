const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime } = require('./fixtures/shared-runtime');

function createDialog(runtime) {
  return new runtime.api.SaveImportDialog({
    document: runtime.document, transfer: runtime.api.GameSaveTransfer,
    createFocus: overlay => new runtime.api.ModalFocus(overlay),
    exportCurrent: () => runtime.api.GameSaveTransfer.createSnapshot(),
    reportError: error => runtime.errors.push(error),
  });
}

test('导入弹窗展示真实预览，文件名按文本渲染，取消不改变数据且恢复焦点', () => {
  const runtime = createSharedRuntime({ save: '1' });
  const opener = runtime.document.createElement('button');
  opener.focus();
  const dialog = createDialog(runtime);
  dialog.open({ save: '2', other: 'true' }, '<img src=x onerror=alert(1)>.json');
  assert.equal(dialog.overlay.getAttribute('role'), 'dialog');
  assert.equal(dialog.summary.textContent, '共 2 项数据：新增 1 项，替换 1 项，相同 0 项。');
  const body = dialog.overlay.children[0].children[1];
  assert.equal(body.children[0].textContent, '<img src=x onerror=alert(1)>.json');
  assert.equal(body.children[0].children.length, 0);
  assert.equal(body.children[1].textContent, '备份时间：未记录');
  dialog.close();
  assert.equal(dialog.overlay.isConnected, false);
  assert.equal(runtime.document.activeElement, opener);
  assert.equal(runtime.control.writes.length, 0);
  assert.equal(runtime.context.reloads, 0);
});

test('无效备份在弹窗创建之前失败，不修改存档', () => {
  const runtime = createSharedRuntime({ save: '1' });
  const dialog = createDialog(runtime);
  assert.throws(() => dialog.open({ save: '{broken' }, 'broken.json'), /有效 JSON/);
  assert.equal(dialog.overlay, undefined);
  assert.equal(runtime.data.get('save'), '1');
  assert.equal(runtime.context.reloads, 0);
});

test('提交失败在弹窗内展示错误并可重试，成功只提交与刷新一次', () => {
  const runtime = createSharedRuntime({ save: '1', settings: 'false' });
  const dialog = createDialog(runtime);
  const incoming = { save: '2', settings: 'true' };
  dialog.open(incoming, 'backup.json');
  incoming.save = '999';
  runtime.control.onWrite = key => { if (key === 'settings') throw new Error('quota'); };
  dialog.confirm.click();
  assert.equal(runtime.data.get('save'), '1');
  assert.equal(runtime.context.reloads, 0);
  assert.equal(dialog.error.hidden, false);
  assert.match(dialog.error.textContent, /导入失败.*已恢复/);
  assert.equal(dialog.confirm.disabled, false);
  assert.equal(runtime.document.activeElement, dialog.confirm);
  runtime.control.onWrite = null;
  dialog.confirm.click();
  assert.equal(runtime.data.get('save'), '2');
  assert.equal(runtime.data.get('settings'), 'true');
  assert.equal(runtime.context.reloads, 1);
  assert.equal(dialog.error.hidden, true);
  assert.equal(dialog.confirm.disabled, true);
  dialog.apply();
  assert.equal(runtime.context.reloads, 1);
});
