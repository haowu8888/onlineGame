const SettingsFields = {
  initialValue(field, saved) {
    const value = saved?.[field.key] ?? field.default;
    if (field.type === 'checkbox') return typeof value === 'boolean' ? value : field.default;
    if (field.type === 'select') {
      const option = field.options.find(item => String(item.value) === String(value));
      return option ? option.value : field.default;
    }
    if (field.type === 'range') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? clamp(numeric, field.min, field.max) : field.default;
    }
    return String(value ?? '');
  },
  read(field, input) {
    if (field.type === 'checkbox') return input.checked;
    if (field.type === 'range') {
      const value = Number(input.value);
      if (!Number.isFinite(value)) throw new TypeError(`${field.label}必须为数字`);
      return clamp(value, field.min, field.max);
    }
    if (field.type === 'select') {
      const selected = field.options.find(option => String(option.value) === input.value);
      if (!selected) throw new TypeError(`${field.label}选项无效`);
      return selected.value;
    }
    return input.value;
  },
  markup(field, value) {
    const identity = `id="settings-${escapeHtml(field.key)}" data-key="${escapeHtml(field.key)}"`;
    if (field.type === 'checkbox') {
      return `<label class="form-check"><input type="checkbox" ${identity} ${value ? 'checked' : ''}><span>${escapeHtml(field.checkLabel ?? '')}</span></label>`;
    }
    if (field.type === 'range') {
      return `<input type="range" class="form-range" ${identity} min="${field.min}" max="${field.max}" step="${field.step ?? 1}" value="${value}"><span class="range-value">${value}</span>`;
    }
    if (field.type === 'select') {
      const options = field.options.map(option => `<option value="${escapeHtml(option.value)}" ${value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      return `<select class="form-select" ${identity}>${options}</select>`;
    }
    return `<input type="text" class="form-input" ${identity} value="${escapeHtml(value)}">`;
  },
};

class SettingsModal {
  constructor(schema, storageKey, onChange) {
    this.schema = schema;
    this.storageKey = storageKey;
    this.onChange = onChange;
    this.values = this._readValues();
    if (window._settingsModal) window._settingsModal.destroy();
    this._build();
    window._settingsModal = this;
  }

  _defaults() {
    return Object.fromEntries(this.schema.map(field => [field.key, field.default]));
  }

  _readValues() {
    const saved = Storage.get(this.storageKey, {});
    return Object.fromEntries(this.schema.map(field => [field.key, SettingsFields.initialValue(field, saved)]));
  }

  _fieldMarkup() {
    return this.schema.map(field => `<div class="form-group"><label class="form-label" for="settings-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>${SettingsFields.markup(field, this.values[field.key])}</div>`).join('');
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'settings-title');
    this.overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3 class="modal-title" id="settings-title">设置</h3><button class="modal-close" aria-label="关闭设置">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label" for="settings-player-name">玩家昵称</label>
            <input id="settings-player-name" type="text" class="form-input" data-profile="name" maxlength="${CONSTANTS.PLAYER_NAME_MAX_LENGTH}" placeholder="用于排行榜显示"></div>
          ${this._fieldMarkup()}
          <div class="form-group"><span class="form-label">数据管理</span>
            <button class="btn btn-outline btn-sm modal-export">导出存档</button>
            <button class="btn btn-outline btn-sm modal-import">导入存档</button></div>
        </div>
        <div class="modal-footer"><button class="btn btn-outline btn-sm modal-reset">恢复默认设置</button><button class="btn btn-gold btn-sm modal-save">保存</button></div>
      </div>`;
    this.focusManager = new ModalFocus(this.overlay);
    document.body.appendChild(this.overlay);
    this._bindEvents();
  }

  _bindEvents() {
    const actions = { '.modal-close': () => this.close(), '.modal-save': () => this.save(),
      '.modal-reset': () => this.reset(), '.modal-export': exportData, '.modal-import': importData };
    for (const [selector, action] of Object.entries(actions)) {
      this.overlay.querySelector(selector).addEventListener('click', action);
    }
    this.overlay.addEventListener('click', event => { if (event.target === this.overlay) this.close(); });
    this.overlay.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => { input.nextElementSibling.textContent = input.value; });
    });
  }

  _syncForm() {
    this.overlay.querySelector('[data-profile="name"]').value = loadPlayerProfile().name ?? '';
    for (const field of this.schema) {
      const input = this.overlay.querySelector(`[data-key="${field.key}"]`);
      if (field.type === 'checkbox') input.checked = this.values[field.key];
      else input.value = this.values[field.key];
      if (field.type === 'range') input.nextElementSibling.textContent = this.values[field.key];
    }
  }

  open() {
    this.values = this._readValues();
    this._syncForm();
    this.focusManager.open();
  }

  close() {
    this.focusManager.close();
  }

  _formValues() {
    return Object.fromEntries(this.schema.map(field => {
      const input = this.overlay.querySelector(`[data-key="${field.key}"]`);
      return [field.key, SettingsFields.read(field, input)];
    }));
  }

  save() {
    let values;
    try {
      values = this._formValues();
      const name = this.overlay.querySelector('[data-profile="name"]').value.trim().slice(0, CONSTANTS.PLAYER_NAME_MAX_LENGTH);
      Storage.setManyImmediate({ [this.storageKey]: values, [PLAYER_PROFILE_KEY]: { ...loadPlayerProfile(), name } });
    } catch (error) {
      console.error('保存设置失败:', error);
      showToast(`设置未保存：${error.message}`, 'error');
      return false;
    }
    this.values = values;
    this.close();
    if (this.onChange) this.onChange({ ...values });
    showToast('设置已保存', 'success');
    return true;
  }

  reset() {
    const values = this._defaults();
    if (!Storage.setImmediate(this.storageKey, values)) return false;
    this.values = values;
    this._syncForm();
    if (this.onChange) this.onChange({ ...values });
    showToast('已恢复默认设置', 'info');
    return true;
  }

  get(key) {
    return this.values[key];
  }

  destroy() {
    this.focusManager.destroy();
    this.overlay.remove();
    if (window._settingsModal === this) window._settingsModal = null;
  }
}
