/* 先预览，再提交；取消、预览和校验都不会写入存档。 */
class SaveImportDialog {
  constructor(options) {
    this.document = options.document;
    this.transfer = options.transfer;
    this.createFocus = options.createFocus;
    this.exportCurrent = options.exportCurrent;
    this.reportError = options.reportError;
  }

  element(tag, options = {}) {
    const node = this.document.createElement(tag);
    node.className = options.className ?? '';
    node.textContent = options.text ?? '';
    if (options.id) node.id = options.id;
    return node;
  }

  button(label, options) {
    const button = this.element('button', { className: options.className, text: label });
    button.type = 'button';
    button.addEventListener('click', options.onClick);
    return button;
  }

  append(parent, children) {
    children.forEach(child => parent.appendChild(child));
    return parent;
  }

  buildBody(filename) {
    const body = this.element('div', { className: 'modal-body' });
    const file = this.element('p', { className: 'form-group', text: filename });
    file.style.overflowWrap = 'anywhere';
    const timestamp = typeof this.data.__export_time === 'string' ? Date.parse(this.data.__export_time) : NaN;
    const date = Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('zh-CN') : '未记录';
    this.summary = this.element('p', { className: 'form-group', id: 'save-import-summary' });
    this.error = this.element('p', { className: 'form-group' });
    this.error.setAttribute('role', 'alert');
    this.error.hidden = true;
    return this.append(body, [file, this.element('p', { className: 'form-group', text: '备份时间：' + date }),
      this.summary, this.element('p', { className: 'form-group',
        text: '导入会替换同名数据，保留本机的其他数据，并刷新当前页面。可以先导出当前存档留作备份。' }),
      this.button('先导出当前存档', { className: 'btn btn-outline btn-sm', onClick: this.exportCurrent }), this.error]);
  }

  build(filename) {
    this.overlay = this.element('div', { className: 'modal-overlay' });
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'save-import-title');
    this.overlay.setAttribute('aria-describedby', 'save-import-summary');
    const header = this.append(this.element('div', { className: 'modal-header' }), [
      this.element('h3', { className: 'modal-title', id: 'save-import-title', text: '确认导入存档' }),
      this.button('×', { className: 'modal-close', onClick: () => this.close() }),
    ]);
    header.children[1].setAttribute('aria-label', '取消导入');
    this.confirm = this.button('导入并刷新', { className: 'btn btn-gold btn-sm', onClick: () => this.apply() });
    const footer = this.append(this.element('div', { className: 'modal-footer' }), [
      this.button('取消', { className: 'btn btn-outline btn-sm', onClick: () => this.close() }), this.confirm,
    ]);
    this.append(this.overlay, [this.append(this.element('div', { className: 'modal' }),
      [header, this.buildBody(filename), footer])]);
    this.overlay.addEventListener('click', event => { if (event.target === this.overlay) this.close(); });
    this.document.body.appendChild(this.overlay);
    this.focus = this.createFocus(this.overlay);
  }

  open(data, filename) {
    const summary = this.transfer.inspectSnapshot(data);
    this.data = Object.freeze({ ...data });
    this.build(filename);
    this.summary.textContent = `共 ${summary.total} 项数据：新增 ${summary.added} 项，替换 ${summary.replaced} 项，相同 ${summary.unchanged} 项。`;
    this.focus.open();
  }

  apply() {
    if (this.confirm.disabled) return;
    this.confirm.disabled = true;
    this.error.hidden = true;
    try {
      this.transfer.applySnapshot(this.data);
      this.confirm.textContent = '正在刷新…';
    } catch (error) {
      this.reportError(error);
      this.error.textContent = `导入失败：${error.message}`;
      this.error.hidden = false;
      this.confirm.disabled = false;
      this.confirm.focus();
    }
  }

  close() {
    this.focus.destroy();
    this.overlay.remove();
  }
}
