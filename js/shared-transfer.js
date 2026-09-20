/* 导入提交成功后立即重载，避免运行中的旧游戏再次覆盖新存档。 */
const SAVE_BYTES_PER_KIBIBYTE = 1024;

class SaveTransfer {
  constructor(options) {
    this.storage = options.storage;
    this.version = options.version;
    this.reload = options.reload;
    this.now = options.now;
    this.capture = options.capture;
    this.isReloading = false;
  }

  createSnapshot() {
    this.capture();
    return { ...this.storage.getSnapshot(), __save_version: this.version, __export_time: this.now().toISOString() };
  }

  inspectSnapshot(data) {
    const incoming = this.validateSnapshot(data);
    const current = this.storage.getSnapshot();
    const counts = { added: 0, replaced: 0, unchanged: 0 };
    for (const [key, raw] of Object.entries(incoming)) {
      if (!Object.hasOwn(current, key)) counts.added++;
      else if (current[key] === raw) counts.unchanged++;
      else counts.replaced++;
    }
    return Object.freeze({ ...counts, total: Object.keys(incoming).length });
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
  capture: () => GameSaveCheckpoints.capture(),
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
    showToast(`已生成存档文件 (${(blob.size / SAVE_BYTES_PER_KIBIBYTE).toFixed(1)} KB)，请在浏览器下载中查看。`, 'success');
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
    try {
      const data = JSON.parse(reader.result);
      GameSaveTransfer.validateSnapshot(data);
      new SaveImportDialog({
        document, transfer: GameSaveTransfer, createFocus: overlay => new ModalFocus(overlay),
        exportCurrent: exportData, reportError: error => console.error('导入存档失败:', error),
      }).open(data, file.name);
    }
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
