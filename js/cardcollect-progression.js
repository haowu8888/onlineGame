(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CardCollectProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const COMPENSATION_FAIL_THRESHOLD = 2;
  const COMPENSATION_STEP_PCT = 6;
  const COMPENSATION_MAX_PCT = 36;

  function normalizeNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function getCompensationBuffPct(failCount) {
    const normalizedFailCount = Math.max(0, normalizeNumber(failCount));
    if (normalizedFailCount < COMPENSATION_FAIL_THRESHOLD) {
      return 0;
    }
    return Math.min(normalizedFailCount * COMPENSATION_STEP_PCT, COMPENSATION_MAX_PCT);
  }

  function grantTeamExp(options) {
    const team = Array.isArray(options?.team) ? options.team : [];
    const owned = options?.owned && typeof options.owned === 'object' ? options.owned : {};
    const expGain = Math.max(0, normalizeNumber(options?.expGain));
    const maxLevel = Math.max(0, normalizeNumber(options?.maxLevel));
    const getExpForLevel = typeof options?.expForLevel === 'function'
      ? options.expForLevel
      : function() { return 0; };

    let nextOwned = owned;

    for (const cid of team) {
      if (!cid || !owned[cid]) {
        continue;
      }

      const current = owned[cid];
      let level = Math.max(0, normalizeNumber(current.level));
      let exp = Math.max(0, normalizeNumber(current.exp)) + expGain;

      while (level < maxLevel && exp >= getExpForLevel(level)) {
        exp -= getExpForLevel(level);
        level++;
      }
      if (level >= maxLevel) {
        exp = 0;
      }

      if (level === current.level && exp === current.exp) {
        continue;
      }

      if (nextOwned === owned) {
        nextOwned = { ...owned };
      }
      nextOwned[cid] = { ...current, level, exp };
    }

    return nextOwned;
  }

  function getEquipScore(equip) {
    if (!equip) {
      return 0;
    }
    return normalizeNumber(equip.atk) * 10 + normalizeNumber(equip.hp);
  }

  function resolveAutoEquipDrop(options) {
    const equip = options?.equip;
    const team = Array.isArray(options?.team) ? options.team : [];
    const owned = options?.owned && typeof options.owned === 'object' ? options.owned : {};
    const equipment = options?.equipment && typeof options.equipment === 'object' ? options.equipment : {};
    const equipInventory = Array.isArray(options?.equipInventory) ? options.equipInventory : [];
    const equipMap = options?.equipMap && typeof options.equipMap === 'object' ? options.equipMap : {};

    if (!equip || !equip.slot || team.length === 0) {
      return {
        equipped: false,
        targetId: null,
        replacedId: null,
        nextEquipment: equipment,
        nextInventory: equipInventory,
      };
    }

    const newScore = getEquipScore(equip);
    let bestTarget = null;
    let bestDiff = 0;

    for (const cid of team) {
      if (!cid || !owned[cid]) {
        continue;
      }

      const currentId = equipment[cid]?.[equip.slot] || null;
      const current = currentId ? equipMap[currentId] : null;
      const diff = newScore - getEquipScore(current);
      if (diff > bestDiff) {
        bestDiff = diff;
        bestTarget = { cid, currentId };
      }
    }

    if (!bestTarget) {
      return {
        equipped: false,
        targetId: null,
        replacedId: null,
        nextEquipment: equipment,
        nextInventory: equipInventory,
      };
    }

    const nextEquipment = {
      ...equipment,
      [bestTarget.cid]: {
        ...(equipment[bestTarget.cid] || {}),
        [equip.slot]: equip.id,
      },
    };
    const nextInventory = bestTarget.currentId
      ? [...equipInventory, bestTarget.currentId]
      : equipInventory.slice();

    return {
      equipped: true,
      targetId: bestTarget.cid,
      replacedId: bestTarget.currentId,
      nextEquipment,
      nextInventory,
    };
  }

  return {
    getCompensationBuffPct,
    grantTeamExp,
    resolveAutoEquipDrop,
  };
});
