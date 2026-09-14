/* 人生手札的只读日志与数值变化模型。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeJournal = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ENTITIES = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' });
  const MAX_CODE_POINT = 0x10ffff;

  function decodeEntity(match, entity) {
    const normalized = entity.toLowerCase();
    if (Object.hasOwn(ENTITIES, normalized)) return ENTITIES[normalized];
    const radix = normalized.startsWith('#x') ? 16 : 10;
    const value = parseInt(normalized.slice(radix === 16 ? 2 : 1), radix);
    return Number.isInteger(value) && value >= 0 && value <= MAX_CODE_POINT
      ? String.fromCodePoint(value) : match;
  }

  function plainText(value) {
    const text = typeof value === 'string' ? value : String(value?.text ?? '');
    return text.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, decodeEntity);
  }

  function parseLogs(logs) {
    return logs.map((entry, index) => {
      const text = plainText(entry).trim();
      const ageMatch = text.match(/^\[(\d+)岁\]\s*/);
      return Object.freeze({
        id: index,
        age: ageMatch ? Number(ageMatch[1]) : null,
        text: ageMatch ? text.slice(ageMatch[0].length) : text,
      });
    });
  }

  function filterEntries(entries, options = {}) {
    const query = (options.query || '').trim().toLocaleLowerCase();
    return entries.filter(entry => {
      const stage = options.stage;
      if (stage && (entry.age === null || entry.age < stage.minAge || entry.age > stage.maxAge)) return false;
      return !query || entry.text.toLocaleLowerCase().includes(query)
        || (entry.age !== null && `${entry.age}岁`.includes(query));
    });
  }

  function getChanges({ before, after, labels }) {
    return Object.entries(labels).flatMap(([key, label]) => {
      const delta = after[key] - before[key];
      if (!Number.isFinite(delta)) throw new TypeError(`无效的属性变化: ${key}`);
      return delta === 0 ? [] : [{ key, label, before: before[key], value: after[key], delta }];
    });
  }

  function getTimeline(age, stages) {
    return stages.map(stage => ({
      ...stage,
      current: age >= stage.minAge && age <= stage.maxAge,
      passed: age > stage.maxAge,
    }));
  }

  return Object.freeze({ plainText, parseLogs, filterEntries, getChanges, getTimeline });
});
