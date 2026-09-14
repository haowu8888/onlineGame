/* 可注入存储和调度器，浏览器经典脚本与 Node 测试共用。 */
class GameStorage {
  constructor(options) {
    this.backend = options.backend;
    this.schedule = options.schedule;
    this.cancel = options.cancel;
    this.reportError = options.reportError;
    this.delay = options.delay;
    this.pending = new Map();
    this.timer = null;
  }

  serialize(value) {
    const raw = JSON.stringify(value);
    if (raw === undefined) throw new TypeError('存储值必须可序列化为 JSON');
    return raw;
  }

  get(key, fallback = null) {
    try {
      const raw = this.pending.has(key) ? this.pending.get(key) : this.backend.getItem(key);
      return raw === null ? JSON.parse(this.serialize(fallback)) : JSON.parse(raw);
    } catch (error) {
      this.reportError(error, `读取 ${key}`);
      return JSON.parse(this.serialize(fallback));
    }
  }

  set(key, value) {
    this.pending.set(key, this.serialize(value));
    this.scheduleFlush();
    return true;
  }

  scheduleFlush() {
    if (this.timer !== null) return;
    this.timer = this.schedule(() => this.flush(), this.delay);
  }

  cancelScheduledFlush() {
    if (this.timer === null) return;
    this.cancel(this.timer);
    this.timer = null;
  }

  flush() {
    this.cancelScheduledFlush();
    const errors = [];
    for (const [key, raw] of this.pending) {
      try {
        this.backend.setItem(key, raw);
        this.pending.delete(key);
      } catch (error) {
        errors.push(new Error(`写入 ${key} 失败`, { cause: error }));
      }
    }
    if (errors.length) this.reportError(new AggregateError(errors, '部分数据尚未保存'), '保存');
    return errors.length === 0;
  }

  setImmediate(key, value) {
    const raw = this.serialize(value);
    try {
      this.backend.setItem(key, raw);
      this.pending.delete(key);
      if (!this.pending.size) this.cancelScheduledFlush();
      return true;
    } catch (error) {
      this.pending.set(key, raw);
      this.reportError(error, `保存 ${key}`);
      return false;
    }
  }

  setManyImmediate(values) {
    const entries = Object.entries(values).map(([key, value]) => [key, this.serialize(value)]);
    return this.commitRaw(entries);
  }

  commitRaw(entries) {
    const previous = new Map(entries.map(([key]) => [key, this.backend.getItem(key)]));
    const written = [];
    try {
      for (const [key, raw] of entries) {
        this.backend.setItem(key, raw);
        written.push(key);
      }
    } catch (error) {
      this.rollback(previous, written, error);
    }
    for (const [key] of entries) this.pending.delete(key);
    if (!this.pending.size) this.cancelScheduledFlush();
    return true;
  }

  rollback(previous, written, writeError) {
    const failures = [];
    for (const key of written.reverse()) {
      try {
        const raw = previous.get(key);
        if (raw === null) this.backend.removeItem(key);
        else this.backend.setItem(key, raw);
      } catch (error) {
        failures.push(new Error(`回滚 ${key} 失败`, { cause: error }));
      }
    }
    if (failures.length) {
      throw new AggregateError([writeError, ...failures], '存储提交与回滚均失败，请立即导出存档');
    }
    throw new Error('存储提交失败，已恢复提交前的数据', { cause: writeError });
  }

  importSnapshot(rawValues) {
    const merged = new Map([...this.pending, ...Object.entries(rawValues)]);
    return this.commitRaw([...merged]);
  }

  getSnapshot() {
    const entries = [];
    for (let index = 0; index < this.backend.length; index++) {
      const key = this.backend.key(index);
      entries.push([key, this.backend.getItem(key)]);
    }
    return Object.fromEntries(new Map([...entries, ...this.pending]));
  }

  remove(key) {
    this.backend.removeItem(key);
    this.pending.delete(key);
    if (!this.pending.size) this.cancelScheduledFlush();
    return true;
  }

  getUsedSize() {
    const BYTES_PER_KIBIBYTE = 1024;
    const size = Object.entries(this.getSnapshot()).reduce((total, [key, raw]) => total + key.length + raw.length, 0);
    return Math.round(size / BYTES_PER_KIBIBYTE);
  }
}

(function exposeStorage(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SharedStorage = factory();
})(typeof globalThis === 'object' ? globalThis : this, () => ({ GameStorage }));
