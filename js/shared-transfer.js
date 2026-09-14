/* 导入提交成功后立即重载，避免运行中的旧游戏再次覆盖新存档。 */
class SaveTransfer {
  constructor(options) {
    this.storage = options.storage;
    this.version = options.version;
    this.reload = options.reload;
    this.now = options.now;
    this.isReloading = false;
  }

  createSnapshot() {
    return { ...this.storage.getSnapshot(), __save_version: this.version, __export_time: this.now().toISOString() };
  }

  validateSnapshot(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('存档格式无效：需要 JSON 对象');
    const version = data.__save_version ?? 0;
    if (!Number.isInteger(version) || version < 0) throw new TypeError('存档版本无效');
    if (version > this.version) throw new Error('存档版本过新，请更新游戏后重试');
    const entries = Object.entries(data).filter(([key]) => !key.startsWith('__'));
    if (!entries.length) throw new Error('未发现有效存档数据');
    for (const [key, raw] of entries) {
      if (typeof raw !== 'string') throw new TypeError(`存档条目 ${key} 必须为 JSON 字符串`);
      try { JSON.parse(raw); }
      catch (error) { throw new SyntaxError(`存档条目 ${key} 不是有效 JSON`, { cause: error }); }
    }
    return Object.fromEntries(entries);
  }

  applySnapshot(data) {
    const rawValues = this.validateSnapshot(data);
    this.storage.importSnapshot(rawValues);
    this.isReloading = true;
    try { this.reload(); }
    catch (error) { this.isReloading = false; throw error; }
    return Object.keys(rawValues).length;
  }
}

window.GameSaveTransfer = new SaveTransfer({
  storage: Storage,
  version: CONSTANTS.SAVE_VERSION,
  reload: () => location.reload(),
  now: () => new Date(),
});

function exportData() {
  try {
    const snapshot = GameSaveTransfer.createSnapshot();
    const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `仙界游坊_存档_${snapshot.__export_time.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast(`存档导出成功 (${Storage.getUsedSize()}KB)`, 'success');
  } catch (error) {
    console.error('导出存档失败:', error);
    showToast(`导出失败：${error.message}`, 'error');
  }
}

function readImportFile(file) {
  if (file.size > CONSTANTS.MAX_IMPORT_FILE_SIZE) {
    showToast('文件过大，请检查是否选择了正确的存档文件', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try { GameSaveTransfer.applySnapshot(JSON.parse(reader.result)); }
    catch (error) {
      console.error('导入存档失败:', error);
      showToast(`导入失败：${error.message}`, 'error', CONSTANTS.STORAGE_ERROR_DURATION);
    }
  };
  reader.onerror = () => showToast('文件读取失败', 'error');
  reader.readAsText(file);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) readImportFile(file);
  });
  input.click();
}
