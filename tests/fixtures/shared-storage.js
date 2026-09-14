function createMemoryStorage(values = {}) {
  const data = new Map(Object.entries(values).map(([key, value]) => [key, String(value)]));
  const control = { onWrite: null, onRemove: null, writes: [] };
  const backend = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem(key, value) {
      if (control.onWrite) control.onWrite(key, String(value));
      data.set(key, String(value));
      control.writes.push([key, String(value)]);
    },
    removeItem(key) {
      if (control.onRemove) control.onRemove(key);
      data.delete(key);
    },
    key: index => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
  return { backend, data, control };
}

function createScheduler() {
  const pending = new Map();
  let nextId = 0;
  return {
    pending,
    schedule(callback) { const id = ++nextId; pending.set(id, callback); return id; },
    cancel(id) { pending.delete(id); },
    runPending() {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(callback => callback());
    },
  };
}

module.exports = { createMemoryStorage, createScheduler };
