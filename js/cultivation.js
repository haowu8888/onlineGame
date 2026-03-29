/* ========== 修仙放置RPG ========== */

(function () {
  'use strict';

  const recoveryHelper = globalThis.CultivationRecovery;
  if (!recoveryHelper || typeof recoveryHelper.useRecoverItem !== 'function') {
    throw new Error('CultivationRecovery helper is unavailable');
  }

  // ==================== 特效系统 ====================

  function _animationsEnabled() {
    const s = Storage.get('settings_cultivation', {});
    return s.enableAnimations !== false;
  }

  const Effects = {
    particleExplosion(container, count = 30, colors = ['#ffd700', '#ffaa00', '#ff8800']) {
      if (!_animationsEnabled()) return;
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      container.style.position = 'relative';
      const frag = document.createDocumentFragment();
      const particles = [];
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'effect-particle';
        const size = Math.random() * 6 + 3;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
        const dist = 60 + Math.random() * 80;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 0.6 + Math.random() * 0.6;
        p.style.cssText = `width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size*2}px ${color};left:${centerX}px;top:${centerY}px;--tx:${tx}px;--ty:${ty}px;--fly-duration:${duration}s;`;
        frag.appendChild(p);
        particles.push({ el: p, duration });
      }
      container.appendChild(frag);
      for (const { el, duration } of particles) {
        setTimeout(() => el.remove(), duration * 1000);
      }
    },

    screenFlash(color = 'rgba(255,215,0,0.3)', duration = 400) {
      if (!_animationsEnabled()) return;
      const flash = document.createElement('div');
      flash.className = 'screen-flash';
      flash.style.background = color;
      flash.style.setProperty('--flash-duration', duration + 'ms');
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), duration);
    },

    floatingText(container, text, { color = '#ff4444', fontSize = '1.2rem' } = {}) {
      const el = document.createElement('div');
      el.className = 'floating-text';
      el.textContent = text;
      el.style.color = color;
      el.style.fontSize = fontSize;
      el.style.left = '50%';
      el.style.top = '50%';
      el.style.transform = 'translate(-50%, -50%)';
      container.style.position = 'relative';
      container.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    },

    screenShake(element, intensity = 1, duration = 400) {
      if (!_animationsEnabled()) return;
      element.classList.remove('shaking');
      void element.offsetWidth; // force reflow
      element.style.setProperty('--shake-duration', duration + 'ms');
      element.classList.add('shaking');
      setTimeout(() => element.classList.remove('shaking'), duration);
    },

    realmUpText(realmName) {
      if (!_animationsEnabled()) return;
      const el = document.createElement('div');
      el.className = 'realm-up-text';
      el.textContent = `突破！${realmName}！`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    },

    showCauldronAnimation() {
      if (!_animationsEnabled()) return Promise.resolve();
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'alchemy-process-overlay';
        overlay.innerHTML = '<div class="cauldron-anim">⚗️</div><div class="cauldron-fire">🔥🔥🔥</div><div class="alchemy-process-text">炼丹中...</div>';
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.remove(); resolve(); }, 1500);
      });
    },

    showForgeAnimation() {
      if (!_animationsEnabled()) return Promise.resolve();
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'alchemy-process-overlay';
        overlay.innerHTML = '<div class="forge-anim">⚒️</div><div class="forge-sparks">✨✨✨</div><div class="alchemy-process-text">炼器中...</div>';
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.remove(); resolve(); }, 1500);
      });
    },

    lootCard(icon, text) {
      const card = document.createElement('div');
      card.className = 'loot-card';
      card.innerHTML = `<span class="loot-card-icon">${escapeHtml(icon)}</span><span class="loot-card-text">${escapeHtml(text)}</span>`;
      document.body.appendChild(card);
      setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 300); }, 2000);
    }
  };

  // ==================== 数据常量 ====================

  const REALMS = [
    { name: '凡人', expReq: 0, baseHp: 100, baseAtk: 10, baseDef: 5, baseSpirit: 30 },
    { name: '炼气期', expReq: 220, baseHp: 200, baseAtk: 25, baseDef: 12, baseSpirit: 50, rate: 0.75 },
    { name: '筑基期', expReq: 1000, baseHp: 400, baseAtk: 50, baseDef: 25, baseSpirit: 80, rate: 0.55 },
    { name: '金丹期', expReq: 5000, baseHp: 800, baseAtk: 100, baseDef: 50, baseSpirit: 120, rate: 0.40 },
    { name: '元婴期', expReq: 20000, baseHp: 1600, baseAtk: 200, baseDef: 100, baseSpirit: 180, rate: 0.28 },
    { name: '化神期', expReq: 80000, baseHp: 3200, baseAtk: 400, baseDef: 200, baseSpirit: 260, rate: 0.18 },
    { name: '渡劫期', expReq: 300000, baseHp: 6400, baseAtk: 800, baseDef: 400, baseSpirit: 380, rate: 0.10 },
    { name: '大乘期', expReq: 1500000, baseHp: 12800, baseAtk: 1600, baseDef: 800, baseSpirit: 500, rate: 0.05 },
  ];

  // 悟道值需求：每个境界突破前需要积累的悟道值
  const INSIGHT_REQUIREMENTS = [0, 30, 80, 150, 300, 600, 1200, 2500];

  const SPIRIT_ROOTS = [
    { id: 'gold', name: '金灵根', desc: '攻击+20%', icon: '⚔️', atkMul: 1.2, defMul: 1.0, expMul: 1.0 },
    { id: 'wood', name: '木灵根', desc: '生命+20%', icon: '🌿', atkMul: 1.0, defMul: 1.0, expMul: 1.0, hpMul: 1.2 },
    { id: 'water', name: '水灵根', desc: '修炼+20%', icon: '💧', atkMul: 1.0, defMul: 1.0, expMul: 1.2 },
    { id: 'fire', name: '火灵根', desc: '攻击+30%,防御-10%', icon: '🔥', atkMul: 1.3, defMul: 0.9, expMul: 1.0 },
    { id: 'earth', name: '土灵根', desc: '防御+25%', icon: '🪨', atkMul: 1.0, defMul: 1.25, expMul: 1.0 },
    { id: 'chaos', name: '混沌灵根', desc: '全属性+10%', icon: '☯️', atkMul: 1.1, defMul: 1.1, expMul: 1.1, hpMul: 1.1 },
  ];

  const SECTS = [
    { id: 'sword', name: '御剑宗', desc: '攻击+15%', icon: '🗡️', atkMul: 1.15, defMul: 1.0, expMul: 1.0, spiritMul: 1.0 },
    { id: 'pill', name: '丹鼎派', desc: '炼丹成功率+15%', icon: '⚗️', atkMul: 1.0, defMul: 1.0, expMul: 1.0, alchemyBonus: 0.15, spiritMul: 1.1 },
    { id: 'body', name: '炼体门', desc: '防御+20%,生命+10%', icon: '💪', atkMul: 1.0, defMul: 1.2, expMul: 1.0, hpMul: 1.1, spiritMul: 0.9 },
    { id: 'spirit', name: '灵修阁', desc: '修炼速度+20%', icon: '📖', atkMul: 1.0, defMul: 1.0, expMul: 1.2, spiritMul: 1.3 },
  ];
  const SECTS_MAP = Object.fromEntries(SECTS.map(s => [s.id, s]));

  const EQUIPMENT = [
    // 武器
    { id: 'wooden_sword', name: '木剑', icon: '🗡️', slot: 'weapon', quality: 'common', price: 100, atk: 10, def: 0, hp: 0, desc: '初学者木剑', realmReq: 0 },
    { id: 'iron_sword', name: '铁剑', icon: '🗡️', slot: 'weapon', quality: 'common', price: 300, atk: 18, def: 0, hp: 0, desc: '锋利的铁剑', realmReq: 1 },
    { id: 'spirit_sword', name: '灵剑', icon: '⚔️', slot: 'weapon', quality: 'good', price: 800, atk: 30, def: 0, hp: 0, desc: '注入灵力的剑', realmReq: 1 },
    { id: 'dark_iron_sword', name: '玄铁剑', icon: '⚔️', slot: 'weapon', quality: 'good', price: 2000, atk: 50, def: 0, hp: 0, desc: '玄铁铸造的重剑', realmReq: 2 },
    { id: 'purple_sword', name: '紫电剑', icon: '⚔️', slot: 'weapon', quality: 'rare', price: 5000, atk: 80, def: 0, hp: 0, desc: '剑身环绕紫色雷电', realmReq: 3 },
    { id: 'sky_sword', name: '天罡剑', icon: '🔱', slot: 'weapon', quality: 'rare', price: 12000, atk: 120, def: 0, hp: 0, desc: '天罡之气凝聚成剑', realmReq: 4 },
    { id: 'immortal_sword', name: '仙人剑', icon: '🔱', slot: 'weapon', quality: 'epic', price: 30000, atk: 200, def: 0, hp: 0, desc: '仙人遗留的神兵', realmReq: 5 },
    { id: 'dao_sword', name: '天道剑', icon: '🔱', slot: 'weapon', quality: 'legend', price: 80000, atk: 350, def: 0, hp: 0, desc: '蕴含天道法则的至高神剑', realmReq: 6 },
    // 护甲
    { id: 'cloth_armor', name: '布衣', icon: '👘', slot: 'armor', quality: 'common', price: 80, atk: 0, def: 8, hp: 0, desc: '普通布衣', realmReq: 0 },
    { id: 'iron_armor', name: '铁甲', icon: '🛡️', slot: 'armor', quality: 'common', price: 250, atk: 0, def: 15, hp: 0, desc: '普通铁甲', realmReq: 1 },
    { id: 'spirit_robe', name: '灵袍', icon: '👘', slot: 'armor', quality: 'good', price: 700, atk: 0, def: 30, hp: 50, desc: '灵力编织的法袍', realmReq: 1 },
    { id: 'turtle_armor', name: '玄龟甲', icon: '🛡️', slot: 'armor', quality: 'good', price: 1800, atk: 0, def: 50, hp: 80, desc: '玄龟壳制成的甲', realmReq: 2 },
    { id: 'golden_armor', name: '金丝甲', icon: '🛡️', slot: 'armor', quality: 'rare', price: 4500, atk: 0, def: 80, hp: 120, desc: '金丝软甲,轻便坚韧', realmReq: 3 },
    { id: 'silkworm_robe', name: '天蚕衣', icon: '👘', slot: 'armor', quality: 'rare', price: 11000, atk: 0, def: 120, hp: 200, desc: '天蚕丝织就', realmReq: 4 },
    { id: 'star_robe', name: '星辰袍', icon: '✨', slot: 'armor', quality: 'epic', price: 28000, atk: 0, def: 200, hp: 400, desc: '星辰之力护体', realmReq: 5 },
    { id: 'chaos_armor', name: '混沌战甲', icon: '🛡️', slot: 'armor', quality: 'legend', price: 75000, atk: 0, def: 350, hp: 800, desc: '混沌之力铸造的无上战甲', realmReq: 6 },
    // 饰品
    { id: 'jade_ring', name: '玉戒', icon: '💍', slot: 'accessory', quality: 'common', price: 120, atk: 5, def: 5, hp: 30, desc: '灵玉打磨的戒指', realmReq: 0 },
    { id: 'spirit_necklace', name: '灵石项链', icon: '📿', slot: 'accessory', quality: 'common', price: 350, atk: 8, def: 8, hp: 50, desc: '灵石串成的项链', realmReq: 1 },
    { id: 'wind_ring', name: '风灵环', icon: '💍', slot: 'accessory', quality: 'good', price: 1000, atk: 15, def: 12, hp: 80, desc: '蕴含风之灵力', realmReq: 2 },
    { id: 'sky_bracelet', name: '天目镯', icon: '📿', slot: 'accessory', quality: 'rare', price: 5500, atk: 25, def: 20, hp: 150, desc: '可洞察天机的手镯', realmReq: 3 },
    { id: 'dragon_pendant', name: '龙魂坠', icon: '📿', slot: 'accessory', quality: 'epic', price: 25000, atk: 50, def: 40, hp: 300, desc: '封印龙魂的吊坠', realmReq: 5 },
    { id: 'chaos_pearl', name: '鸿蒙珠', icon: '🔮', slot: 'accessory', quality: 'legend', price: 70000, atk: 80, def: 60, hp: 500, desc: '鸿蒙初开时诞生的至宝', realmReq: 6 },
    // 仙缘联动装备
    { id: 'tower_relic', name: '仙塔灵器', icon: '🏯', slot: 'accessory', quality: 'epic', price: 0, atk: 40, def: 30, hp: 200, desc: '通关斩仙塔获得的灵器（仙缘联动）', realmReq: 0 },
  ];
  const EQUIPMENT_MAP = Object.fromEntries(EQUIPMENT.map(e => [e.id, e]));

  const RECIPES = [
    { id: 'hp_pill', name: '回春丹', desc: '恢复30%生命', effect: { type: 'heal', value: 0.3 }, materials: [{ id: 'herb', count: 3 }], baseRate: 0.8, realmReq: 0 },
    { id: 'exp_pill', name: '培元丹', desc: '获得修为100', effect: { type: 'exp', value: 100 }, materials: [{ id: 'herb', count: 5 }, { id: 'crystal', count: 1 }], baseRate: 0.7, realmReq: 1 },
    { id: 'atk_pill', name: '狂暴丹', desc: '战斗中攻击+50%', effect: { type: 'buff_atk', value: 1.5 }, materials: [{ id: 'beast_core', count: 2 }, { id: 'herb', count: 3 }], baseRate: 0.6, realmReq: 2 },
    { id: 'def_pill', name: '金刚丹', desc: '战斗中防御+50%', effect: { type: 'buff_def', value: 1.5 }, materials: [{ id: 'ore', count: 3 }, { id: 'crystal', count: 1 }], baseRate: 0.6, realmReq: 2 },
    { id: 'small_break_pill', name: '小破境丹', desc: '突破成功率+10%', effect: { type: 'break_bonus', value: 0.1 }, materials: [{ id: 'crystal', count: 2 }, { id: 'herb', count: 4 }], baseRate: 0.65, realmReq: 1 },
    { id: 'break_pill', name: '破境丹', desc: '突破成功率+20%', effect: { type: 'break_bonus', value: 0.2 }, materials: [{ id: 'crystal', count: 3 }, { id: 'beast_core', count: 2 }, { id: 'herb', count: 5 }], baseRate: 0.5, realmReq: 3 },
    { id: 'great_break_pill', name: '大破境丹', desc: '突破成功率+30%', effect: { type: 'break_bonus', value: 0.3 }, materials: [{ id: 'crystal', count: 6 }, { id: 'beast_core', count: 4 }, { id: 'herb', count: 10 }, { id: 'ore', count: 3 }], baseRate: 0.3, realmReq: 4 },
    { id: 'dao_pill', name: '天道丹', desc: '突破成功率+40%', effect: { type: 'break_bonus', value: 0.4 }, materials: [{ id: 'crystal', count: 12 }, { id: 'beast_core', count: 8 }, { id: 'herb', count: 18 }, { id: 'ore', count: 8 }], baseRate: 0.15, realmReq: 6 },
    { id: 'super_pill', name: '九转金丹', desc: '获得修为1000', effect: { type: 'exp', value: 1000 }, materials: [{ id: 'crystal', count: 5 }, { id: 'beast_core', count: 3 }, { id: 'herb', count: 8 }], baseRate: 0.35, realmReq: 4 },
    { id: 'speed_pill', name: '疾风丹', desc: '修炼速度+100%持续60秒', effect: { type: 'speed_boost', value: 2, duration: 60 }, materials: [{ id: 'herb', count: 4 }, { id: 'crystal', count: 2 }], baseRate: 0.7, realmReq: 1 },
    { id: 'crit_pill', name: '破甲丹', desc: '战斗中暴击率+30%', effect: { type: 'buff_crit', value: 0.3 }, materials: [{ id: 'beast_core', count: 3 }, { id: 'ore', count: 2 }], baseRate: 0.6, realmReq: 2 },
    { id: 'spirit_pill', name: '聚灵丹', desc: '恢复50%灵力', effect: { type: 'restore_spirit', value: 0.5 }, materials: [{ id: 'crystal', count: 3 }, { id: 'herb', count: 4 }], baseRate: 0.65, realmReq: 2 },
    { id: 'insight_pill', name: '悟心丹', desc: '获得悟道值+8', effect: { type: 'insight', value: 8 }, materials: [{ id: 'herb', count: 6 }, { id: 'crystal', count: 3 }], baseRate: 0.55, realmReq: 2 },
    { id: 'revive_pill', name: '续命丹', desc: '战斗中复活(50%HP)', effect: { type: 'revive', value: 0.5 }, materials: [{ id: 'crystal', count: 4 }, { id: 'beast_core', count: 3 }, { id: 'herb', count: 6 }], baseRate: 0.4, realmReq: 4 },
    { id: 'greater_heal_pill', name: '大还丹', desc: '恢复70%生命', effect: { type: 'heal', value: 0.7 }, materials: [{ id: 'herb', count: 8 }, { id: 'crystal', count: 3 }, { id: 'beast_core', count: 2 }], baseRate: 0.5, realmReq: 3 },
    { id: 'enlighten_pill', name: '悟道丹', desc: '获得修为5000', effect: { type: 'exp', value: 5000 }, materials: [{ id: 'crystal', count: 8 }, { id: 'beast_core', count: 5 }, { id: 'herb', count: 10 }, { id: 'ore', count: 5 }], baseRate: 0.25, realmReq: 5 },
    { id: 'capture_talisman_recipe', name: '炼制捕灵符', desc: '制作捕灵符', effect: { type: 'item', itemId: 'capture_talisman', count: 1 }, materials: [{ id: 'beast_core', count: 2 }, { id: 'crystal', count: 1 }], baseRate: 0.85, realmReq: 1 },
  ];
  const RECIPES_MAP = Object.fromEntries(RECIPES.map(r => [r.id, r]));

  // ==================== 炼器系统 ====================

  const FORGE_RECIPES = [
    // 武器
    { id: 'forge_iron_sword', name: '锻铁剑', product: 'iron_sword', productName: '铁剑', slot: 'weapon', realmReq: 1, rate: 0.85, materials: [{ id: 'ore', count: 5 }] },
    { id: 'forge_spirit_sword', name: '炼灵剑', product: 'spirit_sword', productName: '灵剑', slot: 'weapon', realmReq: 1, rate: 0.75, materials: [{ id: 'ore', count: 8 }, { id: 'crystal', count: 3 }] },
    { id: 'forge_dark_iron', name: '炼玄铁剑', product: 'dark_iron_sword', productName: '玄铁剑', slot: 'weapon', realmReq: 2, rate: 0.60, materials: [{ id: 'ore', count: 12 }, { id: 'crystal', count: 5 }, { id: 'beast_core', count: 3 }] },
    { id: 'forge_purple', name: '铸紫电', product: 'purple_sword', productName: '紫电剑', slot: 'weapon', realmReq: 3, rate: 0.45, materials: [{ id: 'ore', count: 15 }, { id: 'crystal', count: 8 }, { id: 'beast_core', count: 5 }] },
    { id: 'forge_sky_sword', name: '铸天罡剑', product: 'sky_sword', productName: '天罡剑', slot: 'weapon', realmReq: 4, rate: 0.35, materials: [{ id: 'ore', count: 25 }, { id: 'crystal', count: 15 }, { id: 'beast_core', count: 8 }] },
    // 护甲
    { id: 'forge_spirit_robe', name: '织灵袍', product: 'spirit_robe', productName: '灵光法袍', slot: 'armor', realmReq: 1, rate: 0.75, materials: [{ id: 'herb', count: 5 }, { id: 'crystal', count: 3 }, { id: 'ore', count: 3 }] },
    { id: 'forge_turtle', name: '炼龟甲', product: 'turtle_armor', productName: '玄龟甲', slot: 'armor', realmReq: 2, rate: 0.60, materials: [{ id: 'ore', count: 10 }, { id: 'beast_core', count: 5 }, { id: 'crystal', count: 3 }] },
    { id: 'forge_golden', name: '铸金丝甲', product: 'golden_armor', productName: '金丝软甲', slot: 'armor', realmReq: 3, rate: 0.45, materials: [{ id: 'ore', count: 18 }, { id: 'crystal', count: 10 }, { id: 'beast_core', count: 6 }] },
    { id: 'forge_silkworm', name: '织天蚕衣', product: 'silkworm_robe', productName: '天蚕宝衣', slot: 'armor', realmReq: 4, rate: 0.35, materials: [{ id: 'herb', count: 15 }, { id: 'crystal', count: 12 }, { id: 'ore', count: 10 }] },
    // 饰品
    { id: 'forge_wind_ring', name: '铸风灵环', product: 'wind_ring', productName: '风灵戒', slot: 'accessory', realmReq: 2, rate: 0.65, materials: [{ id: 'crystal', count: 5 }, { id: 'ore', count: 5 }, { id: 'herb', count: 3 }] },
    { id: 'forge_sky_bracelet', name: '铸天目镯', product: 'sky_bracelet', productName: '天目手镯', slot: 'accessory', realmReq: 3, rate: 0.50, materials: [{ id: 'crystal', count: 8 }, { id: 'beast_core', count: 5 }, { id: 'ore', count: 8 }] },
    { id: 'forge_dragon', name: '铸龙魂坠', product: 'dragon_pendant', productName: '龙魂坠', slot: 'accessory', realmReq: 5, rate: 0.30, materials: [{ id: 'crystal', count: 15 }, { id: 'beast_core', count: 10 }, { id: 'ore', count: 12 }] },
  ];
  const FORGE_RECIPES_MAP = Object.fromEntries(FORGE_RECIPES.map(r => [r.id, r]));

  const FORGE_QUALITY = [
    { name: '普通', enhanceBonus: 0, chance: 0.65 },
    { name: '良品', enhanceBonus: 2, chance: 0.20 },
    { name: '上品', enhanceBonus: 4, chance: 0.10 },
    { name: '极品', enhanceBonus: 6, chance: 0.05 },
  ];

  const DUNGEONS = [
    { id: 'forest', name: '灵兽森林', desc: '低级灵兽出没', realmReq: 0, monsters: ['wolf', 'snake', 'bear'] },
    { id: 'cave', name: '灵矿洞穴', desc: '矿脉深处有守护兽', realmReq: 1, monsters: ['bat', 'golem', 'spider'] },
    { id: 'valley', name: '落凰谷', desc: '传说中凤凰陨落之地', realmReq: 2, monsters: ['ghost', 'demon', 'phoenix_jr'] },
    { id: 'tower', name: '天魔塔', desc: '魔修盘踞之地', realmReq: 3, monsters: ['dark_monk', 'demon_lord', 'shadow'] },
    { id: 'void', name: '虚空裂缝', desc: '时空交错，危机四伏', realmReq: 5, monsters: ['void_beast', 'ancient_dragon', 'chaos_entity'] },
    { id: 'heaven', name: '天劫之地', desc: '天道考验', realmReq: 6, monsters: ['thunder_god', 'celestial', 'dao_guardian'] },
  ];

  const MONSTERS = {
    wolf: { name: '灵狼', icon: '🐺', hp: 50, atk: 12, def: 5, exp: 20, gold: 10, element: 'wood', drops: [{ id: 'beast_core', rate: 0.3 }, { id: 'herb', rate: 0.5 }] },
    snake: { name: '蟒蛇', icon: '🐍', hp: 70, atk: 15, def: 8, exp: 30, gold: 15, element: 'water', drops: [{ id: 'beast_core', rate: 0.4 }, { id: 'herb', rate: 0.4 }] },
    bear: { name: '灵熊', icon: '🐻', hp: 120, atk: 20, def: 15, exp: 50, gold: 25, element: 'earth', drops: [{ id: 'beast_core', rate: 0.5 }, { id: 'ore', rate: 0.3 }] },
    bat: { name: '蝙蝠精', icon: '🦇', hp: 80, atk: 18, def: 6, exp: 35, gold: 20, element: 'metal', drops: [{ id: 'crystal', rate: 0.2 }, { id: 'herb', rate: 0.4 }] },
    golem: { name: '石魔傀', icon: '🗿', hp: 200, atk: 25, def: 30, exp: 60, gold: 40, element: 'earth', drops: [{ id: 'ore', rate: 0.6 }, { id: 'crystal', rate: 0.3 }] },
    spider: { name: '千年蛛妖', icon: '🕷️', hp: 150, atk: 30, def: 12, exp: 55, gold: 35, element: 'wood', drops: [{ id: 'herb', rate: 0.5 }, { id: 'beast_core', rate: 0.4 }] },
    ghost: { name: '幽魂', icon: '👻', hp: 180, atk: 35, def: 10, exp: 70, gold: 45, element: 'water', drops: [{ id: 'crystal', rate: 0.4 }, { id: 'herb', rate: 0.3 }] },
    demon: { name: '妖修', icon: '👹', hp: 300, atk: 45, def: 25, exp: 100, gold: 60, element: 'fire', drops: [{ id: 'beast_core', rate: 0.5 }, { id: 'crystal', rate: 0.3 }] },
    phoenix_jr: { name: '火鸦', icon: '🐦', hp: 250, atk: 55, def: 20, exp: 120, gold: 70, element: 'fire', drops: [{ id: 'crystal', rate: 0.5 }, { id: 'beast_core', rate: 0.4 }] },
    dark_monk: { name: '暗修', icon: '🧙', hp: 500, atk: 80, def: 40, exp: 200, gold: 120, element: 'metal', drops: [{ id: 'crystal', rate: 0.5 }, { id: 'ore', rate: 0.4 }] },
    demon_lord: { name: '魔尊', icon: '😈', hp: 800, atk: 120, def: 60, exp: 350, gold: 200, element: 'fire', drops: [{ id: 'crystal', rate: 0.6 }, { id: 'beast_core', rate: 0.5 }] },
    shadow: { name: '暗影', icon: '🌑', hp: 400, atk: 100, def: 30, exp: 250, gold: 150, element: 'water', drops: [{ id: 'crystal', rate: 0.5 }, { id: 'herb', rate: 0.5 }] },
    void_beast: { name: '虚空兽', icon: '🌀', hp: 1500, atk: 200, def: 100, exp: 600, gold: 400, element: 'earth', drops: [{ id: 'crystal', rate: 0.7 }, { id: 'beast_core', rate: 0.6 }] },
    ancient_dragon: { name: '古龙', icon: '🐉', hp: 3000, atk: 350, def: 180, exp: 1200, gold: 800, element: 'fire', drops: [{ id: 'crystal', rate: 0.8 }, { id: 'ore', rate: 0.6 }] },
    chaos_entity: { name: '混沌体', icon: '🌌', hp: 2000, atk: 280, def: 140, exp: 900, gold: 600, element: 'earth', drops: [{ id: 'crystal', rate: 0.7 }, { id: 'beast_core', rate: 0.7 }] },
    thunder_god: { name: '雷神', icon: '⚡', hp: 5000, atk: 500, def: 250, exp: 2000, gold: 1500, element: 'metal', drops: [{ id: 'crystal', rate: 0.9 }, { id: 'beast_core', rate: 0.7 }] },
    celestial: { name: '天人', icon: '👼', hp: 8000, atk: 700, def: 400, exp: 4000, gold: 3000, element: 'metal', drops: [{ id: 'crystal', rate: 0.9 }, { id: 'ore', rate: 0.8 }] },
    dao_guardian: { name: '道之守卫', icon: '🛡️', hp: 12000, atk: 1000, def: 600, exp: 8000, gold: 5000, element: 'earth', drops: [{ id: 'crystal', rate: 1.0 }, { id: 'beast_core', rate: 0.9 }] },
  };

  const MATERIALS = {
    herb: { name: '灵草', icon: '🌿', desc: '炼丹基础材料' },
    crystal: { name: '灵石', icon: '💎', desc: '蕴含灵力的石头' },
    beast_core: { name: '兽核', icon: '🔮', desc: '灵兽体内的核心' },
    ore: { name: '灵矿', icon: '⛏️', desc: '蕴含灵力的矿石' },
    capture_talisman: { name: '捕灵符', icon: '📜', desc: '增加捕捉灵宠成功率' },
  };

  const SHOP_ITEMS = [
    { id: 'herb', name: '灵草', icon: '🌿', price: 10, type: 'material', desc: '炼丹基础材料' },
    { id: 'crystal', name: '灵石', icon: '💎', price: 50, type: 'material', desc: '蕴含灵力的石头' },
    { id: 'beast_core', name: '兽核', icon: '🔮', price: 80, type: 'material', desc: '灵兽核心' },
    { id: 'ore', name: '灵矿', icon: '⛏️', price: 40, type: 'material', desc: '灵力矿石' },
    { id: 'capture_talisman', name: '捕灵符', icon: '📜', price: 200, type: 'material', desc: '捕捉灵宠成功率+25%' },
    { id: 'hp_pill', name: '回春丹', icon: '💊', price: 30, type: 'pill', desc: '恢复30%生命' },
  ];
  const SHOP_ITEMS_MAP = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));

  const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'];
  const SLOT_NAMES = { weapon: '武器', armor: '护甲', accessory: '饰品' };
  const SLOT_ICONS = { weapon: '🗡️', armor: '🛡️', accessory: '💍' };
  const QUALITY_NAMES = { common: '凡品', good: '良品', rare: '稀有', epic: '史诗', legend: '传说' };

  const SKILLS = [
    // 御剑宗
    { id: 'sword_qi', name: '剑气斩', desc: '释放剑气攻击', sect: 'sword', dmgMul: 1.8, spiritCost: 20, cooldown: 0, realmReq: 0, effect: null },
    { id: 'ten_swords', name: '万剑归宗', desc: '召唤剑雨', sect: 'sword', dmgMul: 2.5, spiritCost: 40, cooldown: 3, realmReq: 2, effect: { type: 'dot', dmg: 0.3, turns: 2 } },
    { id: 'sword_intent', name: '剑意无形', desc: '无形剑意', sect: 'sword', dmgMul: 3.5, spiritCost: 60, cooldown: 5, realmReq: 4, effect: { type: 'lifesteal', value: 0.2 } },
    { id: 'sword_domain', name: '御剑领域', desc: '剑域笼罩', sect: 'sword', dmgMul: 5.0, spiritCost: 100, cooldown: 8, realmReq: 6, effect: { type: 'dot', dmg: 0.5, turns: 3 } },
    // 丹鼎派
    { id: 'poison_mist', name: '毒雾术', desc: '释放毒雾', sect: 'pill', dmgMul: 1.5, spiritCost: 15, cooldown: 0, realmReq: 0, effect: { type: 'dot', dmg: 0.2, turns: 3 } },
    { id: 'heal_art', name: '回春术', desc: '恢复生命', sect: 'pill', dmgMul: 0, spiritCost: 30, cooldown: 3, realmReq: 1, effect: { type: 'heal', value: 0.25 } },
    { id: 'spirit_drain_skill', name: '吸灵术', desc: '吸取灵力', sect: 'pill', dmgMul: 2.0, spiritCost: 20, cooldown: 4, realmReq: 3, effect: { type: 'spirit_drain', value: 30 } },
    { id: 'nirvana', name: '涅槃术', desc: '浴火重生', sect: 'pill', dmgMul: 4.0, spiritCost: 90, cooldown: 8, realmReq: 5, effect: { type: 'heal', value: 0.4 } },
    // 炼体门
    { id: 'iron_fist', name: '铁拳', desc: '刚猛拳击', sect: 'body', dmgMul: 2.0, spiritCost: 15, cooldown: 0, realmReq: 0, effect: null },
    { id: 'stone_skin', name: '金刚体', desc: '防御增幅', sect: 'body', dmgMul: 0, spiritCost: 25, cooldown: 4, realmReq: 1, effect: { type: 'def_buff', value: 2.0, turns: 3 } },
    { id: 'counter_skill', name: '以彼之道', desc: '反弹伤害', sect: 'body', dmgMul: 1.0, spiritCost: 35, cooldown: 4, realmReq: 3, effect: { type: 'counter', value: 0.5, turns: 2 } },
    { id: 'titan', name: '巨人化', desc: '全属性提升', sect: 'body', dmgMul: 3.0, spiritCost: 80, cooldown: 7, realmReq: 5, effect: { type: 'shield', value: 0.3 } },
    // 灵修阁
    { id: 'mind_blast', name: '神识冲击', desc: '精神攻击', sect: 'spirit', dmgMul: 1.6, spiritCost: 18, cooldown: 0, realmReq: 0, effect: null },
    { id: 'spirit_shield', name: '灵盾', desc: '灵力护盾', sect: 'spirit', dmgMul: 0, spiritCost: 30, cooldown: 3, realmReq: 1, effect: { type: 'shield', value: 0.25 } },
    { id: 'soul_burn', name: '焚魂', desc: '灼烧灵魂', sect: 'spirit', dmgMul: 2.8, spiritCost: 50, cooldown: 5, realmReq: 3, effect: { type: 'dot', dmg: 0.4, turns: 2 } },
    { id: 'void_gaze', name: '虚空之眼', desc: '虚空凝视', sect: 'spirit', dmgMul: 4.5, spiritCost: 90, cooldown: 7, realmReq: 5, effect: { type: 'spirit_drain', value: 50 } },
  ];

  const ACHIEVEMENTS = [
    // 战斗
    { id: 'first_kill', name: '初出茅庐', icon: '⚔️', desc: '击败第一个敌人', category: 'battle', condition: d => d.totalKills >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'kills_100', name: '百战修士', icon: '⚔️', desc: '累计击败100个敌人', category: 'battle', condition: d => d.totalKills >= 100, reward: { gold: 500, exp: 300 } },
    { id: 'kills_1000', name: '千斩', icon: '🗡️', desc: '累计击败1000个敌人', category: 'battle', condition: d => d.totalKills >= 1000, reward: { gold: 2000, exp: 1500 } },
    { id: 'kills_5000', name: '屠龙勇士', icon: '🐉', desc: '累计击败5000个敌人', category: 'battle', condition: d => d.totalKills >= 5000, reward: { gold: 10000, exp: 8000 } },
    // 修炼
    { id: 'realm_1', name: '入门', icon: '🌱', desc: '突破到炼气期', category: 'cultivation', condition: d => d.realm >= 1, reward: { gold: 100, exp: 50 } },
    { id: 'realm_2', name: '筑基成功', icon: '🏗️', desc: '突破到筑基期', category: 'cultivation', condition: d => d.realm >= 2, reward: { gold: 300, exp: 200 } },
    { id: 'realm_3', name: '金丹大道', icon: '🟡', desc: '突破到金丹期', category: 'cultivation', condition: d => d.realm >= 3, reward: { gold: 800, exp: 500 } },
    { id: 'realm_4', name: '元婴老怪', icon: '👶', desc: '突破到元婴期', category: 'cultivation', condition: d => d.realm >= 4, reward: { gold: 2000, exp: 1500 } },
    { id: 'realm_5', name: '化神尊者', icon: '✨', desc: '突破到化神期', category: 'cultivation', condition: d => d.realm >= 5, reward: { gold: 5000, exp: 4000 } },
    { id: 'realm_6', name: '渡劫大能', icon: '🌩️', desc: '突破到渡劫期', category: 'cultivation', condition: d => d.realm >= 6, reward: { gold: 15000, exp: 12000 } },
    { id: 'realm_7', name: '大乘圆满', icon: '🌟', desc: '达到大乘期', category: 'cultivation', condition: d => d.realm >= 7, reward: { gold: 50000, exp: 40000 } },
    { id: 'exp_10k', name: '修炼之路', icon: '📖', desc: '累计获得10000修为', category: 'cultivation', condition: d => d.totalExp >= 10000, reward: { gold: 200, exp: 100 } },
    { id: 'exp_100k', name: '修仙大道', icon: '📚', desc: '累计获得100000修为', category: 'cultivation', condition: d => d.totalExp >= 100000, reward: { gold: 2000, exp: 1000 } },
    // 炼丹
    { id: 'craft_1', name: '初学炼丹', icon: '🔥', desc: '成功炼制第一颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'craft_20', name: '丹道小成', icon: '🔮', desc: '成功炼制20颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 20, reward: { gold: 500, exp: 300 } },
    { id: 'craft_100', name: '丹道大师', icon: '⚗️', desc: '成功炼制100颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 100, reward: { gold: 3000, exp: 2000 } },
    // 探索
    { id: 'event_1', name: '初探秘境', icon: '🗺️', desc: '触发第一个随机事件', category: 'explore', condition: d => d.totalEvents >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'event_10', name: '历练丰富', icon: '🧭', desc: '触发10个随机事件', category: 'explore', condition: d => d.totalEvents >= 10, reward: { gold: 300, exp: 200 } },
    { id: 'event_50', name: '阅历无数', icon: '🌍', desc: '触发50个随机事件', category: 'explore', condition: d => d.totalEvents >= 50, reward: { gold: 1500, exp: 1000 } },
    { id: 'event_100', name: '天命之人', icon: '🌈', desc: '触发100个随机事件', category: 'explore', condition: d => d.totalEvents >= 100, reward: { gold: 5000, exp: 4000 } },
    // 灵宠
    { id: 'pet_first', name: '灵兽初契', icon: '🐾', desc: '获得第一只灵宠', category: 'explore', condition: d => (d.pets || []).length >= 1, reward: { gold: 200, exp: 150 } },
    { id: 'pet_3', name: '驯兽师', icon: '🐾', desc: '拥有3只灵宠', category: 'explore', condition: d => (d.pets || []).length >= 3, reward: { gold: 1000, exp: 800 } },
    { id: 'pet_evolved', name: '灵兽进化', icon: '🐉', desc: '灵宠完成一次进化', category: 'explore', condition: d => (d.pets || []).some(p => p.evolution >= 1), reward: { gold: 800, exp: 600 } },
    // 强化
    { id: 'enhance_5', name: '强化入门', icon: '🔨', desc: '装备强化到+5', category: 'cultivation', condition: d => Object.values(d.enhanceLevels || {}).some(v => v >= 5), reward: { gold: 1000, exp: 800 } },
    { id: 'enhance_10', name: '强化大师', icon: '⚒️', desc: '装备强化到+10', category: 'cultivation', condition: d => Object.values(d.enhanceLevels || {}).some(v => v >= 10), reward: { gold: 5000, exp: 4000 } },
    // 秘境
    { id: 'sr_5', name: '秘境探险', icon: '🏔️', desc: '秘境到达第5层', category: 'battle', condition: d => (d.secretRealmBestFloor || 0) >= 5, reward: { gold: 1500, exp: 1200 } },
    { id: 'sr_10', name: '秘境征服', icon: '🏰', desc: '通关秘境', category: 'battle', condition: d => (d.secretRealmBestFloor || 0) >= 10, reward: { gold: 5000, exp: 4000 } },
    // 轮回
    { id: 'rebirth_1', name: '轮回初悟', icon: '🔄', desc: '完成第一次轮回', category: 'cultivation', condition: d => (d.rebirthCount || 0) >= 1, reward: { gold: 5000, exp: 3000 } },
    { id: 'rebirth_3', name: '三世修仙', icon: '♻️', desc: '完成3次轮回', category: 'cultivation', condition: d => (d.rebirthCount || 0) >= 3, reward: { gold: 20000, exp: 15000 } },
    // 功法
    { id: 'tech_first', name: '初窥门径', icon: '📖', desc: '学习第一部功法', category: 'cultivation', condition: d => (d.learnedTechniques || []).length >= 1, reward: { gold: 300, exp: 200 } },
    { id: 'tech_5', name: '博学多才', icon: '📚', desc: '学习5部功法', category: 'cultivation', condition: d => (d.learnedTechniques || []).length >= 5, reward: { gold: 3000, exp: 2000 } },
    // 财富
    { id: 'gold_100k', name: '富可敌国', icon: '💰', desc: '拥有100000灵石', category: 'explore', condition: d => d.gold >= 100000, reward: { gold: 10000, exp: 5000 } },
    // 炼器
    { id: 'forge_first', name: '初窥炼器', icon: '🔨', desc: '成功炼制第一件装备', category: 'alchemy', condition: d => (d.totalForges || 0) >= 1, reward: { gold: 100, exp: 80 } },
    { id: 'forge_10', name: '炼器师', icon: '⚒️', desc: '成功炼制10件装备', category: 'alchemy', condition: d => (d.totalForges || 0) >= 10, reward: { gold: 2000, exp: 1500 } },
    { id: 'forge_epic', name: '神兵利器', icon: '🌟', desc: '炼制出极品装备', category: 'alchemy', condition: d => d.hasForgedEpic === true, reward: { gold: 5000, exp: 3000 } },
  ];

  const RANDOM_EVENTS = [
    { id: 'treasure_box', name: '发现宝箱', icon: '📦', desc: '你发现了一个古老的宝箱！', chance: 0.0024, options: [
      { text: '打开宝箱', result: g => { const gold = randomInt(100, 300); g.data.gold += gold; return `获得 ${gold} 灵石！`; } },
      { text: '谨慎离开', result: g => { const exp = randomInt(30, 80); g.data.exp += exp; g.data.totalExp += exp; return `感悟道理，获得 ${exp} 修为。`; } },
    ]},
    { id: 'evil_cultivator', name: '遭遇妖修', icon: '👹', desc: '一名妖修挡住了你的去路！', chance: 0.0018, options: [
      { text: '与之战斗', result: g => { if (Math.random() < 0.6) { const gold = randomInt(150, 400); const exp = randomInt(80, 200); g.data.gold += gold; g.data.exp += exp; g.data.totalExp += exp; return `击败妖修！获得 ${gold} 灵石和 ${exp} 修为！`; } else { const loss = Math.floor(g.data.gold * 0.1); g.data.gold = Math.max(0, g.data.gold - loss); return `不敌妖修，丢失了 ${loss} 灵石。`; } } },
      { text: '绕道而行', result: () => '你选择绕道而行，避免了一场恶战。' },
    ]},
    { id: 'inheritance', name: '获得传承', icon: '📜', desc: '你发现了一处古修士洞府！', chance: 0.0012, options: [
      { text: '接受传承', result: g => { const exp = randomInt(300, 600); g.data.exp += exp; g.data.totalExp += exp; return `获得古修士传承，修为大增！+${exp} 修为！`; } },
      { text: '搜刮洞府', result: g => { const gold = randomInt(200, 500); g.data.gold += gold; return `在洞府中找到 ${gold} 灵石。`; } },
    ]},
    { id: 'herb_find', name: '发现灵药', icon: '🌿', desc: '你发现了一片灵药田！', chance: 0.003, options: [
      { text: '采集灵药', result: g => { const c = randomInt(3, 6); g.data.inventory.herb = (g.data.inventory.herb || 0) + c; return `采集了 ${c} 株灵草！`; } },
      { text: '在此修炼', result: g => { const exp = randomInt(50, 120); g.data.exp += exp; g.data.totalExp += exp; return `灵气充裕之地修炼，获得 ${exp} 修为。`; } },
    ]},
    { id: 'merchant', name: '神秘商人', icon: '🧳', desc: '一位云游商人出现在你面前。', chance: 0.0024, options: [
      { text: '交易 (花费100灵石)', result: g => { if (g.data.gold >= 100) { g.data.gold -= 100; const mats = ['herb','crystal','beast_core','ore']; const m = pick(mats); const c = randomInt(2, 4); g.data.inventory[m] = (g.data.inventory[m] || 0) + c; return `购得 ${c} 个${MATERIALS[m].name}！`; } return '灵石不足，商人摇头离去。'; } },
      { text: '闲聊', result: g => { const exp = randomInt(20, 50); g.data.exp += exp; g.data.totalExp += exp; return `交流修仙心得，获得 ${exp} 修为。`; } },
    ]},
    { id: 'mine', name: '灵石矿脉', icon: '⛏️', desc: '你发现了一条灵矿矿脉！', chance: 0.003, options: [
      { text: '开采矿石', result: g => { const c = randomInt(2, 5); g.data.inventory.ore = (g.data.inventory.ore || 0) + c; return `开采了 ${c} 块灵矿！`; } },
      { text: '探索深处', result: g => { if (Math.random() < 0.5) { const c = randomInt(1, 3); g.data.inventory.crystal = (g.data.inventory.crystal || 0) + c; return `发现 ${c} 颗灵石！`; } const gold = randomInt(50, 150); g.data.gold += gold; return `找到 ${gold} 灵石的矿物。`; } },
    ]},
    { id: 'spring', name: '灵泉', icon: '💧', desc: '你发现了一处灵泉！', chance: 0.0024, options: [
      { text: '饮用灵泉', result: g => { g.data.hp = g.data.maxHp; if (g.data.spirit !== undefined) g.data.spirit = g.data.maxSpirit; const exp = randomInt(40, 100); g.data.exp += exp; g.data.totalExp += exp; return `伤势全愈，灵力恢复，获得 ${exp} 修为！`; } },
      { text: '在灵泉旁修炼', result: g => { const exp = randomInt(80, 200); g.data.exp += exp; g.data.totalExp += exp; return `灵气充沛，获得 ${exp} 修为！`; } },
    ]},
    { id: 'tribulation', name: '天劫感悟', icon: '🌩️', desc: '你在天劫余波中获得感悟！', chance: 0.0012, options: [
      { text: '参悟天劫', result: g => { const exp = randomInt(200, 500); g.data.exp += exp; g.data.totalExp += exp; return `参悟大道，获得 ${exp} 修为！`; } },
      { text: '收集雷灵', result: g => { const c = randomInt(1, 3); g.data.inventory.crystal = (g.data.inventory.crystal || 0) + c; g.data.inventory.beast_core = (g.data.inventory.beast_core || 0) + c; return `收集了 ${c} 颗灵石和 ${c} 颗兽核！`; } },
    ]},
    { id: 'beast_remains', name: '灵兽遗骸', icon: '🦴', desc: '你发现了一具远古灵兽的遗骸。', chance: 0.0018, options: [
      { text: '搜索遗骸', result: g => { const c = randomInt(2, 5); g.data.inventory.beast_core = (g.data.inventory.beast_core || 0) + c; return `获取了 ${c} 颗兽核！`; } },
      { text: '感悟灵兽之道', result: g => { const exp = randomInt(100, 250); g.data.exp += exp; g.data.totalExp += exp; return `感悟战斗之道，获得 ${exp} 修为！`; } },
    ]},
    { id: 'pill_rain', name: '天降丹药', icon: '💊', desc: '天空中降下了奇异的丹药！', chance: 0.0036, options: [
      { text: '收集丹药', result: g => { const heal = Math.floor(g.data.maxHp * 0.3); g.data.hp = Math.min(g.data.maxHp, g.data.hp + heal); const exp = randomInt(30, 80); g.data.exp += exp; g.data.totalExp += exp; return `恢复 ${heal} 生命，获得 ${exp} 修为！`; } },
      { text: '分析丹方', result: g => { for (const m of ['herb','crystal','beast_core','ore']) { const c = randomInt(1, 2); g.data.inventory[m] = (g.data.inventory[m] || 0) + c; } return '分析丹药成分，获得了各种炼丹材料！'; } },
    ]},
  ];

  // ==================== 装备强化系统 ====================

  const ENHANCE_CONFIG = {
    maxLevel: 10,
    rates: { 1: 1.0, 2: 1.0, 3: 1.0, 4: 0.8, 5: 0.8, 6: 0.8, 7: 0.5, 8: 0.5, 9: 0.5, 10: 0.3 },
    costs: {
      1: { gold: 100, ore: 1 }, 2: { gold: 200, ore: 2 }, 3: { gold: 400, ore: 3 },
      4: { gold: 800, crystal: 1, ore: 2 }, 5: { gold: 1500, crystal: 2, ore: 3 },
      6: { gold: 3000, crystal: 3, ore: 4 }, 7: { gold: 6000, crystal: 5, beast_core: 2 },
      8: { gold: 12000, crystal: 8, beast_core: 3 }, 9: { gold: 25000, crystal: 12, beast_core: 5 },
      10: { gold: 50000, crystal: 20, beast_core: 10 },
    },
    bonusPerLevel: 0.08,
  };

  // ==================== 灵宠系统 ====================

  const PET_TEMPLATES = [
    { id: 'pet_wolf', name: '灵狼', icon: '🐺', baseAtk: 8, baseDef: 4, baseHp: 40, captureFrom: 'wolf' },
    { id: 'pet_snake', name: '蟒蛇', icon: '🐍', baseAtk: 10, baseDef: 6, baseHp: 50, captureFrom: 'snake' },
    { id: 'pet_bear', name: '灵熊', icon: '🐻', baseAtk: 12, baseDef: 10, baseHp: 80, captureFrom: 'bear' },
    { id: 'pet_bat', name: '蝙蝠精', icon: '🦇', baseAtk: 14, baseDef: 5, baseHp: 45, captureFrom: 'bat' },
    { id: 'pet_spider', name: '蛛妖', icon: '🕷️', baseAtk: 16, baseDef: 8, baseHp: 55, captureFrom: 'spider' },
    { id: 'pet_phoenix', name: '火鸦', icon: '🐦', baseAtk: 20, baseDef: 12, baseHp: 70, captureFrom: 'phoenix_jr' },
    { id: 'pet_shadow', name: '暗影', icon: '🌑', baseAtk: 25, baseDef: 10, baseHp: 60, captureFrom: 'shadow' },
    { id: 'pet_void', name: '虚空兽', icon: '🌀', baseAtk: 35, baseDef: 18, baseHp: 100, captureFrom: 'void_beast' },
  ];

  const PET_EVOLUTION = {
    pet_wolf: [{ lvl: 10, name: '银狼', icon: '🐺', mul: 1.5 }, { lvl: 20, name: '天狼', icon: '🐺', mul: 2.0 }],
    pet_snake: [{ lvl: 10, name: '蛟蛇', icon: '🐍', mul: 1.5 }, { lvl: 20, name: '蛟龙', icon: '🐉', mul: 2.0 }],
    pet_bear: [{ lvl: 10, name: '玄熊', icon: '🐻', mul: 1.5 }, { lvl: 20, name: '熊王', icon: '🐻', mul: 2.0 }],
    pet_bat: [{ lvl: 10, name: '夜魔', icon: '🦇', mul: 1.5 }, { lvl: 20, name: '血族', icon: '🦇', mul: 2.0 }],
    pet_spider: [{ lvl: 10, name: '毒蛛', icon: '🕷️', mul: 1.5 }, { lvl: 20, name: '蛛皇', icon: '🕷️', mul: 2.0 }],
    pet_phoenix: [{ lvl: 10, name: '朱雀', icon: '🐦', mul: 1.5 }, { lvl: 20, name: '凤凰', icon: '🔥', mul: 2.0 }],
    pet_shadow: [{ lvl: 10, name: '暗魂', icon: '🌑', mul: 1.5 }, { lvl: 20, name: '暗影主宰', icon: '🌑', mul: 2.0 }],
    pet_void: [{ lvl: 10, name: '虚空领主', icon: '🌀', mul: 1.5 }, { lvl: 20, name: '混沌巨兽', icon: '🌌', mul: 2.0 }],
  };

  // ==================== 秘境探索 ====================

  const SECRET_REALM = {
    entryCost: 500,
    cooldownMs: 5 * 60 * 1000,
    realmReq: 2,
    floors: [
      { floor: 1, type: 'random', scale: 1.0 },
      { floor: 2, type: 'random', scale: 1.2 },
      { floor: 3, type: 'random', scale: 1.5 },
      { floor: 4, type: 'random', scale: 1.8 },
      { floor: 5, type: 'boss', scale: 2.5, boss: 'demon_lord' },
      { floor: 6, type: 'random', scale: 2.0 },
      { floor: 7, type: 'random', scale: 2.3 },
      { floor: 8, type: 'random', scale: 2.8 },
      { floor: 9, type: 'random', scale: 3.2 },
      { floor: 10, type: 'boss', scale: 4.0, boss: 'dao_guardian' },
    ],
  };

  // ==================== 宗门任务 ====================

  const QUEST_TEMPLATES = [
    { id: 'qt_kill_3', name: '除恶令', desc: '击杀3只怪物', type: 'kill', target: 3, rewardGold: 200, rewardExp: 150 },
    { id: 'qt_kill_5', name: '大扫除', desc: '击杀5只怪物', type: 'kill', target: 5, rewardGold: 400, rewardExp: 300 },
    { id: 'qt_kill_10', name: '灭妖令', desc: '击杀10只怪物', type: 'kill', target: 10, rewardGold: 800, rewardExp: 600 },
    { id: 'qt_craft_1', name: '炼丹任务', desc: '成功炼制1颗丹药', type: 'craft', target: 1, rewardGold: 150, rewardExp: 100 },
    { id: 'qt_craft_3', name: '批量炼丹', desc: '成功炼制3颗丹药', type: 'craft', target: 3, rewardGold: 500, rewardExp: 400 },
    { id: 'qt_meditate_60', name: '静心修炼', desc: '打坐修炼60秒', type: 'meditate', target: 60, rewardGold: 100, rewardExp: 200 },
    { id: 'qt_meditate_300', name: '闭关修炼', desc: '打坐修炼300秒', type: 'meditate', target: 300, rewardGold: 300, rewardExp: 500 },
    { id: 'qt_gold_500', name: '财务审计', desc: '持有500灵石', type: 'gold', target: 500, rewardGold: 100, rewardExp: 100 },
    { id: 'qt_gold_2000', name: '富甲一方', desc: '持有2000灵石', type: 'gold', target: 2000, rewardGold: 300, rewardExp: 200 },
    { id: 'qt_event_1', name: '奇遇之旅', desc: '触发1次随机事件', type: 'event', target: 1, rewardGold: 200, rewardExp: 150 },
  ];

  // ==================== 悬赏令系统 ====================

  const BOUNTY_TEMPLATES = [
    { id: 'b_kill_wolf_5', name: '灵狼之患', desc: '击杀5只灵狼', type: 'kill_specific', monster: 'wolf', target: 5, rewardGold: 500, rewardExp: 400, realmReq: 0 },
    { id: 'b_kill_boss_1', name: '魔尊悬赏', desc: '击杀1只魔尊', type: 'kill_specific', monster: 'demon_lord', target: 1, rewardGold: 3000, rewardExp: 2500, realmReq: 3 },
    { id: 'b_kill_20', name: '杀伐令', desc: '击杀20只怪物', type: 'kill', target: 20, rewardGold: 2000, rewardExp: 1500, realmReq: 1 },
    { id: 'b_craft_5', name: '丹方大师', desc: '成功炼制5颗丹药', type: 'craft', target: 5, rewardGold: 1200, rewardExp: 800, realmReq: 1 },
    { id: 'b_sr_5', name: '秘境先锋', desc: '秘境到达第5层', type: 'sr_floor', target: 5, rewardGold: 1500, rewardExp: 1200, realmReq: 2 },
    { id: 'b_sr_10', name: '秘境征服者', desc: '通关秘境', type: 'sr_floor', target: 10, rewardGold: 5000, rewardExp: 4000, realmReq: 3 },
    { id: 'b_gold_5000', name: '聚财令', desc: '持有5000灵石', type: 'gold', target: 5000, rewardGold: 800, rewardExp: 600, realmReq: 2 },
    { id: 'b_meditate_600', name: '禅定修行', desc: '打坐600秒', type: 'meditate', target: 600, rewardGold: 1000, rewardExp: 1000, realmReq: 1 },
    { id: 'b_no_damage', name: '完美战斗', desc: '无伤击杀3只怪物', type: 'no_damage_kills', target: 3, rewardGold: 2000, rewardExp: 1800, realmReq: 2 },
    { id: 'b_pet_lv10', name: '灵兽大师', desc: '灵宠达到10级', type: 'pet_level', target: 10, rewardGold: 1500, rewardExp: 1200, realmReq: 2 },
    { id: 'b_kill_element', name: '五行猎手', desc: '击杀3只不同五行的怪物', type: 'element_kills', target: 3, rewardGold: 1800, rewardExp: 1500, realmReq: 2 },
    { id: 'b_enhance_5', name: '强化大师', desc: '装备强化5次', type: 'enhance', target: 5, rewardGold: 1000, rewardExp: 800, realmReq: 1 },
    { id: 'b_kill_dragon', name: '屠龙令', desc: '击杀古龙', type: 'kill_specific', monster: 'ancient_dragon', target: 1, rewardGold: 8000, rewardExp: 6000, realmReq: 5 },
    { id: 'b_kill_50', name: '百战令', desc: '击杀50只怪物', type: 'kill', target: 50, rewardGold: 5000, rewardExp: 4000, realmReq: 3 },
    { id: 'b_event_5', name: '奇缘猎人', desc: '触发5次随机事件', type: 'event', target: 5, rewardGold: 1500, rewardExp: 1200, realmReq: 1 },
  ];

  // ==================== 轮回系统 ====================

  const REBIRTH_CONFIG = {
    minRealm: 5,
    bonusPerRebirth: { expRate: 0.15, atkMul: 0.05, defMul: 0.05, hpMul: 0.05, goldCarry: 0.1 },
    startRealm: [0, 0, 1, 1, 2, 2, 3],
    maxRebirth: 10,
  };

  // ==================== 灵宠捕捉配置 ====================

  const CAPTURE_CONFIG = {
    baseRate: 0.12,
    realmBonus: 0.035,
    hpThreshold: 0.55,
    hpBonusRate: 0.0025,
    talismanBonus: 0.25,
    affinityPerBattle: 3,
    affinityPerFeed: 5,
    affinityMax: 100,
  };

  // ==================== 灵宠技能 ====================

  const PET_SKILLS = {
    pet_wolf: { name: '狼嚎', dmgMul: 1.5, cooldown: 3, effect: null, desc: '嚎叫攻击' },
    pet_snake: { name: '毒噬', dmgMul: 1.0, cooldown: 4, effect: { type: 'dot', dmg: 0.3, turns: 2 }, desc: '毒液持续伤害' },
    pet_bear: { name: '熊击守护', dmgMul: 1.5, cooldown: 5, effect: { type: 'taunt', turns: 2 }, desc: '重击并嘲讽2回合', manual: true },
    pet_bat: { name: '血宴', dmgMul: 0.8, cooldown: 4, effect: { type: 'heal_burst', value: 0.15 }, desc: '恢复主人15%HP', manual: true },
    pet_spider: { name: '蛛丝护盾', dmgMul: 0.5, cooldown: 5, effect: { type: 'shield_owner', value: 0.12 }, desc: '给主人12%最大HP护盾', manual: true },
    pet_phoenix: { name: '烈焰冲击', dmgMul: 1.3, cooldown: 5, effect: { type: 'dot', dmg: 0.4, turns: 3 }, desc: '火焰持续伤害' },
    pet_shadow: { name: '暗影突袭', dmgMul: 2.5, cooldown: 6, effect: null, desc: '暗影突袭' },
    pet_void: { name: '虚空吞噬', dmgMul: 3.0, cooldown: 7, effect: { type: 'restore_spirit', value: 20 }, desc: '恢复20灵力', manual: true },
  };

  // ==================== 宗门捐赠选项 ====================

  const SECT_DONATION_OPTIONS = [
    { id: 'gold_100', name: '捐赠100灵石', cost: { gold: 100 }, contribution: 10 },
    { id: 'gold_500', name: '捐赠500灵石', cost: { gold: 500 }, contribution: 60 },
    { id: 'gold_2000', name: '捐赠2000灵石', cost: { gold: 2000 }, contribution: 280 },
    { id: 'herb_10', name: '灵草x10', cost: { herb: 10 }, contribution: 15 },
    { id: 'crystal_5', name: '灵石x5', cost: { crystal: 5 }, contribution: 30 },
    { id: 'beast_core_5', name: '兽核x5', cost: { beast_core: 5 }, contribution: 40 },
    { id: 'ore_10', name: '灵矿x10', cost: { ore: 10 }, contribution: 25 },
  ];

  // ==================== 宗门商店（按宗门分类） ====================

  const SECT_SHOP_ITEMS = {
    sword: [
      { id: 'ss_sword_1', name: '剑意残卷', cost: 50, type: 'perm', effect: { atkPct: 0.05 }, desc: '攻击+5%永久' },
      { id: 'ss_sword_2', name: '剑心丹', cost: 20, type: 'exp', value: 500, desc: '+500修为' },
      { id: 'ss_sword_3', name: '聚灵石', cost: 30, type: 'material', itemId: 'crystal', count: 5, desc: '灵石x5' },
      { id: 'ss_sword_4', name: '捕灵符x5', cost: 40, type: 'material', itemId: 'capture_talisman', count: 5, desc: '捕灵符x5' },
      { id: 'ss_sword_5', name: '御剑秘典', cost: 200, type: 'perm', effect: { atkPct: 0.10 }, desc: '攻击+10%永久' },
    ],
    pill: [
      { id: 'ss_pill_1', name: '丹道残篇', cost: 50, type: 'perm', effect: { alchemyPct: 0.05 }, desc: '炼丹+5%永久' },
      { id: 'ss_pill_2', name: '固元丹', cost: 20, type: 'exp', value: 500, desc: '+500修为' },
      { id: 'ss_pill_3', name: '百草集', cost: 30, type: 'material', itemId: 'herb', count: 10, desc: '灵草x10' },
      { id: 'ss_pill_4', name: '捕灵符x5', cost: 40, type: 'material', itemId: 'capture_talisman', count: 5, desc: '捕灵符x5' },
      { id: 'ss_pill_5', name: '丹道秘典', cost: 200, type: 'perm', effect: { alchemyPct: 0.10 }, desc: '炼丹+10%永久' },
    ],
    body: [
      { id: 'ss_body_1', name: '体修残卷', cost: 50, type: 'perm', effect: { defPct: 0.05 }, desc: '防御+5%永久' },
      { id: 'ss_body_2', name: '壮骨丹', cost: 20, type: 'exp', value: 500, desc: '+500修为' },
      { id: 'ss_body_3', name: '精铁块', cost: 30, type: 'material', itemId: 'ore', count: 8, desc: '灵矿x8' },
      { id: 'ss_body_4', name: '捕灵符x5', cost: 40, type: 'material', itemId: 'capture_talisman', count: 5, desc: '捕灵符x5' },
      { id: 'ss_body_5', name: '金刚秘典', cost: 200, type: 'perm', effect: { defPct: 0.10, hpPct: 0.05 }, desc: '防御+10%,生命+5%永久' },
    ],
    spirit: [
      { id: 'ss_spirit_1', name: '灵修残篇', cost: 50, type: 'perm', effect: { expPct: 0.05 }, desc: '经验+5%永久' },
      { id: 'ss_spirit_2', name: '醒灵丹', cost: 20, type: 'exp', value: 500, desc: '+500修为' },
      { id: 'ss_spirit_3', name: '灵晶', cost: 30, type: 'material', itemId: 'crystal', count: 5, desc: '灵石x5' },
      { id: 'ss_spirit_4', name: '捕灵符x5', cost: 40, type: 'material', itemId: 'capture_talisman', count: 5, desc: '捕灵符x5' },
      { id: 'ss_spirit_5', name: '灵修秘典', cost: 200, type: 'perm', effect: { expPct: 0.10 }, desc: '经验+10%永久' },
    ],
  };

  // ==================== 宗门修炼室 ====================

  const SECT_TRAINING_CONFIG = [
    { id: 'train_1', name: '初级修炼室', cost: 20, duration: 60, multiplier: 1.5 },
    { id: 'train_2', name: '中级修炼室', cost: 50, duration: 300, multiplier: 1.8 },
    { id: 'train_3', name: '高级修炼室', cost: 100, duration: 600, multiplier: 2.0 },
    { id: 'train_4', name: '至尊修炼室', cost: 200, duration: 1800, multiplier: 2.5 },
  ];

  // ==================== 宗门大比 ====================

  const SECT_TOURNAMENT_CONFIG = {
    dailyFights: 3,
    entryCost: 10,
    npcs: [
      { rank: 1, name: '张师弟', icon: '🧑', scale: { atk: 0.6, def: 0.5, hp: 0.7 }, rewardContribution: 10, rewardGold: 50 },
      { rank: 2, name: '李师妹', icon: '👧', scale: { atk: 0.7, def: 0.6, hp: 0.8 }, rewardContribution: 20, rewardGold: 100 },
      { rank: 3, name: '王师兄', icon: '🧔', scale: { atk: 0.8, def: 0.7, hp: 0.9 }, rewardContribution: 35, rewardGold: 200 },
      { rank: 4, name: '赵长老', icon: '👴', scale: { atk: 0.9, def: 0.8, hp: 1.0 }, rewardContribution: 50, rewardGold: 350 },
      { rank: 5, name: '钱护法', icon: '🥷', scale: { atk: 1.0, def: 0.9, hp: 1.1 }, rewardContribution: 70, rewardGold: 500 },
      { rank: 6, name: '孙执事', icon: '🧙', scale: { atk: 1.05, def: 1.0, hp: 1.2 }, rewardContribution: 100, rewardGold: 700 },
      { rank: 7, name: '周掌门弟子', icon: '⚔️', scale: { atk: 1.1, def: 1.1, hp: 1.4 }, rewardContribution: 140, rewardGold: 1000 },
      { rank: 8, name: '吴太上长老', icon: '🧓', scale: { atk: 1.2, def: 1.2, hp: 1.6 }, rewardContribution: 180, rewardGold: 1500 },
      { rank: 9, name: '郑掌门', icon: '👑', scale: { atk: 1.35, def: 1.3, hp: 1.8 }, rewardContribution: 230, rewardGold: 2000 },
      { rank: 10, name: '天机老人', icon: '🌟', scale: { atk: 1.5, def: 1.4, hp: 2.0 }, rewardContribution: 300, rewardGold: 3000 },
    ],
  };

  // ==================== 称号系统 ====================

  const TITLES = [
    { id: 'title_beginner', name: '初入江湖', condition: () => true, bonus: { expPct: 0.02 }, desc: '创建角色', bonusDesc: '经验+2%' },
    { id: 'title_warrior', name: '百战之士', condition: d => d.totalKills >= 100, bonus: { atkPct: 0.03 }, desc: '击杀100敌人', bonusDesc: '攻击+3%' },
    { id: 'title_slayer', name: '屠龙勇者', condition: d => d.totalKills >= 5000, bonus: { atkPct: 0.08 }, desc: '击杀5000敌人', bonusDesc: '攻击+8%' },
    { id: 'title_alchemist', name: '丹道宗师', condition: d => d.totalCrafts >= 100, bonus: { alchemyPct: 0.05 }, desc: '炼丹100次', bonusDesc: '炼丹+5%' },
    { id: 'title_rich', name: '富甲天下', condition: d => d.gold >= 100000, bonus: { goldPct: 0.10 }, desc: '持有10万灵石', bonusDesc: '金币+10%' },
    { id: 'title_beastmaster', name: '驯兽大师', condition: d => (d.pets || []).length >= 6, bonus: { atkPct: 0.05, defPct: 0.05 }, desc: '拥有6只灵宠', bonusDesc: '攻防各+5%' },
    { id: 'title_reborn', name: '轮回仙尊', condition: d => (d.rebirthCount || 0) >= 3, bonus: { expPct: 0.10 }, desc: '3次轮回', bonusDesc: '经验+10%' },
    { id: 'title_collector', name: '万物通鉴', condition: d => { const b = d.bestiary || {}; const total = Object.keys(MONSTERS).length; const found = Object.keys(b.monsters || {}).length; return found >= total * 0.5; }, bonus: { expPct: 0.05, atkPct: 0.03 }, desc: '图鉴50%+', bonusDesc: '经验+5%,攻+3%' },
    { id: 'title_champion', name: '宗门之星', condition: d => (d.tournamentBestRank || 0) >= 7, bonus: { atkPct: 0.05, defPct: 0.05 }, desc: '大比第7名', bonusDesc: '攻防各+5%' },
    { id: 'title_transcend', name: '超越凡尘', condition: d => d.realm >= 7, bonus: { atkPct: 0.10, defPct: 0.10, hpPct: 0.10 }, desc: '大乘期', bonusDesc: '攻防血各+10%' },
  ];
  const TITLES_MAP = Object.fromEntries(TITLES.map(t => [t.id, t]));

  // ==================== 功法系统 ====================

  const TECHNIQUES = [
    { id: 'tech_flame', name: '焚天诀', icon: '🔥', desc: '攻击+12%', type: 'attack', element: 'fire', realmReq: 1, cost: 500, effect: { atkMul: 1.12 } },
    { id: 'tech_thunder', name: '雷霆万钧', icon: '⚡', desc: '攻击+20%, 暴击+10%', type: 'attack', element: 'wood', realmReq: 3, cost: 3000, effect: { atkMul: 1.20, critBonus: 0.10 } },
    { id: 'tech_void_slash', name: '虚空斩', icon: '🌀', desc: '攻击+35%', type: 'attack', element: 'chaos', realmReq: 5, cost: 15000, effect: { atkMul: 1.35 } },
    { id: 'tech_iron_body', name: '金钟罩', icon: '🛡️', desc: '防御+15%', type: 'defense', element: 'earth', realmReq: 1, cost: 500, effect: { defMul: 1.15 } },
    { id: 'tech_diamond', name: '金刚不坏', icon: '💎', desc: '防御+25%, 生命+10%', type: 'defense', element: 'gold', realmReq: 3, cost: 3000, effect: { defMul: 1.25, hpMul: 1.10 } },
    { id: 'tech_chaos_body', name: '混沌体', icon: '🌌', desc: '防御+30%, 生命+20%', type: 'defense', element: 'chaos', realmReq: 5, cost: 15000, effect: { defMul: 1.30, hpMul: 1.20 } },
    { id: 'tech_spirit_draw', name: '聚灵决', icon: '💨', desc: '修炼速度+15%', type: 'cultivate', element: 'water', realmReq: 0, cost: 200, effect: { expMul: 1.15 } },
    { id: 'tech_heaven_sutra', name: '太上感应', icon: '📜', desc: '修炼速度+25%, 灵力+15%', type: 'cultivate', element: 'wood', realmReq: 2, cost: 2000, effect: { expMul: 1.25, spiritMul: 1.15 } },
    { id: 'tech_dao_heart', name: '道心种魔', icon: '☯️', desc: '修炼速度+40%', type: 'cultivate', element: 'chaos', realmReq: 4, cost: 10000, effect: { expMul: 1.40 } },
    { id: 'tech_pill_art', name: '天工开物', icon: '⚗️', desc: '炼丹成功率+10%', type: 'support', element: 'wood', realmReq: 1, cost: 800, effect: { alchemyBonus: 0.10 } },
    { id: 'tech_treasure_eye', name: '鉴宝神瞳', icon: '👁️', desc: '掉落率+20%, 金币+15%', type: 'support', element: 'gold', realmReq: 3, cost: 4000, effect: { dropBonus: 0.20, goldMul: 1.15 } },
    { id: 'tech_reborn', name: '不灭轮回', icon: '♾️', desc: '轮回保留额外10%金币', type: 'support', element: 'chaos', realmReq: 5, cost: 20000, effect: { rebirthGoldBonus: 0.10 } },
  ];
  const TECHNIQUES_MAP = Object.fromEntries(TECHNIQUES.map(t => [t.id, t]));

  const ELEMENT_GEN = { wood: 'fire', fire: 'earth', earth: 'gold', gold: 'water', water: 'wood' };
  const ELEMENT_CTRL = { wood: 'earth', earth: 'water', water: 'fire', fire: 'gold', gold: 'wood' };

  function scaleMul(baseMul, strength = 1) {
    if (typeof baseMul !== 'number') return baseMul;
    return 1 + (baseMul - 1) * strength;
  }

  function getTechniqueAffinity(spiritRootId, tech) {
    const rootElem = spiritRootId === 'chaos' ? 'chaos' : spiritRootId;
    const techElem = tech && tech.element ? tech.element : null;
    if (!techElem) return { label: '—', relation: 'none', mult: 1, breakBonus: 0, deviationBonus: 0 };

    // 混沌：弱相性，偏正向
    if (rootElem === 'chaos' || techElem === 'chaos') {
      return { label: '混沌契合', relation: 'chaos', mult: 1.05, breakBonus: 0.01, deviationBonus: 0 };
    }

    if (rootElem === techElem) {
      return { label: '同源', relation: 'same', mult: 1.10, breakBonus: 0.02, deviationBonus: 0 };
    }
    if (ELEMENT_GEN[rootElem] === techElem) {
      return { label: '相生', relation: 'gen', mult: 1.06, breakBonus: 0.01, deviationBonus: 0 };
    }
    if (ELEMENT_GEN[techElem] === rootElem) {
      return { label: '相生(反)', relation: 'gen_by', mult: 1.03, breakBonus: 0.00, deviationBonus: 0 };
    }
    if (ELEMENT_CTRL[rootElem] === techElem) {
      return { label: '相克', relation: 'ctrl', mult: 0.92, breakBonus: -0.02, deviationBonus: 0.06 };
    }
    if (ELEMENT_CTRL[techElem] === rootElem) {
      return { label: '相克(反)', relation: 'ctrl_by', mult: 0.95, breakBonus: -0.01, deviationBonus: 0.04 };
    }
    return { label: '平', relation: 'neutral', mult: 1.00, breakBonus: 0, deviationBonus: 0 };
  }

  function getScaledTechniqueEffect(d, tech) {
    if (!tech || !tech.effect) return null;
    const affinity = getTechniqueAffinity(d.spiritRoot, tech);
    const mult = affinity.mult || 1;
    const eff = tech.effect;
    const out = { ...eff };

    // 乘法类：按“强度”缩放增益幅度
    ['atkMul', 'defMul', 'hpMul', 'spiritMul', 'expMul', 'goldMul'].forEach((k) => {
      if (typeof eff[k] === 'number') out[k] = scaleMul(eff[k], mult);
    });

    // 加法类：按强度线性缩放
    ['critBonus', 'alchemyBonus', 'dropBonus', 'rebirthGoldBonus'].forEach((k) => {
      if (typeof eff[k] === 'number') out[k] = eff[k] * mult;
    });

    return out;
  }

  // ==================== 天劫小游戏 ====================

  const TRIBULATION_CONFIG = {
    minRealm: 6,
    phases: 5,
    timePerPhase: 2000,
    damageOnFail: 0.3,
  };

  // ==================== 世界事件 ====================

  const WORLD_EVENTS = [
    { id: 'spirit_tide', name: '灵气潮汐', icon: '🌊', desc: '天地灵气暴涨，修炼速度翻倍！', duration: 120, effect: { expMul: 2.0 } },
    { id: 'beast_wave', name: '妖兽潮', icon: '🐲', desc: '妖兽大举入侵，战利品翻倍但怪物更强！', duration: 120, effect: { monsterScale: 1.5, dropMul: 2.0, goldMul: 2.0 } },
    { id: 'market_fair', name: '仙人集市', icon: '🏪', desc: '神秘商人降临，物价减半！', duration: 120, effect: { shopDiscount: 0.5 } },
    { id: 'tribulation_wave', name: '天劫降世', icon: '🌩️', desc: '天劫气息弥漫，突破成功率+25%！', duration: 120, effect: { breakBonus: 0.25 } },
  ];

  // ==================== 世界地图系统 ====================

  const MAP_LOCATIONS = [
    // 凡人域
    { id: 'qingyun_town', name: '青云镇', icon: '🏘️', region: '凡人域', desc: '初始城镇，商铺林立', minRealm: 0, actions: ['talk', 'rest', 'explore'], connectedTo: ['luoxia_village', 'heifeng_ridge', 'market', 'library'], monsterPool: [] },
    { id: 'luoxia_village', name: '落霞村', icon: '🌾', region: '凡人域', desc: '宁静村落，灵草遍野', minRealm: 0, actions: ['gather', 'talk', 'explore'], connectedTo: ['qingyun_town', 'lingyao_valley'], monsterPool: ['wolf'] },
    { id: 'heifeng_ridge', name: '黑风岭', icon: '⛰️', region: '凡人域', desc: '盗匪横行，野兽出没', minRealm: 0, actions: ['battle', 'gather', 'talk', 'explore'], connectedTo: ['qingyun_town', 'tianji_city', 'mist_forest'], monsterPool: ['wolf', 'snake', 'bear'] },
    // 修仙界
    { id: 'tianji_city', name: '天机城', icon: '🏯', region: '修仙界', desc: '修仙者聚集之地', minRealm: 1, actions: ['talk', 'rest', 'explore'], connectedTo: ['heifeng_ridge', 'lingyao_valley', 'trial_tower', 'sect_hall', 'market'], monsterPool: [] },
    { id: 'lingyao_valley', name: '灵药谷', icon: '🌸', region: '修仙界', desc: '采药圣地，灵草遍地', minRealm: 1, actions: ['gather', 'talk', 'explore'], connectedTo: ['luoxia_village', 'tianji_city', 'alchemy_room'], monsterPool: ['bat', 'spider'] },
    { id: 'trial_tower', name: '试炼塔', icon: '🗼', region: '修仙界', desc: '逐层挑战，步步惊心', minRealm: 2, actions: ['battle', 'talk'], connectedTo: ['tianji_city'], monsterPool: ['golem', 'ghost', 'dark_monk'] },
    { id: 'sect_hall', name: '宗门驻地', icon: '🏛️', region: '修仙界', desc: '宗门核心，修炼重地', minRealm: 1, actions: ['talk', 'rest'], connectedTo: ['tianji_city'], monsterPool: [] },
    // 秘境
    { id: 'mist_forest', name: '迷雾森林', icon: '🌲', region: '秘境', desc: '迷雾笼罩，危机四伏', minRealm: 2, actions: ['battle', 'gather', 'explore'], connectedTo: ['heifeng_ridge', 'dragon_mine', 'ancient_ruins'], monsterPool: ['spider', 'ghost', 'demon'] },
    { id: 'dragon_mine', name: '龙脉矿洞', icon: '⛏️', region: '秘境', desc: '灵矿丰富，守护兽强', minRealm: 2, actions: ['battle', 'gather', 'talk', 'explore'], connectedTo: ['mist_forest', 'blood_arena'], monsterPool: ['golem', 'bat', 'dark_monk'] },
    { id: 'ancient_ruins', name: '上古遗迹', icon: '🏚️', region: '秘境', desc: '远古文明的遗存', minRealm: 3, actions: ['battle', 'explore', 'talk'], connectedTo: ['mist_forest', 'blood_arena'], monsterPool: ['demon', 'shadow', 'demon_lord'] },
    { id: 'blood_arena', name: '血海修罗场', icon: '🩸', region: '秘境', desc: '以战养战之地', minRealm: 3, actions: ['battle', 'talk'], connectedTo: ['dragon_mine', 'ancient_ruins'], monsterPool: ['dark_monk', 'demon_lord', 'shadow'] },
    // 仙域
    { id: 'yaochi', name: '瑶池仙境', icon: '🌅', region: '仙域', desc: '仙气缭绕，宝材遍地', minRealm: 5, actions: ['gather', 'talk', 'explore'], connectedTo: ['thunder_waste', 'heaven_ruins'], monsterPool: ['void_beast'] },
    { id: 'thunder_waste', name: '雷劫荒原', icon: '🌩️', region: '仙域', desc: '雷劫汇聚之所', minRealm: 6, actions: ['battle', 'talk', 'explore'], connectedTo: ['yaochi', 'chaos_void'], monsterPool: ['thunder_god', 'celestial'] },
    { id: 'heaven_ruins', name: '天庭废墟', icon: '☁️', region: '仙域', desc: '昔日天庭残骸', minRealm: 7, actions: ['battle', 'explore'], connectedTo: ['yaochi', 'chaos_void'], monsterPool: ['celestial', 'dao_guardian'] },
    { id: 'chaos_void', name: '混沌虚空', icon: '🌌', region: '仙域', desc: '万物起源与终结', minRealm: 7, actions: ['battle', 'explore', 'talk'], connectedTo: ['thunder_waste', 'heaven_ruins'], monsterPool: ['chaos_entity', 'dao_guardian', 'ancient_dragon'] },
    // 特殊
    { id: 'market', name: '坊市', icon: '🏪', region: '特殊', desc: '交易中心', minRealm: 0, actions: ['talk'], connectedTo: ['qingyun_town', 'tianji_city'], monsterPool: [] },
    { id: 'library', name: '藏经阁', icon: '📚', region: '特殊', desc: '功法学习之所', minRealm: 0, actions: ['talk'], connectedTo: ['qingyun_town'], monsterPool: [] },
    { id: 'alchemy_room', name: '炼丹房', icon: '⚗️', region: '特殊', desc: '炼丹系统入口', minRealm: 0, actions: [], connectedTo: ['lingyao_valley', 'tianji_city'], monsterPool: [] },
  ];

  const GATHER_TABLE = {
    luoxia_village: [{ id: 'herb', min: 1, max: 3, rate: 0.9 }, { id: 'crystal', min: 1, max: 1, rate: 0.1 }],
    heifeng_ridge: [{ id: 'ore', min: 1, max: 2, rate: 0.6 }, { id: 'beast_core', min: 1, max: 1, rate: 0.3 }, { id: 'herb', min: 1, max: 2, rate: 0.5 }],
    lingyao_valley: [{ id: 'herb', min: 2, max: 5, rate: 0.95 }, { id: 'crystal', min: 1, max: 2, rate: 0.3 }],
    mist_forest: [{ id: 'herb', min: 2, max: 4, rate: 0.7 }, { id: 'beast_core', min: 1, max: 2, rate: 0.4 }, { id: 'crystal', min: 1, max: 2, rate: 0.3 }],
    dragon_mine: [{ id: 'ore', min: 2, max: 5, rate: 0.9 }, { id: 'crystal', min: 1, max: 3, rate: 0.5 }, { id: 'beast_core', min: 1, max: 2, rate: 0.3 }],
    yaochi: [{ id: 'herb', min: 3, max: 8, rate: 0.9 }, { id: 'crystal', min: 2, max: 5, rate: 0.7 }, { id: 'beast_core', min: 1, max: 3, rate: 0.5 }],
  };

  // ==================== NPC系统 ====================

  const FAVOR_LEVELS = [
    { name: '陌生', min: 0, max: 19, color: 'level-0' },
    { name: '认识', min: 20, max: 39, color: 'level-1' },
    { name: '友好', min: 40, max: 59, color: 'level-2' },
    { name: '信任', min: 60, max: 79, color: 'level-3' },
    { name: '至交', min: 80, max: 100, color: 'level-4' },
  ];

  const NPC_DATA = [
    // 商人
    { id: 'npc_grocer', name: '杂货商·陈老汉', icon: '🧓', title: '青云镇杂货铺', location: 'qingyun_town', personality: 'friendly', dialogues: ['客官需要什么？小店应有尽有。', '今日灵草新到，品质上乘。', '做生意讲究诚信，老汉一辈子没骗过人。'], giftLikes: ['herb', 'ore'], giftDislikes: ['beast_core'], teachSkill: null, sparPower: 0 },
    { id: 'npc_spirit_merchant', name: '灵器商·玉清子', icon: '🧙', title: '天机城灵器坊', location: 'tianji_city', personality: 'proud', dialogues: ['这些都是上乘灵器，凡品不入我眼。', '修为不够，可驾驭不了好东西。', '灵器通灵，择主而侍。'], giftLikes: ['crystal', 'ore'], giftDislikes: ['herb'], teachSkill: null, sparPower: 0 },
    { id: 'npc_pill_merchant', name: '丹药商·药仙翁', icon: '👴', title: '坊市丹药铺', location: 'market', personality: 'wise', dialogues: ['丹药之道，在于火候。', '上品灵丹，可遇不可求。', '老夫炼丹百年，略有心得。'], giftLikes: ['herb', 'crystal'], giftDislikes: ['ore'], teachSkill: null, sparPower: 0 },
    { id: 'npc_black_market', name: '黑市商·鬼面', icon: '🎭', title: '血海修罗场暗商', location: 'blood_arena', personality: 'mysterious', dialogues: ['嘘…想要什么好东西？', '这里的交易，不问来路。', '有灵石就有一切。'], giftLikes: ['beast_core', 'crystal'], giftDislikes: ['herb'], teachSkill: null, sparPower: 0 },
    // 修士
    { id: 'npc_sword_cultivator', name: '剑修散人·凌霄', icon: '⚔️', title: '游历剑修', location: 'heifeng_ridge', personality: 'cold', dialogues: ['剑道，唯快不破。', '你的剑意太弱了。', '以剑入道，方为正途。'], giftLikes: ['ore', 'crystal'], giftDislikes: ['herb'], teachSkill: { id: 'teach_sword', name: '剑意传承', desc: '攻击+10%永久', effect: { atkPct: 0.10 } }, sparPower: 1.0, canBeCompanion: true },
    { id: 'npc_pill_elder', name: '丹师长老·丹青', icon: '⚗️', title: '灵药谷丹师', location: 'lingyao_valley', personality: 'patient', dialogues: ['炼丹需要静心。', '灵药的品质决定了丹药的上限。', '火候差一分，丹药就废了。'], giftLikes: ['herb', 'crystal'], giftDislikes: ['beast_core'], teachSkill: { id: 'teach_pill', name: '丹道传承', desc: '炼丹成功率+10%', effect: { alchemyPct: 0.10 } }, sparPower: 0.7 },
    { id: 'npc_formation_master', name: '阵法师·玄机', icon: '🔮', title: '试炼塔阵法师', location: 'trial_tower', personality: 'scholarly', dialogues: ['阵法之妙，在于变化无穷。', '此阵困不住有缘人。', '天地万物皆可为阵。'], giftLikes: ['crystal', 'ore'], giftDislikes: ['herb'], teachSkill: { id: 'teach_formation', name: '阵法传承', desc: '防御+10%永久', effect: { defPct: 0.10 } }, sparPower: 0.8 },
    { id: 'npc_beast_tamer', name: '驯兽师·云野', icon: '🐾', title: '迷雾森林驯兽人', location: 'mist_forest', personality: 'cheerful', dialogues: ['灵兽也有感情的！', '要用心去感受灵兽的心意。', '和灵兽做朋友，比驯服更重要。'], giftLikes: ['beast_core', 'herb'], giftDislikes: ['ore'], teachSkill: { id: 'teach_beast', name: '驯兽传承', desc: '宠物属性+15%', effect: { petPct: 0.15 } }, sparPower: 0.9, canBeCompanion: true },
    { id: 'npc_body_cultivator', name: '体修蛮汉·铁山', icon: '💪', title: '龙脉矿洞矿工头', location: 'dragon_mine', personality: 'rough', dialogues: ['拳头就是道理！', '矿洞里的灵兽？一拳解决！', '修炼？练体就够了！'], giftLikes: ['ore', 'beast_core'], giftDislikes: ['crystal'], teachSkill: { id: 'teach_body', name: '体修传承', desc: '生命+15%永久', effect: { hpPct: 0.15 } }, sparPower: 1.2 },
    { id: 'npc_dark_cultivator', name: '魔修暗影·幽冥', icon: '🌑', title: '上古遗迹游魂', location: 'ancient_ruins', personality: 'sinister', dialogues: ['光与暗，不过一念之间。', '你身上有股有趣的气息。', '力量…你想要更多力量吗？'], giftLikes: ['beast_core', 'crystal'], giftDislikes: ['herb'], teachSkill: { id: 'teach_dark', name: '魔道传承', desc: '暴击率+5%永久', effect: { critPct: 0.05 } }, sparPower: 1.3 },
    // 宗门长老（根据宗门显示不同）
    { id: 'npc_sect_elder_sword', name: '御剑宗长老·青峰', icon: '🗡️', title: '御剑宗执事长老', location: 'sect_hall', personality: 'strict', dialogues: ['剑修之道，在于心诚。', '宗门就是你的后盾。', '好好修炼，莫负师恩。'], giftLikes: ['crystal', 'ore'], giftDislikes: [], teachSkill: null, sparPower: 1.1, sectReq: 'sword' },
    { id: 'npc_sect_elder_pill', name: '丹鼎派长老·紫烟', icon: '⚗️', title: '丹鼎派药殿长老', location: 'sect_hall', personality: 'kind', dialogues: ['炼丹之道，水到渠成。', '多练几炉，手感就来了。', '丹成天下知。'], giftLikes: ['herb', 'crystal'], giftDislikes: [], teachSkill: null, sparPower: 0.8, sectReq: 'pill' },
    { id: 'npc_sect_elder_body', name: '炼体门长老·铁壁', icon: '💪', title: '炼体门武殿长老', location: 'sect_hall', personality: 'tough', dialogues: ['肉身即是最强法器。', '百炼成钢，千锤百炼。', '来，跟老夫过两招。'], giftLikes: ['ore', 'beast_core'], giftDislikes: [], teachSkill: null, sparPower: 1.3, sectReq: 'body' },
    { id: 'npc_sect_elder_spirit', name: '灵修阁长老·星河', icon: '📖', title: '灵修阁经殿长老', location: 'sect_hall', personality: 'calm', dialogues: ['心静则灵通。', '灵力如水，需顺势而行。', '悟道之路，在于内心。'], giftLikes: ['crystal', 'herb'], giftDislikes: [], teachSkill: null, sparPower: 0.9, sectReq: 'spirit' },
    // 奇遇NPC
    { id: 'npc_mysterious_elder', name: '神秘老者', icon: '🧙‍♂️', title: '雷劫荒原隐士', location: 'thunder_waste', personality: 'enigmatic', dialogues: ['天劫不过是道的考验。', '你有一段不凡的机缘。', '时候到了，自然会明白。'], giftLikes: ['crystal'], giftDislikes: [], teachSkill: null, sparPower: 1.5 },
    { id: 'npc_fallen_fairy', name: '落难仙子·瑶光', icon: '🧚', title: '瑶池流落仙人', location: 'yaochi', personality: 'gentle', dialogues: ['多谢相助之恩。', '瑶池的灵泉可治百伤。', '仙凡有别，但善心无界。'], giftLikes: ['herb', 'crystal'], giftDislikes: ['beast_core'], teachSkill: null, sparPower: 1.4, canBeCompanion: true },
    { id: 'npc_tomb_guardian', name: '古墓守灵·石生', icon: '🗿', title: '上古遗迹守护者', location: 'ancient_ruins', personality: 'solemn', dialogues: ['此地封印已久…', '古人的智慧，非今人所能及。', '你若有缘，这里有你要找的东西。'], giftLikes: ['ore', 'crystal'], giftDislikes: [], teachSkill: null, sparPower: 1.3 },
    { id: 'npc_outsider', name: '天外来客·虚无', icon: '👽', title: '混沌虚空旅者', location: 'chaos_void', personality: 'alien', dialogues: ['你们的"修仙"很有意思。', '虚空之外还有虚空。', '力量的本质…不过是规则的扭曲。'], giftLikes: ['crystal', 'beast_core'], giftDislikes: [], teachSkill: null, sparPower: 2.0 },
    // 村民
    { id: 'npc_innkeeper', name: '酒馆老板·老刘', icon: '🍺', title: '青云镇酒馆', location: 'qingyun_town', personality: 'warm', dialogues: ['来杯热酒？旅途辛苦了。', '镇上最近不太平啊。', '有什么八卦想听？'], giftLikes: ['herb'], giftDislikes: ['ore'], teachSkill: null, sparPower: 0 },
    { id: 'npc_blacksmith', name: '铁匠·大锤', icon: '🔨', title: '天机城锻造坊', location: 'tianji_city', personality: 'blunt', dialogues: ['好钢需要千锤百炼。', '你这武器该修理一下了。', '灵矿不够？那锻不出好东西。'], giftLikes: ['ore', 'beast_core'], giftDislikes: ['herb'], teachSkill: null, sparPower: 0 },
    { id: 'npc_herb_farmer', name: '药农·青山', icon: '🌱', title: '落霞村药田', location: 'luoxia_village', personality: 'humble', dialogues: ['今年灵草收成不错。', '山里有更好的药材，就是危险。', '采药也是一门学问。'], giftLikes: ['herb'], giftDislikes: ['beast_core'], teachSkill: null, sparPower: 0 },
    { id: 'npc_hunter', name: '猎人·苍鹰', icon: '🏹', title: '黑风岭猎户', location: 'heifeng_ridge', personality: 'wary', dialogues: ['最近山上的灵兽越来越多了。', '打猎要讲究时机。', '你也是来历练的？小心点。'], giftLikes: ['beast_core', 'ore'], giftDislikes: ['crystal'], teachSkill: null, sparPower: 0.5 },
  ];
  const NPC_DATA_MAP = Object.fromEntries(NPC_DATA.map(n => [n.id, n]));

  // ==================== 冒险事件链 ====================

  const ADVENTURE_CHAINS = [
    {
      id: 'tomb_mystery', name: '古墓探秘', icon: '🏚️', triggerLocation: 'ancient_ruins', minRealm: 3,
      steps: [
        { text: '你在上古遗迹深处发现了一座隐秘的古墓入口，阴风阵阵，隐约传来低沉的嗡鸣声。', choices: [
          { label: '推门而入', successRate: 0.8, success: '你推开沉重的石门，里面的灵气令你精神一振。', failure: '石门上的禁制被触发，你被震退，损失了一些生命。', failEffect: { hpLoss: 0.2 } },
          { label: '仔细查看门上的铭文', success: '你辨认出古老的封印纹路，找到了安全开启的方法。' },
        ]},
        { text: '古墓内部宽阔，两条通道分别通向左右。左边传来微弱的灵光，右边隐约有战斗的痕迹。', choices: [
          { label: '走左边灵光通道', success: '你发现了一个灵石矿脉！', reward: { crystal: 5 } },
          { label: '走右边战斗通道', requirement: { minAtk: 100 }, success: '你击败了守护傀儡，获得了珍贵的兽核！', reward: { beast_core: 5 }, failure: '傀儡太强了，你被迫撤退。' },
        ]},
        { text: '通道尽头是一间藏宝室，中央放着一个散发金光的宝箱，但四周布满了阵法。', choices: [
          { label: '强行突破阵法', successRate: 0.6, success: '你以蛮力破开了阵法！', reward: { gold: 2000 }, failure: '阵法反噬！你受了轻伤。', failEffect: { hpLoss: 0.15 } },
          { label: '尝试破解阵法', requirement: { minRealm: 4 }, success: '凭借你的修为，成功化解了阵法。', reward: { gold: 3000 } },
        ]},
        { text: '宝箱中有一件上古法宝，散发着令人心悸的力量！你是否拿取？', choices: [
          { label: '取走法宝', success: '你获得了上古法宝的认主！修为暴涨！', reward: { exp: 5000, gold: 2000 } },
          { label: '封印法宝，带走其中的修炼心得', success: '你从法宝铭文中领悟了古人的修炼之道。', reward: { exp: 8000 } },
        ]},
      ]
    },
    {
      id: 'herb_war', name: '灵药争夺', icon: '🌸', triggerLocation: 'lingyao_valley', minRealm: 1,
      steps: [
        { text: '灵药谷深处出现了一株千年灵芝，消息传开，各方势力蠢蠢欲动。', choices: [
          { label: '立刻前往争夺', success: '你抢先一步到达了灵芝生长处！' },
          { label: '暗中观察局势', success: '你隐藏气息，观察着各方动向，发现了一条隐秘的小路。' },
        ]},
        { text: '途中遭遇了一名同样觊觎灵芝的修士，他挡住了你的去路。', choices: [
          { label: '与之战斗', successRate: 0.7, success: '你击败了对手，对方落荒而逃！', reward: { gold: 500 }, failure: '对方实力不弱，你且战且退，被迫绕路。' },
          { label: '交涉合作，约定分成', success: '你以三七分成说服了对方，一同前行。' },
        ]},
        { text: '你终于来到灵芝面前，但守护灵兽正虎视眈眈地看着你。', choices: [
          { label: '击退灵兽', successRate: 0.75, success: '你成功击退了灵兽，采下了灵芝！还在周围发现了大量灵草！', reward: { herb: 10, crystal: 3 }, failure: '灵兽太强了，你无功而返。', failEffect: { hpLoss: 0.15 } },
          { label: '用灵草引开灵兽', requirement: { herb: 5 }, success: '灵兽被引走了，你趁机采下了灵芝和周围的灵草！', reward: { herb: 8, crystal: 5 }, cost: { herb: 5 } },
        ]},
      ]
    },
    {
      id: 'black_market_deal', name: '黑市交易', icon: '🎭', triggerLocation: 'tianji_city', minRealm: 2,
      steps: [
        { text: '你在天机城的暗巷中发现了一个秘密入口，隐约有灵力波动传出。', choices: [
          { label: '大胆进入', success: '你进入了一个隐秘的黑市，里面的宝贝让你目不暇接。' },
          { label: '打探消息后再进入', success: '你了解到这是修仙界知名的暗市，虽然危险，但也有不少好东西。' },
        ]},
        { text: '黑市中一位神秘商人向你展示了一批稀有材料，但价格不菲。', choices: [
          { label: '花费1000灵石购买', requirement: { gold: 1000 }, success: '你获得了一批珍贵的修炼材料！', reward: { crystal: 8, beast_core: 5 }, cost: { gold: 1000 } },
          { label: '讨价还价', successRate: 0.5, success: '你成功以半价拿下了材料！', reward: { crystal: 8, beast_core: 5 }, cost: { gold: 500 }, failure: '商人不屑一顾，拒绝了你的还价。' },
        ]},
        { text: '黑市主人注意到了你，主动提出合作——帮他运送一批货物，可以获得丰厚回报。', choices: [
          { label: '接受任务', success: '你成功完成了运送，获得了丰厚回报，还解锁了黑市的VIP通道！', reward: { gold: 5000 } },
          { label: '婉拒，不趟浑水', success: '你谨慎地离开了黑市，虽然没有额外收获，但也避免了风险。', reward: { gold: 500 } },
        ]},
      ]
    },
    {
      id: 'fairy_encounter', name: '仙缘奇遇', icon: '🌟', triggerLocation: 'mist_forest', minRealm: 2,
      steps: [
        { text: '迷雾森林深处，你感应到一股奇异的灵力波动，仿佛有什么在召唤你。', choices: [
          { label: '循着灵力前进', success: '你穿过层层迷雾，来到了一片隐秘的空间。' },
          { label: '以灵识探查', requirement: { minRealm: 3 }, success: '你的灵识穿透迷雾，发现了一处隐藏的洞天福地！' },
        ]},
        { text: '你发现了一个古老的修炼场，地面上刻满了复杂的纹路，中央有一个蒲团。', choices: [
          { label: '坐上蒲团修炼', success: '灵气疯狂涌入体内，你的修为大涨！', reward: { exp: 2000 } },
          { label: '研究地面纹路', success: '你从纹路中领悟了一丝道韵，修炼速度提升了！', reward: { exp: 1500, gold: 800 } },
        ]},
        { text: '突然，一道残影出现在你面前，是一位古修士的残魂。他注视着你，似乎在考验你。', choices: [
          { label: '接受考验', successRate: 0.6, success: '你通过了古修士的考验！', reward: { exp: 3000 }, failure: '考验太艰难了，你未能通过。但也有所收获。', reward2: { exp: 1000 } },
          { label: '恭敬行礼，请求指点', success: '古修士满意地点头，将毕生所学的精华传授给你。', reward: { exp: 2500 } },
        ]},
        { text: '古修士决定传你一门绝学，但需要你做出选择。', choices: [
          { label: '选择攻击之道', success: '你领悟了上古攻伐秘术！攻击力大增！', reward: { exp: 3000 } },
          { label: '选择防御之道', success: '你领悟了上古守护秘术！防御大增！', reward: { exp: 3000 } },
        ]},
        { text: '洞天开始崩塌，古修士将最后的力量注入你体内。一道金光将你传送出了迷雾森林。', choices: [
          { label: '感悟这段奇遇', success: '你彻底消化了古修士的传承，修为突飞猛进！', reward: { exp: 5000, gold: 3000 } },
        ]},
      ]
    },
    {
      id: 'demon_invasion', name: '魔道入侵', icon: '😈', triggerLocation: 'blood_arena', minRealm: 3,
      steps: [
        { text: '血海修罗场上空突然裂开一道空间裂缝，大量魔气涌出，魔修大举入侵！', choices: [
          { label: '挺身而出', success: '你第一个冲向前线，激励了在场的修士们！' },
          { label: '先观察敌情', success: '你冷静地分析了魔修的阵型，发现了弱点。' },
        ]},
        { text: '魔修先锋冲了过来，你必须迎战！', choices: [
          { label: '全力迎战', successRate: 0.75, success: '你击退了魔修先锋！战场上士气大振！', reward: { gold: 1000 }, failure: '魔修先锋实力惊人，你被迫后撤。', failEffect: { hpLoss: 0.2 } },
          { label: '与其他修士联手', success: '你们组成联军，成功抵挡住了第一波攻势！', reward: { gold: 800 } },
        ]},
        { text: '魔修首领现身了，他散发着恐怖的魔气，周围的空气都开始扭曲。', choices: [
          { label: '单挑魔修首领', requirement: { minAtk: 200 }, success: '你与魔修首领展开了激烈的战斗，最终将其击败！', reward: { exp: 3000, gold: 2000 } },
          { label: '率领众人围攻', success: '你指挥众修士围攻魔修首领，虽然损失不小，但最终取得了胜利！', reward: { exp: 2000, gold: 1500 } },
        ]},
        { text: '魔修被击退，空间裂缝也在逐渐愈合。你在战场上发现了魔修首领留下的宝物。', choices: [
          { label: '吸收魔修首领的力量', success: '你将魔气转化为自己的力量，攻击力永久提升！', reward: { exp: 2000, gold: 2000 } },
          { label: '封印魔气，守护修罗场', success: '你将魔气封印，获得了在场修士的敬佩！', reward: { exp: 2500, gold: 3000 } },
        ]},
      ]
    },
    {
      id: 'dragon_awakening', name: '龙脉觉醒', icon: '🐉', triggerLocation: 'dragon_mine', minRealm: 2,
      steps: [
        { text: '龙脉矿洞深处传来一阵震动，沉睡已久的龙脉似乎正在苏醒！大量灵矿从墙壁中析出。', choices: [
          { label: '深入探索', success: '你沿着龙脉的方向深入矿洞，发现了一处灵矿富集区！' },
          { label: '先收集散落的灵矿', success: '你收集了大量从墙壁析出的灵矿！', reward: { ore: 5 } },
        ]},
        { text: '你来到龙脉核心区域，一条巨大的矿脉正在发出耀眼的光芒。但守护的石魔傀正在巡逻。', choices: [
          { label: '趁巡逻间隙采矿', successRate: 0.7, success: '你成功在石魔傀巡逻的间隙采集了大量灵矿！', reward: { ore: 8, crystal: 3 }, failure: '你被石魔傀发现了，被迫逃离！' },
          { label: '击败石魔傀', successRate: 0.65, success: '你击败了石魔傀，尽情采集了龙脉灵矿！', reward: { ore: 12, crystal: 5, beast_core: 3 }, failure: '石魔傀太强了，你无功而返。', failEffect: { hpLoss: 0.15 } },
        ]},
        { text: '龙脉完全觉醒！一股强大的力量从地底涌出，你感到自己与天地间的联系更加紧密了。', choices: [
          { label: '吸收龙脉之力', success: '龙脉之力涌入你的身体，你感到浑身充满了力量！', reward: { ore: 10, crystal: 8, exp: 2000 } },
          { label: '引导龙脉之力入体锻炼', success: '你借龙脉之力锻体，肉身强度大幅提升！', reward: { ore: 8, exp: 3000 } },
        ]},
      ]
    },
    {
      id: 'heavenly_tribulation', name: '天劫降临', icon: '⚡', triggerLocation: 'thunder_waste', minRealm: 6,
      steps: [
        { text: '雷劫荒原上空乌云密布，一道道天雷落下。你感到机缘降临——这是领悟天道的绝佳时机！', choices: [
          { label: '在雷中修炼', success: '你在天雷中领悟了雷之真谛！', reward: { exp: 5000 } },
          { label: '收集雷灵', success: '你收集了大量珍贵的雷灵！', reward: { crystal: 10 } },
        ]},
        { text: '天劫突然加剧，九天之雷同时劈下！你必须做出选择！', choices: [
          { label: '以身渡劫', successRate: 0.5, success: '你成功以肉身抵御了天雷！修为暴涨！', reward: { exp: 8000 }, failure: '天雷的力量太过恐怖，你受了重伤。', failEffect: { hpLoss: 0.3 } },
          { label: '借助法宝抵御', success: '你用法宝化解了天雷之力，平安度过。', reward: { exp: 4000 } },
        ]},
        { text: '天劫过后，荒原上出现了一个雷池。池中有一颗散发着紫光的雷灵珠。', choices: [
          { label: '取走雷灵珠', success: '你得到了雷灵珠，突破成功率永久提升！', reward: { exp: 5000, gold: 5000 } },
          { label: '在雷池中修炼', success: '你在雷池中修炼，彻底参悟了天劫的奥秘！', reward: { exp: 10000 } },
        ]},
        { text: '天际传来一声叹息，似乎有什么存在在注视着你。一束光芒落在你身上。', choices: [
          { label: '接受天道的洗礼', success: '天道的力量洗涤了你的身心，你感到与天地的联系更加紧密了。突破成功率永久提升！', reward: { exp: 8000, gold: 5000 } },
        ]},
      ]
    },
  ];

  // ==================== CultivationGame类 ====================

  class CultivationGame {
    constructor() {
      this.data = null;
      this.activeSlot = null;
      this.meditating = false;
      this.battleState = null;
      this.autoSaveInterval = null;
      this.tickInterval = null;
      this.tickCount = 0;
      this.speedBoostEnd = 0;
    }

    static migrateOldSave() {
      const old = Storage.get('cultivation_save');
      if (old && !Storage.get('cultivation_save_1')) {
        Storage.set('cultivation_save_1', old);
        Storage.remove('cultivation_save');
      }
    }

    static getSlotInfo(slot) {
      const data = Storage.get('cultivation_save_' + slot);
      if (!data) return null;
      return { name: data.name, realm: REALMS[data.realm]?.name || '凡人', sect: SECTS_MAP[data.sect]?.name || '', totalKills: data.totalKills || 0 };
    }

    createCharacter(name, spiritRootId, sectId, slot) {
      const sr = SPIRIT_ROOTS.find(s => s.id === spiritRootId);
      const sect = SECTS_MAP[sectId];
      if (!name || !sr || !sect) return false;

      this.activeSlot = slot;
      this.data = {
        name, spiritRoot: spiritRootId, sect: sectId,
        realm: 0, exp: 0, gold: 50, hp: 100, maxHp: 100, atk: 10, def: 5,
        spirit: 30, maxSpirit: 30,
        inventory: { herb: 5, crystal: 0, beast_core: 0, ore: 0, capture_talisman: 0 },
        pills: { hp_pill: 2 },
        equipment: { weapon: null, armor: null, accessory: null },
        ownedEquips: [],
        totalExp: 0, totalKills: 0, totalCrafts: 0, totalEvents: 0,
        achievements: [],
        lastOnline: Date.now(), created: Date.now(),
        // 装备强化
        enhanceLevels: {},
        // 灵宠
        pets: [],
        activePet: null,
        // 秘境
        secretRealmCooldown: 0,
        secretRealmBestFloor: 0,
        // 宗门任务
        dailyQuests: [],
        questResetTime: 0,
        questProgress: {},
        meditateSeconds: 0,
        // 轮回
        rebirthCount: 0,
        // 功法
        learnedTechniques: [],
        activeTechnique: null,
        // 天劫
        tribulationPassed: 0,
        // 世界事件
        worldEventEnd: 0,
        worldEventId: null,
        // 第三期新系统
        insight: 0,
        deviationEnd: 0,
        totalForges: 0,
        hasForgedEpic: false,
        // 第四期新系统
        sectExp: 0,
        sectContribution: 0,
        sectTrainingEnd: 0,
        sectTrainingMul: 1,
        sectShopPurchased: [],
        sectPermBonuses: {},
        tournamentBestRank: 0,
        tournamentDailyFights: 0,
        tournamentFightDate: '',
        bestiary: { monsters: {}, petsFound: [], equipsFound: [] },
        activeTitle: 'title_beginner',
        unlockedTitles: ['title_beginner'],
        autoBattle: false,
        // 第五期：世界/NPC/冒险
        currentLocation: 'qingyun_town',
        npcFavor: {},
        npcDailyTalks: {},
        npcDailyGifts: {},
        npcDailyRumors: {},
        npcDailyPractice: {},
        npcTeachings: [],
        adventureProgress: {},
        adventureCompleted: [],
        stamina: 20,
        staminaMax: 20,
        lastStaminaRegen: Date.now(),
        lastEventTime: 0,
        eventInbox: [],
        // 道侣系统
        companion: null,
        dualCultivationCooldown: 0,
        // 悬赏令
        activeBounty: null,
        bountyProgress: 0,
        bountyChoices: [],
        bountyResetTime: 0,
      };

      this.recalcStats();
      this.data.hp = this.data.maxHp;
      this.data.spirit = this.data.maxSpirit;
      this.save();
      return true;
    }

    load(slot) {
      const saved = Storage.get('cultivation_save_' + slot);
      if (!saved) return false;
      this.activeSlot = slot;
      this.data = saved;
      // migrate missing fields
      if (this.data.spirit === undefined) { this.data.spirit = 30; this.data.maxSpirit = 30; }
      if (!this.data.achievements) this.data.achievements = [];
      if (this.data.totalCrafts === undefined) this.data.totalCrafts = 0;
      if (this.data.totalEvents === undefined) this.data.totalEvents = 0;
      // 新系统迁移
      if (!this.data.enhanceLevels) this.data.enhanceLevels = {};
      if (!this.data.pets) this.data.pets = [];
      if (this.data.activePet === undefined) this.data.activePet = null;
      if (this.data.secretRealmCooldown === undefined) this.data.secretRealmCooldown = 0;
      if (this.data.secretRealmBestFloor === undefined) this.data.secretRealmBestFloor = 0;
      if (!this.data.dailyQuests) this.data.dailyQuests = [];
      if (this.data.questResetTime === undefined) this.data.questResetTime = 0;
      if (!this.data.questProgress) this.data.questProgress = {};
      if (this.data.meditateSeconds === undefined) this.data.meditateSeconds = 0;
      // 二期新系统迁移
      if (this.data.rebirthCount === undefined) this.data.rebirthCount = 0;
      if (!this.data.learnedTechniques) this.data.learnedTechniques = [];
      if (this.data.activeTechnique === undefined) this.data.activeTechnique = null;
      if (this.data.tribulationPassed === undefined) this.data.tribulationPassed = 0;
      if (this.data.worldEventEnd === undefined) this.data.worldEventEnd = 0;
      if (this.data.worldEventId === undefined) this.data.worldEventId = null;
      // 三期新系统迁移
      if (this.data.insight === undefined) this.data.insight = 0;
      if (this.data.deviationEnd === undefined) this.data.deviationEnd = 0;
      if (this.data.totalForges === undefined) this.data.totalForges = 0;
      if (this.data.hasForgedEpic === undefined) this.data.hasForgedEpic = false;
      // 四期新系统迁移
      if (this.data.inventory.capture_talisman === undefined) this.data.inventory.capture_talisman = 0;
      if (this.data.sectExp === undefined) this.data.sectExp = 0;
      if (this.data.sectContribution === undefined) this.data.sectContribution = 0;
      if (this.data.sectTrainingEnd === undefined) this.data.sectTrainingEnd = 0;
      if (this.data.sectTrainingMul === undefined) this.data.sectTrainingMul = 1;
      if (!this.data.sectShopPurchased) this.data.sectShopPurchased = [];
      if (!this.data.sectPermBonuses) this.data.sectPermBonuses = {};
      if (this.data.tournamentBestRank === undefined) this.data.tournamentBestRank = 0;
      if (this.data.tournamentDailyFights === undefined) this.data.tournamentDailyFights = 0;
      if (this.data.tournamentFightDate === undefined) this.data.tournamentFightDate = '';
      if (!this.data.bestiary) this.data.bestiary = { monsters: {}, petsFound: [], equipsFound: [] };
      if (this.data.activeTitle === undefined) this.data.activeTitle = null;
      if (!this.data.unlockedTitles) this.data.unlockedTitles = [];
      // 五期新系统迁移：世界/NPC/冒险
      if (!this.data.currentLocation) this.data.currentLocation = 'qingyun_town';
      if (!this.data.npcFavor) this.data.npcFavor = {};
      if (!this.data.npcDailyTalks) this.data.npcDailyTalks = {};
      if (!this.data.npcDailyGifts) this.data.npcDailyGifts = {};
      if (!this.data.npcDailyRumors) this.data.npcDailyRumors = {};
      if (!this.data.npcDailyPractice) this.data.npcDailyPractice = {};
      if (!this.data.npcTeachings) this.data.npcTeachings = [];
      if (!this.data.adventureProgress) this.data.adventureProgress = {};
      if (!this.data.adventureCompleted) this.data.adventureCompleted = [];
      if (this.data.stamina === undefined) this.data.stamina = 20;
      if (this.data.staminaMax === undefined) this.data.staminaMax = 20;
      if (this.data.lastStaminaRegen === undefined) this.data.lastStaminaRegen = Date.now();
      // 事件簿迁移
      if (!this.data.eventInbox) this.data.eventInbox = [];
      // 道侣系统迁移
      if (this.data.companion === undefined) this.data.companion = null;
      if (this.data.dualCultivationCooldown === undefined) this.data.dualCultivationCooldown = 0;
      if (this.data.activeBounty === undefined) this.data.activeBounty = null;
      if (this.data.bountyProgress === undefined) this.data.bountyProgress = 0;
      if (!this.data.bountyChoices) this.data.bountyChoices = [];
      if (this.data.bountyResetTime === undefined) this.data.bountyResetTime = 0;
      // Migrate pet affinity/skillCooldown
      if (this.data.pets) {
        for (const pet of this.data.pets) {
          if (pet.affinity === undefined) pet.affinity = 0;
          if (pet.skillCooldown === undefined) pet.skillCooldown = 0;
        }
      }
      this.recalcStats();
      this.processOfflineGains();
      return true;
    }

    save() {
      if (!this.data || !this.activeSlot) return;
      this.data.lastOnline = Date.now();
      Storage.setImmediate('cultivation_save_' + this.activeSlot, this.data);
      if (typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('cultivation_gold', this.data.gold || 0);
      }
    }

    deleteSave() {
      if (this.activeSlot) Storage.remove('cultivation_save_' + this.activeSlot);
      this.data = null;
    }

    recalcStats() {
      const d = this.data;
      const realm = REALMS[d.realm];
      const sr = SPIRIT_ROOTS.find(s => s.id === d.spiritRoot);
      const sect = SECTS_MAP[d.sect];

      let baseHp = realm.baseHp;
      let baseAtk = realm.baseAtk;
      let baseDef = realm.baseDef;
      let baseSpirit = realm.baseSpirit || 30;

      baseAtk *= sr.atkMul;
      baseDef *= sr.defMul;
      if (sr.hpMul) baseHp *= sr.hpMul;

      baseAtk *= sect.atkMul;
      baseDef *= sect.defMul;
      if (sect.hpMul) baseHp *= sect.hpMul;
      if (sect.spiritMul) baseSpirit *= sect.spiritMul;

      for (const slot of EQUIP_SLOTS) {
        const eqId = d.equipment[slot];
        if (!eqId) continue;
        const eq = EQUIPMENT_MAP[eqId];
        if (!eq) continue;
        const enhLvl = d.enhanceLevels ? (d.enhanceLevels[eqId] || 0) : 0;
        const enhMul = 1 + enhLvl * ENHANCE_CONFIG.bonusPerLevel;
        if (eq.atk) baseAtk += eq.atk * enhMul;
        if (eq.def) baseDef += eq.def * enhMul;
        if (eq.hp) baseHp += eq.hp * enhMul;
      }

      // 出战灵宠加成（基于亲密度）
      if (d.activePet !== null && d.pets && d.pets[d.activePet]) {
        const pet = d.pets[d.activePet];
        const affinity = pet.affinity || 0;
        let petMul = 1;
        // NPC传授宠物加成
        if (d.npcTeachings) {
          const beastTeach = NPC_DATA.find(n => n.teachSkill && n.teachSkill.id === 'teach_beast');
          if (beastTeach && d.npcTeachings.includes('teach_beast') && beastTeach.teachSkill.effect.petPct) {
            petMul += beastTeach.teachSkill.effect.petPct;
          }
        }
        const atkRatio = 0.10 + 0.10 * (affinity / CAPTURE_CONFIG.affinityMax);
        const defRatio = 0.10 + 0.10 * (affinity / CAPTURE_CONFIG.affinityMax);
        const hpRatio = 0.20 + 0.20 * (affinity / CAPTURE_CONFIG.affinityMax);
        baseAtk += Math.floor(pet.atk * atkRatio * petMul);
        baseDef += Math.floor(pet.def * defRatio * petMul);
        baseHp += Math.floor(pet.hp * hpRatio * petMul);
      }

      // 功法加成
      if (d.activeTechnique) {
        const tech = TECHNIQUES_MAP[d.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(d, tech) : null;
        if (eff) {
          if (eff.atkMul) baseAtk *= eff.atkMul;
          if (eff.defMul) baseDef *= eff.defMul;
          if (eff.hpMul) baseHp *= eff.hpMul;
          if (eff.spiritMul) baseSpirit *= eff.spiritMul;
        }
      }

      // 轮回加成
      if (d.rebirthCount > 0) {
        const rb = REBIRTH_CONFIG.bonusPerRebirth;
        baseAtk *= (1 + rb.atkMul * d.rebirthCount);
        baseDef *= (1 + rb.defMul * d.rebirthCount);
        baseHp *= (1 + rb.hpMul * d.rebirthCount);
      }

      // 宗门永久加成
      if (d.sectPermBonuses) {
        if (d.sectPermBonuses.atkPct) baseAtk *= (1 + d.sectPermBonuses.atkPct);
        if (d.sectPermBonuses.defPct) baseDef *= (1 + d.sectPermBonuses.defPct);
        if (d.sectPermBonuses.hpPct) baseHp *= (1 + d.sectPermBonuses.hpPct);
      }

      // NPC传授加成
      if (d.npcTeachings && d.npcTeachings.length > 0) {
        for (const teachId of d.npcTeachings) {
          const npc = NPC_DATA.find(n => n.teachSkill && n.teachSkill.id === teachId);
          if (npc && npc.teachSkill && npc.teachSkill.effect) {
            const eff = npc.teachSkill.effect;
            if (eff.atkPct) baseAtk *= (1 + eff.atkPct);
            if (eff.defPct) baseDef *= (1 + eff.defPct);
            if (eff.hpPct) baseHp *= (1 + eff.hpPct);
          }
        }
      }

      // 称号加成
      if (d.activeTitle) {
        const title = TITLES_MAP[d.activeTitle];
        if (title && title.bonus) {
          if (title.bonus.atkPct) baseAtk *= (1 + title.bonus.atkPct);
          if (title.bonus.defPct) baseDef *= (1 + title.bonus.defPct);
          if (title.bonus.hpPct) baseHp *= (1 + title.bonus.hpPct);
        }
      }

      d.maxHp = Math.floor(baseHp);
      d.atk = Math.floor(baseAtk);
      d.def = Math.floor(baseDef);
      d.maxSpirit = Math.floor(baseSpirit);
      if (d.hp > d.maxHp) d.hp = d.maxHp;
      if (d.spirit > d.maxSpirit) d.spirit = d.maxSpirit;
    }

    getExpRate() {
      const sr = SPIRIT_ROOTS.find(s => s.id === this.data.spiritRoot);
      const sect = SECTS_MAP[this.data.sect];
      const base = Math.max(1, Math.floor((this.data.realm + 1) * 1.2));
      let rate = Math.max(1, Math.floor(base * sr.expMul * sect.expMul));
      if (Date.now() < this.speedBoostEnd) rate *= 2;
      // 走火入魔减速
      if (this.data.deviationEnd && Date.now() < this.data.deviationEnd) rate = Math.max(1, Math.floor(rate * 0.5));
      // 功法加成
      if (this.data.activeTechnique) {
        const tech = TECHNIQUES_MAP[this.data.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(this.data, tech) : null;
        if (eff && eff.expMul) rate = Math.floor(rate * eff.expMul);
      }
      // 轮回加成
      if (this.data.rebirthCount > 0) {
        rate = Math.floor(rate * (1 + REBIRTH_CONFIG.bonusPerRebirth.expRate * this.data.rebirthCount));
      }
      // 世界事件
      const we = this.getActiveWorldEvent();
      if (we && we.effect.expMul) rate = Math.floor(rate * we.effect.expMul);
      // 宗门永久经验加成
      if (this.data.sectPermBonuses && this.data.sectPermBonuses.expPct) {
        rate = Math.floor(rate * (1 + this.data.sectPermBonuses.expPct));
      }
      // 称号经验加成
      if (this.data.activeTitle) {
        const title = TITLES_MAP[this.data.activeTitle];
        if (title && title.bonus && title.bonus.expPct) rate = Math.floor(rate * (1 + title.bonus.expPct));
      }
      // 宗门修炼室加成
      rate = Math.floor(rate * this.getSectTrainingBoost());
      // 道侣修炼加成 (+10%)
      if (this.data.companion) rate = Math.floor(rate * 1.10);
      return rate;
    }

    processOfflineGains() {
      const now = Date.now();
      const elapsed = (now - this.data.lastOnline) / 1000;
      if (elapsed < 10) return;
      let expGain = Math.floor(elapsed * this.getExpRate() * 0.3);
      if (this.data.realm < REALMS.length - 1) {
        const cap = Math.floor(REALMS[this.data.realm + 1].expReq * 0.5);
        expGain = Math.min(expGain, cap);
      }
      // 离线灵石收益
      let goldGain = Math.floor(elapsed * this.getExpRate() * 0.002);
      goldGain = Math.min(goldGain, 1000 * (this.data.realm + 1));
      // 离线悟道值
      let insightGain = Math.min(Math.floor(elapsed * 0.03), 50);
      if (expGain > 0) {
        this.data.exp += expGain;
        this.data.totalExp += expGain;
      }
      if (goldGain > 0) this.data.gold += goldGain;
      if (insightGain > 0) this.data.insight = (this.data.insight || 0) + insightGain;
      this._offlineResult = (expGain > 0 || goldGain > 0) ? { elapsed, expGain, goldGain, insightGain } : null;
    }

    tick() {
      if (!this.data || !this.meditating) return;
      const rate = this.getExpRate();
      this.data.exp += rate;
      this.data.totalExp += rate;
      if (this.data.hp < this.data.maxHp) {
        this.data.hp = Math.min(this.data.maxHp, this.data.hp + Math.ceil(this.data.maxHp * 0.01));
      }
      // 灵力恢复
      if (this.data.spirit < this.data.maxSpirit) {
        this.data.spirit = Math.min(this.data.maxSpirit, this.data.spirit + Math.ceil(this.data.maxSpirit * 0.02));
      }
      // 悟道值积累（打坐时每tick +0.1）
      if (this.data.realm < REALMS.length - 1) {
        this.data.insight = (this.data.insight || 0) + 0.1;
      }
      // 打坐秒数 (用于任务)
      this.data.meditateSeconds = (this.data.meditateSeconds || 0) + 1;
      this.updateQuestProgress('meditate', 1);
      this.updateBountyProgress('meditate', 1);
      if (this.data.meditateSeconds % 60 === 0 && typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('cultivation_meditate_count', Math.floor(this.data.meditateSeconds / 60));
      }
      // 道侣被动恢复（每tick恢复少量HP和灵力）
      if (this.data.companion) {
        if (this.data.hp < this.data.maxHp) {
          this.data.hp = Math.min(this.data.maxHp, this.data.hp + Math.ceil(this.data.maxHp * 0.005));
        }
        if (this.data.spirit < this.data.maxSpirit) {
          this.data.spirit = Math.min(this.data.maxSpirit, this.data.spirit + Math.ceil(this.data.maxSpirit * 0.008));
        }
      }
      // 持有金币任务
      this.updateQuestProgress('gold', 0);
      this.updateBountyProgress('gold', 0);
      this.tickCount++;
      // 体力恢复（每60tick恢复1点）
      this._regenStamina();
      // 每10秒检查成就+任务重置
      if (this.tickCount % 10 === 0) {
        this.checkAchievements();
        this.checkQuestReset();
        this.checkWorldEvent();
        this.checkTitles();
      }
    }

    _checkRandomEvent() {
      const freqSetting = Storage.get('settings_cultivation', {}).eventFrequency || 'normal';
      const cooldowns = { low: 120000, normal: 60000, high: 30000 };
      const cooldown = cooldowns[freqSetting] || 60000;
      if (Date.now() - (this.data.lastEventTime || 0) < cooldown) return null;
      for (const evt of RANDOM_EVENTS) {
        if (Math.random() < evt.chance) {
          this.data.lastEventTime = Date.now();
          return evt;
        }
      }
      return null;
    }

    canBreakthrough() {
      if (this.data.realm >= REALMS.length - 1) return false;
      if (this.data.exp < REALMS[this.data.realm + 1].expReq) return false;
      // 检查悟道值
      const insightReq = INSIGHT_REQUIREMENTS[this.data.realm + 1] || 0;
      if ((this.data.insight || 0) < insightReq) return false;
      return true;
    }

    getInsightProgress() {
      if (this.data.realm >= REALMS.length - 1) return { current: 0, required: 0, sufficient: true };
      const insightReq = INSIGHT_REQUIREMENTS[this.data.realm + 1] || 0;
      const current = this.data.insight || 0;
      return { current: Math.floor(current * 10) / 10, required: insightReq, sufficient: current >= insightReq };
    }

    tryBreakthrough(tribulationBonus = 0, selectedPillId = null) {
      if (!this.canBreakthrough()) return { success: false, reason: '修为或悟道不足' };
      const nextRealm = REALMS[this.data.realm + 1];
      let rate = nextRealm.rate || 0.5;
      let deviationChance = 0.1;
      // 灵根×功法相性：影响突破率与走火入魔概率
      if (this.data.activeTechnique) {
        const tech = TECHNIQUES_MAP[this.data.activeTechnique];
        if (tech) {
          const aff = getTechniqueAffinity(this.data.spiritRoot, tech);
          rate += aff.breakBonus || 0;
          deviationChance += aff.deviationBonus || 0;
        }
      }

      // 使用玩家选择的突破丹药
      let usedPillName = null;
      const breakPills = [
        { id: 'dao_pill', name: '天道丹', bonus: 0.4 },
        { id: 'great_break_pill', name: '大破境丹', bonus: 0.3 },
        { id: 'break_pill', name: '破境丹', bonus: 0.2 },
        { id: 'small_break_pill', name: '小破境丹', bonus: 0.1 },
      ];
      if (selectedPillId) {
        const pill = breakPills.find(p => p.id === selectedPillId);
        if (pill && this.data.pills[pill.id] && this.data.pills[pill.id] > 0) {
          rate += pill.bonus;
          this.data.pills[pill.id]--;
          usedPillName = pill.name;
        }
      }

      // 世界事件突破加成
      const we = this.getActiveWorldEvent();
      if (we && we.effect.breakBonus) rate += we.effect.breakBonus;
      // 道侣突破加成 (+5%)
      if (this.data.companion) rate += 0.05;
      // 天劫加成
      rate += tribulationBonus;
      rate = Math.min(0.99, rate);
      deviationChance = Math.max(0, Math.min(0.6, deviationChance));

      // 消耗70%修为
      this.data.exp -= Math.floor(nextRealm.expReq * 0.7);
      if (this.data.exp < 0) this.data.exp = 0;

      if (Math.random() < rate) {
        this.data.realm++;
        // 突破后悟道值重置
        this.data.insight = 0;
        this.recalcStats();
        this.data.hp = this.data.maxHp;
        this.data.spirit = this.data.maxSpirit;
        this.save();
        this.checkAchievements();
        updateLeaderboard('cultivation', this.data.realm, { name: this.data.name });
        if (typeof CrossGameAchievements !== 'undefined') {
          CrossGameAchievements.trackStat('cultivation_max_realm', this.data.realm);
        }
        return { success: true, realm: REALMS[this.data.realm].name, usedPill: usedPillName };
      }

      // 突破失败：10%几率走火入魔（60秒修炼减半）
      let deviation = false;
      if (Math.random() < deviationChance) {
        this.data.deviationEnd = Date.now() + 60000;
        deviation = true;
      }

      this.save();
      return { success: false, reason: '突破失败，损失大量修为' + (deviation ? '，走火入魔！60秒内修炼减半' : ''), usedPill: usedPillName, deviation };
    }

    needsTribulation() {
      return this.data.realm + 1 >= TRIBULATION_CONFIG.minRealm;
    }

    // --- 战斗系统 ---
    _getPermCritBonus() {
      let crit = 0;
      if (this.data.npcTeachings && this.data.npcTeachings.includes('teach_dark')) {
        const darkNpc = NPC_DATA.find(n => n.teachSkill && n.teachSkill.id === 'teach_dark');
        if (darkNpc && darkNpc.teachSkill.effect.critPct) crit += darkNpc.teachSkill.effect.critPct;
      }
      if (this.data.activeTechnique) {
        const tech = TECHNIQUES_MAP[this.data.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(this.data, tech) : null;
        if (eff && eff.critBonus) crit += eff.critBonus;
      }
      return crit;
    }

    startBattle(dungeonId) {
      let monsterId;
      if (dungeonId === '__location__') {
        // 地点战斗模式：使用当前地点怪物池
        const loc = MAP_LOCATIONS.find(l => l.id === this.data.currentLocation);
        if (!loc || !loc.monsterPool || loc.monsterPool.length === 0) return null;
        monsterId = pick(loc.monsterPool);
      } else {
        const dungeon = DUNGEONS.find(d => d.id === dungeonId);
        if (!dungeon || this.data.realm < dungeon.realmReq) return null;
        monsterId = pick(dungeon.monsters);
      }
      const mTemplate = MONSTERS[monsterId];
      // Monster scaling: exponential with player realm, offset by dungeon's realm requirement
      // Monsters from low-tier dungeons still scale but less aggressively
      const dungeonRealm = dungeonId === '__location__' ? 0 : (DUNGEONS.find(d => d.id === dungeonId)?.realmReq || 0);
      const realmDiff = Math.max(0, this.data.realm - dungeonRealm);
      const scale = Math.pow(1.5, dungeonRealm) * (1 + realmDiff * 0.25);

      const playerElement = this.data.spiritRoot === 'chaos' ? null : this.data.spiritRoot;
      const monsterElement = mTemplate.element || null;
      const elBonusPlayer = elementBonus(playerElement, monsterElement);
      const elBonusMonster = elementBonus(monsterElement, playerElement);
      this.battleState = {
        monster: { ...mTemplate, id: monsterId, currentHp: Math.floor(mTemplate.hp * scale), maxHp: Math.floor(mTemplate.hp * scale), atk: Math.floor(mTemplate.atk * scale), def: Math.floor(mTemplate.def * scale) },
        log: [], turn: 0, done: false, won: false,
        buffAtk: 1, buffDef: 1, buffCrit: this._getPermCritBonus(),
        dots: [], cooldowns: {}, counterTurns: 0, counterValue: 0, shield: 0,
        reviveUsed: false, playerDamageTaken: 0, captureFails: 0,
        playerElement, monsterElement, elBonusPlayer, elBonusMonster,
      };
      let elHint = '';
      if (elBonusPlayer > 1) elHint = ' (五行克制！伤害+30%)';
      else if (elBonusPlayer < 1) elHint = ' (五行被克！伤害-30%)';
      this.battleState.log.push({ text: `遭遇 ${mTemplate.icon} ${mTemplate.name}！${elHint}`, type: 'info' });
      return this.battleState;
    }

    _monsterAttack() {
      const b = this.battleState;
      const d = this.data;
      let mDmg = Math.max(1, Math.floor((b.monster.atk - d.def * b.buffDef * 0.5) * (b.elBonusMonster || 1)));

      // 灵宠嘲讽：伤害转移给灵宠
      if ((b.petTauntTurns || 0) > 0 && d.activePet !== null && d.pets[d.activePet]) {
        const pet = d.pets[d.activePet];
        const petDmg = Math.max(1, mDmg - Math.floor(pet.def * 0.5));
        pet.hp -= petDmg;
        b.log.push({ text: `${pet.icon}${pet.name} 替主人承受 ${petDmg} 点伤害！`, type: 'damage' });
        b.petTauntTurns--;
        if (pet.hp <= 0) {
          pet.hp = 1;
          b.petTauntTurns = 0;
          b.log.push({ text: `${pet.name} 嘲讽结束，体力耗尽！`, type: 'info' });
        }
        // 反伤仍然触发
        if (b.counterTurns > 0) {
          const reflected = Math.floor(mDmg * b.counterValue);
          b.monster.currentHp -= reflected;
          b.log.push({ text: `反弹 ${reflected} 点伤害！`, type: 'skill' });
          b.counterTurns--;
        }
        if (b.monster.currentHp <= 0) {
          b.monster.currentHp = 0; b.done = true; b.won = true;
          this.battleReward();
        }
        return;
      }

      // 反伤
      if (b.counterTurns > 0) {
        const reflected = Math.floor(mDmg * b.counterValue);
        b.monster.currentHp -= reflected;
        b.log.push({ text: `反弹 ${reflected} 点伤害！`, type: 'skill' });
        b.counterTurns--;
      }
      // 护盾吸收
      if (b.shield > 0) {
        const absorbed = Math.min(b.shield, mDmg);
        b.shield -= absorbed;
        mDmg -= absorbed;
        if (absorbed > 0) b.log.push({ text: `护盾吸收 ${absorbed} 点伤害`, type: 'info' });
      }
      d.hp -= mDmg;
      if (mDmg > 0) b.playerDamageTaken += mDmg;
      b.log.push({ text: `${b.monster.name} 造成 ${mDmg} 点伤害`, type: 'damage' });

      if (b.monster.currentHp <= 0) {
        b.monster.currentHp = 0; b.done = true; b.won = true;
        this.battleReward(); return;
      }
      if (d.hp <= 0) {
        // 续命丹检查
        if (!b.reviveUsed && d.pills.revive_pill && d.pills.revive_pill > 0) {
          d.pills.revive_pill--;
          d.hp = Math.floor(d.maxHp * 0.5);
          b.reviveUsed = true;
          b.log.push({ text: '续命丹生效，浴火重生！', type: 'heal' });
        } else {
          d.hp = 0; b.done = true; b.won = false;
          b.log.push({ text: '你被击败了...', type: 'info' });
          b.log.push({ text: typeof getEncouragement === 'function' ? getEncouragement() : '再接再厉！', type: 'skill' });
          d.hp = Math.ceil(d.maxHp * 0.1);
          if (typeof SoundManager !== 'undefined') SoundManager.play('defeat');
        }
      }
    }

    _processDots() {
      const b = this.battleState;
      const newDots = [];
      for (const dot of b.dots) {
        const dmg = Math.floor(this.data.atk * dot.dmg);
        b.monster.currentHp -= dmg;
        b.log.push({ text: `持续伤害 ${dmg} 点`, type: 'skill' });
        dot.turns--;
        if (dot.turns > 0) newDots.push(dot);
      }
      b.dots = newDots;
      if (b.monster.currentHp <= 0) {
        b.monster.currentHp = 0; b.done = true; b.won = true;
        this.battleReward();
      }
    }

    battleAttack() {
      if (!this.battleState || this.battleState.done) return;
      const b = this.battleState;
      b.turn++;
      // 冷却递减
      for (const k in b.cooldowns) { if (b.cooldowns[k] > 0) b.cooldowns[k]--; }

      let pDmg = Math.max(1, Math.floor((this.data.atk * b.buffAtk - b.monster.def * 0.5) * (b.elBonusPlayer || 1)));
      if (b.buffCrit > 0 && Math.random() < b.buffCrit) { pDmg = Math.floor(pDmg * 1.5); b.log.push({ text: '暴击！', type: 'skill' }); }
      b.monster.currentHp -= pDmg;
      b.log.push({ text: `你造成 ${pDmg} 点伤害`, type: 'damage' });

      // 出战灵宠攻击（使用新的技能系统）
      if (!b.done) this._petAttack(b);

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleSkill() {
      if (!this.battleState || this.battleState.done) return;
      const b = this.battleState;
      b.turn++;
      for (const k in b.cooldowns) { if (b.cooldowns[k] > 0) b.cooldowns[k]--; }

      const pDmg = Math.max(1, Math.floor((this.data.atk * b.buffAtk * 1.5 - b.monster.def * 0.3) * (b.elBonusPlayer || 1)));
      b.monster.currentHp -= pDmg;
      b.log.push({ text: `你使出灵技，造成 ${pDmg} 点伤害！`, type: 'damage' });

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleUseSkill(skillId) {
      if (!this.battleState || this.battleState.done) return;
      const skill = SKILLS.find(s => s.id === skillId);
      if (!skill) return;
      const b = this.battleState;
      const d = this.data;

      if (d.realm < skill.realmReq) { showToast('境界不足', 'error'); return; }
      if ((b.cooldowns[skillId] || 0) > 0) { showToast(`冷却中 (${b.cooldowns[skillId]}回合)`, 'error'); return; }
      if (d.spirit < skill.spiritCost) { showToast('灵力不足', 'error'); return; }

      d.spirit -= skill.spiritCost;
      b.cooldowns[skillId] = skill.cooldown;
      b.turn++;
      for (const k in b.cooldowns) { if (k !== skillId && b.cooldowns[k] > 0) b.cooldowns[k]--; }

      // 技能伤害
      if (skill.dmgMul > 0) {
        let pDmg = Math.max(1, Math.floor((d.atk * b.buffAtk * skill.dmgMul - b.monster.def * 0.3) * (b.elBonusPlayer || 1)));
        if (b.buffCrit > 0 && Math.random() < b.buffCrit) { pDmg = Math.floor(pDmg * 1.5); b.log.push({ text: '暴击！', type: 'skill' }); }
        b.monster.currentHp -= pDmg;
        b.log.push({ text: `${skill.name}！造成 ${pDmg} 点伤害`, type: 'skill' });

        // 吸血
        if (skill.effect && skill.effect.type === 'lifesteal') {
          const heal = Math.floor(pDmg * skill.effect.value);
          d.hp = Math.min(d.maxHp, d.hp + heal);
          b.log.push({ text: `吸取 ${heal} 生命`, type: 'heal' });
        }
      }

      // 特殊效果
      if (skill.effect) {
        const eff = skill.effect;
        if (eff.type === 'dot') b.dots.push({ dmg: eff.dmg, turns: eff.turns });
        if (eff.type === 'heal') { const heal = Math.floor(d.maxHp * eff.value); d.hp = Math.min(d.maxHp, d.hp + heal); b.log.push({ text: `恢复 ${heal} 生命`, type: 'heal' }); }
        if (eff.type === 'def_buff') { b.buffDef = eff.value; b.log.push({ text: `防御提升${eff.turns}回合！`, type: 'info' }); }
        if (eff.type === 'counter') { b.counterTurns = eff.turns; b.counterValue = eff.value; b.log.push({ text: `反伤${eff.turns}回合！`, type: 'info' }); }
        if (eff.type === 'shield') { b.shield = Math.floor(d.maxHp * eff.value); b.log.push({ text: `获得 ${b.shield} 护盾`, type: 'info' }); }
        if (eff.type === 'spirit_drain') { const gain = Math.min(eff.value, d.maxSpirit - d.spirit); d.spirit += gain; b.log.push({ text: `恢复 ${gain} 灵力`, type: 'info' }); }
      }

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleUsePill() {
      if (!this.battleState || this.battleState.done) return false;
      const result = recoveryHelper.useRecoverItem({
        count: this.data.pills.hp_pill,
        current: this.data.hp,
        max: this.data.maxHp,
        ratio: 0.3,
      });
      if (!result.ok) return false;
      this.data.pills.hp_pill = result.count;
      this.data.hp = result.value;
      this.battleState.log.push({ text: `使用回春丹，恢复 ${result.gain} 生命`, type: 'heal' });
      return true;
    }

    battleUseGreaterHealPill() {
      if (!this.battleState || this.battleState.done) return false;
      const result = recoveryHelper.useRecoverItem({
        count: this.data.pills.greater_heal_pill,
        current: this.data.hp,
        max: this.data.maxHp,
        ratio: 0.7,
      });
      if (!result.ok) return false;
      this.data.pills.greater_heal_pill = result.count;
      this.data.hp = result.value;
      this.battleState.log.push({ text: `使用大还丹，恢复 ${result.gain} 生命`, type: 'heal' });
      return true;
    }

    battleUseSpiritPill() {
      if (!this.battleState || this.battleState.done) return false;
      const result = recoveryHelper.useRecoverItem({
        count: this.data.pills.spirit_pill,
        current: this.data.spirit,
        max: this.data.maxSpirit,
        ratio: 0.5,
      });
      if (!result.ok) return false;
      this.data.pills.spirit_pill = result.count;
      this.data.spirit = result.value;
      this.battleState.log.push({ text: `使用聚灵丹，恢复 ${result.gain} 灵力`, type: 'info' });
      return true;
    }

    battleUseBuff(pillId) {
      if (!this.battleState || this.battleState.done) return false;
      if (!this.data.pills[pillId] || this.data.pills[pillId] <= 0) return false;
      const recipe = RECIPES_MAP[pillId];
      if (!recipe) return false;
      this.data.pills[pillId]--;
      const eff = recipe.effect;
      if (eff.type === 'buff_atk') { this.battleState.buffAtk = eff.value; this.battleState.log.push({ text: `使用${recipe.name}，攻击力提升！`, type: 'info' }); }
      else if (eff.type === 'buff_def') { this.battleState.buffDef = eff.value; this.battleState.log.push({ text: `使用${recipe.name}，防御力提升！`, type: 'info' }); }
      else if (eff.type === 'buff_crit') { this.battleState.buffCrit += eff.value; this.battleState.log.push({ text: `使用${recipe.name}，暴击率提升！`, type: 'info' }); }
      return true;
    }

    battleFlee() {
      if (!this.battleState || this.battleState.done) return;
      const hpPct = this.data.maxHp ? this.data.hp / this.data.maxHp : 1;
      let fleeRate = 0.6;
      if (hpPct < 0.3) fleeRate += 0.2;
      if (hpPct < 0.15) fleeRate += 0.1;
      fleeRate = Math.min(0.85, fleeRate);
      if (Math.random() < fleeRate) {
        this.battleState.done = true;
        this.battleState.log.push({ text: '成功逃跑！', type: 'info' });
      } else {
        const b = this.battleState;
        const mDmg = Math.max(1, Math.floor(b.monster.atk - this.data.def * 0.3));
        this.data.hp -= mDmg;
        b.log.push({ text: `逃跑失败！${b.monster.name} 造成 ${mDmg} 点伤害`, type: 'damage' });
        if (this.data.hp <= 0) { this.data.hp = Math.ceil(this.data.maxHp * 0.1); b.done = true; b.won = false; b.log.push({ text: '你被击败了...', type: 'info' }); b.log.push({ text: typeof getEncouragement === 'function' ? getEncouragement() : '再接再厉！', type: 'skill' }); }
      }
    }

    battleReward() {
      const b = this.battleState;
      const m = b.monster;
      // Reward scaling matches monster scaling
      const rewardScale = m.maxHp / (MONSTERS[m.id] ? MONSTERS[m.id].hp : m.maxHp) || 1;
      const realmBonus = 1 + Math.min(0.12, this.data.realm * 0.02);
      const exp = Math.floor(m.exp * rewardScale * realmBonus);
      const gold = Math.floor(m.gold * rewardScale * realmBonus);
      // 功法金币加成
      let goldFinal = gold;
      if (this.data.activeTechnique) {
        const tech = TECHNIQUES_MAP[this.data.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(this.data, tech) : null;
        if (eff && eff.goldMul) goldFinal = Math.floor(goldFinal * eff.goldMul);
      }
      // 世界事件金币加成
      const we = this.getActiveWorldEvent();
      if (we && we.effect.goldMul) goldFinal = Math.floor(goldFinal * we.effect.goldMul);
      // 称号金币加成
      if (this.data.activeTitle) {
        const title = TITLES_MAP[this.data.activeTitle];
        if (title && title.bonus && title.bonus.goldPct) goldFinal = Math.floor(goldFinal * (1 + title.bonus.goldPct));
      }
      let expFinal = exp;
      let goldFinalWithBonus = goldFinal;
      if (b.playerDamageTaken === 0) {
        const bonusExp = Math.floor(exp * 0.1);
        const bonusGold = Math.floor(goldFinal * 0.1);
        expFinal += bonusExp;
        goldFinalWithBonus += bonusGold;
        if (bonusExp > 0 || bonusGold > 0) {
          b.log.push({ text: `无伤奖励：+${bonusExp} 修为 +${bonusGold} 灵石`, type: 'reward' });
        }
      }
      this.data.exp += expFinal; this.data.totalExp += expFinal; this.data.gold += goldFinalWithBonus; this.data.totalKills++;
      b.log.push({ text: `获得 ${expFinal} 修为, ${goldFinalWithBonus} 灵石`, type: 'reward' });
      const hpRecover = Math.floor(this.data.maxHp * 0.04);
      const spRecover = Math.floor(this.data.maxSpirit * 0.06);
      let hpGain = 0;
      let spGain = 0;
      if (hpRecover > 0 && this.data.hp < this.data.maxHp) {
        const before = this.data.hp;
        this.data.hp = Math.min(this.data.maxHp, this.data.hp + hpRecover);
        hpGain = this.data.hp - before;
      }
      if (spRecover > 0 && this.data.spirit < this.data.maxSpirit) {
        const before = this.data.spirit;
        this.data.spirit = Math.min(this.data.maxSpirit, this.data.spirit + spRecover);
        spGain = this.data.spirit - before;
      }
      if (hpGain > 0 || spGain > 0) {
        b.log.push({ text: `战后调息：气血+${hpGain} 灵力+${spGain}`, type: 'info' });
      }
      const mTemplate = MONSTERS[m.id];
      if (mTemplate.drops) {
        // 掉落加成：世界事件(dropMul) + 功法(dropBonus)
        let dropMul = 1;
        let dropBonus = 0;
        if (we && we.effect.dropMul) dropMul *= we.effect.dropMul;
        if (this.data.activeTechnique) {
          const tech = TECHNIQUES_MAP[this.data.activeTechnique];
          const eff = tech ? getScaledTechniqueEffect(this.data, tech) : null;
          if (eff && eff.dropBonus) dropBonus += eff.dropBonus;
        }
        for (const drop of mTemplate.drops) {
          const chance = Math.min(0.95, drop.rate * dropMul * (1 + dropBonus));
          if (Math.random() < chance) {
            const count = randomInt(1, 2);
            this.data.inventory[drop.id] = (this.data.inventory[drop.id] || 0) + count;
            b.log.push({ text: `获得 ${MATERIALS[drop.id].icon} ${MATERIALS[drop.id].name} x${count}`, type: 'reward' });
          }
        }
      }
      // 灵宠捕获（改为主动捕捉，不再被动触发）
      // this.tryCapturePet(m.id, b); -- 已移除，改为手动捕捉按钮
      // 出战灵宠获得经验+亲密度
      this.petGainExp(exp, b);
      if (this.data.activePet !== null && this.data.pets[this.data.activePet]) {
        const pet = this.data.pets[this.data.activePet];
        pet.affinity = Math.min(CAPTURE_CONFIG.affinityMax, (pet.affinity || 0) + CAPTURE_CONFIG.affinityPerBattle);
      }
      // 战斗胜利悟道+5
      this.data.insight = (this.data.insight || 0) + 5;
      if (typeof SoundManager !== 'undefined') SoundManager.play('coin');
      // 图鉴记录
      this.recordBestiaryKill(m.id);
      // 任务进度
      this.updateQuestProgress('kill', 1);
      this.updateBountyProgress('kill', 1, m.id);
      // 无伤击杀检测 (for bounty)
      if (b.playerDamageTaken === 0) this.updateBountyProgress('no_damage_kills', 1);
      else this.data._bountyNoDmgStreak = 0;
      // 五行击杀追踪 (for bounty)
      if (b.monsterElement) {
        const elSet = new Set(this.data._bountyElementKills || []);
        elSet.add(b.monsterElement);
        this.data._bountyElementKills = [...elSet];
        this.updateBountyProgress('element_kills', elSet.size);
      }
      this.checkAchievements();
      this.checkTitles();
      if (typeof CrossGameAchievements !== 'undefined') {
        const kills = (this.data.totalKills || 0) + 1;
        this.data.totalKills = kills;
        CrossGameAchievements.trackStat('cultivation_kills', kills);
      }
    }

    // --- 炼丹 ---
    canCraft(recipeId) {
      const recipe = RECIPES_MAP[recipeId];
      if (!recipe || this.data.realm < recipe.realmReq) return false;
      for (const mat of recipe.materials) { if ((this.data.inventory[mat.id] || 0) < mat.count) return false; }
      return true;
    }

    craft(recipeId) {
      const recipe = RECIPES_MAP[recipeId];
      if (!this.canCraft(recipeId)) return { success: false, reason: '材料不足或境界不够' };
      for (const mat of recipe.materials) this.data.inventory[mat.id] -= mat.count;
      let rate = recipe.baseRate;
      const sect = SECTS_MAP[this.data.sect];
      if (sect.alchemyBonus) rate += sect.alchemyBonus;
      // 功法炼丹加成
      if (this.data.activeTechnique) {
        const tech = TECHNIQUES_MAP[this.data.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(this.data, tech) : null;
        if (eff && eff.alchemyBonus) rate += eff.alchemyBonus;
      }
      // 宗门永久炼丹加成
      if (this.data.sectPermBonuses && this.data.sectPermBonuses.alchemyPct) rate += this.data.sectPermBonuses.alchemyPct;
      // 称号炼丹加成
      if (this.data.activeTitle) {
        const title = TITLES_MAP[this.data.activeTitle];
        if (title && title.bonus && title.bonus.alchemyPct) rate += title.bonus.alchemyPct;
      }
      // NPC传授炼丹加成
      if (this.data.npcTeachings && this.data.npcTeachings.includes('teach_pill')) {
        const pillNpc = NPC_DATA.find(n => n.teachSkill && n.teachSkill.id === 'teach_pill');
        if (pillNpc && pillNpc.teachSkill.effect.alchemyPct) rate += pillNpc.teachSkill.effect.alchemyPct;
      }
      rate = Math.min(0.99, rate);
      if (Math.random() < rate) {
        if (recipe.effect.type === 'item') {
          // 产出材料而非丹药
          this.data.inventory[recipe.effect.itemId] = (this.data.inventory[recipe.effect.itemId] || 0) + recipe.effect.count;
        } else {
          this.data.pills[recipe.id] = (this.data.pills[recipe.id] || 0) + 1;
        }
        if (recipe.effect.type === 'exp') { this.data.exp += recipe.effect.value; this.data.totalExp += recipe.effect.value; }
        this.data.totalCrafts++;
        this.save();
        this.checkAchievements();
        this.updateQuestProgress('craft', 1);
        this.updateBountyProgress('craft', 1);
        if (typeof CrossGameAchievements !== 'undefined') {
          CrossGameAchievements.trackStat('cultivation_pills_crafted', this.data.totalCrafts);
        }
        return { success: true, pill: recipe.name };
      }
      this.save();
      return { success: false, reason: '炼丹失败，材料已消耗' };
    }

    // --- 炼器 ---
    canForge(recipeId) {
      const recipe = FORGE_RECIPES_MAP[recipeId];
      if (!recipe || this.data.realm < recipe.realmReq) return false;
      for (const mat of recipe.materials) { if ((this.data.inventory[mat.id] || 0) < mat.count) return false; }
      return true;
    }

    forge(recipeId) {
      const recipe = FORGE_RECIPES_MAP[recipeId];
      if (!this.canForge(recipeId)) return { success: false, reason: '材料不足或境界不够' };
      for (const mat of recipe.materials) this.data.inventory[mat.id] -= mat.count;
      let rate = recipe.rate;
      // 丹鼎派炼器也有微量加成
      const sect = SECTS_MAP[this.data.sect];
      if (sect.alchemyBonus) rate += sect.alchemyBonus * 0.5;
      rate = Math.min(0.99, rate);
      if (Math.random() < rate) {
        // 品质随机
        let qualityIdx = 0;
        const roll = Math.random();
        let cumChance = 0;
        // 极品仅高阶配方(realmReq>=3)可出
        const qualityPool = recipe.realmReq >= 3 ? FORGE_QUALITY : FORGE_QUALITY.slice(0, 3);
        // 重新计算概率分配
        const totalChance = qualityPool.reduce((s, q) => s + q.chance, 0);
        for (let i = qualityPool.length - 1; i >= 0; i--) {
          if (roll < qualityPool[i].chance / totalChance * (i === qualityPool.length - 1 ? 1 : 1)) {
            // 使用简单判定
          }
        }
        // 简化品质判定
        const qualityRoll = Math.random();
        if (recipe.realmReq >= 3 && qualityRoll < 0.05) qualityIdx = 3; // 极品
        else if (qualityRoll < 0.15) qualityIdx = 2; // 上品
        else if (qualityRoll < 0.35) qualityIdx = 1; // 良品
        else qualityIdx = 0; // 普通

        const quality = FORGE_QUALITY[qualityIdx];
        const enhanceBonus = quality.enhanceBonus;

        // 添加装备到背包
        if (!this.data.ownedEquips.includes(recipe.product) && !Object.values(this.data.equipment).includes(recipe.product)) {
          this.data.ownedEquips.push(recipe.product);
        }
        // 自动强化（品质加成）
        if (enhanceBonus > 0) {
          this.data.enhanceLevels[recipe.product] = Math.max(this.data.enhanceLevels[recipe.product] || 0, enhanceBonus);
          this.recalcStats();
        }

        this.data.totalForges = (this.data.totalForges || 0) + 1;
        if (qualityIdx === 3) this.data.hasForgedEpic = true;
        this.recordBestiaryEquip(recipe.product);
        this.save();
        this.checkAchievements();
        return { success: true, product: recipe.productName, quality: quality.name, enhanceBonus };
      }
      this.save();
      return { success: false, reason: '炼器失败，材料已消耗' };
    }

    // --- 商店 ---
    buy(itemId) {
      const item = SHOP_ITEMS_MAP[itemId];
      if (!item || this.data.gold < item.price) return false;
      this.data.gold -= item.price;
      if (item.type === 'material') this.data.inventory[item.id] = (this.data.inventory[item.id] || 0) + 1;
      else if (item.type === 'pill') this.data.pills[item.id] = (this.data.pills[item.id] || 0) + 1;
      this.save();
      return true;
    }

    buyEquip(equipId) {
      const eq = EQUIPMENT_MAP[equipId];
      if (!eq || this.data.gold < eq.price) return false;
      if (this.data.realm < eq.realmReq) return false;
      if (this.data.ownedEquips.includes(equipId) || Object.values(this.data.equipment).includes(equipId)) return false;
      this.data.gold -= eq.price;
      this.data.ownedEquips.push(equipId);
      this.recordBestiaryEquip(equipId);
      this.save();
      return true;
    }

    sell(materialId, count = 1) {
      if ((this.data.inventory[materialId] || 0) < count) return false;
      const prices = { herb: 5, crystal: 25, beast_core: 40, ore: 20, capture_talisman: 50 };
      this.data.inventory[materialId] -= count;
      this.data.gold += (prices[materialId] || 5) * count;
      this.save();
      return true;
    }

    // --- 装备 ---
    equip(itemId) {
      const item = EQUIPMENT_MAP[itemId];
      if (!item) return false;
      const idx = this.data.ownedEquips.indexOf(itemId);
      if (idx === -1) return false;
      const current = this.data.equipment[item.slot];
      if (current) this.data.ownedEquips.push(current);
      this.data.ownedEquips.splice(idx, 1);
      this.data.equipment[item.slot] = itemId;
      this.recalcStats();
      this.save();
      return true;
    }

    unequip(slot) {
      const current = this.data.equipment[slot];
      if (!current) return false;
      this.data.ownedEquips.push(current);
      this.data.equipment[slot] = null;
      this.recalcStats();
      this.save();
      return true;
    }

    // --- 成就 ---
    checkAchievements() {
      if (!this.data) return;
      let newAch = false;
      for (const ach of ACHIEVEMENTS) {
        if (this.data.achievements.includes(ach.id)) continue;
        if (ach.condition(this.data)) {
          this.data.achievements.push(ach.id);
          if (ach.reward.gold) this.data.gold += ach.reward.gold;
          if (ach.reward.exp) { this.data.exp += ach.reward.exp; this.data.totalExp += ach.reward.exp; }
          showToast(`成就达成：${ach.name}！`, 'success');
          newAch = true;
        }
      }
      if (newAch) this.save();
    }

    // --- 装备强化 ---
    canEnhance(equipId) {
      const d = this.data;
      const lvl = (d.enhanceLevels[equipId] || 0) + 1;
      if (lvl > ENHANCE_CONFIG.maxLevel) return false;
      const cost = ENHANCE_CONFIG.costs[lvl];
      if (!cost) return false;
      if (d.gold < cost.gold) return false;
      if (cost.ore && (d.inventory.ore || 0) < cost.ore) return false;
      if (cost.crystal && (d.inventory.crystal || 0) < cost.crystal) return false;
      if (cost.beast_core && (d.inventory.beast_core || 0) < cost.beast_core) return false;
      return true;
    }

    enhanceEquip(equipId) {
      if (!this.canEnhance(equipId)) return { success: false, reason: '材料或金币不足' };
      const d = this.data;
      const lvl = (d.enhanceLevels[equipId] || 0) + 1;
      const cost = ENHANCE_CONFIG.costs[lvl];
      const rate = ENHANCE_CONFIG.rates[lvl];

      d.gold -= cost.gold;
      if (cost.ore) d.inventory.ore -= cost.ore;
      if (cost.crystal) d.inventory.crystal -= cost.crystal;
      if (cost.beast_core) d.inventory.beast_core -= cost.beast_core;

      if (Math.random() < rate) {
        d.enhanceLevels[equipId] = lvl;
        this.recalcStats();
        this.updateBountyProgress('enhance', 1);
        this.save();
        return { success: true, level: lvl };
      }
      this.save();
      return { success: false, reason: '强化失败，材料已消耗' };
    }

    getEnhancedEquipName(equipId) {
      const eq = EQUIPMENT_MAP[equipId];
      if (!eq) return '';
      const lvl = this.data.enhanceLevels ? (this.data.enhanceLevels[equipId] || 0) : 0;
      return lvl > 0 ? `${eq.name}+${lvl}` : eq.name;
    }

    // --- 灵宠系统 ---
    canCapturePet() {
      if (!this.battleState || this.battleState.done) return false;
      const b = this.battleState;
      const hpRatio = b.monster.currentHp / b.monster.maxHp;
      if (hpRatio > CAPTURE_CONFIG.hpThreshold) return false;
      if (this.data.pets.length >= 6) return false;
      const template = PET_TEMPLATES.find(p => p.captureFrom === b.monster.id);
      if (!template) return false;
      if (this.data.pets.some(p => p.templateId === template.id)) return false;
      return true;
    }

    attemptCapture() {
      if (!this.canCapturePet()) return { success: false, reason: '无法捕捉' };
      const b = this.battleState;
      const d = this.data;
      const template = PET_TEMPLATES.find(p => p.captureFrom === b.monster.id);

      let rate = CAPTURE_CONFIG.baseRate + d.realm * CAPTURE_CONFIG.realmBonus;
      const hpRatio = b.monster.currentHp / b.monster.maxHp;
      const hpMissing = Math.floor((CAPTURE_CONFIG.hpThreshold - hpRatio) * 120);
      rate += hpMissing * CAPTURE_CONFIG.hpBonusRate;
      if (b.captureFails) {
        rate += Math.min(0.15, b.captureFails * 0.03);
      }

      let usedTalisman = false;
      if ((d.inventory.capture_talisman || 0) > 0) {
        rate += CAPTURE_CONFIG.talismanBonus;
        d.inventory.capture_talisman--;
        usedTalisman = true;
      }

      rate = Math.min(0.95, rate);

      if (Math.random() < rate) {
        const pet = {
          templateId: template.id,
          name: template.name,
          icon: template.icon,
          level: 1,
          exp: 0,
          atk: template.baseAtk,
          def: template.baseDef,
          hp: template.baseHp,
          evolution: 0,
          affinity: 10,
          skillCooldown: 0,
        };
        d.pets.push(pet);
        b.log.push({ text: `成功捕获 ${template.icon} ${template.name}！`, type: 'reward' });
        this.recordBestiaryPet(template.id);
        // 捕捉成功：战斗结束，仍获得战利品
        b.done = true;
        b.won = true;
        this.battleReward();
        this.save();
        return { success: true, petName: template.name };
      } else {
        b.captureFails = (b.captureFails || 0) + 1;
        // 捕捉失败：怪物反击一次
        b.log.push({ text: `捕捉失败！${usedTalisman ? '(捕灵符已消耗)' : ''}`, type: 'info' });
        if (usedTalisman && Math.random() < 0.5) {
          b.log.push({ text: '捕灵符护身，避免了反击！', type: 'info' });
          this.save();
          return { success: false, reason: '捕捉失败，但捕灵符避免反击' };
        }
        this._monsterAttack();
        this.save();
        return { success: false, reason: '捕捉失败，怪物发动反击！' };
      }
    }

    _petAttack(b) {
      if (this.data.activePet === null) return;
      const pet = this.data.pets[this.data.activePet];
      if (!pet) return;

      const skill = PET_SKILLS[pet.templateId];
      const hasSkill = skill && pet.level >= 5;

      // 手动技能的宠物不会自动释放技能，只普攻
      if (hasSkill && !skill.manual && (pet.skillCooldown || 0) <= 0) {
        this._executePetSkill(b, pet, skill);
      } else {
        // 普攻
        const dmg = Math.max(1, Math.floor((pet.atk - b.monster.def * 0.3) * (b.elBonusPlayer || 1)));
        b.monster.currentHp -= dmg;
        b.log.push({ text: `${pet.icon}${pet.name} 造成 ${dmg} 点伤害`, type: 'skill' });
        if (pet.skillCooldown > 0) pet.skillCooldown--;
      }

      if (b.monster.currentHp <= 0) {
        b.monster.currentHp = 0; b.done = true; b.won = true;
      }
    }

    /** 手动触发灵宠技能 */
    battleUsePetSkill() {
      if (!this.battleState || this.battleState.done) return;
      if (this.data.activePet === null) { showToast('没有出战灵宠', 'error'); return; }
      const pet = this.data.pets[this.data.activePet];
      if (!pet) return;
      const skill = PET_SKILLS[pet.templateId];
      if (!skill || !skill.manual || pet.level < 5) { showToast('灵宠技能未解锁', 'error'); return; }
      if ((pet.skillCooldown || 0) > 0) { showToast(`灵宠技能冷却中 (${pet.skillCooldown}回合)`, 'error'); return; }

      const b = this.battleState;
      this._executePetSkill(b, pet, skill);

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
    }

    _executePetSkill(b, pet, skill) {
      const dmg = Math.max(1, Math.floor((pet.atk * skill.dmgMul - b.monster.def * 0.3) * (b.elBonusPlayer || 1)));
      if (skill.dmgMul > 0) {
        b.monster.currentHp -= dmg;
        b.log.push({ text: `${pet.icon}${pet.name} 释放【${skill.name}】造成 ${dmg} 点伤害`, type: 'skill' });
      } else {
        b.log.push({ text: `${pet.icon}${pet.name} 释放【${skill.name}】`, type: 'skill' });
      }
      pet.skillCooldown = skill.cooldown;

      // 技能特殊效果
      if (skill.effect) {
        if (skill.effect.type === 'dot') {
          b.dots.push({ dmg: skill.effect.dmg, turns: skill.effect.turns });
          b.log.push({ text: `${skill.name}附加持续伤害`, type: 'skill' });
        }
        if (skill.effect.type === 'heal_owner') {
          const heal = Math.floor(this.data.maxHp * skill.effect.value);
          this.data.hp = Math.min(this.data.maxHp, this.data.hp + heal);
          b.log.push({ text: `${pet.name}吸血恢复${heal}生命`, type: 'heal' });
        }
        if (skill.effect.type === 'heal_burst') {
          const heal = Math.floor(this.data.maxHp * skill.effect.value);
          this.data.hp = Math.min(this.data.maxHp, this.data.hp + heal);
          b.log.push({ text: `${pet.name}恢复主人${heal}生命`, type: 'heal' });
        }
        if (skill.effect.type === 'debuff_atk') {
          b.monster.atk = Math.floor(b.monster.atk * (1 - skill.effect.value));
          b.log.push({ text: `${skill.name}降低敌人攻击`, type: 'skill' });
        }
        if (skill.effect.type === 'restore_spirit') {
          const gain = Math.min(skill.effect.value, this.data.maxSpirit - this.data.spirit);
          this.data.spirit += gain;
          if (gain > 0) b.log.push({ text: `${pet.name}恢复${gain}灵力`, type: 'info' });
        }
        if (skill.effect.type === 'taunt') {
          b.petTauntTurns = skill.effect.turns;
          b.log.push({ text: `${pet.name}嘲讽敌人${skill.effect.turns}回合！`, type: 'skill' });
        }
        if (skill.effect.type === 'shield_owner') {
          const shield = Math.floor(this.data.maxHp * skill.effect.value);
          b.shield = (b.shield || 0) + shield;
          b.log.push({ text: `${pet.name}为主人添加${shield}护盾`, type: 'info' });
        }
      }
    }

    feedPet(index) {
      const pet = this.data.pets[index];
      if (!pet) return false;
      if ((this.data.inventory.beast_core || 0) < 1) return false;
      this.data.inventory.beast_core -= 1;
      pet.atk += 2;
      pet.def += 1;
      pet.hp += 5;
      pet.affinity = Math.min(CAPTURE_CONFIG.affinityMax, (pet.affinity || 0) + CAPTURE_CONFIG.affinityPerFeed);
      this.recalcStats();
      this.save();
      return true;
    }

    setActivePet(index) {
      if (index === null || (this.data.pets[index])) {
        this.data.activePet = index;
        this.recalcStats();
        this.save();
        return true;
      }
      return false;
    }

    releasePet(index) {
      if (this.data.activePet === index) this.data.activePet = null;
      else if (this.data.activePet !== null && this.data.activePet > index) this.data.activePet--;
      this.data.pets.splice(index, 1);
      this.recalcStats();
      this.save();
    }

    petGainExp(exp, battleState) {
      if (this.data.activePet === null) return;
      const pet = this.data.pets[this.data.activePet];
      if (!pet) return;
      if (pet.affinity === undefined) pet.affinity = 0;
      if (pet.skillCooldown === undefined) pet.skillCooldown = 0;
      const petExp = Math.floor(exp * 0.5);
      pet.exp += petExp;
      while (pet.exp >= pet.level * 50 && pet.level < 30) {
        pet.exp -= pet.level * 50;
        pet.level++;
        pet.atk += 3;
        pet.def += 2;
        pet.hp += 8;
        this.updateBountyProgress('pet_level', pet.level);
        // Check evolution
        const evolutions = PET_EVOLUTION[pet.templateId];
        if (evolutions) {
          for (const evo of evolutions) {
            if (pet.level === evo.lvl && pet.evolution < evolutions.indexOf(evo) + 1) {
              pet.name = evo.name;
              pet.icon = evo.icon;
              pet.atk = Math.floor(pet.atk * evo.mul);
              pet.def = Math.floor(pet.def * evo.mul);
              pet.hp = Math.floor(pet.hp * evo.mul);
              pet.evolution = evolutions.indexOf(evo) + 1;
              battleState.log.push({ text: `${pet.icon} ${pet.name} 进化了！`, type: 'reward' });
            }
          }
        }
      }
      this.recalcStats();
    }

    getPetBattleDmg() {
      if (this.data.activePet === null) return 0;
      const pet = this.data.pets[this.data.activePet];
      if (!pet) return 0;
      return pet.atk;
    }

    // --- 秘境探索 ---
    canEnterSecretRealm() {
      if (this.data.realm < SECRET_REALM.realmReq) return { can: false, reason: `需要${REALMS[SECRET_REALM.realmReq].name}以上` };
      if (this.data.gold < SECRET_REALM.entryCost) return { can: false, reason: `需要${SECRET_REALM.entryCost}灵石` };
      if (Date.now() < (this.data.secretRealmCooldown || 0)) {
        const remain = Math.ceil(((this.data.secretRealmCooldown || 0) - Date.now()) / 1000);
        return { can: false, reason: `冷却中 (${remain}秒)` };
      }
      return { can: true };
    }

    startSecretRealm() {
      const check = this.canEnterSecretRealm();
      if (!check.can) return null;
      this.data.gold -= SECRET_REALM.entryCost;
      this.data.secretRealmCooldown = Date.now() + SECRET_REALM.cooldownMs;
      return { currentFloor: 1, log: ['进入秘境第1层...'], alive: true };
    }

    secretRealmFloor(realmState) {
      const floorConfig = SECRET_REALM.floors[realmState.currentFloor - 1];
      if (!floorConfig) { realmState.alive = false; return realmState; }

      // 分支选择: 非Boss层从战斗/事件/休息中选择（由UI选择传入）
      let encounter;
      if (floorConfig.type === 'boss') {
        encounter = 'monster';
      } else if (realmState.chosenPath) {
        encounter = realmState.chosenPath;
        realmState.chosenPath = null;
      } else {
        encounter = pick(['monster', 'treasure', 'trap', 'event']);
      }
      const scale = floorConfig.scale * Math.pow(1.4, this.data.realm);

      // 玩家五行
      const playerEl = this.data.spiritRoot === 'chaos' ? null : this.data.spiritRoot;

      if (encounter === 'monster' || floorConfig.type === 'boss') {
        const monsterId = floorConfig.boss || pick(Object.keys(MONSTERS).filter(k => MONSTERS[k].exp <= 500 * floorConfig.scale));
        const mTemplate = MONSTERS[monsterId] || MONSTERS.demon;
        const mHp = Math.floor(mTemplate.hp * scale);
        const mAtk = Math.floor(mTemplate.atk * scale);
        const mDef = Math.floor(mTemplate.def * scale);

        // 五行加成
        const elP = elementBonus(playerEl, mTemplate.element || null);
        const elM = elementBonus(mTemplate.element || null, playerEl);

        // Auto-battle
        let pHp = this.data.hp;
        const pAtk = this.data.atk;
        const pDef = this.data.def;
        let mCurrentHp = mHp;
        let turns = 0;
        let phase2 = false;

        while (pHp > 0 && mCurrentHp > 0 && turns < 50) {
          const pDmg = Math.max(1, Math.floor((pAtk - mDef * 0.5) * elP));
          mCurrentHp -= pDmg;
          // Pet attack
          const petDmg = Math.max(0, Math.floor((this.getPetBattleDmg() - mDef * 0.3) * elP));
          if (petDmg > 0) mCurrentHp -= petDmg;

          // Boss Phase 2: 50%HP时狂暴（攻击+50%）
          if (floorConfig.type === 'boss' && !phase2 && mCurrentHp > 0 && mCurrentHp <= mHp * 0.5) {
            phase2 = true;
            realmState.log.push(`第${realmState.currentFloor}层：${mTemplate.icon}${mTemplate.name} 进入狂暴状态！攻击提升！`);
          }

          if (mCurrentHp <= 0) break;
          const atkMul = phase2 ? 1.5 : 1;
          const eDmg = Math.max(1, Math.floor((mAtk * atkMul - pDef * 0.5) * elM));
          pHp -= eDmg;
          turns++;
        }

        this.data.hp = Math.max(1, pHp);
        if (pHp <= 0) {
          realmState.alive = false;
          realmState.log.push(`第${realmState.currentFloor}层：被 ${mTemplate.icon}${mTemplate.name} 击败！`);
        } else {
          const expReward = Math.floor(mTemplate.exp * scale * 2);
          const goldReward = Math.floor(mTemplate.gold * scale * 2);
          this.data.exp += expReward;
          this.data.totalExp += expReward;
          this.data.gold += goldReward;
          this.data.totalKills++;
          this.updateQuestProgress('kill', 1);
          this.updateBountyProgress('kill', 1, mTemplate.id);
          realmState.log.push(`第${realmState.currentFloor}层：击败 ${mTemplate.icon}${mTemplate.name}！+${expReward}修为 +${goldReward}灵石`);
        }
      } else if (encounter === 'treasure') {
        const gold = randomInt(100, 500) * Math.floor(scale);
        this.data.gold += gold;
        const matId = pick(['herb', 'crystal', 'beast_core', 'ore']);
        const matCount = randomInt(2, 5);
        this.data.inventory[matId] = (this.data.inventory[matId] || 0) + matCount;
        realmState.log.push(`第${realmState.currentFloor}层：发现宝箱！+${gold}灵石 +${matCount}${MATERIALS[matId].name}`);
      } else if (encounter === 'trap') {
        const dmg = Math.floor(this.data.maxHp * 0.15 * scale);
        this.data.hp = Math.max(1, this.data.hp - dmg);
        realmState.log.push(`第${realmState.currentFloor}层：触发陷阱！-${dmg}生命`);
        if (this.data.hp <= 1) { realmState.alive = false; }
      } else {
        const exp = randomInt(100, 300) * Math.floor(scale);
        this.data.exp += exp;
        this.data.totalExp += exp;
        const heal = Math.floor(this.data.maxHp * 0.2);
        this.data.hp = Math.min(this.data.maxHp, this.data.hp + heal);
        realmState.log.push(`第${realmState.currentFloor}层：灵泉恢复！+${exp}修为 +${heal}生命`);
      }

      if (realmState.alive && realmState.currentFloor > (this.data.secretRealmBestFloor || 0)) {
        this.data.secretRealmBestFloor = realmState.currentFloor;
      }
      this.updateBountyProgress('sr_floor', realmState.currentFloor);

      if (realmState.alive) {
        realmState.currentFloor++;
        if (realmState.currentFloor > 10) {
          realmState.log.push('恭喜！成功通关秘境！');
          // Bonus reward
          const bonusExp = 2000 + this.data.realm * 500;
          const bonusGold = 1000 + this.data.realm * 300;
          this.data.exp += bonusExp;
          this.data.totalExp += bonusExp;
          this.data.gold += bonusGold;
          realmState.log.push(`通关奖励：+${bonusExp}修为 +${bonusGold}灵石`);
          realmState.alive = false; // done
          realmState.cleared = true;
        }
      }

      this.save();
      return realmState;
    }

    // --- 宗门任务 ---
    checkQuestReset() {
      if (!this.data) return;
      const now = Date.now();
      if (now >= (this.data.questResetTime || 0)) {
        this.generateDailyQuests();
      }
    }

    generateDailyQuests() {
      const shuffled = [...QUEST_TEMPLATES];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const selected = shuffled.slice(0, 3);
      const realmMul = 1 + this.data.realm * 0.5;
      const rewardSectExp = 10 + this.data.realm * 5;
      this.data.dailyQuests = selected.map(qt => ({
        id: qt.id,
        name: qt.name,
        desc: qt.desc,
        type: qt.type,
        target: qt.target,
        progress: 0,
        rewardGold: Math.floor(qt.rewardGold * realmMul),
        rewardExp: Math.floor(qt.rewardExp * realmMul),
        rewardSectExp,
        claimed: false,
      }));
      this.data.questProgress = {};
      // Reset time: next day at midnight
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      this.data.questResetTime = tomorrow.getTime();
      this.save();
    }

    updateQuestProgress(type, amount) {
      if (!this.data || !this.data.dailyQuests) return;
      for (const quest of this.data.dailyQuests) {
        if (quest.claimed) continue;
        if (quest.type === type) {
          if (type === 'gold') {
            // gold type checks current holdings
            quest.progress = this.data.gold;
          } else if (type === 'meditate') {
            quest.progress = (quest.progress || 0) + amount;
          } else {
            quest.progress = (quest.progress || 0) + amount;
          }
        }
      }
    }

    // --- 宗门任务领取额外贡献 ---
    claimQuest(index) {
      const quest = this.data.dailyQuests[index];
      if (!quest || quest.claimed) return false;
      if (quest.progress < quest.target) return false;
      quest.claimed = true;
      this.data.gold += quest.rewardGold;
      this.data.exp += quest.rewardExp;
      this.data.totalExp += quest.rewardExp;
      // 宗门经验 + 贡献
      const sectExp = quest.rewardSectExp !== undefined ? quest.rewardSectExp : (10 + this.data.realm * 5);
      this.data.sectExp = (this.data.sectExp || 0) + sectExp;
      this.data.sectContribution = (this.data.sectContribution || 0) + sectExp;
      this.save();
      return true;
    }

    // --- 悬赏令系统 ---
    refreshBountyChoices() {
      const eligible = BOUNTY_TEMPLATES.filter(b => this.data.realm >= b.realmReq);
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      this.data.bountyChoices = shuffled.slice(0, 3).map(b => b.id);
      this.data.bountyResetTime = Date.now() + 24 * 60 * 60 * 1000;
      this.save();
    }

    getBountyChoices() {
      if (Date.now() >= (this.data.bountyResetTime || 0) || !this.data.bountyChoices.length) {
        this.refreshBountyChoices();
      }
      return this.data.bountyChoices.map(id => BOUNTY_TEMPLATES.find(b => b.id === id)).filter(Boolean);
    }

    acceptBounty(bountyId) {
      if (this.data.activeBounty) return false;
      const b = BOUNTY_TEMPLATES.find(t => t.id === bountyId);
      if (!b) return false;
      this.data.activeBounty = bountyId;
      this.data.bountyProgress = 0;
      this.data._bountyElementKills = [];
      this.save();
      return true;
    }

    updateBountyProgress(type, amount, extra) {
      if (!this.data.activeBounty) return;
      const b = BOUNTY_TEMPLATES.find(t => t.id === this.data.activeBounty);
      if (!b) return;
      // kill_specific: must match monster id
      if (b.type === 'kill_specific' && type === 'kill' && extra === b.monster) {
        this.data.bountyProgress += amount; return;
      }
      // gold: snapshot current gold
      if (b.type === 'gold' && type === 'gold') {
        this.data.bountyProgress = this.data.gold; return;
      }
      // pet_level: snapshot pet level
      if (b.type === 'pet_level' && type === 'pet_level') {
        this.data.bountyProgress = Math.max(this.data.bountyProgress, amount); return;
      }
      // sr_floor: snapshot best floor reached
      if (b.type === 'sr_floor' && type === 'sr_floor') {
        this.data.bountyProgress = Math.max(this.data.bountyProgress, amount); return;
      }
      // element_kills: count distinct elements (stored as bitmask in extra)
      if (b.type === 'element_kills' && type === 'element_kills') {
        this.data.bountyProgress = amount; return;
      }
      // no_damage_kills: incremental
      if (b.type === 'no_damage_kills' && type === 'no_damage_kills') {
        this.data.bountyProgress += amount; return;
      }
      // simple match: kill, craft, meditate, event, enhance
      if (b.type === type) {
        this.data.bountyProgress += amount;
      }
    }

    claimBounty() {
      if (!this.data.activeBounty) return false;
      const b = BOUNTY_TEMPLATES.find(t => t.id === this.data.activeBounty);
      if (!b || this.data.bountyProgress < b.target) return false;
      this.data.gold += b.rewardGold;
      this.data.exp += b.rewardExp;
      this.data.totalExp += b.rewardExp;
      this.data.activeBounty = null;
      this.data.bountyProgress = 0;
      this.save();
      return true;
    }

    abandonBounty() {
      this.data.activeBounty = null;
      this.data.bountyProgress = 0;
      this.save();
    }

    // --- 轮回系统 ---
    canRebirth() {
      return this.data.realm >= REBIRTH_CONFIG.minRealm && this.data.rebirthCount < REBIRTH_CONFIG.maxRebirth;
    }

    doRebirth() {
      if (!this.canRebirth()) return false;
      const d = this.data;
      const rb = REBIRTH_CONFIG;
      let carryRate = rb.bonusPerRebirth.goldCarry * (d.rebirthCount + 1);
      if (d.activeTechnique) {
        const tech = TECHNIQUES_MAP[d.activeTechnique];
        const eff = tech ? getScaledTechniqueEffect(d, tech) : null;
        if (eff && eff.rebirthGoldBonus) carryRate += eff.rebirthGoldBonus;
      }
      carryRate = Math.min(0.9, Math.max(0, carryRate));
      const goldCarry = Math.floor(d.gold * carryRate);
      const startRealm = rb.startRealm[Math.min(d.rebirthCount + 1, rb.startRealm.length - 1)] || 0;
      const keptTechniques = [...d.learnedTechniques];
      const keptActiveTech = d.activeTechnique;
      const keptAchievements = [...d.achievements];
      const keptRebirthCount = d.rebirthCount + 1;
      const keptTribulationPassed = d.tribulationPassed;
      // 保留宗门数据
      const keptSectExp = Math.floor((d.sectExp || 0) * 0.5);
      const keptSectContribution = Math.floor((d.sectContribution || 0) * 0.5);
      const keptSectShopPurchased = [...(d.sectShopPurchased || [])];
      const keptSectPermBonuses = { ...(d.sectPermBonuses || {}) };
      const keptBestiary = d.bestiary ? JSON.parse(JSON.stringify(d.bestiary)) : { monsters: {}, petsFound: [], equipsFound: [] };
      const keptUnlockedTitles = [...(d.unlockedTitles || [])];
      const keptActiveTitle = d.activeTitle;
      const keptTournamentBestRank = d.tournamentBestRank || 0;
      // 保留第五期数据
      const keptNpcFavor = {};
      if (d.npcFavor) { for (const [k, v] of Object.entries(d.npcFavor)) keptNpcFavor[k] = Math.floor(v * 0.5); }
      const keptNpcTeachings = [...(d.npcTeachings || [])];
      const keptAdventureCompleted = [...(d.adventureCompleted || [])];

      // Reset character
      d.realm = startRealm;
      d.exp = 0;
      d.gold = goldCarry;
      d.inventory = { herb: 5, crystal: 0, beast_core: 0, ore: 0, capture_talisman: 0 };
      d.pills = { hp_pill: 2 };
      d.equipment = { weapon: null, armor: null, accessory: null };
      d.ownedEquips = [];
      d.enhanceLevels = {};
      d.pets = [];
      d.activePet = null;
      d.totalKills = 0;
      d.totalCrafts = 0;
      d.totalEvents = 0;
      d.totalExp = 0;
      d.rebirthCount = keptRebirthCount;
      d.learnedTechniques = keptTechniques;
      d.activeTechnique = keptActiveTech;
      d.achievements = keptAchievements;
      d.tribulationPassed = keptTribulationPassed;
      d.secretRealmBestFloor = 0;
      d.secretRealmCooldown = 0;
      d.dailyQuests = [];
      d.questResetTime = 0;
      d.questProgress = {};
      d.meditateSeconds = 0;
      d.insight = 0;
      d.deviationEnd = 0;
      d.totalForges = 0;
      d.hasForgedEpic = false;
      // 宗门：贡献保留50%，永久加成和已购商品完整保留，修炼室/大比状态重置
      d.sectExp = keptSectExp;
      d.sectContribution = keptSectContribution;
      d.sectShopPurchased = keptSectShopPurchased;
      d.sectPermBonuses = keptSectPermBonuses;
      d.sectTrainingEnd = 0;
      d.sectTrainingMul = 1;
      d.tournamentBestRank = keptTournamentBestRank;
      d.tournamentDailyFights = 0;
      d.tournamentFightDate = '';
      d.bestiary = keptBestiary;
      d.unlockedTitles = keptUnlockedTitles;
      d.activeTitle = keptActiveTitle;
      // 第五期：世界/NPC/冒险轮回保留
      d.currentLocation = 'qingyun_town';
      d.npcFavor = keptNpcFavor;
      d.npcDailyTalks = {};
      d.npcDailyGifts = {};
      d.npcDailyRumors = {};
      d.npcDailyPractice = {};
      d.npcTeachings = keptNpcTeachings;
      d.adventureProgress = {};
      d.adventureCompleted = keptAdventureCompleted;
      d.stamina = d.staminaMax || 20;
      d.lastStaminaRegen = Date.now();

      this.recalcStats();
      d.hp = d.maxHp;
      d.spirit = d.maxSpirit;
      this.save();
      this.checkAchievements();
      return true;
    }

    // --- 功法系统 ---
    canLearnTechnique(techId) {
      const tech = TECHNIQUES_MAP[techId];
      if (!tech) return false;
      if (this.data.learnedTechniques.includes(techId)) return false;
      if (this.data.realm < tech.realmReq) return false;
      if (this.data.gold < tech.cost) return false;
      // Branch limit: max 3 techniques per type
      const sameTypeCount = this.data.learnedTechniques.filter(tid => {
        const t = TECHNIQUES_MAP[tid];
        return t && t.type === tech.type;
      }).length;
      if (sameTypeCount >= 3) return false;
      return true;
    }

    getTechBranchCount(type) {
      return this.data.learnedTechniques.filter(tid => {
        const t = TECHNIQUES_MAP[tid];
        return t && t.type === type;
      }).length;
    }

    learnTechnique(techId) {
      if (!this.canLearnTechnique(techId)) return false;
      const tech = TECHNIQUES_MAP[techId];
      this.data.gold -= tech.cost;
      this.data.learnedTechniques.push(techId);
      this.save();
      this.checkAchievements();
      return true;
    }

    setActiveTechnique(techId) {
      if (techId !== null && !this.data.learnedTechniques.includes(techId)) return false;
      this.data.activeTechnique = techId;
      this.recalcStats();
      this.save();
      return true;
    }

    // --- 世界事件 ---
    getActiveWorldEvent() {
      if (!this.data.worldEventId || Date.now() > (this.data.worldEventEnd || 0)) return null;
      return WORLD_EVENTS.find(e => e.id === this.data.worldEventId) || null;
    }

    checkWorldEvent() {
      if (this.getActiveWorldEvent()) return;
      // 2% chance per 10-second check to start a world event
      if (Math.random() < 0.02) {
        const evt = pick(WORLD_EVENTS);
        this.data.worldEventId = evt.id;
        this.data.worldEventEnd = Date.now() + evt.duration * 1000;
        this.save();
      }
    }

    // --- 宗门系统 ---
    donateSect(donationId) {
      const option = SECT_DONATION_OPTIONS.find(o => o.id === donationId);
      if (!option) return false;
      const d = this.data;
      // Check costs
      if (option.cost.gold && d.gold < option.cost.gold) return false;
      if (option.cost.herb && (d.inventory.herb || 0) < option.cost.herb) return false;
      if (option.cost.crystal && (d.inventory.crystal || 0) < option.cost.crystal) return false;
      if (option.cost.beast_core && (d.inventory.beast_core || 0) < option.cost.beast_core) return false;
      if (option.cost.ore && (d.inventory.ore || 0) < option.cost.ore) return false;
      // Consume
      if (option.cost.gold) d.gold -= option.cost.gold;
      if (option.cost.herb) d.inventory.herb -= option.cost.herb;
      if (option.cost.crystal) d.inventory.crystal -= option.cost.crystal;
      if (option.cost.beast_core) d.inventory.beast_core -= option.cost.beast_core;
      if (option.cost.ore) d.inventory.ore -= option.cost.ore;
      d.sectContribution = (d.sectContribution || 0) + option.contribution;
      this.save();
      return true;
    }

    buySectShop(itemId) {
      const d = this.data;
      const items = SECT_SHOP_ITEMS[d.sect] || [];
      const item = items.find(i => i.id === itemId);
      if (!item) return false;
      if ((d.sectContribution || 0) < item.cost) return false;
      if (item.type === 'perm' && d.sectShopPurchased.includes(itemId)) return false;

      d.sectContribution -= item.cost;

      if (item.type === 'perm') {
        d.sectShopPurchased.push(itemId);
        // Apply permanent bonuses
        if (!d.sectPermBonuses) d.sectPermBonuses = {};
        for (const [key, val] of Object.entries(item.effect)) {
          d.sectPermBonuses[key] = (d.sectPermBonuses[key] || 0) + val;
        }
        this.recalcStats();
      } else if (item.type === 'exp') {
        d.exp += item.value;
        d.totalExp += item.value;
      } else if (item.type === 'material') {
        d.inventory[item.itemId] = (d.inventory[item.itemId] || 0) + item.count;
      }
      this.save();
      return true;
    }

    enterSectTraining(tier) {
      const config = SECT_TRAINING_CONFIG[tier];
      if (!config) return false;
      const d = this.data;
      if ((d.sectContribution || 0) < config.cost) return false;
      if (Date.now() < (d.sectTrainingEnd || 0)) return false;
      d.sectContribution -= config.cost;
      d.sectTrainingEnd = Date.now() + config.duration * 1000;
      d.sectTrainingMul = config.multiplier;
      this.save();
      return true;
    }

    getSectTrainingBoost() {
      if (!this.data.sectTrainingEnd || Date.now() > this.data.sectTrainingEnd) {
        this.data.sectTrainingMul = 1;
        return 1;
      }
      return this.data.sectTrainingMul || 1;
    }

    canTournamentFight() {
      const d = this.data;
      const today = new Date().toDateString();
      if (d.tournamentFightDate !== today) {
        d.tournamentDailyFights = 0;
        d.tournamentFightDate = today;
      }
      if (d.tournamentDailyFights >= SECT_TOURNAMENT_CONFIG.dailyFights) return false;
      if ((d.sectContribution || 0) < SECT_TOURNAMENT_CONFIG.entryCost) return false;
      return true;
    }

    doTournamentFight(rank) {
      if (!this.canTournamentFight()) return null;
      const d = this.data;
      const npc = SECT_TOURNAMENT_CONFIG.npcs[rank];
      if (!npc) return null;

      d.sectContribution -= SECT_TOURNAMENT_CONFIG.entryCost;
      d.tournamentDailyFights++;

      // Simulated battle
      const npcAtk = Math.floor(d.atk * npc.scale.atk);
      const npcDef = Math.floor(d.def * npc.scale.def);
      const npcHp = Math.floor(d.maxHp * npc.scale.hp);

      let pHp = d.hp;
      let nHp = npcHp;
      let turns = 0;
      const log = [];

      while (pHp > 0 && nHp > 0 && turns < 50) {
        const pDmg = Math.max(1, Math.floor(d.atk - npcDef * 0.5));
        nHp -= pDmg;
        log.push(`你造成 ${pDmg} 点伤害`);
        if (nHp <= 0) break;
        const nDmg = Math.max(1, Math.floor(npcAtk - d.def * 0.5));
        pHp -= nDmg;
        log.push(`${npc.name} 造成 ${nDmg} 点伤害`);
        turns++;
      }

      const won = nHp <= 0;
      if (won) {
        d.sectContribution = (d.sectContribution || 0) + npc.rewardContribution;
        d.gold += npc.rewardGold;
        if (npc.rank > (d.tournamentBestRank || 0)) {
          d.tournamentBestRank = npc.rank;
        }
      }

      this.save();
      this.checkTitles();
      return { won, log, npc, rewardContribution: won ? npc.rewardContribution : 0, rewardGold: won ? npc.rewardGold : 0 };
    }

    // --- 图鉴系统 ---
    recordBestiaryKill(monsterId) {
      if (!this.data.bestiary) this.data.bestiary = { monsters: {}, petsFound: [], equipsFound: [] };
      const b = this.data.bestiary;
      if (!b.monsters[monsterId]) b.monsters[monsterId] = { kills: 0, firstKill: Date.now() };
      b.monsters[monsterId].kills++;
    }

    recordBestiaryPet(petTemplateId) {
      if (!this.data.bestiary) this.data.bestiary = { monsters: {}, petsFound: [], equipsFound: [] };
      if (!this.data.bestiary.petsFound.includes(petTemplateId)) {
        this.data.bestiary.petsFound.push(petTemplateId);
      }
    }

    recordBestiaryEquip(equipId) {
      if (!this.data.bestiary) this.data.bestiary = { monsters: {}, petsFound: [], equipsFound: [] };
      if (!this.data.bestiary.equipsFound.includes(equipId)) {
        this.data.bestiary.equipsFound.push(equipId);
      }
    }

    // --- 称号系统 ---
    checkTitles() {
      if (!this.data) return;
      if (!this.data.unlockedTitles) this.data.unlockedTitles = [];
      let changed = false;
      for (const title of TITLES) {
        if (this.data.unlockedTitles.includes(title.id)) continue;
        if (title.condition(this.data)) {
          this.data.unlockedTitles.push(title.id);
          showToast(`解锁称号：${title.name}`, 'success');
          changed = true;
        }
      }
      if (changed) this.save();
    }

    setActiveTitle(titleId) {
      if (titleId && !this.data.unlockedTitles.includes(titleId)) return false;
      this.data.activeTitle = titleId;
      this.recalcStats();
      this.save();
      return true;
    }

    // ==================== 世界地图系统 ====================

    travelTo(locationId) {
      const loc = MAP_LOCATIONS.find(l => l.id === locationId);
      if (!loc) return { success: false, reason: '地点不存在' };
      if (this.data.realm < loc.minRealm) return { success: false, reason: `需要${REALMS[loc.minRealm].name}以上` };
      const curLoc = MAP_LOCATIONS.find(l => l.id === this.data.currentLocation);
      if (curLoc && !curLoc.connectedTo.includes(locationId) && this.data.currentLocation !== locationId) {
        return { success: false, reason: '无法直接到达该地点' };
      }
      this.data.currentLocation = locationId;
      this.save();
      return { success: true };
    }

    getLocationActions(locationId) {
      const loc = MAP_LOCATIONS.find(l => l.id === (locationId || this.data.currentLocation));
      if (!loc) return [];
      return loc.actions;
    }

    gatherAtLocation() {
      const d = this.data;
      if (d.stamina < 3) return { success: false, reason: '体力不足（需要3点）' };
      const table = GATHER_TABLE[d.currentLocation];
      if (!table) return { success: false, reason: '此地无可采集资源' };
      d.stamina -= 3;
      const results = [];
      for (const item of table) {
        if (Math.random() < item.rate) {
          const count = randomInt(item.min, item.max);
          d.inventory[item.id] = (d.inventory[item.id] || 0) + count;
          results.push({ id: item.id, name: MATERIALS[item.id].name, icon: MATERIALS[item.id].icon, count });
        }
      }
      if (results.length === 0) results.push({ id: null, name: '什么也没找到', icon: '❌', count: 0 });
      this.save();
      return { success: true, results };
    }

    _regenStamina() {
      const d = this.data;
      const now = Date.now();
      if (!d.lastStaminaRegen) { d.lastStaminaRegen = now; return; }
      const elapsed = (now - d.lastStaminaRegen) / 1000;
      if (elapsed >= 60) {
        const points = Math.floor(elapsed / 60);
        d.stamina = Math.min(d.staminaMax || 20, d.stamina + points);
        d.lastStaminaRegen += points * 60 * 1000;
      }
    }

    // ==================== NPC关系系统 ====================

    _getTodayKey() {
      return new Date().toISOString().slice(0, 10);
    }

    _getNpcFavor(npcId) {
      return (this.data.npcFavor && this.data.npcFavor[npcId]) || 0;
    }

    _getFavorLevel(favor) {
      if (favor >= 80) return 4;
      if (favor >= 60) return 3;
      if (favor >= 40) return 2;
      if (favor >= 20) return 1;
      return 0;
    }

    _addFavor(npcId, amount) {
      if (!this.data.npcFavor) this.data.npcFavor = {};
      this.data.npcFavor[npcId] = Math.max(0, Math.min(100, (this.data.npcFavor[npcId] || 0) + amount));
    }

    getVisibleNpcs(locationId) {
      const loc = locationId || this.data.currentLocation;
      return NPC_DATA.filter(npc => {
        if (npc.location !== loc) return false;
        if (npc.sectReq && npc.sectReq !== this.data.sect) return false;
        return true;
      });
    }

    talkToNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) return { success: false, reason: 'NPC不存在' };
      const today = this._getTodayKey();
      if (!this.data.npcDailyTalks) this.data.npcDailyTalks = {};
      const key = `${npcId}_${today}`;
      const talked = this.data.npcDailyTalks[key] || 0;
      if (talked >= 3) return { success: false, reason: '今日对话次数已满(3/3)' };
      this.data.npcDailyTalks[key] = talked + 1;
      const gain = randomInt(1, 3);
      this._addFavor(npcId, gain);
      const dialogue = pick(npc.dialogues);
      this.save();
      return { success: true, dialogue, favorGain: gain, remaining: 3 - talked - 1 };
    }

    askNpcRumor(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) return { success: false, reason: 'NPC不存在' };
      if (this._getNpcFavor(npcId) < 20) return { success: false, reason: '好感度不足(需要认识)' };
      const today = this._getTodayKey();
      if (!this.data.npcDailyRumors) this.data.npcDailyRumors = {};
      const key = `${npcId}_${today}`;
      const used = this.data.npcDailyRumors[key] || 0;
      if (used >= 2) return { success: false, reason: '今日打听次数已满(2/2)' };
      this.data.npcDailyRumors[key] = used + 1;

      const favorGain = 1;
      const insightGain = randomInt(1, 3);
      this._addFavor(npcId, favorGain);
      this.data.insight = (this.data.insight || 0) + insightGain;

      // Prefer location-specific hints (available adventure)
      const adventures = this.getAvailableAdventures();
      let rumor = '';
      if (adventures.length > 0) {
        const adv = pick(adventures);
        const loc = MAP_LOCATIONS.find(l => l.id === adv.triggerLocation);
        rumor = `听说“${loc ? loc.name : '此地'}”近日异象频现，或许有奇遇：${adv.name}。`;
      } else {
        const reachable = MAP_LOCATIONS.filter(l => this.data.realm >= l.minRealm);
        const loc = pick(reachable);
        rumor = pick([
          `有人说${loc.name}的灵气最近格外浓郁，适合修炼。`,
          `坊间传闻：高境界突破前多积累悟道值，成功率会更稳。`,
          `小道消息：切磋与送礼都能提升好感度，关系好能学到真东西。`,
        ]);
      }

      this.save();
      return { success: true, rumor, favorGain, insightGain, remaining: 2 - used - 1 };
    }

    practiceWithNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) return { success: false, reason: 'NPC不存在' };
      if (this._getNpcFavor(npcId) < 40) return { success: false, reason: '好感度不足(需要友好)' };
      const today = this._getTodayKey();
      if (!this.data.npcDailyPractice) this.data.npcDailyPractice = {};
      const key = `${npcId}_${today}`;
      if (this.data.npcDailyPractice[key]) return { success: false, reason: '今日已请教过一次' };

      const cost = 100 + this.data.realm * 60;
      if (this.data.gold < cost) return { success: false, reason: '灵石不足' };
      this.data.gold -= cost;
      this.data.npcDailyPractice[key] = true;

      const expGain = Math.floor(this.getExpRate() * 20);
      const insightGain = randomInt(1, 2);
      const favorGain = 2;
      this.data.exp += expGain;
      this.data.totalExp += expGain;
      this.data.insight = (this.data.insight || 0) + insightGain;
      this._addFavor(npcId, favorGain);
      this.save();
      return { success: true, cost, expGain, insightGain, favorGain };
    }

    adventureWithNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) return { success: false, reason: 'NPC不存在' };
      if (this._getNpcFavor(npcId) < 40) return { success: false, reason: '好感度不足(需要友好)' };
      const d = this.data;
      const today = this._getTodayKey();
      if (!d.npcDailyAdventures) d.npcDailyAdventures = {};
      const key = `${npcId}_${today}`;
      if (d.npcDailyAdventures[key]) return { success: false, reason: '今日已结伴历练过' };
      if ((d.stamina || 0) < 2) return { success: false, reason: '体力不足(需要2)' };
      d.stamina -= 2;
      d.npcDailyAdventures[key] = true;

      const favor = this._getNpcFavor(npcId);
      let baseSuccess = 0.62 + favor / 220;
      if (npc.personality === 'cheerful') baseSuccess += 0.05;
      if (npc.personality === 'wary') baseSuccess -= 0.05;
      baseSuccess = Math.min(0.92, Math.max(0.45, baseSuccess));

      const success = Math.random() < baseSuccess;
      const rewards = [];
      let expGain = 0;
      let goldGain = 0;
      let insightGain = 0;
      let hpLoss = 0;

      if (success) {
        expGain = Math.floor(this.getExpRate() * (25 + d.realm * 12));
        goldGain = 80 + d.realm * 60;
        insightGain = randomInt(1, 3);
        d.exp += expGain;
        d.totalExp += expGain;
        d.gold += goldGain;
        d.insight = (d.insight || 0) + insightGain;
        rewards.push(`修为 +${formatNumber(expGain)}`);
        rewards.push(`灵石 +${formatNumber(goldGain)}`);
        rewards.push(`悟道 +${insightGain}`);
        // small chance for material
        if (Math.random() < 0.35) {
          const mats = ['herb', 'crystal', 'ore', 'beast_core'];
          const mid = pick(mats);
          const c = 1 + (Math.random() < 0.2 ? 1 : 0);
          d.inventory[mid] = (d.inventory[mid] || 0) + c;
          rewards.push(`${MATERIALS[mid].icon}${MATERIALS[mid].name} x${c}`);
        }
        this._addFavor(npcId, 2);
      } else {
        expGain = Math.floor(this.getExpRate() * (8 + d.realm * 4));
        goldGain = 20 + d.realm * 15;
        hpLoss = Math.max(1, Math.floor(d.maxHp * 0.08));
        d.exp += expGain;
        d.totalExp += expGain;
        d.gold += goldGain;
        d.hp = Math.max(1, d.hp - hpLoss);
        rewards.push(`修为 +${formatNumber(expGain)}`);
        rewards.push(`灵石 +${formatNumber(goldGain)}`);
        rewards.push(`生命 -${hpLoss}`);
        this._addFavor(npcId, 1);
      }

      this.save();
      return { success: true, npcName: npc.name, ok: success, rewards, expGain, goldGain, insightGain, hpLoss };
    }

    giveGiftToNpc(npcId, itemId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) return { success: false, reason: 'NPC不存在' };
      if (this._getNpcFavor(npcId) < 20) return { success: false, reason: '好感度不足(需要认识)' };
      const today = this._getTodayKey();
      if (!this.data.npcDailyGifts) this.data.npcDailyGifts = {};
      const key = `${npcId}_${today}`;
      if (this.data.npcDailyGifts[key]) return { success: false, reason: '今日已送过礼物' };
      if (!this.data.inventory[itemId] || this.data.inventory[itemId] <= 0) return { success: false, reason: '物品不足' };
      this.data.inventory[itemId]--;
      this.data.npcDailyGifts[key] = true;
      let gain = 5;
      let pref = 'normal';
      if (npc.giftLikes && npc.giftLikes.includes(itemId)) { gain = 15; pref = 'like'; }
      if (npc.giftDislikes && npc.giftDislikes.includes(itemId)) { gain = -10; pref = 'dislike'; }
      this._addFavor(npcId, gain);
      this.save();
      return { success: true, favorGain: gain, pref };
    }

    sparWithNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc || !npc.sparPower) return { success: false, reason: '此NPC无法切磋' };
      if (this._getNpcFavor(npcId) < 40) return { success: false, reason: '好感度不足(需要友好)' };
      const d = this.data;
      const myPower = d.atk + d.def * 0.5;
      const npcPower = myPower * npc.sparPower;
      const rounds = [];
      let myHp = 100, npcHp = 100;
      for (let i = 0; i < 3; i++) {
        const myDmg = Math.floor((myPower / (myPower + npcPower)) * randomInt(15, 30));
        const npcDmg = Math.floor((npcPower / (myPower + npcPower)) * randomInt(15, 30));
        npcHp -= myDmg;
        myHp -= npcDmg;
        rounds.push({ round: i + 1, myDmg, npcDmg, myHp: Math.max(0, myHp), npcHp: Math.max(0, npcHp) });
        if (npcHp <= 0 || myHp <= 0) break;
      }
      let result, favorGain;
      if (npcHp <= myHp) { result = 'win'; favorGain = 5; }
      else if (myHp > 0 && npcHp - myHp < 20) { result = 'close'; favorGain = 3; }
      else { result = 'lose'; favorGain = 1; }
      this._addFavor(npcId, favorGain);
      this.save();
      return { success: true, result, rounds, favorGain };
    }

    learnFromNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc || !npc.teachSkill) return { success: false, reason: '此NPC无法传授' };
      if (this._getNpcFavor(npcId) < 60) return { success: false, reason: '好感度不足(需要信任)' };
      if (!this.data.npcTeachings) this.data.npcTeachings = [];
      if (this.data.npcTeachings.includes(npc.teachSkill.id)) return { success: false, reason: '已经学过了' };
      this.data.npcTeachings.push(npc.teachSkill.id);
      this.recalcStats();
      this.save();
      return { success: true, skill: npc.teachSkill };
    }

    // ==================== 道侣系统 ====================

    confessToNpc(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc || !npc.canBeCompanion) return { success: false, reason: '此NPC无法结为道侣' };
      if (this.data.companion) return { success: false, reason: '你已有道侣' };
      const favor = this._getNpcFavor(npcId);
      if (favor < 80) return { success: false, reason: '好感度不足(需要至交)' };
      // 好感度>=80: 90%成功率
      const rate = 0.90;
      if (Math.random() < rate) {
        this.data.companion = { npcId: npc.id, name: npc.name, icon: npc.icon };
        this.save();
        return { success: true, accepted: true, name: npc.name };
      }
      // 失败时好感度-5
      this._addFavor(npcId, -5);
      this.save();
      return { success: true, accepted: false, name: npc.name };
    }

    dualCultivate() {
      if (!this.data.companion) return { success: false, reason: '没有道侣' };
      const now = Date.now();
      const cooldown = this.data.dualCultivationCooldown || 0;
      if (now < cooldown) {
        const remain = Math.ceil((cooldown - now) / 60000);
        return { success: false, reason: `双修冷却中，还需${remain}分钟` };
      }
      // 给予大量经验（等同于60秒打坐的经验 * 3）
      const rate = this.getExpRate();
      const bonusExp = rate * 60 * 3;
      this.data.exp += bonusExp;
      this.data.totalExp += bonusExp;
      // 10分钟冷却
      this.data.dualCultivationCooldown = now + 600000;
      this.save();
      return { success: true, exp: bonusExp };
    }

    // ==================== 冒险事件链系统 ====================

    getAvailableAdventures() {
      const loc = this.data.currentLocation;
      return ADVENTURE_CHAINS.filter(chain => {
        if (chain.triggerLocation !== loc) return false;
        if (this.data.realm < chain.minRealm) return false;
        if (this.data.adventureCompleted && this.data.adventureCompleted.includes(chain.id)) return false;
        return true;
      });
    }

    triggerAdventure(chainId) {
      if (this.data.stamina < 5) return { success: false, reason: '体力不足（需要5点）' };
      const chain = ADVENTURE_CHAINS.find(c => c.id === chainId);
      if (!chain) return { success: false, reason: '事件不存在' };
      if (!this.data.adventureProgress) this.data.adventureProgress = {};
      if (this.data.adventureProgress[chainId] === undefined) {
        this.data.stamina -= 5;
        this.data.adventureProgress[chainId] = 0;
      }
      const step = this.data.adventureProgress[chainId];
      if (step >= chain.steps.length) return { success: false, reason: '事件已完成' };
      this.save();
      return { success: true, chain, step: chain.steps[step], stepIdx: step, totalSteps: chain.steps.length };
    }

    makeAdventureChoice(chainId, choiceIdx) {
      const chain = ADVENTURE_CHAINS.find(c => c.id === chainId);
      if (!chain) return null;
      const stepIdx = this.data.adventureProgress[chainId];
      const step = chain.steps[stepIdx];
      if (!step) return null;
      const choice = step.choices[choiceIdx];
      if (!choice) return null;

      // Check requirements
      if (choice.requirement) {
        if (choice.requirement.minAtk && this.data.atk < choice.requirement.minAtk) {
          return { success: false, reason: `需要攻击力 ${choice.requirement.minAtk}` };
        }
        if (choice.requirement.minRealm && this.data.realm < choice.requirement.minRealm) {
          return { success: false, reason: `需要${REALMS[choice.requirement.minRealm].name}` };
        }
        if (choice.requirement.gold && this.data.gold < choice.requirement.gold) {
          return { success: false, reason: `需要${choice.requirement.gold}灵石` };
        }
        if (choice.requirement.herb && (this.data.inventory.herb || 0) < choice.requirement.herb) {
          return { success: false, reason: `需要${choice.requirement.herb}灵草` };
        }
      }

      // Apply cost
      if (choice.cost) {
        if (choice.cost.gold) this.data.gold -= choice.cost.gold;
        if (choice.cost.herb) this.data.inventory.herb = (this.data.inventory.herb || 0) - choice.cost.herb;
      }

      // Determine success
      let isSuccess = true;
      if (choice.successRate !== undefined) {
        isSuccess = Math.random() < choice.successRate;
      }

      const resultText = isSuccess ? choice.success : (choice.failure || '你失败了。');
      const rewards = [];

      if (isSuccess) {
        const rw = choice.reward;
        if (rw) {
          if (rw.gold) { this.data.gold += rw.gold; rewards.push(`${rw.gold} 灵石`); }
          if (rw.exp) { this.data.exp += rw.exp; this.data.totalExp += rw.exp; rewards.push(`${rw.exp} 修为`); }
          if (rw.herb) { this.data.inventory.herb = (this.data.inventory.herb || 0) + rw.herb; rewards.push(`${rw.herb} 灵草`); }
          if (rw.crystal) { this.data.inventory.crystal = (this.data.inventory.crystal || 0) + rw.crystal; rewards.push(`${rw.crystal} 灵石(材料)`); }
          if (rw.beast_core) { this.data.inventory.beast_core = (this.data.inventory.beast_core || 0) + rw.beast_core; rewards.push(`${rw.beast_core} 兽核`); }
          if (rw.ore) { this.data.inventory.ore = (this.data.inventory.ore || 0) + rw.ore; rewards.push(`${rw.ore} 灵矿`); }
        }
      } else {
        // Failure with secondary reward
        if (choice.reward2) {
          const rw = choice.reward2;
          if (rw.exp) { this.data.exp += rw.exp; this.data.totalExp += rw.exp; rewards.push(`${rw.exp} 修为`); }
        }
        if (choice.failEffect) {
          if (choice.failEffect.hpLoss) {
            const loss = Math.floor(this.data.maxHp * choice.failEffect.hpLoss);
            this.data.hp = Math.max(1, this.data.hp - loss);
            rewards.push(`失去 ${loss} 生命`);
          }
        }
      }

      // Advance step
      this.data.adventureProgress[chainId] = stepIdx + 1;

      // Check completion
      let completed = false;
      if (this.data.adventureProgress[chainId] >= chain.steps.length) {
        completed = true;
        if (!this.data.adventureCompleted) this.data.adventureCompleted = [];
        this.data.adventureCompleted.push(chainId);
        delete this.data.adventureProgress[chainId];
      }

      this.save();
      return { success: true, isSuccess, resultText, rewards, completed, chainName: chain.name };
    }

    startAutoSave() {
      this.autoSaveInterval = setInterval(() => this.save(), 30000);
      window.addEventListener('beforeunload', () => this.save());
    }

    startTick(callback) {
      this.tickInterval = setInterval(() => { this.tick(); if (callback) callback(); }, 1000);
    }

    stopTick() {
      if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    }
  }

  // ==================== CultivationUI类 ====================

  class CultivationUI {
    constructor() {
      this.game = new CultivationGame();
      this.charCreateEl = document.getElementById('char-create');
      this.gameEl = document.getElementById('cult-game');
      this.statusBarEl = document.getElementById('status-bar');
      this._initStatusBarCache();
      this.eventPaused = false;
      this._autoBattleInterval = null;
      this._worldMapCollapsed = false;
      this._worldScrollToActions = false;
      // Cache frequently-accessed panel elements
      this._panels = {};

      this.initSettings();
      CultivationGame.migrateOldSave();
      this.renderSlotSelection();
      this._bindBattleHotkeys();
    }

    initSettings() {
      // Cache panel elements lazily
      this._getPanel = (id) => {
        if (!this._panels[id]) this._panels[id] = document.getElementById('panel-' + id);
        return this._panels[id];
      };
      this.settingsModal = new SettingsModal([
        { key: 'autoMeditate', label: '自动打坐', type: 'checkbox', default: true, checkLabel: '进入游戏时自动开始打坐' },
        {
          key: 'eventFrequency', label: '事件频率', type: 'select', default: 'normal',
          options: [
            { value: 'low', label: '低（120秒冷却）' },
            { value: 'normal', label: '正常（60秒冷却）' },
            { value: 'high', label: '高（30秒冷却）' },
          ],
        },
        { key: 'enableAnimations', label: '动画效果', type: 'checkbox', default: true, checkLabel: '启用战斗和突破动画' },
        { key: 'autoCollectEvents', label: '自动收集事件', type: 'checkbox', default: false, checkLabel: '冲突时自动存入事件簿' },
      ], 'settings_cultivation', () => {});
    }

    // --- 存档选择 ---
    renderSlotSelection() {
      let html = '<h2>踏入仙途</h2><div class="slot-grid">';
      for (let i = 1; i <= 3; i++) {
        const info = CultivationGame.getSlotInfo(i);
        if (info) {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-name">${info.name}</div><div class="slot-realm">${info.realm}</div><div class="slot-details">${info.sect} | 击杀: ${info.totalKills}</div></div><div class="slot-actions"><button class="btn btn-gold btn-sm" data-enter="${i}">进入</button><button class="btn btn-outline btn-sm" data-delete="${i}" style="color:var(--red);">删除</button></div></div>`;
        } else {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-empty">空存档</div></div><div class="slot-actions"><button class="btn btn-cyan btn-sm" data-create="${i}">创建角色</button></div></div>`;
        }
      }
      html += '</div>';
      this.charCreateEl.innerHTML = html;
      this.charCreateEl.style.display = '';

      this.charCreateEl.querySelectorAll('[data-enter]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = parseInt(btn.dataset.enter);
          if (this.game.load(slot)) this.enterGame();
        });
      });
      this.charCreateEl.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = parseInt(btn.dataset.delete);
          if (confirm('确定删除此存档？所有进度将丢失！')) {
            Storage.remove('cultivation_save_' + slot);
            this.renderSlotSelection();
          }
        });
      });
      this.charCreateEl.querySelectorAll('[data-create]').forEach(btn => {
        btn.addEventListener('click', () => this.showCharCreate(parseInt(btn.dataset.create)));
      });
    }

    showCharCreate(slot) {
      this.charCreateEl.innerHTML = `
        <div class="back-to-slots" id="back-slots">← 返回存档列表</div>
        <h2>踏入仙途</h2>
        <div class="form-group"><label class="form-label">道号</label><input type="text" class="form-input" id="char-name" placeholder="请输入你的道号" maxlength="12"></div>
        <div class="form-group"><label class="form-label">灵根</label><div class="spirit-root-options" id="spirit-roots"></div></div>
        <div class="form-group"><label class="form-label">门派</label><div class="sect-options" id="sects"></div></div>
        <button class="btn btn-gold btn-lg" style="width:100%;margin-top:16px;" id="btn-create">踏入仙途</button>
      `;

      document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());
      const rootsEl = document.getElementById('spirit-roots');
      const sectsEl = document.getElementById('sects');

      rootsEl.innerHTML = SPIRIT_ROOTS.map(sr => `<div class="spirit-root-option" data-id="${sr.id}"><div class="option-name">${sr.icon} ${sr.name}</div><div class="option-desc">${sr.desc}</div></div>`).join('');
      sectsEl.innerHTML = SECTS.map(s => `<div class="sect-option" data-id="${s.id}"><div class="option-name">${s.icon} ${s.name}</div><div class="option-desc">${s.desc}</div></div>`).join('');

      let selectedRoot = null, selectedSect = null;
      rootsEl.addEventListener('click', e => { const opt = e.target.closest('.spirit-root-option'); if (!opt) return; rootsEl.querySelectorAll('.spirit-root-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); selectedRoot = opt.dataset.id; });
      sectsEl.addEventListener('click', e => { const opt = e.target.closest('.sect-option'); if (!opt) return; sectsEl.querySelectorAll('.sect-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); selectedSect = opt.dataset.id; });

      document.getElementById('btn-create').addEventListener('click', () => {
        const name = document.getElementById('char-name').value.trim();
        if (!name) { showToast('请输入道号', 'error'); return; }
        if (name.length > 12) { showToast('道号最多12个字', 'error'); return; }
        if (!selectedRoot) { showToast('请选择灵根', 'error'); return; }
        if (!selectedSect) { showToast('请选择门派', 'error'); return; }
        if (this.game.createCharacter(name, selectedRoot, selectedSect, slot)) {
          this.enterGame();
          showToast(`${name}，欢迎踏入仙途！`, 'success');
        }
      });
    }

    enterGame() {
      this.charCreateEl.style.display = 'none';
      this.gameEl.classList.add('active');
      // 世界事件横幅
      if (!document.getElementById('world-event-banner')) {
        const banner = document.createElement('div');
        banner.id = 'world-event-banner';
        banner.style.cssText = 'display:none;align-items:center;gap:8px;padding:6px 16px;background:rgba(212,164,74,0.15);border:1px solid var(--gold-dark);border-radius:var(--radius-md);margin-bottom:12px;font-size:0.85rem;color:var(--gold);';
        this.statusBarEl.parentElement.insertBefore(banner, this.statusBarEl);
      }
      this.game.startAutoSave();
      this.game.meditating = window._settingsModal?.get('autoMeditate') ?? true;
      this.game.startTick(() => this.onTick());
      this.bindTabs();
      this.renderAll();
      // 仙缘联动: 检查跨游戏奖励
      if (typeof CrossGameRewards !== 'undefined') {
        const cultRewards = CrossGameRewards.checkAndClaim('cultivation');
        cultRewards.forEach(r => {
          if (r.reward.type === 'equipment' && this.game.data) {
            const eqId = r.reward.value;
            if (!this.game.data.ownedEquips.includes(eqId) && !Object.values(this.game.data.equipment).includes(eqId)) {
              this.game.data.ownedEquips.push(eqId);
              this.game.save();
            }
          }
          showToast('仙缘联动: ' + r.name, 'success');
        });
      }
      // 跨游戏统计上报
      if (typeof CrossGameAchievements !== 'undefined' && this.game.data) {
        CrossGameAchievements.trackStat('games_played_cultivation', true);
        CrossGameAchievements.trackStat('cultivation_gold', this.game.data.gold || 0);
        if (this.game.data.totalKills) CrossGameAchievements.trackStat('cultivation_kills', this.game.data.totalKills);
        if (this.game.data.totalCrafts) CrossGameAchievements.trackStat('cultivation_pills_crafted', this.game.data.totalCrafts);
        if (this.game.data.meditateSeconds) CrossGameAchievements.trackStat('cultivation_meditate_count', Math.floor(this.game.data.meditateSeconds / 60));
      }
      // 离线收益弹窗
      if (this.game._offlineResult) {
        const r = this.game._offlineResult;
        this.game._offlineResult = null;
        if (r.elapsed >= 300) {
          this._showOfflineModal(r);
        } else {
          showToast(`离线收获 ${formatNumber(r.expGain)} 修为`, 'info');
        }
      }
    }

    _showOfflineModal(r) {
      const hours = Math.floor(r.elapsed / 3600);
      const mins = Math.floor((r.elapsed % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `<div class="modal" style="text-align:center;">
        <div class="modal-header"><h3 class="modal-title">离线修炼</h3></div>
        <p style="color:var(--text-secondary);margin-bottom:16px;">你闭关修炼了 <span style="color:var(--gold)">${timeStr}</span></p>
        <div style="display:flex;gap:16px;justify-content:center;margin-bottom:20px;">
          <div class="stat-box"><div class="stat-label">修为</div><div class="stat-value">+${formatNumber(r.expGain)}</div></div>
          ${r.goldGain > 0 ? `<div class="stat-box"><div class="stat-label">灵石</div><div class="stat-value">+${formatNumber(r.goldGain)}</div></div>` : ''}
          ${r.insightGain > 0 ? `<div class="stat-box"><div class="stat-label">悟道</div><div class="stat-value">+${r.insightGain}</div></div>` : ''}
        </div>
        <button class="btn btn-gold" id="offline-dismiss">收下</button>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#offline-dismiss').addEventListener('click', () => overlay.remove());
      setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 15000);
    }

    bindTabs() {
      const tabs = document.getElementById('cult-tabs');
      tabs.addEventListener('click', e => {
        const tab = e.target.closest('.cult-tab');
        if (!tab) return;
        if (this._autoBattleInterval) { clearInterval(this._autoBattleInterval); this._autoBattleInterval = null; }
        tabs.querySelectorAll('.cult-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.cult-panel').forEach(p => p.classList.remove('active'));
        const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
        this.renderPanel(tab.dataset.tab);
      });
    }

    _bindBattleHotkeys() {
      if (this._battleHotkeysBound) return;
      this._battleHotkeysBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
        if (!this.game || !this.game.battleState || this.game.battleState.done) return;
        const panel = document.getElementById('panel-battle');
        if (!panel || !panel.classList.contains('active')) return;
        const key = e.key.toLowerCase();
        const actionMap = { a: 'attack', p: 'pill', f: 'flee', b: 'auto' };
        const action = actionMap[key];
        if (action) {
          const btn = panel.querySelector(`[data-action="${action}"]`);
          if (btn && !btn.disabled) {
            e.preventDefault();
            btn.click();
          }
          return;
        }
        if (['1', '2', '3', '4'].includes(key)) {
          const idx = parseInt(key, 10) - 1;
          const skillBtns = panel.querySelectorAll('[data-skill]');
          const btn = skillBtns[idx];
          if (btn && !btn.disabled) {
            e.preventDefault();
            btn.click();
          }
        }
      });
    }

    onTick() {
      this.renderStatusBar();
      const activePanel = document.querySelector('.cult-panel.active');
      if (activePanel && activePanel.dataset.panel === 'cultivate') this._updateCultivatePanelTick();
      if (activePanel && activePanel.dataset.panel === 'sect') this.renderSectPanel();
      // World panel: only update stamina display on tick, not full re-render
      if (activePanel && activePanel.dataset.panel === 'world') {
        const staminaLabel = activePanel.querySelector('.stamina-bar-label');
        const staminaFill = activePanel.querySelector('.stamina-bar .progress-fill');
        if (staminaLabel && staminaFill) {
          const d = this.game.data;
          const pct = ((d.stamina || 0) / (d.staminaMax || 20)) * 100;
          staminaLabel.innerHTML = `<span>体力</span><span>${d.stamina || 0}/${d.staminaMax || 20}</span>`;
          staminaFill.style.width = pct + '%';
        }
      }
      // 世界事件提示
      const we = this.game.getActiveWorldEvent();
      if (!this._weBanner) this._weBanner = document.getElementById('world-event-banner');
      const weBanner = this._weBanner;
      if (we && weBanner) {
        weBanner.style.display = 'flex';
        const remain = Math.ceil((this.game.data.worldEventEnd - Date.now()) / 1000);
        weBanner.innerHTML = `<span>${we.icon} ${we.name}</span><span style="margin-left:auto;font-size:0.8rem;">${remain}s</span>`;
      } else if (weBanner) {
        weBanner.style.display = 'none';
      }
      // 随机事件
      if (!this.eventPaused && this.game.meditating) {
        const evt = this.game._checkRandomEvent();
        if (evt) {
          // 如果当前已有弹窗（eventPaused会在showEventModal中设为true，这里是尚未暂停时检查）
          const hasModal = document.querySelector('.event-modal-overlay');
          if (hasModal) {
            // 已有弹窗打开，检查是否自动收集
            const autoCollect = Storage.get('settings_cultivation', {}).autoCollectEvents;
            if (autoCollect) {
              const inbox = this.game.data.eventInbox || [];
              if (inbox.length >= 20) inbox.shift();
              inbox.push({ id: evt.id, name: evt.name, icon: evt.icon, desc: evt.desc, time: Date.now() });
              this.game.data.eventInbox = inbox;
              this.game.save();
              this._updateInboxBadge();
            }
          } else {
            this.showEventModal(evt);
          }
        }
      }
    }

    renderAll() { this.renderStatusBar(); this.renderCultivatePanel(); this._updateInboxBadge(); }

    renderPanel(panelId) {
      switch (panelId) {
        case 'cultivate': this.renderCultivatePanel(); break;
        case 'battle': this.renderBattlePanel(); break;
        case 'alchemy': this.renderAlchemyPanel(); break;
        case 'forge': this.renderForgePanel(); break;
        case 'shop': this.renderShopPanel(); break;
        case 'inventory': this.renderInventoryPanel(); break;
        case 'achievement': this.renderAchievementPanel(); break;
        case 'pet': this.renderPetPanel(); break;
        case 'technique': this.renderTechniquePanel(); break;
        case 'sect': this.renderSectPanel(); break;
        case 'bestiary': this.renderBestiaryPanel(); break;
        case 'world': this.renderWorldPanel(); break;
        case 'inbox': this._openEventInbox(); break;
      }
    }

    // --- 状态栏 ---
    _initStatusBarCache() {
      const sb = this.statusBarEl;
      sb.innerHTML = `
        <div class="status-item"><div class="status-label">道号</div><div class="status-value" id="sb-name"></div></div>
        <div class="status-item"><div class="status-label">境界</div><div class="status-value purple" id="sb-realm"></div></div>
        <div class="status-item"><div class="status-label">生命</div><div class="status-value" id="sb-hp"></div></div>
        <div class="status-item"><div class="status-label">攻击</div><div class="status-value" id="sb-atk"></div></div>
        <div class="status-item"><div class="status-label">防御</div><div class="status-value" id="sb-def"></div></div>
        <div class="status-item"><div class="status-label">灵力</div><div class="status-value blue" id="sb-spirit"></div></div>
        <div class="status-item"><div class="status-label">灵石</div><div class="status-value" id="sb-gold"></div></div>
        <div class="exp-bar-wrap">
          <div class="exp-bar-label"><span id="sb-exp-text"></span><span id="sb-exp-pct"></span></div>
          <div class="progress-bar"><div class="progress-fill" id="sb-exp-fill"></div></div>
        </div>
        <div class="spirit-bar-wrap">
          <div class="spirit-bar-label"><span id="sb-spirit-text"></span><span id="sb-spirit-pct"></span></div>
          <div class="progress-bar spirit-bar"><div class="progress-fill" id="sb-spirit-fill"></div></div>
        </div>
        <div id="sb-companion-slot"></div>
      `;
      this._sbCache = {
        name: document.getElementById('sb-name'),
        realm: document.getElementById('sb-realm'),
        hp: document.getElementById('sb-hp'),
        atk: document.getElementById('sb-atk'),
        def: document.getElementById('sb-def'),
        spirit: document.getElementById('sb-spirit'),
        gold: document.getElementById('sb-gold'),
        expText: document.getElementById('sb-exp-text'),
        expPct: document.getElementById('sb-exp-pct'),
        expFill: document.getElementById('sb-exp-fill'),
        spiritText: document.getElementById('sb-spirit-text'),
        spiritPct: document.getElementById('sb-spirit-pct'),
        spiritFill: document.getElementById('sb-spirit-fill'),
        companionSlot: document.getElementById('sb-companion-slot'),
      };
      this._lastCompanion = null;
    }

    renderStatusBar() {
      const d = this.game.data;
      if (!d) return;
      if (!this._sbCache) this._initStatusBarCache();
      const c = this._sbCache;
      const realm = REALMS[d.realm];
      const nextRealm = d.realm < REALMS.length - 1 ? REALMS[d.realm + 1] : null;
      const expPct = nextRealm ? Math.min(100, (d.exp / nextRealm.expReq) * 100) : 100;
      const spiritPct = d.maxSpirit > 0 ? (d.spirit / d.maxSpirit) * 100 : 0;
      const activeTitle = d.activeTitle ? TITLES_MAP[d.activeTitle] : null;
      const titleBadge = activeTitle ? `<span class="active-title-badge">[${activeTitle.name}]</span>` : '';

      c.name.innerHTML = titleBadge + escapeHtml(d.name);
      c.realm.textContent = realm.name;
      c.hp.textContent = d.hp + '/' + d.maxHp;
      c.hp.className = 'status-value ' + (d.hp < d.maxHp * 0.3 ? 'red' : 'cyan');
      c.atk.textContent = d.atk;
      c.def.textContent = d.def;
      c.spirit.textContent = d.spirit + '/' + d.maxSpirit;
      c.gold.textContent = formatNumber(d.gold);
      c.expText.textContent = '修为 ' + formatNumber(d.exp) + (nextRealm ? ' / ' + formatNumber(nextRealm.expReq) : ' (已满)');
      c.expPct.textContent = expPct.toFixed(1) + '%';
      c.expFill.style.width = expPct + '%';
      c.spiritText.textContent = '灵力 ' + d.spirit + '/' + d.maxSpirit;
      c.spiritPct.textContent = spiritPct.toFixed(0) + '%';
      c.spiritFill.style.width = spiritPct + '%';

      const companionKey = d.companion ? d.companion.name : null;
      if (companionKey !== this._lastCompanion) {
        this._lastCompanion = companionKey;
        c.companionSlot.innerHTML = d.companion ? `<div class="companion-status-card">
          <span class="companion-status-icon">${d.companion.icon}</span>
          <span class="companion-status-name">道侣：${d.companion.name}</span>
          <span class="companion-status-bonus">修炼+10%</span>
        </div>` : '';
      }
    }

    // --- 修炼面板 ---
    renderCultivatePanel() {
      const d = this.game.data;
      const panel = document.getElementById('panel-cultivate');
      const rate = this.game.getExpRate();
      const canBreak = this.game.canBreakthrough();
      const nextRealm = d.realm < REALMS.length - 1 ? REALMS[d.realm + 1] : null;
      const insightInfo = this.game.getInsightProgress();
      const isDeviation = d.deviationEnd && Date.now() < d.deviationEnd;
      const deviationRemain = isDeviation ? Math.ceil((d.deviationEnd - Date.now()) / 1000) : 0;

      // 计算突破率显示（基础率，丹药由弹窗选择）
      let displayRate = nextRealm ? (nextRealm.rate || 0.5) : 0;
      const breakPillDisplay = [
        { id: 'dao_pill', name: '天道丹', bonus: 0.4 },
        { id: 'great_break_pill', name: '大破境丹', bonus: 0.3 },
        { id: 'break_pill', name: '破境丹', bonus: 0.2 },
        { id: 'small_break_pill', name: '小破境丹', bonus: 0.1 },
      ];
      let pillCount = 0;
      for (const pill of breakPillDisplay) {
        if (d.pills[pill.id] && d.pills[pill.id] > 0) pillCount += d.pills[pill.id];
      }
      displayRate = Math.min(0.99, displayRate);

      // 悟道值进度条
      const insightPct = insightInfo.required > 0 ? Math.min(100, (insightInfo.current / insightInfo.required) * 100) : 100;
      const expInsufficient = nextRealm && d.exp < nextRealm.expReq;
      const breakReason = expInsufficient ? '修为不足' : '悟道不足';

      panel.innerHTML = `<div class="cultivation-area">
        <div class="meditation-visual ${this.game.meditating ? 'meditating' : ''}">🧘</div>
        <div class="cultivation-info" id="cult-info">修炼速度：<strong>${rate} 修为/秒</strong> ${this.game.meditating ? '（修炼中...）' : '（已停止）'}${isDeviation ? `<span class="deviation-warning"> ⚠️ 走火入魔中 (${deviationRemain}s)</span>` : ''}</div>
        <div class="cultivation-actions"><button class="btn ${this.game.meditating ? 'btn-outline' : 'btn-cyan'} btn-sm" id="btn-meditate">${this.game.meditating ? '停止修炼' : '开始修炼'}</button><button class="btn btn-outline btn-sm" id="btn-meditation-game" style="margin-left:8px;">灵气吐纳 (小游戏)</button></div>
        ${nextRealm ? `<div class="breakthrough-area"><div class="breakthrough-info" id="cult-break-info">下一境界：<strong>${nextRealm.name}</strong> | 需要修为：${formatNumber(nextRealm.expReq)} | 基础成功率：${Math.floor(displayRate * 100)}%${pillCount > 0 ? ` (有${pillCount}颗丹药可用)` : ''}</div>
        <div class="insight-area">
          <div class="insight-label" id="cult-insight-label">悟道值：${insightInfo.current} / ${insightInfo.required}</div>
          <div class="progress-bar insight-bar"><div class="progress-fill insight-fill ${insightInfo.sufficient ? 'sufficient' : ''}" id="cult-insight-fill" style="width:${insightPct}%"></div></div>
        </div>
        <button class="btn ${canBreak ? 'btn-gold' : 'btn-outline'} btn-sm" id="btn-breakthrough" aria-disabled="${canBreak ? 'false' : 'true'}" ${canBreak ? '' : ('data-disabled-reason=\"' + breakReason + '\"')}>${canBreak ? '尝试突破' : (expInsufficient ? '修为不足' : '悟道不足')}</button></div>` : '<div class="breakthrough-area"><div class="breakthrough-info" style="color:var(--gold)">已达最高境界！</div></div>'}
        ${this.game.canRebirth() ? '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);"><div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:8px;">轮回次数：<strong style="color:var(--gold);">' + d.rebirthCount + '</strong> | 轮回加成：攻/防/血+' + (d.rebirthCount * 5) + '% 修炼+' + (d.rebirthCount * 15) + '%</div><button class="btn btn-gold btn-sm" id="btn-rebirth">轮回转世</button><button class="btn btn-outline btn-sm" id="btn-rebirth-preview" style="margin-left:8px;">轮回预览</button><span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">保留功法、成就，携带部分灵石重新开始</span></div>' : (d.rebirthCount > 0 ? '<div style="margin-top:12px;font-size:0.8rem;color:var(--gold);">轮回×' + d.rebirthCount + ' | 加成：攻/防/血+' + (d.rebirthCount * 5) + '% 修炼+' + (d.rebirthCount * 15) + '%</div>' : '')}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);"><button class="btn btn-outline btn-sm" id="btn-back-slots">返回存档列表</button></div>
      </div>${this.renderQuestBoard()}${this.renderBountyBoard()}`;

      panel.querySelector('#btn-meditate').addEventListener('click', () => { this.game.meditating = !this.game.meditating; this.renderCultivatePanel(); });
      panel.querySelector('#btn-meditation-game').addEventListener('click', () => { this._showMeditationMinigame(); });
      const breakBtn = panel.querySelector('#btn-breakthrough');
      if (breakBtn) {
        breakBtn.addEventListener('click', () => {
          if (!this.game.canBreakthrough()) {
            if (this.game.data.realm >= REALMS.length - 1) {
              showToast('已达最高境界', 'info');
              return;
            }
            const nextRealm = REALMS[this.game.data.realm + 1];
            const expOk = this.game.data.exp >= nextRealm.expReq;
            const insightReq = INSIGHT_REQUIREMENTS[this.game.data.realm + 1] || 0;
            const insightOk = (this.game.data.insight || 0) >= insightReq;
            showToast(expOk ? (insightOk ? '当前无法突破' : '悟道不足') : '修为不足', 'error');
            return;
          }
          if (this.game.needsTribulation()) {
            this.showTribulation();
            return;
          }
          // Breakthrough trial for realm 2+ (before pill selection)
          if (this.game.data.realm >= 1) {
            this._showBreakthroughTrial(() => {
              // Trial passed - proceed with pill selection and breakthrough
              this._showPillSelectionModal((pillId) => {
                const result = this.game.tryBreakthrough(0, pillId);
                if (result.success) {
                  Effects.screenFlash('rgba(255, 215, 0, 0.35)', 500);
                  Effects.particleExplosion(panel, 50, ['#ffd700', '#ffaa00', '#ff8800', '#fff4c0']);
                  Effects.realmUpText(result.realm);
                  showToast(`突破成功！晋升${result.realm}！${result.usedPill ? '（使用' + result.usedPill + '）' : ''}`, 'success');
                } else {
                  Effects.screenShake(panel, 1, 400);
                  Effects.screenFlash(result.deviation ? 'rgba(128, 0, 255, 0.3)' : 'rgba(255, 50, 50, 0.25)', 300);
                  showToast(result.reason, 'error');
                }
                this.renderStatusBar(); this.renderCultivatePanel();
              });
            });
            return;
          }
          this._showPillSelectionModal((pillId) => {
            const result = this.game.tryBreakthrough(0, pillId);
            if (result.success) {
              Effects.screenFlash('rgba(255, 215, 0, 0.35)', 500);
              Effects.particleExplosion(panel, 50, ['#ffd700', '#ffaa00', '#ff8800', '#fff4c0']);
              Effects.realmUpText(result.realm);
              showToast(`突破成功！晋升${result.realm}！${result.usedPill ? '（使用' + result.usedPill + '）' : ''}`, 'success');
            } else {
              Effects.screenShake(panel, 1, 400);
              Effects.screenFlash(result.deviation ? 'rgba(128, 0, 255, 0.3)' : 'rgba(255, 50, 50, 0.25)', 300);
              showToast(result.reason, 'error');
            }
            this.renderStatusBar(); this.renderCultivatePanel();
          });
        });
      }
      panel.querySelector('#btn-back-slots').addEventListener('click', () => {
        this.game.save(); this.game.stopTick();
        if (this.game.autoSaveInterval) clearInterval(this.game.autoSaveInterval);
        this.gameEl.classList.remove('active');
        this.game.data = null;
        this.renderSlotSelection();
      });
      const rebirthBtn = panel.querySelector('#btn-rebirth');
      if (rebirthBtn) {
        rebirthBtn.addEventListener('click', () => {
          if (confirm('轮回转世将重置境界、装备、灵宠等，但保留功法和成就。确定？')) {
            if (this.game.doRebirth()) {
              Effects.screenFlash('rgba(255, 255, 255, 0.5)', 600);
              Effects.realmUpText('轮回转世！');
              showToast(`轮回成功！第${this.game.data.rebirthCount}世`, 'success');
              this.renderAll();
            }
          }
        });
      }
      const rebirthPreviewBtn = panel.querySelector('#btn-rebirth-preview');
      if (rebirthPreviewBtn) {
        rebirthPreviewBtn.addEventListener('click', () => {
          const d = this.game.data;
          const rb = REBIRTH_CONFIG.bonusPerRebirth;
          const nextCount = d.rebirthCount + 1;
          let carryRate = rb.goldCarry * nextCount;
          if (d.activeTechnique) {
            const tech = TECHNIQUES_MAP[d.activeTechnique];
            const eff = tech ? getScaledTechniqueEffect(d, tech) : null;
            if (eff && eff.rebirthGoldBonus) carryRate += eff.rebirthGoldBonus;
          }
          carryRate = Math.min(0.9, Math.max(0, carryRate));
          const goldCarry = Math.floor(d.gold * carryRate);
          const startIdx = Math.min(nextCount - 1, REBIRTH_CONFIG.startRealm.length - 1);
          const REALM_NAMES = ['凡人','炼气期','筑基期','金丹期','元婴期','化神期','渡劫期','大乘期','飞升'];
          const startRealm = REALM_NAMES[REBIRTH_CONFIG.startRealm[startIdx] || 0];
          const atkBonus = nextCount * rb.atkMul * 100;
          const defBonus = nextCount * rb.defMul * 100;
          const hpBonus = nextCount * rb.hpMul * 100;
          const expBonus = nextCount * rb.expRate * 100;
          alert(`【轮回预览 - 第${nextCount}世】\n\n起始境界: ${startRealm}\n携带灵石: ${formatNumber(goldCarry)}\n攻击加成: +${atkBonus}%\n防御加成: +${defBonus}%\n血量加成: +${hpBonus}%\n修炼加速: +${expBonus}%\n\n保留: 功法、成就、称号、宗门(50%贡献)\n重置: 装备、灵宠、背包、境界`);
        });
      }
      // Quest claim buttons
      panel.querySelectorAll('.quest-claim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.quest);
          if (this.game.claimQuest(idx)) {
            showToast('任务奖励已领取！', 'success');
            this.renderCultivatePanel();
            this.renderStatusBar();
          }
        });
      });
      // Bounty buttons
      panel.querySelectorAll('.bounty-choice').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.acceptBounty(el.dataset.bounty)) {
            showToast('已接取悬赏令！', 'success');
            this.renderCultivatePanel();
          }
        });
      });
      const bClaimBtn = panel.querySelector('.bounty-claim-btn');
      if (bClaimBtn) bClaimBtn.addEventListener('click', () => {
        if (this.game.claimBounty()) {
          showToast('悬赏奖励已领取！', 'success');
          this.renderCultivatePanel();
          this.renderStatusBar();
        }
      });
      const bAbandonBtn = panel.querySelector('.bounty-abandon-btn');
      if (bAbandonBtn) bAbandonBtn.addEventListener('click', () => {
        if (confirm('确定放弃当前悬赏？进度将清零。')) {
          this.game.abandonBounty();
          this.renderCultivatePanel();
        }
      });
    }

    _updateCultivatePanelTick() {
      const panel = this._getPanel('cultivate');
      if (!panel) return;
      const infoEl = panel.querySelector('#cult-info');
      // If key elements are missing, the panel hasn't been built yet; do a full render
      if (!infoEl) { this.renderCultivatePanel(); return; }

      const d = this.game.data;
      const rate = this.game.getExpRate();
      const isDeviation = d.deviationEnd && Date.now() < d.deviationEnd;
      const deviationRemain = isDeviation ? Math.ceil((d.deviationEnd - Date.now()) / 1000) : 0;

      // Update cultivation info line
      infoEl.innerHTML = `修炼速度：<strong>${rate} 修为/秒</strong> ${this.game.meditating ? '（修炼中...）' : '（已停止）'}${isDeviation ? `<span class="deviation-warning"> ⚠️ 走火入魔中 (${deviationRemain}s)</span>` : ''}`;

      // Update insight progress
      const insightInfo = this.game.getInsightProgress();
      const insightLabel = panel.querySelector('#cult-insight-label');
      const insightFill = panel.querySelector('#cult-insight-fill');
      if (insightLabel) insightLabel.textContent = `悟道值：${insightInfo.current} / ${insightInfo.required}`;
      if (insightFill) {
        const insightPct = insightInfo.required > 0 ? Math.min(100, (insightInfo.current / insightInfo.required) * 100) : 100;
        insightFill.style.width = insightPct + '%';
        insightFill.classList.toggle('sufficient', insightInfo.sufficient);
      }

      // Update breakthrough button state
      const canBreak = this.game.canBreakthrough();
      const breakBtn = panel.querySelector('#btn-breakthrough');
      const nextRealm = d.realm < REALMS.length - 1 ? REALMS[d.realm + 1] : null;
      if (breakBtn && nextRealm) {
        const expInsufficient = d.exp < nextRealm.expReq;
        breakBtn.className = `btn ${canBreak ? 'btn-gold' : 'btn-outline'} btn-sm`;
        breakBtn.textContent = canBreak ? '尝试突破' : (expInsufficient ? '修为不足' : '悟道不足');
        breakBtn.setAttribute('aria-disabled', canBreak ? 'false' : 'true');
      }

      // Update quest progress bars and text
      const quests = d.dailyQuests || [];
      panel.querySelectorAll('.quest-card').forEach((card, i) => {
        if (i >= quests.length) return;
        const q = quests[i];
        const pct = Math.min(100, (q.progress / q.target) * 100);
        const fill = card.querySelector('.quest-progress-fill');
        const text = card.querySelector('.quest-progress-text');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = `${q.progress}/${q.target}`;
      });
    }

    // --- 战斗面板 ---
    renderBattlePanel() {
      const panel = document.getElementById('panel-battle');
      const d = this.game.data;
      if (this.game.battleState && !this.game.battleState.done) { this.renderBattleField(panel); return; }
      panel.innerHTML = `<div class="battle-zone">${this.renderSecretRealmButton(panel)}<h3 style="color:var(--gold);margin-bottom:16px;">选择秘境</h3><div class="realm-select">${DUNGEONS.map(dg => {
        const locked = d.realm < dg.realmReq;
        return `<div class="realm-card ${locked ? 'locked' : ''}" data-dungeon="${dg.id}"><div class="realm-card-name">${dg.name}</div><div class="realm-card-desc">${dg.desc}</div><div class="realm-card-level">${locked ? `需要${REALMS[dg.realmReq].name}` : '可进入'}</div></div>`;
      }).join('')}</div></div>`;
      panel.querySelectorAll('.realm-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => { const state = this.game.startBattle(card.dataset.dungeon); if (state) this.renderBattleField(panel); });
      });
      panel.querySelectorAll('.realm-card.locked').forEach(card => {
        card.addEventListener('click', () => {
          const dg = DUNGEONS_MAP[card.dataset.dungeon];
          if (!dg) return;
          showToast(`需要${REALMS[dg.realmReq].name}`, 'info');
        });
      });
      const srBtn = panel.querySelector('#btn-secret-realm');
      if (srBtn) {
        srBtn.addEventListener('click', () => {
          if (srBtn.getAttribute('aria-disabled') === 'true') {
            showToast(srBtn.dataset.disabledReason || '当前无法进入秘境', 'error');
            return;
          }
          this.showSecretRealm();
        });
      }
    }

    renderBattleField(panel) {
      const b = this.game.battleState;
      const d = this.game.data;
      const mHpPct = (b.monster.currentHp / b.monster.maxHp) * 100;
      const pHpPct = (d.hp / d.maxHp) * 100;
      const spiritPct = d.maxSpirit > 0 ? (d.spirit / d.maxSpirit) * 100 : 0;

      // 获取可用技能
      const mySkills = SKILLS.filter(s => s.sect === d.sect && d.realm >= s.realmReq);
      let skillBtns = '';
      if (!b.done) {
        skillBtns = '<div class="battle-skills">' + mySkills.map(s => {
          const cd = b.cooldowns[s.id] || 0;
          const noSpirit = d.spirit < s.spiritCost;
          return `<button class="skill-btn ${cd > 0 || noSpirit ? 'on-cd' : ''}" data-skill="${s.id}" ${cd > 0 || noSpirit ? 'disabled' : ''}>${s.name} (${s.spiritCost}灵)${cd > 0 ? `<span class="cd-text">${cd}回合</span>` : ''}</button>`;
        }).join('') + '</div>';
      }

      const canCapture = this.game.canCapturePet();
      const hasTalisman = (d.inventory.capture_talisman || 0) > 0;
      const captureLabel = hasTalisman ? '捕捉(符)' : '捕捉';
      const isAutoActive = !!this._autoBattleInterval;

      // 五行克制显示
      const pEl = b.playerElement ? FIVE_ELEMENTS[b.playerElement] : null;
      const mEl = b.monsterElement ? FIVE_ELEMENTS[b.monsterElement] : null;
      const pElIcon = pEl ? `<span class="element-badge" style="color:${pEl.color}" title="${pEl.name}属性">${pEl.icon}</span>` : '';
      const mElIcon = mEl ? `<span class="element-badge" style="color:${mEl.color}" title="${mEl.name}属性">${mEl.icon}</span>` : '';
      let elHintText = '';
      if ((b.elBonusPlayer || 1) > 1) elHintText = '<span style="color:#4ad46a;font-size:0.75rem">▲ 五行克制</span>';
      else if ((b.elBonusPlayer || 1) < 1) elHintText = '<span style="color:#d44a4a;font-size:0.75rem">▼ 五行被克</span>';

      // 灵宠手动技能按钮
      let petSkillBtn = '';
      if (!b.done && d.activePet !== null && d.pets[d.activePet]) {
        const activePet = d.pets[d.activePet];
        const petSkill = PET_SKILLS[activePet.templateId];
        if (petSkill && petSkill.manual && activePet.level >= 5) {
          const petCd = activePet.skillCooldown || 0;
          petSkillBtn = `<button class="btn btn-outline btn-sm pet-skill-btn ${petCd > 0 ? 'on-cd' : ''}" data-action="petskill" ${petCd > 0 ? 'disabled' : ''}>${activePet.icon}${petSkill.name}${petCd > 0 ? ` (${petCd})` : ''}</button>`;
        }
      }

      const hpPillCount = d.pills.hp_pill || 0;
      const greaterHealCount = d.pills.greater_heal_pill || 0;
      const spiritPillCount = d.pills.spirit_pill || 0;
      const hpPillDisabled = hpPillCount <= 0 ? 'aria-disabled="true" data-disabled-reason="回春丹不足"' : '';
      const pillBtns = [
        `<button class="btn btn-outline btn-sm" data-action="pill" ${hpPillDisabled}>回春丹 (${hpPillCount})</button>`,
        greaterHealCount > 0 ? `<button class="btn btn-outline btn-sm" data-action="greater">大还丹 (${greaterHealCount})</button>` : '',
        spiritPillCount > 0 ? `<button class="btn btn-outline btn-sm" data-action="spirit">回灵丹 (${spiritPillCount})</button>` : ''
      ].join('');

      panel.innerHTML = `<div class="battle-zone"><div class="battle-field active">
        <div class="battle-entities">
          <div class="battle-entity"><div class="battle-entity-icon">🧘${pElIcon}</div><div class="battle-entity-name">${escapeHtml(d.name)}</div>
            <div class="battle-hp"><div class="battle-hp-text">${d.hp} / ${d.maxHp}</div><div class="battle-hp-bar"><div class="battle-hp-fill ${pHpPct < 30 ? 'low' : ''}" style="width:${pHpPct}%"></div></div></div>
            <div class="battle-spirit-bar"><div class="battle-spirit-fill" style="width:${spiritPct}%"></div></div>
          </div>
          <div class="battle-vs">${elHintText || 'VS'}</div>
          <div class="battle-entity"><div class="battle-entity-icon">${b.monster.icon}${mElIcon}</div><div class="battle-entity-name">${b.monster.name}</div>
            <div class="battle-hp"><div class="battle-hp-text">${b.monster.currentHp} / ${b.monster.maxHp}</div><div class="battle-hp-bar"><div class="battle-hp-fill ${mHpPct < 30 ? 'low' : ''}" style="width:${mHpPct}%"></div></div></div>
          </div>
        </div>
        ${!b.done ? `<div class="battle-actions">
          <button class="btn btn-gold btn-sm" data-action="attack">攻击</button>
          ${petSkillBtn}
          <button class="capture-btn ${canCapture ? 'glow' : ''}" data-action="capture" ${canCapture ? '' : 'disabled'}>${captureLabel}</button>
          ${pillBtns}
          <button class="btn btn-outline btn-sm auto-battle-btn ${isAutoActive ? 'active' : ''}" data-action="auto">${isAutoActive ? '停止自动' : '自动战斗'}</button>
          <button class="btn btn-outline btn-sm" data-action="flee">逃跑</button>
        </div>${skillBtns}` : `<div class="battle-actions"><button class="btn btn-gold btn-sm" data-action="back">返回秘境</button></div>`}
        <div class="battle-log">${b.log.map(l => `<div class="battle-log-entry ${l.type}">${l.text}</div>`).join('')}</div>
      </div></div>`;

      panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const prevMonsterHp = this.game.battleState ? this.game.battleState.monster.currentHp : 0;
          const prevPlayerHp = this.game.data.hp;
          switch (btn.dataset.action) {
            case 'attack': this.game.battleAttack(); break;
            case 'petskill': this.game.battleUsePetSkill(); break;
            case 'capture': {
              const result = this.game.attemptCapture();
              if (result.success) {
                Effects.screenFlash('rgba(255, 215, 0, 0.4)', 500);
                Effects.particleExplosion(panel, 40, ['#ffd700', '#ffaa00', '#4ad46a']);
                showToast(`成功捕获 ${result.petName}！`, 'success');
              } else {
                showToast(result.reason, 'error');
              }
              break;
            }
            case 'auto': {
              if (this._autoBattleInterval) {
                clearInterval(this._autoBattleInterval);
                this._autoBattleInterval = null;
              } else {
                this._autoBattleInterval = setInterval(() => {
                  if (!this.game.battleState || this.game.battleState.done) {
                    clearInterval(this._autoBattleInterval);
                    this._autoBattleInterval = null;
                    this.renderBattleField(panel);
                    return;
                  }
                  const d = this.game.data;
                  const b = this.game.battleState;
                  const hpPct = d.maxHp ? d.hp / d.maxHp : 1;
                  const baseCrit = typeof this.game._getPermCritBonus === 'function' ? this.game._getPermCritBonus() : 0;
                  const sectSkills = SKILLS.filter(s => s.sect === d.sect && d.realm >= s.realmReq);
                  const readySkills = sectSkills.filter(s => (b.cooldowns[s.id] || 0) <= 0 && d.spirit >= s.spiritCost);
                  const activePet = d.activePet !== null ? d.pets[d.activePet] : null;
                  const petSkill = activePet ? PET_SKILLS[activePet.templateId] : null;
                  const petReady = activePet && petSkill && petSkill.manual && activePet.level >= 5 && (activePet.skillCooldown || 0) <= 0;
                  let acted = false;

                  const canCapture = this.game.canCapturePet();
                  const hasTalisman = (d.inventory.capture_talisman || 0) > 0;
                  const captureReady = canCapture && (b.monster.currentHp / b.monster.maxHp < (hasTalisman ? 0.33 : 0.25)
                    || (b.captureFails || 0) >= 2 && b.monster.currentHp / b.monster.maxHp < 0.4);
                  if (captureReady) {
                    const result = this.game.attemptCapture();
                    if (result.success) showToast(`成功捕获 ${result.petName}`, 'success');
                    else showToast(result.reason || '捕捉失败', 'info');
                    acted = true;
                  } else if (hpPct < 0.18 && (d.pills.greater_heal_pill || 0) <= 0 && (d.pills.hp_pill || 0) <= 0) {
                    this.game.battleFlee();
                    acted = true;
                  } else if (hpPct < 0.45 && d.pills.greater_heal_pill > 0) {
                    this.game.battleUseGreaterHealPill();
                    acted = true;
                  } else if (hpPct < 0.55 && d.pills.hp_pill > 0) {
                    this.game.battleUsePill();
                    acted = true;
                  } else if (d.spirit < d.maxSpirit * 0.45 && d.pills.spirit_pill > 0) {
                    this.game.battleUseSpiritPill();
                    acted = true;
                  } else if (b.buffAtk <= 1 && d.pills.atk_pill > 0) {
                    this.game.battleUseBuff('atk_pill');
                    acted = true;
                  } else if (hpPct < 0.6 && b.buffDef <= 1 && d.pills.def_pill > 0) {
                    this.game.battleUseBuff('def_pill');
                    acted = true;
                  } else if (b.buffCrit <= baseCrit + 0.01 && d.pills.crit_pill > 0) {
                    this.game.battleUseBuff('crit_pill');
                    acted = true;
                  } else if (readySkills.length > 0) {
                    readySkills.sort((a, c) => c.dmgMul - a.dmgMul);
                    this.game.battleUseSkill(readySkills[0].id);
                    acted = true;
                  } else if (petReady && b.monster.currentHp / b.monster.maxHp > 0.4) {
                    this.game.battleUsePetSkill();
                    acted = true;
                  }

                  if (!acted) this.game.battleAttack();
                  this.renderBattleField(panel);
                  this.renderStatusBar();
                }, 800);
              }
              this.renderBattleField(panel);
              return;
            }
            case 'pill': if (!this.game.battleUsePill()) { showToast('回春丹不足', 'error'); return; } break;
            case 'greater': if (!this.game.battleUseGreaterHealPill()) { showToast('大还丹不足', 'error'); return; } break;
            case 'spirit': if (!this.game.battleUseSpiritPill()) { showToast('回灵丹不足', 'error'); return; } break;
            case 'flee': this.game.battleFlee(); break;
            case 'back': {
              if (this._autoBattleInterval) { clearInterval(this._autoBattleInterval); this._autoBattleInterval = null; }
              this.game.battleState = null; this.renderBattlePanel(); return;
            }
          }
          this._applyBattleEffects(panel, prevMonsterHp, prevPlayerHp, { showLoot: true });
          this.renderBattleField(panel); this.renderStatusBar();
        });
      });
      panel.querySelectorAll('[data-skill]').forEach(btn => {
        btn.addEventListener('click', () => {
          const prevMonsterHp = this.game.battleState ? this.game.battleState.monster.currentHp : 0;
          const prevPlayerHp = this.game.data.hp;
          Effects.screenFlash('rgba(74, 122, 212, 0.2)', 250);
          this.game.battleUseSkill(btn.dataset.skill);
          this._applyBattleEffects(panel, prevMonsterHp, prevPlayerHp, { dmgColor: '#6a9af4', dmgSize: '1.4rem' });
          this.renderBattleField(panel); this.renderStatusBar();
        });
      });
    }

    _applyBattleEffects(panel, prevMonsterHp, prevPlayerHp, opts = {}) {
      const b = this.game.battleState;
      if (!b) return;
      const monsterEntity = panel.querySelector('.battle-entity:last-child');
      const playerEntity = panel.querySelector('.battle-entity:first-child');
      const dmgColor = opts.dmgColor || '#ff4444';
      const dmgSize = opts.dmgSize || '1.3rem';
      if (b.monster.currentHp < prevMonsterHp && monsterEntity) {
        const dmg = prevMonsterHp - b.monster.currentHp;
        Effects.floatingText(monsterEntity, `-${dmg}`, { color: dmgColor, fontSize: dmgSize });
      }
      if (this.game.data.hp < prevPlayerHp && playerEntity) {
        const dmg = prevPlayerHp - this.game.data.hp;
        Effects.floatingText(playerEntity, `-${dmg}`, { color: '#ff8844', fontSize: '1.1rem' });
        Effects.screenShake(panel, 0.5, 300);
      }
      if (this.game.data.hp > prevPlayerHp && playerEntity) {
        const heal = this.game.data.hp - prevPlayerHp;
        Effects.floatingText(playerEntity, `+${heal}`, { color: '#4ad46a', fontSize: '1.1rem' });
      }
      const lastLogs = b.log.slice(-5);
      if (lastLogs.some(l => l.text.includes('暴击'))) {
        Effects.screenFlash('rgba(255, 215, 0, 0.25)', 250);
      }
      if (b.done && b.won) {
        Effects.particleExplosion(panel, 40, ['#ffd700', '#ffaa00', '#4ad46a']);
        if (opts.showLoot) {
          const rewardLogs = b.log.filter(l => l.type === 'reward' && l.text.includes('获得'));
          rewardLogs.forEach((l, i) => {
            setTimeout(() => Effects.lootCard('🎁', l.text), i * 300);
          });
        }
      }
    }

    // --- 炼丹面板 ---
    renderAlchemyPanel() {
      const panel = document.getElementById('panel-alchemy');
      const d = this.game.data;
      let selectedRecipe = null;

      const renderDetail = () => {
        const detailEl = panel.querySelector('.recipe-detail');
        if (!selectedRecipe) { detailEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个丹方</p>'; return; }
        const r = selectedRecipe;
        const sect = SECTS_MAP[d.sect];
        let rate = r.baseRate;
        if (sect.alchemyBonus) rate += sect.alchemyBonus;
        if (d.sectPermBonuses && d.sectPermBonuses.alchemyPct) rate += d.sectPermBonuses.alchemyPct;
        if (d.activeTitle) { const t = TITLES_MAP[d.activeTitle]; if (t && t.bonus && t.bonus.alchemyPct) rate += t.bonus.alchemyPct; }
        if (d.activeTechnique) {
          const tech = TECHNIQUES_MAP[d.activeTechnique];
          const eff = tech ? getScaledTechniqueEffect(d, tech) : null;
          if (eff && eff.alchemyBonus) rate += eff.alchemyBonus;
        }
        if (d.npcTeachings && d.npcTeachings.includes('teach_pill')) { const pn = NPC_DATA.find(n => n.teachSkill && n.teachSkill.id === 'teach_pill'); if (pn && pn.teachSkill.effect.alchemyPct) rate += pn.teachSkill.effect.alchemyPct; }
        rate = Math.min(0.99, rate);
        const canCraft = this.game.canCraft(r.id);
        const craftReason = d.realm < (r.realmReq || 0) ? `需达到${REALMS[r.realmReq].name}` : '材料不足';
        detailEl.innerHTML = `<h4>${r.name}</h4><p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">${r.desc}</p>
          <p class="form-label">所需材料：</p><ul class="recipe-materials">${r.materials.map(m => {
            const has = (d.inventory[m.id] || 0) >= m.count;
            return `<li class="${has ? 'has' : 'missing'}">${MATERIALS[m.id].icon} ${MATERIALS[m.id].name} x${m.count} (拥有:${d.inventory[m.id] || 0})</li>`;
          }).join('')}</ul>
          <p class="recipe-success-rate">成功率：${Math.floor(rate * 100)}%</p>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">已拥有：${r.effect.type === 'item' ? (d.inventory[r.effect.itemId] || 0) + ' 个' : (d.pills[r.id] || 0) + ' 颗'}</p>
          <div class="craft-buttons">
            <button class="btn btn-gold btn-sm" data-craft="1" ${canCraft ? '' : `aria-disabled="true" data-disabled-reason="${craftReason}"`}>炼丹</button>
            <button class="btn btn-outline btn-sm" data-craft="5" ${canCraft ? '' : `aria-disabled="true" data-disabled-reason="${craftReason}"`}>x5</button>
            <button class="btn btn-outline btn-sm" data-craft="all" ${canCraft ? '' : `aria-disabled="true" data-disabled-reason="${craftReason}"`}>全部</button>
          </div>`;
        const craftBtns = detailEl.querySelectorAll('[data-craft]');
        craftBtns.forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!selectedRecipe) return;
            if (!this.game.canCraft(selectedRecipe.id)) {
              const req = selectedRecipe.realmReq || 0;
              if (d.realm < req) showToast(`需达到${REALMS[req].name}`, 'info');
              else showToast('材料不足', 'error');
              return;
            }
            await Effects.showCauldronAnimation();
            const countStr = btn.dataset.craft;
            let count = countStr === 'all' ? 99 : parseInt(countStr);
            let success = 0, fail = 0;
            for (let i = 0; i < count; i++) {
              if (!this.game.canCraft(selectedRecipe.id)) break;
              const result = this.game.craft(selectedRecipe.id);
              if (result.success) success++;
              else fail++;
            }
            if (success + fail > 0) {
              if (success > 0) {
                Effects.screenFlash('rgba(74, 218, 212, 0.3)', 400);
                Effects.particleExplosion(detailEl, 30, ['#4adad4', '#80ffe0', '#ffd700']);
              } else {
                Effects.screenShake(panel, 0.8, 400);
                Effects.screenFlash('rgba(255, 50, 50, 0.2)', 300);
              }
              showToast(`炼丹完成: 成功${success}次, 失败${fail}次`, success > 0 ? 'success' : 'error');
              renderDetail();
              this.renderStatusBar();
            } else {
              showToast('材料不足', 'error');
            }
          });
        });
      };

      panel.innerHTML = `<h3 style="color:var(--gold);margin-bottom:16px;">⚗️ 炼丹</h3><div class="alchemy-area"><div class="recipe-list">${RECIPES.map(r => {
        const locked = d.realm < r.realmReq;
        return `<div class="recipe-card ${locked ? 'locked' : ''}" data-recipe="${r.id}"><div class="recipe-name">${r.name} ${locked ? '🔒' : ''}</div><div class="recipe-desc">${r.desc}${locked ? ` (需${REALMS[r.realmReq].name})` : ''}</div></div>`;
      }).join('')}</div><div class="recipe-detail"><p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个丹方</p></div></div>`;
      panel.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
          panel.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedRecipe = RECIPES_MAP[card.dataset.recipe];
          if (card.classList.contains('locked')) {
            showToast(`需达到${REALMS[selectedRecipe.realmReq].name}`, 'info');
          }
          renderDetail();
        });
      });
    }

    // --- 炼器面板 ---
    renderForgePanel() {
      const panel = document.getElementById('panel-forge');
      const d = this.game.data;
      let selectedForge = null;

      const renderForgeDetail = () => {
        const detailEl = panel.querySelector('.recipe-detail');
        if (!selectedForge) { detailEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个炼器配方</p>'; return; }
        const r = selectedForge;
        const eq = EQUIPMENT_MAP[r.product];
        const owned = d.ownedEquips.includes(r.product) || Object.values(d.equipment).includes(r.product);
        const canForge = this.game.canForge(r.id);
        const forgeReason = d.realm < (r.realmReq || 0) ? `需达到${REALMS[r.realmReq].name}` : '材料不足';
        detailEl.innerHTML = `<h4>${r.name}</h4><p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px;">产物：${r.productName}${eq ? ` (${SLOT_NAMES[r.slot]})` : ''}</p>
          ${eq ? `<p style="font-size:0.8rem;color:var(--cyan);margin-bottom:12px;">属性：${eq.atk ? '攻+' + eq.atk + ' ' : ''}${eq.def ? '防+' + eq.def + ' ' : ''}${eq.hp ? '血+' + eq.hp : ''}</p>` : ''}
          <p class="form-label">所需材料：</p><ul class="recipe-materials">${r.materials.map(m => {
            const has = (d.inventory[m.id] || 0) >= m.count;
            return `<li class="${has ? 'has' : 'missing'}">${MATERIALS[m.id].icon} ${MATERIALS[m.id].name} x${m.count} (拥有:${d.inventory[m.id] || 0})</li>`;
          }).join('')}</ul>
          <p class="recipe-success-rate">成功率：${Math.floor(r.rate * 100)}%</p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">品质概率：普通65% | 良品20%(+2强化) | 上品10%(+4强化)${r.realmReq >= 3 ? ' | 极品5%(+6强化)' : ''}</p>
          ${owned ? '<p style="font-size:0.8rem;color:var(--gold);margin-bottom:12px;">已拥有此装备（再次炼制可覆盖品质）</p>' : ''}
          <div class="craft-buttons">
            <button class="btn btn-gold btn-sm" data-forge-craft="1" ${canForge ? '' : `aria-disabled="true" data-disabled-reason="${forgeReason}"`}>炼器</button>
            <button class="btn btn-outline btn-sm" data-forge-craft="5" ${canForge ? '' : `aria-disabled="true" data-disabled-reason="${forgeReason}"`}>x5</button>
            <button class="btn btn-outline btn-sm" data-forge-craft="all" ${canForge ? '' : `aria-disabled="true" data-disabled-reason="${forgeReason}"`}>全部</button>
          </div>`;
        const forgeBtns = detailEl.querySelectorAll('[data-forge-craft]');
        forgeBtns.forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!selectedForge) return;
            if (!this.game.canForge(selectedForge.id)) {
              const req = selectedForge.realmReq || 0;
              if (d.realm < req) showToast(`需达到${REALMS[req].name}`, 'info');
              else showToast('材料不足', 'error');
              return;
            }
            await Effects.showForgeAnimation();
            const countStr = btn.dataset.forgeCraft;
            let count = countStr === 'all' ? 99 : parseInt(countStr);
            let success = 0, fail = 0, bestQuality = '', bestEnhance = 0;
            for (let i = 0; i < count; i++) {
              if (!this.game.canForge(selectedForge.id)) break;
              const result = this.game.forge(selectedForge.id);
              if (result.success) {
                success++;
                if (result.enhanceBonus > bestEnhance) { bestEnhance = result.enhanceBonus; bestQuality = result.quality; }
              } else fail++;
            }
            if (success + fail > 0) {
              if (success > 0) {
                Effects.screenFlash(bestEnhance >= 6 ? 'rgba(255, 215, 0, 0.5)' : 'rgba(74, 218, 212, 0.3)', 400);
                Effects.particleExplosion(detailEl, 30, bestEnhance >= 4 ? ['#ffd700', '#ffaa00', '#ff8800'] : ['#4adad4', '#80ffe0', '#ffd700']);
                if (bestEnhance >= 6) Effects.realmUpText('极品神兵！');
              } else {
                Effects.screenShake(panel, 0.8, 400);
                Effects.screenFlash('rgba(255, 50, 50, 0.2)', 300);
              }
              showToast(`炼器完成: 成功${success}次, 失败${fail}次${bestQuality ? ' (最佳:' + bestQuality + ')' : ''}`, success > 0 ? 'success' : 'error');
              renderForgeDetail();
              this.renderStatusBar();
            } else {
              showToast('材料不足', 'error');
            }
          });
        });
      };

      panel.innerHTML = `<h3 style="color:var(--gold);margin-bottom:16px;">🔨 炼器</h3><div class="alchemy-area"><div class="recipe-list">${FORGE_RECIPES.map(r => {
        const locked = d.realm < r.realmReq;
        return `<div class="recipe-card ${locked ? 'locked' : ''}" data-forge="${r.id}"><div class="recipe-name">${r.name} ${locked ? '🔒' : ''}</div><div class="recipe-desc">${r.productName}${locked ? ` (需${REALMS[r.realmReq].name})` : ''}</div></div>`;
      }).join('')}</div><div class="recipe-detail"><p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个炼器配方</p></div></div>`;
      panel.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
          panel.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedForge = FORGE_RECIPES_MAP[card.dataset.forge];
          if (card.classList.contains('locked')) {
            showToast(`需达到${REALMS[selectedForge.realmReq].name}`, 'info');
          }
          renderForgeDetail();
        });
      });
    }

    // --- 商店面板 ---
    renderShopPanel() {
      const panel = document.getElementById('panel-shop');
      const d = this.game.data;

      // 消耗品
      let html = `<h3 style="color:var(--gold);margin-bottom:16px;">坊市</h3><p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">灵石：${formatNumber(d.gold)}</p>`;
      html += '<h4 class="shop-section-title">消耗品</h4><div class="shop-grid">';
      for (const item of SHOP_ITEMS) {
        html += `<div class="shop-item" data-item="${item.id}"><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div><div class="item-desc">${item.desc}</div><div class="item-price">${item.price} 灵石</div></div>`;
      }
      html += '</div>';

      // 装备按品质分组
      const qualities = ['common', 'good', 'rare', 'epic', 'legend'];
      for (const q of qualities) {
        const eqs = EQUIPMENT.filter(e => e.quality === q);
        if (eqs.length === 0) continue;
        html += `<h4 class="shop-section-title">${QUALITY_NAMES[q]}装备</h4><div class="shop-grid">`;
        for (const eq of eqs) {
          const locked = d.realm < eq.realmReq;
          const owned = d.ownedEquips.includes(eq.id) || Object.values(d.equipment).includes(eq.id);
          const stats = [];
          if (eq.atk) stats.push(`攻+${eq.atk}`);
          if (eq.def) stats.push(`防+${eq.def}`);
          if (eq.hp) stats.push(`血+${eq.hp}`);
          html += `<div class="shop-item quality-${q} ${locked ? 'locked' : ''} ${owned ? 'owned' : ''}" data-equip="${eq.id}">
            <span class="quality-label ${q}">${QUALITY_NAMES[q]}</span>
            <div class="item-icon">${eq.icon}</div><div class="item-name">${eq.name}</div>
            <div class="item-stats">${stats.join(' ')}</div>
            <div class="item-desc">${eq.desc}${locked ? ` (需${REALMS[eq.realmReq].name})` : ''}</div>
            <div class="item-price">${owned ? '已拥有' : eq.price + ' 灵石'}</div></div>`;
        }
        html += '</div>';
      }
      panel.innerHTML = html;

      panel.querySelectorAll('[data-item]').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.buy(el.dataset.item)) { showToast('购买成功！', 'success'); this.renderShopPanel(); this.renderStatusBar(); }
          else showToast('灵石不足！', 'error');
        });
      });
      panel.querySelectorAll('[data-equip]:not(.locked):not(.owned)').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.buyEquip(el.dataset.equip)) { showToast('购买成功！', 'success'); this.renderShopPanel(); this.renderStatusBar(); }
          else showToast('灵石不足或境界不够！', 'error');
        });
      });
    }

    // --- 背包面板 ---
    renderInventoryPanel() {
      const panel = document.getElementById('panel-inventory');
      const d = this.game.data;

      let equipHTML = '<div class="equipment-area"><div class="equip-slots">';
      for (const slot of EQUIP_SLOTS) {
        const eqId = d.equipment[slot];
        const eq = eqId ? EQUIPMENT_MAP[eqId] : null;
        const enhLvl = eqId && d.enhanceLevels ? (d.enhanceLevels[eqId] || 0) : 0;
        const enhText = enhLvl > 0 ? `+${enhLvl}` : '';
        equipHTML += `<div class="equip-slot ${eq ? 'equipped' : ''} ${eq ? 'quality-' + eq.quality : ''}" data-slot="${slot}"><div class="equip-slot-icon">${eq ? eq.icon : SLOT_ICONS[slot]}</div><div>${eq ? this.game.getEnhancedEquipName(eqId) : SLOT_NAMES[slot]}</div>${eq ? `<button class="btn btn-outline btn-xs enhance-btn" data-enhance="${eqId}">强化${enhText}</button>` : ''}</div>`;
      }
      equipHTML += '</div><div style="flex:1;"><h4 style="color:var(--gold);margin-bottom:8px;">装备</h4>';
      if (d.ownedEquips.length === 0) {
        equipHTML += '<p style="color:var(--text-muted);font-size:0.85rem;">暂无装备</p>';
      } else {
        equipHTML += '<div class="inventory-grid">';
        d.ownedEquips.forEach((eqId, idx) => {
          const eq = EQUIPMENT_MAP[eqId];
          if (!eq) return;
          equipHTML += `<div class="inv-item quality-${eq.quality}" data-equip-idx="${idx}" data-equip-id="${eqId}"><span class="quality-label ${eq.quality}">${QUALITY_NAMES[eq.quality]}</span><div class="item-icon">${eq.icon}</div><div class="item-name">${eq.name}</div><div class="item-desc">${eq.desc}</div></div>`;
        });
        equipHTML += '</div>';
      }
      equipHTML += '</div></div>';

      let matHTML = '<h4 style="color:var(--gold);margin:20px 0 8px;">材料</h4><div class="inventory-grid">';
      for (const [id, mat] of Object.entries(MATERIALS)) {
        matHTML += `<div class="inv-item" data-sell="${id}"><div class="item-icon">${mat.icon}</div><div class="item-name">${mat.name}</div><div class="item-count">x${d.inventory[id] || 0}</div></div>`;
      }
      matHTML += '</div>';

      let pillHTML = '<h4 style="color:var(--gold);margin:20px 0 8px;">丹药</h4><div class="inventory-grid">';
      for (const recipe of RECIPES) {
        const count = d.pills[recipe.id] || 0;
        if (count === 0) continue;
        pillHTML += `<div class="inv-item" data-use-pill="${recipe.id}"><div class="item-icon">💊</div><div class="item-name">${recipe.name}</div><div class="item-desc">${recipe.desc}</div><div class="item-count">x${count}</div></div>`;
      }
      pillHTML += '</div>';

      panel.innerHTML = equipHTML + matHTML + pillHTML;

      panel.querySelectorAll('[data-equip-id]').forEach(el => {
        el.addEventListener('click', () => { if (this.game.equip(el.dataset.equipId)) { showToast('装备成功！', 'success'); this.renderInventoryPanel(); this.renderStatusBar(); } });
      });
      panel.querySelectorAll('.equip-slot.equipped').forEach(el => {
        el.addEventListener('click', () => { if (this.game.unequip(el.dataset.slot)) { showToast('已卸下装备', 'info'); this.renderInventoryPanel(); this.renderStatusBar(); } });
      });
      panel.querySelectorAll('[data-sell]').forEach(el => {
        el.addEventListener('click', () => { if (this.game.sell(el.dataset.sell)) { showToast('出售成功', 'success'); this.renderInventoryPanel(); this.renderStatusBar(); } else showToast('没有可出售的', 'error'); });
      });
      panel.querySelectorAll('.enhance-btn').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const equipId = el.dataset.enhance;
          this.showEnhancePanel(equipId);
        });
      });
      panel.querySelectorAll('[data-use-pill]').forEach(el => {
        el.addEventListener('click', () => {
          const pillId = el.dataset.usePill;
          const recipe = RECIPES_MAP[pillId];
          if (!recipe || !d.pills[pillId] || d.pills[pillId] <= 0) return;
          const eff = recipe.effect;
          if (eff.type === 'heal') { const heal = Math.floor(d.maxHp * eff.value); d.hp = Math.min(d.maxHp, d.hp + heal); d.pills[pillId]--; showToast(`恢复 ${heal} 生命`, 'success'); }
          else if (eff.type === 'exp') { d.exp += eff.value; d.totalExp += eff.value; d.pills[pillId]--; showToast(`获得 ${eff.value} 修为`, 'success'); }
          else if (eff.type === 'restore_spirit') { const gain = Math.floor(d.maxSpirit * eff.value); d.spirit = Math.min(d.maxSpirit, d.spirit + gain); d.pills[pillId]--; showToast(`恢复 ${gain} 灵力`, 'success'); }
          else if (eff.type === 'insight') { d.insight = (d.insight || 0) + eff.value; d.pills[pillId]--; showToast(`悟道 +${eff.value}`, 'success'); }
          else if (eff.type === 'speed_boost') { this.game.speedBoostEnd = Date.now() + eff.duration * 1000; d.pills[pillId]--; showToast(`修炼速度提升${eff.duration}秒！`, 'success'); }
          else if (eff.type === 'break_bonus') { showToast('突破丹药会在尝试突破时自动使用', 'info'); return; }
          else { showToast('此丹药需在战斗中使用', 'info'); return; }
          this.game.save(); this.renderInventoryPanel(); this.renderStatusBar();
        });
      });
    }

    // --- 成就面板 ---
    renderAchievementPanel() {
      const panel = document.getElementById('panel-achievement');
      const d = this.game.data;
      const categories = { battle: '战斗成就', cultivation: '修炼成就', alchemy: '炼丹成就', explore: '探索成就' };
      let html = '';
      for (const [cat, title] of Object.entries(categories)) {
        html += `<h4 class="ach-category-title">${title}</h4><div class="achievement-grid">`;
        for (const ach of ACHIEVEMENTS.filter(a => a.category === cat)) {
          const done = d.achievements.includes(ach.id);
          html += `<div class="achievement-card ${done ? 'completed' : 'locked'}">
            <div class="ach-icon">${ach.icon}</div><div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.desc}</div>
            <div class="ach-reward">奖励: ${ach.reward.gold || 0}灵石 ${ach.reward.exp || 0}修为</div>
            ${done ? '<div class="ach-status">✅ 已达成</div>' : ''}
          </div>`;
        }
        html += '</div>';
      }

      // 称号系统
      html += '<h4 class="ach-category-title" style="margin-top:24px;">称号（点击装备/卸下）</h4>';
      html += `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">当前称号：<strong style="color:var(--gold);">${d.activeTitle ? TITLES_MAP[d.activeTitle]?.name || '无' : '无'}</strong>（同时只能佩戴1个称号）</p>`;
      html += '<div class="title-grid">';
      for (const title of TITLES) {
        const unlocked = (d.unlockedTitles || []).includes(title.id);
        const equipped = d.activeTitle === title.id;
        html += `<div class="title-card ${equipped ? 'equipped' : ''} ${unlocked ? '' : 'locked'}" data-title="${title.id}">
          <div class="title-name">${title.name}</div>
          <div class="title-condition">${title.desc}</div>
          <div class="title-bonus">${title.bonusDesc}</div>
          ${equipped ? '<div style="font-size:0.65rem;color:var(--gold);margin-top:4px;">已装备</div>' : (unlocked ? '<div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;">点击装备</div>' : '<div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;">未解锁</div>')}
        </div>`;
      }
      html += '</div>';

      panel.innerHTML = html;

      // Bind title events
      panel.querySelectorAll('.title-card:not(.locked)').forEach(el => {
        el.addEventListener('click', () => {
          const titleId = el.dataset.title;
          if (d.activeTitle === titleId) {
            this.game.setActiveTitle(null);
            showToast('已卸下称号', 'info');
          } else {
            this.game.setActiveTitle(titleId);
            showToast('已装备称号！', 'success');
          }
          this.renderAchievementPanel();
          this.renderStatusBar();
        });
      });
    }

    // --- 装备强化面板 ---
    showEnhancePanel(equipId) {
      const eq = EQUIPMENT_MAP[equipId];
      if (!eq) return;
      const d = this.game.data;
      const currentLvl = d.enhanceLevels[equipId] || 0;
      const nextLvl = currentLvl + 1;
      const canEnhance = this.game.canEnhance(equipId);

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';

      let costHTML = '';
      if (nextLvl <= ENHANCE_CONFIG.maxLevel) {
        const cost = ENHANCE_CONFIG.costs[nextLvl];
        const rate = Math.floor(ENHANCE_CONFIG.rates[nextLvl] * 100);
        costHTML = `<div class="enhance-cost"><p>强化到 +${nextLvl} 需要：</p><ul>
          <li class="${d.gold >= cost.gold ? 'has' : 'missing'}">灵石: ${cost.gold} (拥有:${d.gold})</li>
          ${cost.ore ? `<li class="${(d.inventory.ore||0) >= cost.ore ? 'has' : 'missing'}">灵矿: ${cost.ore} (拥有:${d.inventory.ore||0})</li>` : ''}
          ${cost.crystal ? `<li class="${(d.inventory.crystal||0) >= cost.crystal ? 'has' : 'missing'}">灵石: ${cost.crystal} (拥有:${d.inventory.crystal||0})</li>` : ''}
          ${cost.beast_core ? `<li class="${(d.inventory.beast_core||0) >= cost.beast_core ? 'has' : 'missing'}">兽核: ${cost.beast_core} (拥有:${d.inventory.beast_core||0})</li>` : ''}
        </ul><p>成功率：${rate}%</p><p>属性加成：+${Math.floor(ENHANCE_CONFIG.bonusPerLevel * 100 * nextLvl)}%</p></div>`;
      } else {
        costHTML = '<p style="color:var(--gold);">已达最高强化等级！</p>';
      }

      overlay.innerHTML = `<div class="event-modal"><div class="event-icon">${eq.icon}</div>
        <div class="event-title">${this.game.getEnhancedEquipName(equipId)} 强化</div>
        <div class="event-desc">当前等级：+${currentLvl}</div>
        ${costHTML}
        <div class="event-choices">
          ${canEnhance ? '<button class="event-choice-btn" id="btn-do-enhance">强化！</button>' : ''}
          <button class="event-choice-btn" id="btn-close-enhance">关闭</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#btn-close-enhance').addEventListener('click', () => overlay.remove());
      const enhBtn = overlay.querySelector('#btn-do-enhance');
      if (enhBtn) {
        enhBtn.addEventListener('click', () => {
          const result = this.game.enhanceEquip(equipId);
          if (result.success) {
            Effects.screenFlash('rgba(255, 215, 0, 0.3)', 400);
            Effects.particleExplosion(overlay.querySelector('.event-modal'), 30, ['#ffd700', '#ffaa00']);
            showToast(`强化成功！+${result.level}`, 'success');
          } else {
            Effects.screenShake(overlay.querySelector('.event-modal'), 1, 400);
            showToast(result.reason, 'error');
          }
          overlay.remove();
          this.renderInventoryPanel();
          this.renderStatusBar();
        });
      }
    }

    // --- 灵宠面板 ---
    renderPetPanel() {
      const panel = document.getElementById('panel-pet');
      if (!panel) return;
      const d = this.game.data;

      let html = '<h3 style="color:var(--gold);margin-bottom:16px;">灵宠</h3>';

      if (d.pets.length === 0) {
        html += '<div class="pet-empty"><p style="color:var(--text-muted);">暂无灵宠</p><p style="font-size:0.8rem;color:var(--text-muted);">击败怪物后有概率捕获灵宠</p></div>';
      } else {
        html += '<div class="pet-grid">';
        d.pets.forEach((pet, idx) => {
          const isActive = d.activePet === idx;
          const expToNext = pet.level * 50;
          const expPct = Math.min(100, (pet.exp / expToNext) * 100);
          const evos = PET_EVOLUTION[pet.templateId] || [];
          const nextEvo = evos.find((e, i) => i >= pet.evolution);
          const affinity = pet.affinity || 0;
          const affinityPct = (affinity / CAPTURE_CONFIG.affinityMax) * 100;
          const skill = PET_SKILLS[pet.templateId];
          const hasSkill = skill && pet.level >= 5;
          html += `<div class="pet-card ${isActive ? 'active' : ''}">
            <div class="pet-icon">${pet.icon}</div>
            <div class="pet-name">${pet.name} Lv.${pet.level}</div>
            <div class="pet-stats">
              <span>攻:${pet.atk}</span><span>防:${pet.def}</span><span>血:${pet.hp}</span>
            </div>
            <div class="affinity-text">亲密度：${affinity}/${CAPTURE_CONFIG.affinityMax}</div>
            <div class="affinity-bar"><div class="affinity-fill" style="width:${affinityPct}%"></div></div>
            <div class="pet-exp-bar"><div class="pet-exp-fill" style="width:${expPct}%"></div></div>
            <div class="pet-exp-text">EXP: ${pet.exp}/${expToNext}</div>
            ${hasSkill ? `<div class="pet-skill-info">技能：${skill.name} (${skill.desc}) CD:${skill.cooldown}回合</div>` : `<div class="pet-skill-info" style="opacity:0.5;">Lv.5解锁技能${skill ? '：' + skill.name : ''}</div>`}
            ${nextEvo ? `<div class="pet-evo-hint">Lv.${nextEvo.lvl}可进化为${nextEvo.name}</div>` : '<div class="pet-evo-hint" style="color:var(--gold);">已完全进化</div>'}
            <div class="pet-actions">
              ${isActive ? '<button class="btn btn-outline btn-xs" data-pet-unset="true">收回</button>' : `<button class="btn btn-cyan btn-xs" data-pet-active="${idx}">出战</button>`}
              <button class="btn btn-outline btn-xs" data-pet-feed="${idx}">喂养(兽核x1)</button>
              <button class="btn btn-outline btn-xs" data-pet-release="${idx}" style="color:var(--red);">放生</button>
            </div>
          </div>`;
        });
        html += '</div>';
      }

      html += `<div class="pet-info-text"><p style="font-size:0.8rem;color:var(--text-muted);margin-top:16px;">• 战斗中怪物HP<50%时可主动捕捉灵宠（最多6只）</p>
        <p style="font-size:0.8rem;color:var(--text-muted);">• 出战灵宠会在战斗中自动攻击并获得经验，Lv.5解锁技能</p>
        <p style="font-size:0.8rem;color:var(--text-muted);">• 喂养和战斗可提升亲密度，亲密度影响属性加成比例</p>
        <p style="font-size:0.8rem;color:var(--text-muted);">• 捕灵符可在商店购买或炼丹炉制作，提高捕捉成功率</p></div>`;

      panel.innerHTML = html;

      // Bind events
      panel.querySelectorAll('[data-pet-active]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.setActivePet(parseInt(btn.dataset.petActive));
          showToast('灵宠出战！', 'success');
          this.renderPetPanel();
          this.renderStatusBar();
        });
      });
      panel.querySelectorAll('[data-pet-unset]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.setActivePet(null);
          showToast('灵宠已收回', 'info');
          this.renderPetPanel();
          this.renderStatusBar();
        });
      });
      panel.querySelectorAll('[data-pet-feed]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.petFeed);
          if (this.game.feedPet(idx)) {
            showToast('喂养成功！属性提升！', 'success');
            this.renderPetPanel();
          } else {
            showToast('兽核不足！', 'error');
          }
        });
      });
      panel.querySelectorAll('[data-pet-release]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.petRelease);
          if (confirm('确定放生这只灵宠？')) {
            this.game.releasePet(idx);
            showToast('已放生', 'info');
            this.renderPetPanel();
            this.renderStatusBar();
          }
        });
      });
    }

    // --- 功法面板 ---
    renderTechniquePanel() {
      const panel = document.getElementById('panel-technique');
      if (!panel) return;
      const d = this.game.data;
      const types = { attack: '攻击功法', defense: '防御功法', cultivate: '修炼功法', support: '辅助功法' };

      let html = '<h3 style="color:var(--gold);margin-bottom:16px;">功法</h3>';
      html += `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">当前装备：<strong style="color:var(--gold);">${d.activeTechnique ? TECHNIQUES_MAP[d.activeTechnique]?.name || '无' : '无'}</strong> | 灵石：${formatNumber(d.gold)}</p>`;

      for (const [type, title] of Object.entries(types)) {
        const branchCount = this.game.getTechBranchCount(type);
        const branchMax = 3;
        html += `<h4 class="shop-section-title">${title} <span style="font-size:0.75rem;color:${branchCount >= branchMax ? 'var(--red)' : 'var(--text-muted)'};font-weight:normal">(${branchCount}/${branchMax})</span></h4><div class="shop-grid">`;
        for (const tech of TECHNIQUES.filter(t => t.type === type)) {
          const learned = d.learnedTechniques.includes(tech.id);
          const active = d.activeTechnique === tech.id;
          const locked = d.realm < tech.realmReq;
          const branchFull = !learned && branchCount >= branchMax;
          const aff = getTechniqueAffinity(d.spiritRoot, tech);
          const affColor = aff.relation === 'same' || aff.relation === 'gen' || aff.relation === 'chaos' ? 'var(--green)'
            : (aff.relation && aff.relation.indexOf('ctrl') === 0 ? 'var(--red)' : 'var(--text-muted)');
          html += `<div class="shop-item ${locked || branchFull ? 'locked' : ''} ${active ? 'owned' : ''}" data-tech="${tech.id}">
            <div class="item-icon">${tech.icon}</div>
            <div class="item-name">${tech.name}</div>
            <div class="item-desc">${tech.desc}<div style="margin-top:6px;font-size:0.75rem;color:var(--text-muted);">灵根相性：<span style="color:${affColor};font-weight:700;">${aff.label}</span></div></div>
            <div class="item-price">${learned ? (active ? '使用中' : '已学习') : (locked ? '需' + REALMS[tech.realmReq].name : branchFull ? '已满3/3' : tech.cost + ' 灵石')}</div>
          </div>`;
        }
        html += '</div>';
      }

      panel.innerHTML = html;

      panel.querySelectorAll('[data-tech]').forEach(el => {
        el.addEventListener('click', () => {
          const techId = el.dataset.tech;
          const learned = d.learnedTechniques.includes(techId);
          if (learned) {
            if (d.activeTechnique === techId) {
              this.game.setActiveTechnique(null);
              showToast('已卸下功法', 'info');
            } else {
              this.game.setActiveTechnique(techId);
              const tech = TECHNIQUES_MAP[techId];
              const aff = tech ? getTechniqueAffinity(d.spiritRoot, tech) : null;
              if (aff && aff.relation && aff.relation.indexOf('ctrl') === 0) {
                showToast('已装备功法（相克：突破更易走火入魔）', 'info', 4500);
              } else if (aff && aff.label && aff.label !== '—') {
                showToast(`已装备功法（${aff.label}）`, 'success');
              } else {
                showToast('已装备功法！', 'success');
              }
            }
            this.renderTechniquePanel();
            this.renderStatusBar();
          } else {
            if (this.game.canLearnTechnique(techId)) {
              if (this.game.learnTechnique(techId)) {
                showToast('学习成功！', 'success');
                this.renderTechniquePanel();
                this.renderStatusBar();
              }
            } else {
              const tech = TECHNIQUES_MAP[techId];
              if (tech && this.game.getTechBranchCount(tech.type) >= 3) {
                showToast('该分支已学满3个功法！', 'error');
              } else {
                showToast('灵石不足或境界不够！', 'error');
              }
            }
          }
        });
      });
    }

    // --- 宗门面板 ---
    renderSectPanel() {
      const panel = document.getElementById('panel-sect');
      if (!panel) return;
      const d = this.game.data;
      const sect = SECTS_MAP[d.sect];
      const contribution = d.sectContribution || 0;
      const sectExp = d.sectExp || 0;

      let html = `<h3 style="color:var(--gold);margin-bottom:4px;">${sect.icon} ${sect.name} - 宗门</h3>`;
      html += `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">
        宗门经验：<strong style="color:var(--cyan);">${sectExp}</strong>
        <span style="margin:0 6px;color:var(--text-muted);">|</span>
        贡献值：<strong style="color:var(--gold);">${contribution}</strong>
      </p>`;
      html += '<div class="sect-panel-grid">';

      // 1. 捐赠区域
      html += '<div class="sect-section"><div class="sect-section-title">捐赠资源</div><div class="donate-grid">';
      for (const opt of SECT_DONATION_OPTIONS) {
        let costText = '';
        if (opt.cost.gold) costText = `${opt.cost.gold}灵石`;
        else if (opt.cost.herb) costText = `灵草x${opt.cost.herb}`;
        else if (opt.cost.crystal) costText = `灵石x${opt.cost.crystal}`;
        else if (opt.cost.beast_core) costText = `兽核x${opt.cost.beast_core}`;
        else if (opt.cost.ore) costText = `灵矿x${opt.cost.ore}`;
        html += `<div class="donate-item" data-donate="${opt.id}"><div>${opt.name}</div><div class="donate-cost">${costText}</div><div class="donate-gain">+${opt.contribution}贡献</div></div>`;
      }
      html += '</div></div>';

      // 2. 宗门商店
      const shopItems = SECT_SHOP_ITEMS[d.sect] || [];
      html += '<div class="sect-section"><div class="sect-section-title">宗门商店</div><div class="sect-shop-grid">';
      for (const item of shopItems) {
        const purchased = item.type === 'perm' && d.sectShopPurchased.includes(item.id);
        html += `<div class="sect-shop-item ${purchased ? 'purchased' : ''}" data-sect-buy="${item.id}">
          <div style="font-size:0.9rem;color:var(--gold);font-weight:bold;">${item.name}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin:4px 0;">${item.desc}</div>
          <div style="font-size:0.8rem;color:var(--cyan);">${purchased ? '已购买' : item.cost + '贡献'}</div>
        </div>`;
      }
      html += '</div></div>';

      // 3. 修炼室
      html += '<div class="sect-section"><div class="sect-section-title">修炼室</div>';
      const trainingActive = d.sectTrainingEnd && Date.now() < d.sectTrainingEnd;
      if (trainingActive) {
        const remain = Math.ceil((d.sectTrainingEnd - Date.now()) / 1000);
        const mins = Math.floor(remain / 60);
        const secs = remain % 60;
        html += `<div class="training-active">
          <div style="font-size:0.85rem;color:var(--text-secondary);">修炼中...</div>
          <div class="training-timer">${mins}:${secs.toString().padStart(2, '0')}</div>
          <div class="training-mul">经验倍率：${d.sectTrainingMul}x</div>
        </div>`;
      } else {
        html += '<div class="training-options">';
        for (let i = 0; i < SECT_TRAINING_CONFIG.length; i++) {
          const cfg = SECT_TRAINING_CONFIG[i];
          const mins = Math.floor(cfg.duration / 60);
          const durText = mins >= 1 ? `${mins}分钟` : `${cfg.duration}秒`;
          html += `<div class="training-card" data-train="${i}">
            <div style="font-size:0.9rem;color:var(--gold);font-weight:bold;">${cfg.name}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin:4px 0;">时长：${durText} | 倍率：${cfg.multiplier}x</div>
            <div style="font-size:0.8rem;color:var(--cyan);">${cfg.cost}贡献</div>
          </div>`;
        }
        html += '</div>';
      }
      html += '</div>';

      // 4. 宗门大比
      html += '<div class="sect-section"><div class="sect-section-title">宗门大比</div>';
      const today = new Date().toDateString();
      if (d.tournamentFightDate !== today) { d.tournamentDailyFights = 0; d.tournamentFightDate = today; }
      const fightsLeft = SECT_TOURNAMENT_CONFIG.dailyFights - (d.tournamentDailyFights || 0);
      html += `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">今日剩余挑战：${fightsLeft}/${SECT_TOURNAMENT_CONFIG.dailyFights} | 最高战胜：第${d.tournamentBestRank || 0}名 | 每次消耗${SECT_TOURNAMENT_CONFIG.entryCost}贡献</p>`;
      html += '<div class="tournament-grid">';
      for (const npc of SECT_TOURNAMENT_CONFIG.npcs) {
        const defeated = (d.tournamentBestRank || 0) >= npc.rank;
        const canFight = this.game.canTournamentFight() && (!defeated || true);
        html += `<div class="tournament-npc ${defeated ? 'defeated' : ''}" data-tournament="${npc.rank - 1}">
          <div class="npc-rank">第${npc.rank}名</div>
          <div style="font-size:1.2rem;">${npc.icon}</div>
          <div class="npc-name">${npc.name}</div>
          <div class="npc-reward">+${npc.rewardContribution}贡献 +${npc.rewardGold}灵石</div>
          ${defeated ? '<div style="font-size:0.65rem;color:var(--green);">已击败</div>' : ''}
        </div>`;
      }
      html += '</div></div>';

      html += '</div>';
      panel.innerHTML = html;

      // Bind donate
      panel.querySelectorAll('[data-donate]').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.donateSect(el.dataset.donate)) {
            showToast('捐赠成功！', 'success');
            this.renderSectPanel();
            this.renderStatusBar();
          } else {
            showToast('资源不足！', 'error');
          }
        });
      });

      // Bind sect shop
      panel.querySelectorAll('.sect-shop-item:not(.purchased)').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.buySectShop(el.dataset.sectBuy)) {
            showToast('购买成功！', 'success');
            this.renderSectPanel();
            this.renderStatusBar();
          } else {
            showToast('贡献不足！', 'error');
          }
        });
      });

      // Bind training
      panel.querySelectorAll('[data-train]').forEach(el => {
        el.addEventListener('click', () => {
          const tier = parseInt(el.dataset.train);
          if (this.game.enterSectTraining(tier)) {
            showToast('开始修炼！', 'success');
            this.renderSectPanel();
          } else {
            showToast('贡献不足或正在修炼中！', 'error');
          }
        });
      });

      // Bind tournament
      panel.querySelectorAll('[data-tournament]').forEach(el => {
        el.addEventListener('click', () => {
          const rank = parseInt(el.dataset.tournament);
          if (!this.game.canTournamentFight()) {
            showToast('今日挑战次数用尽或贡献不足！', 'error');
            return;
          }
          const result = this.game.doTournamentFight(rank);
          if (result) {
            this.showTournamentResult(result);
          }
        });
      });
    }

    showTournamentResult(result) {
      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';
      overlay.innerHTML = `<div class="event-modal">
        <div class="event-icon">${result.won ? '🏆' : '💔'}</div>
        <div class="event-title">${result.won ? '挑战成功！' : '挑战失败...'}</div>
        <div class="event-desc">
          对手：${result.npc.icon} ${result.npc.name}<br>
          ${result.won ? `获得 ${result.rewardContribution}贡献 + ${result.rewardGold}灵石` : '再接再厉！'}
        </div>
        <div style="max-height:200px;overflow-y:auto;font-size:0.75rem;color:var(--text-muted);margin:12px 0;text-align:left;">
          ${result.log.map(l => `<div>${l}</div>`).join('')}
        </div>
        <div class="event-choices">
          <button class="event-choice-btn" id="btn-tournament-close">确定</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#btn-tournament-close').addEventListener('click', () => {
        overlay.remove();
        this.renderSectPanel();
        this.renderStatusBar();
      });
    }

    // --- 图鉴面板 ---
    renderBestiaryPanel() {
      const panel = document.getElementById('panel-bestiary');
      if (!panel) return;
      const d = this.game.data;
      const bestiary = d.bestiary || { monsters: {}, petsFound: [], equipsFound: [] };

      let activeTab = panel.dataset.bestiaryTab || 'monsters';

      const renderContent = () => {
        let html = '<h3 style="color:var(--gold);margin-bottom:16px;">图鉴</h3>';
        html += '<div class="bestiary-tabs">';
        html += `<div class="bestiary-tab ${activeTab === 'monsters' ? 'active' : ''}" data-btab="monsters">怪物</div>`;
        html += `<div class="bestiary-tab ${activeTab === 'pets' ? 'active' : ''}" data-btab="pets">灵宠</div>`;
        html += `<div class="bestiary-tab ${activeTab === 'equips' ? 'active' : ''}" data-btab="equips">装备</div>`;
        html += '</div>';

        if (activeTab === 'monsters') {
          const total = Object.keys(MONSTERS).length;
          const found = Object.keys(bestiary.monsters).length;
          html += `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">已发现：${found}/${total}</p>`;
          html += '<div class="bestiary-grid">';
          for (const [id, m] of Object.entries(MONSTERS)) {
            const record = bestiary.monsters[id];
            if (record) {
              html += `<div class="bestiary-card"><div class="bestiary-icon">${m.icon}</div><div class="bestiary-name">${m.name}</div><div class="bestiary-info">击杀：${record.kills}</div></div>`;
            } else {
              html += `<div class="bestiary-card undiscovered"><div class="bestiary-icon">❓</div><div class="bestiary-name">???</div><div class="bestiary-info">未发现</div></div>`;
            }
          }
          html += '</div>';
        } else if (activeTab === 'pets') {
          const total = PET_TEMPLATES.length;
          const found = bestiary.petsFound.length;
          html += `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">已发现：${found}/${total}</p>`;
          html += '<div class="bestiary-grid">';
          for (const pet of PET_TEMPLATES) {
            if (bestiary.petsFound.includes(pet.id)) {
              html += `<div class="bestiary-card"><div class="bestiary-icon">${pet.icon}</div><div class="bestiary-name">${pet.name}</div><div class="bestiary-info">攻${pet.baseAtk} 防${pet.baseDef}</div></div>`;
            } else {
              html += `<div class="bestiary-card undiscovered"><div class="bestiary-icon">❓</div><div class="bestiary-name">???</div><div class="bestiary-info">未捕获</div></div>`;
            }
          }
          html += '</div>';
        } else if (activeTab === 'equips') {
          const total = EQUIPMENT.length;
          const found = bestiary.equipsFound.length;
          html += `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">已发现：${found}/${total}</p>`;
          html += '<div class="bestiary-grid">';
          for (const eq of EQUIPMENT) {
            if (bestiary.equipsFound.includes(eq.id)) {
              html += `<div class="bestiary-card"><div class="bestiary-icon">${eq.icon}</div><div class="bestiary-name">${eq.name}</div><div class="bestiary-info">${eq.atk ? '攻+' + eq.atk : ''}${eq.def ? ' 防+' + eq.def : ''}${eq.hp ? ' 血+' + eq.hp : ''}</div></div>`;
            } else {
              html += `<div class="bestiary-card undiscovered"><div class="bestiary-icon">❓</div><div class="bestiary-name">???</div><div class="bestiary-info">未拥有</div></div>`;
            }
          }
          html += '</div>';
        }

        panel.innerHTML = html;

        // Bind tab clicks
        panel.querySelectorAll('[data-btab]').forEach(tab => {
          tab.addEventListener('click', () => {
            activeTab = tab.dataset.btab;
            panel.dataset.bestiaryTab = activeTab;
            renderContent();
          });
        });
      };

      renderContent();
    }

    // --- 秘境探索 (in battle panel) ---
    renderSecretRealmButton(panel) {
      const check = this.game.canEnterSecretRealm();
      return `<div class="secret-realm-entry">
        <button class="btn ${check.can ? 'btn-gold' : 'btn-outline'} btn-sm" id="btn-secret-realm" aria-disabled="${check.can ? 'false' : 'true'}" ${check.can ? '' : `data-disabled-reason="${check.reason}"`}>
          秘境探索 (${SECRET_REALM.entryCost}灵石)
        </button>
        ${!check.can ? `<span class="sr-hint">${check.reason}</span>` : ''}
        <span class="sr-best">最高：${this.game.data.secretRealmBestFloor || 0}层</span>
      </div>`;
    }

    _showMeditationMinigame() {
      const game = this.game;
      const baseRate = game.getExpRate();
      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';

      // Minigame state
      const mg = {
        circles: [],
        score: 0,
        perfect: 0,
        good: 0,
        miss: 0,
        combo: 0,
        maxCombo: 0,
        totalSpawned: 0,
        maxCircles: 20,
        spawnTimer: null,
        active: true,
        multiplier: 1,
        expEarned: 0,
        insightEarned: 0,
      };

      const render = () => {
        overlay.innerHTML = `<div class="event-modal" style="max-width:480px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
            <h3 style="color:var(--gold);margin:0;">灵气吐纳</h3>
            <button class="btn btn-outline btn-sm" id="med-exit" style="padding:4px 10px;">✕</button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">点击灵气光环当其到达最佳区域（金色圈内），获得修炼加成</p>
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">
            <span>得分: <strong style="color:var(--gold);">${mg.score}</strong></span>
            <span>连击: <strong style="color:var(--cyan);">${mg.combo}</strong></span>
            <span>倍率: <strong style="color:#ff6699;">x${mg.multiplier.toFixed(1)}</strong></span>
            <span>进度: ${mg.totalSpawned}/${mg.maxCircles}</span>
          </div>
          <div class="meditation-arena" id="med-arena" style="position:relative;width:100%;height:260px;background:radial-gradient(circle,rgba(74,218,212,0.05) 0%,rgba(13,17,23,0.4) 70%);border-radius:var(--radius-md);border:1px solid var(--border-color);overflow:hidden;cursor:pointer;"></div>
          <div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);text-align:center;" id="med-feedback"></div>
        </div>`;
        if (!overlay.isConnected) document.body.appendChild(overlay);

        overlay.querySelector('#med-exit')?.addEventListener('click', () => {
          mg.active = false;
          if (mg.spawnTimer) clearTimeout(mg.spawnTimer);
          overlay.remove();
          this.renderCultivatePanel();
        });

        const arena = overlay.querySelector('#med-arena');
        let spawnCount = 0;

        const spawnCircle = () => {
          if (!mg.active || spawnCount >= mg.maxCircles) {
            if (mg.circles.length === 0) endMinigame();
            return;
          }
          spawnCount++;
          mg.totalSpawned = spawnCount;

          const x = 40 + Math.random() * (arena.offsetWidth - 80);
          const y = 40 + Math.random() * (arena.offsetHeight - 80);

          const circle = document.createElement('div');
          circle.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:60px;height:60px;transform:translate(-50%,-50%);pointer-events:none;`;
          circle.innerHTML = `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid var(--gold);opacity:0.6;"></div>
            <div class="med-ring" style="position:absolute;inset:-15px;border-radius:50%;border:2px solid rgba(74,218,212,0.8);animation:med-shrink 1.8s linear forwards;"></div>`;
          arena.appendChild(circle);

          const circleData = { el: circle, x, y, spawnTime: Date.now(), duration: 1800, hit: false };
          mg.circles.push(circleData);

          // Clickable area over the circle
          const hitArea = document.createElement('div');
          hitArea.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:80px;height:80px;transform:translate(-50%,-50%);cursor:pointer;z-index:2;`;
          hitArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (circleData.hit) return;
            circleData.hit = true;
            const elapsed = Date.now() - circleData.spawnTime;
            const ratio = elapsed / circleData.duration;
            // Perfect: ring is near the golden circle (0.7-0.9 ratio)
            // Good: ring is close (0.5-0.7 or 0.9-1.0)
            let result, points, color;
            if (ratio >= 0.65 && ratio <= 0.90) {
              result = '完美！'; points = 100; color = '#ffd700';
              mg.perfect++;
              mg.multiplier = Math.min(3, mg.multiplier + 0.2);
            } else if (ratio >= 0.45 && ratio < 0.65 || ratio > 0.90 && ratio <= 1.0) {
              result = '良好'; points = 50; color = '#4adad4';
              mg.good++;
              mg.multiplier = Math.min(3, mg.multiplier + 0.05);
            } else {
              result = '过早'; points = 10; color = '#888';
              mg.combo = 0;
              mg.multiplier = Math.max(1, mg.multiplier - 0.3);
            }
            if (points >= 50) {
              mg.combo++;
              mg.maxCombo = Math.max(mg.maxCombo, mg.combo);
            }
            mg.score += Math.floor(points * mg.multiplier);

            // Visual feedback
            circle.innerHTML = `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.4;animation:med-pop 0.3s ease-out forwards;"></div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;color:${color};">${result}</div>`;
            hitArea.remove();
            setTimeout(() => { circle.remove(); mg.circles = mg.circles.filter(c => c !== circleData); if (spawnCount >= mg.maxCircles && mg.circles.length === 0) endMinigame(); }, 500);
            updateHUD();
          });
          arena.appendChild(hitArea);

          // Auto-miss after duration
          setTimeout(() => {
            if (!circleData.hit && mg.active) {
              circleData.hit = true;
              mg.miss++;
              mg.combo = 0;
              mg.multiplier = Math.max(1, mg.multiplier - 0.4);
              circle.innerHTML = `<div style="position:absolute;inset:0;border-radius:50%;background:#ff4444;opacity:0.3;"></div>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#ff4444;">失误</div>`;
              hitArea.remove();
              setTimeout(() => { circle.remove(); mg.circles = mg.circles.filter(c => c !== circleData); if (spawnCount >= mg.maxCircles && mg.circles.length === 0) endMinigame(); }, 400);
              updateHUD();
            }
          }, circleData.duration + 200);

          // Schedule next spawn
          const nextDelay = 600 + Math.random() * 800;
          mg.spawnTimer = setTimeout(spawnCircle, nextDelay);
        };

        const updateHUD = () => {
          const scoreEl = overlay.querySelector('.event-modal');
          if (!scoreEl) return;
          const infoRow = scoreEl.querySelector('div[style*="display:flex"]');
          if (infoRow) {
            infoRow.innerHTML = `<span>得分: <strong style="color:var(--gold);">${mg.score}</strong></span>
              <span>连击: <strong style="color:var(--cyan);">${mg.combo}</strong></span>
              <span>倍率: <strong style="color:#ff6699;">x${mg.multiplier.toFixed(1)}</strong></span>
              <span>进度: ${mg.totalSpawned}/${mg.maxCircles}</span>`;
          }
        };

        const endMinigame = () => {
          mg.active = false;
          if (mg.spawnTimer) clearTimeout(mg.spawnTimer);

          // Calculate rewards
          const scorePct = mg.score / (mg.maxCircles * 100);
          const expBonus = Math.floor(baseRate * 30 * (1 + scorePct));
          const insightBonus = Math.floor(5 + scorePct * 15);
          mg.expEarned = expBonus;
          mg.insightEarned = insightBonus;

          // Apply rewards
          game.data.exp += expBonus;
          game.data.totalExp += expBonus;
          game.data.insight = (game.data.insight || 0) + insightBonus;

          overlay.querySelector('.event-modal').innerHTML = `
            <h3 style="color:var(--gold);margin-bottom:12px;">吐纳完成</h3>
            <div style="font-size:0.9rem;line-height:1.8;color:var(--text-secondary);">
              <div>总得分: <strong style="color:var(--gold);">${mg.score}</strong></div>
              <div>完美: <strong style="color:#ffd700;">${mg.perfect}</strong> | 良好: <strong style="color:#4adad4;">${mg.good}</strong> | 失误: <strong style="color:#ff4444;">${mg.miss}</strong></div>
              <div>最高连击: <strong style="color:var(--cyan);">${mg.maxCombo}</strong></div>
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);">
                <div>获得修为: <strong style="color:var(--gold);">+${formatNumber(expBonus)}</strong></div>
                <div>获得悟道: <strong style="color:var(--cyan);">+${insightBonus}</strong></div>
              </div>
            </div>
            <button class="btn btn-gold btn-sm" id="med-close" style="margin-top:16px;">关闭</button>`;

          overlay.querySelector('#med-close').addEventListener('click', () => {
            overlay.remove();
            this.game.save();
            this.renderStatusBar();
            this.renderCultivatePanel();
          });
        };

        // Start spawning after a short delay
        setTimeout(spawnCircle, 800);
      };

      // Inject CSS animation if not present
      if (!document.getElementById('med-minigame-css')) {
        const style = document.createElement('style');
        style.id = 'med-minigame-css';
        style.textContent = `
          @keyframes med-shrink { from { transform: scale(1.8); opacity: 0.3; } to { transform: scale(1); opacity: 1; } }
          @keyframes med-pop { from { transform: scale(1); } to { transform: scale(1.5); opacity: 0; } }
        `;
        document.head.appendChild(style);
      }

      render();
    }

    showSecretRealm() {
      const realmState = this.game.startSecretRealm();
      if (!realmState) return;

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';

      const renderFloor = () => {
        const floorPct = ((realmState.currentFloor - 1) / 10) * 100;
        const floorConfig = SECRET_REALM.floors[realmState.currentFloor - 1];
        const isBoss = floorConfig && floorConfig.type === 'boss';
        const canAdvance = realmState.alive && realmState.currentFloor <= 10;

        let choiceButtons = '';
        if (canAdvance) {
          if (isBoss) {
            choiceButtons = '<button class="event-choice-btn" data-path="monster">⚔️ 挑战Boss</button>';
          } else {
            choiceButtons = `
              <button class="event-choice-btn" data-path="monster">⚔️ 战斗 (高奖励)</button>
              <button class="event-choice-btn" data-path="treasure">🎁 探索 (宝箱/陷阱)</button>
              <button class="event-choice-btn" data-path="event">💤 休整 (恢复+少量经验)</button>
            `;
          }
          choiceButtons += '<button class="event-choice-btn" id="btn-sr-exit">撤退</button>';
        } else {
          choiceButtons = '<button class="event-choice-btn" id="btn-sr-close">返回</button>';
        }

        overlay.innerHTML = `<div class="event-modal secret-realm-modal">
          <div class="event-title">秘境探索</div>
          <div class="sr-progress"><div class="sr-progress-fill" style="width:${floorPct}%"></div></div>
          <div class="sr-floor-text">当前层数：${realmState.currentFloor > 10 ? '通关！' : realmState.currentFloor + '/10'}</div>
          <div class="sr-log">${realmState.log.map(l => `<div class="sr-log-entry">${l}</div>`).join('')}</div>
          <div class="event-choices">${choiceButtons}</div>
        </div>`;

        overlay.querySelectorAll('[data-path]').forEach(btn => {
          btn.addEventListener('click', () => {
            realmState.chosenPath = btn.dataset.path;
            this.game.secretRealmFloor(realmState);
            renderFloor();
            this.renderStatusBar();
          });
        });
        const exitBtn = overlay.querySelector('#btn-sr-exit');
        if (exitBtn) exitBtn.addEventListener('click', () => { overlay.remove(); this.renderBattlePanel(); this.renderStatusBar(); });
        const closeBtn = overlay.querySelector('#btn-sr-close');
        if (closeBtn) closeBtn.addEventListener('click', () => { overlay.remove(); this.renderBattlePanel(); this.renderStatusBar(); });
      };

      document.body.appendChild(overlay);
      renderFloor();
    }

    // --- 宗门任务 (in cultivate panel) ---
    renderQuestBoard() {
      this.game.checkQuestReset();
      const d = this.game.data;
      if (!d.dailyQuests || d.dailyQuests.length === 0) {
        this.game.generateDailyQuests();
      }
      const quests = d.dailyQuests;
      const resetTime = new Date(d.questResetTime);
      const resetStr = `${resetTime.getHours().toString().padStart(2,'0')}:${resetTime.getMinutes().toString().padStart(2,'0')}`;

      let html = `<div class="quest-board"><h4 style="color:var(--gold);margin-bottom:12px;">宗门任务 <span style="font-size:0.7rem;color:var(--text-muted);">重置于 ${resetStr}</span></h4>`;
      html += '<div class="quest-grid">';
      for (let i = 0; i < quests.length; i++) {
        const q = quests[i];
        const pct = Math.min(100, (q.progress / q.target) * 100);
        const done = q.progress >= q.target;
        html += `<div class="quest-card ${q.claimed ? 'claimed' : done ? 'completable' : ''}">
          <div class="quest-name">${q.name}</div>
          <div class="quest-desc">${q.desc}</div>
          <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
          <div class="quest-progress-text">${q.progress}/${q.target}</div>
          <div class="quest-reward">奖励: ${q.rewardGold}灵石 ${q.rewardExp}修为 宗门经验+${q.rewardSectExp || (10 + d.realm * 5)}</div>
          ${q.claimed ? '<div class="quest-status">已领取</div>' : done ? `<button class="btn btn-gold btn-xs quest-claim-btn" data-quest="${i}">领取</button>` : ''}
        </div>`;
      }
      html += '</div></div>';
      return html;
    }

    // --- 悬赏令 (in cultivate panel) ---
    renderBountyBoard() {
      const d = this.game.data;
      let html = `<div class="quest-board" style="margin-top:16px;"><h4 style="color:var(--gold);margin-bottom:12px;">悬赏令</h4>`;

      if (d.activeBounty) {
        const b = BOUNTY_TEMPLATES.find(t => t.id === d.activeBounty);
        if (b) {
          const pct = Math.min(100, (d.bountyProgress / b.target) * 100);
          const done = d.bountyProgress >= b.target;
          html += `<div class="quest-card ${done ? 'completable' : ''}" style="margin-bottom:8px;">
            <div class="quest-name">${b.name}</div>
            <div class="quest-desc">${b.desc}</div>
            <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
            <div class="quest-progress-text">${Math.min(d.bountyProgress, b.target)}/${b.target}</div>
            <div class="quest-reward">奖励: ${b.rewardGold}灵石 ${b.rewardExp}修为</div>
            ${done ? '<button class="btn btn-gold btn-xs bounty-claim-btn">领取奖励</button>' : ''}
            <button class="btn btn-outline btn-xs bounty-abandon-btn" style="margin-left:6px;font-size:0.7rem;opacity:0.7;">放弃</button>
          </div>`;
        }
      } else {
        const choices = this.game.getBountyChoices();
        if (choices.length === 0) {
          html += '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:8px;">暂无可用悬赏</div>';
        } else {
          html += '<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">选择一个悬赏令执行：</div>';
          html += '<div class="quest-grid">';
          for (const b of choices) {
            html += `<div class="quest-card bounty-choice" data-bounty="${b.id}" style="cursor:pointer;">
              <div class="quest-name">${b.name}</div>
              <div class="quest-desc">${b.desc}</div>
              <div class="quest-reward">奖励: ${b.rewardGold}灵石 ${b.rewardExp}修为</div>
              <div style="font-size:0.7rem;color:var(--cyan);margin-top:4px;">点击接取</div>
            </div>`;
          }
          html += '</div>';
        }
      }
      html += '</div>';
      return html;
    }

    // --- 丹药选择弹窗 ---
    _showPillSelectionModal(callback) {
      const d = this.game.data;
      const pills = [
        { id: 'dao_pill', name: '天道丹', bonus: 0.4 },
        { id: 'great_break_pill', name: '大破境丹', bonus: 0.3 },
        { id: 'break_pill', name: '破境丹', bonus: 0.2 },
        { id: 'small_break_pill', name: '小破境丹', bonus: 0.1 },
      ].filter(p => d.pills[p.id] && d.pills[p.id] > 0);

      const modal = document.createElement('div');
      // `.modal-overlay` is invisible/non-interactive unless it has `.active`.
      modal.className = 'modal-overlay active';
      modal.style.zIndex = '3000';
      modal.style.padding = '20px';
      let html = `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);max-width:400px;width:100%;padding:24px;">
        <h3 style="text-align:center;font-family:var(--font-display);color:var(--gold);margin-bottom:16px;">选择突破丹药</h3>
        <div class="pill-choices">`;
      pills.forEach(p => {
        html += `<button class="pill-choice btn btn-outline" data-pill="${p.id}" style="display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 14px;">
          ${p.name} (成功率+${Math.round(p.bonus * 100)}%) <span style="color:var(--text-muted);float:right">x${d.pills[p.id]}</span>
        </button>`;
      });
      html += `<button class="pill-choice btn btn-outline" data-pill="none" style="display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 14px;color:var(--text-muted);">不使用丹药</button>`;
      html += `<button class="btn btn-sm btn-outline" id="pill-cancel" style="display:block;width:100%;margin-top:12px;">取消</button>`;
      html += '</div></div>';
      modal.innerHTML = html;
      document.body.appendChild(modal);

      modal.querySelectorAll('[data-pill]').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.remove();
          callback(btn.dataset.pill === 'none' ? null : btn.dataset.pill);
        });
      });
      modal.querySelector('#pill-cancel')?.addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    _showBreakthroughTrial(onSuccess) {
      const d = this.game.data;
      const nextRealm = REALMS[d.realm + 1];
      // Generate a trial guardian scaled to target realm
      const guardianHp = Math.floor(nextRealm.baseHp * 0.8);
      const guardianAtk = Math.floor(nextRealm.baseAtk * 0.7);
      const guardianDef = Math.floor(nextRealm.baseDef * 0.5);
      const guardianNames = ['破境守卫', '心魔幻影', '天道试炼者', '灵力风暴', '元神劫灵'];
      const guardianName = guardianNames[d.realm % guardianNames.length];

      let playerHp = d.hp;
      const playerMaxHp = d.maxHp;
      let monsterHp = guardianHp;
      let round = 0;

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';

      const renderTrial = () => {
        const pHpPct = Math.max(0, playerHp / playerMaxHp * 100);
        const mHpPct = Math.max(0, monsterHp / guardianHp * 100);
        overlay.innerHTML = `<div class="modal" style="max-width:400px;text-align:center;">
          <div class="modal-header"><h3 class="modal-title">突破试炼 - ${nextRealm.name}</h3></div>
          <div style="padding:16px;">
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">击败守关者方可突破！</p>
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:16px;">
              <div style="flex:1;text-align:center">
                <div style="font-size:0.8rem;color:var(--cyan);margin-bottom:4px">${d.name}</div>
                <div style="background:var(--bg-primary);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;background:var(--green);width:${pHpPct}%;transition:width 0.3s"></div></div>
                <div style="font-size:0.7rem;color:var(--text-muted)">${Math.max(0,Math.floor(playerHp))}/${playerMaxHp}</div>
              </div>
              <div style="color:var(--red);font-size:1.2rem;align-self:center">VS</div>
              <div style="flex:1;text-align:center">
                <div style="font-size:0.8rem;color:var(--red);margin-bottom:4px">${guardianName}</div>
                <div style="background:var(--bg-primary);border-radius:4px;height:8px;overflow:hidden"><div style="height:100%;background:var(--red);width:${mHpPct}%;transition:width 0.3s"></div></div>
                <div style="font-size:0.7rem;color:var(--text-muted)">${Math.max(0,Math.floor(monsterHp))}/${guardianHp}</div>
              </div>
            </div>
            <div id="trial-log" style="font-size:0.75rem;color:var(--text-secondary);max-height:100px;overflow-y:auto;background:var(--bg-primary);border-radius:6px;padding:8px;margin-bottom:12px;text-align:left"></div>
            <div id="trial-actions">
              <button class="btn btn-gold btn-sm" id="trial-attack">攻击</button>
              <button class="btn btn-outline btn-sm" id="trial-defend" style="margin-left:8px">防御</button>
              <button class="btn btn-outline btn-sm" id="trial-flee" style="margin-left:8px;color:var(--red)">放弃</button>
            </div>
          </div>
        </div>`;
        document.body.appendChild(overlay);
      };

      const logEntries = [];
      const addLog = (text) => {
        logEntries.push(text);
        if (logEntries.length > 10) logEntries.shift();
        const logEl = overlay.querySelector('#trial-log');
        if (logEl) logEl.innerHTML = logEntries.map(l => '<div>' + l + '</div>').join('');
      };

      const doRound = (action) => {
        round++;
        let playerDmg = 0;
        let monsterDmg = 0;
        const crit = Math.random() < (this.game._getPermCritBonus() + 0.1);

        if (action === 'attack') {
          playerDmg = Math.max(1, Math.floor(d.atk * (1 + Math.random() * 0.3) - guardianDef * 0.3));
          if (crit) { playerDmg = Math.floor(playerDmg * 1.5); addLog(`第${round}回合: 暴击！你造成 <span style="color:var(--gold)">${playerDmg}</span> 伤害`); }
          else addLog(`第${round}回合: 你造成 <span style="color:var(--cyan)">${playerDmg}</span> 伤害`);
          monsterHp -= playerDmg;
        } else {
          addLog(`第${round}回合: 你防御，减少50%伤害`);
        }

        if (monsterHp > 0) {
          monsterDmg = Math.max(1, Math.floor(guardianAtk * (0.8 + Math.random() * 0.4) - d.def * 0.3));
          if (action === 'defend') monsterDmg = Math.floor(monsterDmg * 0.5);
          playerHp -= monsterDmg;
          addLog(`${guardianName} 造成 <span style="color:var(--red)">${monsterDmg}</span> 伤害`);
        }

        // Check result
        if (monsterHp <= 0) {
          monsterHp = 0;
          addLog('<span style="color:var(--gold)">试炼通过！</span>');
          overlay.querySelector('#trial-actions').innerHTML = '<button class="btn btn-gold btn-sm" id="trial-continue">继续突破</button>';
          overlay.querySelector('#trial-continue').addEventListener('click', () => {
            overlay.remove();
            // Restore player HP to pre-trial level (trial is symbolic)
            this.game.data.hp = Math.max(1, Math.floor(playerHp));
            onSuccess();
          });
          renderTrialHP();
          return;
        }
        if (playerHp <= 0) {
          playerHp = 0;
          addLog('<span style="color:var(--red)">试炼失败...</span>');
          overlay.querySelector('#trial-actions').innerHTML = '<button class="btn btn-outline btn-sm" id="trial-close">返回</button>';
          overlay.querySelector('#trial-close').addEventListener('click', () => {
            overlay.remove();
            this.game.data.hp = Math.max(1, Math.floor(d.maxHp * 0.3)); // partial HP recovery
            this.game.save();
            this.renderStatusBar();
            showToast('试炼失败，需要恢复后再试', 'error');
          });
          renderTrialHP();
          return;
        }

        renderTrialHP();
        bindActions();
      };

      const renderTrialHP = () => {
        const pHpPct = Math.max(0, playerHp / playerMaxHp * 100);
        const mHpPct = Math.max(0, monsterHp / guardianHp * 100);
        const bars = overlay.querySelectorAll('[style*="transition:width"]');
        if (bars[0]) bars[0].style.width = pHpPct + '%';
        if (bars[1]) bars[1].style.width = mHpPct + '%';
        const hpTexts = overlay.querySelectorAll('[style*="font-size:0.7rem"]');
        if (hpTexts[0]) hpTexts[0].textContent = Math.max(0, Math.floor(playerHp)) + '/' + playerMaxHp;
        if (hpTexts[1]) hpTexts[1].textContent = Math.max(0, Math.floor(monsterHp)) + '/' + guardianHp;
      };

      const bindActions = () => {
        const atkBtn = overlay.querySelector('#trial-attack');
        const defBtn = overlay.querySelector('#trial-defend');
        const fleeBtn = overlay.querySelector('#trial-flee');
        if (atkBtn) atkBtn.addEventListener('click', () => doRound('attack'));
        if (defBtn) defBtn.addEventListener('click', () => doRound('defend'));
        if (fleeBtn) fleeBtn.addEventListener('click', () => {
          overlay.remove();
          showToast('放弃试炼', 'info');
        });
      };

      renderTrial();
      addLog(`${guardianName} 出现！ ATK:${guardianAtk} DEF:${guardianDef} HP:${guardianHp}`);
      bindActions();
    }

    showTribulation() {
      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';
      let phase = 0;
      let score = 0;
      const totalPhases = TRIBULATION_CONFIG.phases;

      const renderPhase = () => {
        if (phase >= totalPhases) {
          // 天劫结束
          const bonus = score * 0.05; // 每次成功+5%突破率
          overlay.innerHTML = `<div class="event-modal">
            <div class="event-icon">🌩️</div>
            <div class="event-title">天劫结束</div>
            <div class="event-desc">成功抵挡 ${score}/${totalPhases} 道天雷<br>突破率加成：+${Math.floor(bonus * 100)}%</div>
            <div class="event-choices">
              <button class="event-choice-btn" id="btn-trib-break">尝试突破</button>
            </div>
          </div>`;
          overlay.querySelector('#btn-trib-break').addEventListener('click', () => {
            overlay.remove();
            this._showPillSelectionModal((pillId) => {
              const result = this.game.tryBreakthrough(bonus, pillId);
              if (result.success) {
                Effects.screenFlash('rgba(255, 215, 0, 0.35)', 500);
                Effects.particleExplosion(document.getElementById('panel-cultivate'), 50, ['#ffd700', '#ffaa00', '#ff8800', '#fff4c0']);
                Effects.realmUpText(result.realm);
                showToast(`突破成功！晋升${result.realm}！${result.usedPill ? '（使用' + result.usedPill + '）' : ''}`, 'success');
              } else {
                Effects.screenShake(document.getElementById('panel-cultivate'), 1, 400);
                Effects.screenFlash(result.deviation ? 'rgba(128, 0, 255, 0.3)' : 'rgba(255, 50, 50, 0.25)', 300);
                showToast(result.reason, 'error');
              }
              this.renderStatusBar();
              this.renderCultivatePanel();
            });
          });
          return;
        }

        const directions = ['左', '右', '上', '下'];
        const correct = pick(directions);
        const keyMap = { '左': 'ArrowLeft', '右': 'ArrowRight', '上': 'ArrowUp', '下': 'ArrowDown' };
        let answered = false;

        overlay.innerHTML = `<div class="event-modal">
          <div class="event-icon">⚡</div>
          <div class="event-title">天劫 第${phase + 1}/${totalPhases}道</div>
          <div class="event-desc" style="font-size:2rem;color:var(--gold);margin:20px 0;">按 ${correct} 键闪避！</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">成功：${score}/${phase}</div>
          <div class="event-choices">
            ${directions.map(d => `<button class="event-choice-btn trib-dir-btn" data-dir="${d}" style="display:inline-block;width:auto;padding:12px 24px;margin:4px;">${d}</button>`).join('')}
          </div>
        </div>`;

        const timer = setTimeout(() => {
          if (!answered) { answered = true; document.removeEventListener('keydown', handleKey); phase++; renderPhase(); }
        }, TRIBULATION_CONFIG.timePerPhase);

        const handleKey = (e) => {
          if (answered) return;
          if (e.key === keyMap[correct]) {
            answered = true; score++; clearTimeout(timer);
            document.removeEventListener('keydown', handleKey);
            Effects.screenFlash('rgba(74, 218, 212, 0.3)', 200);
            phase++; setTimeout(renderPhase, 300);
          } else if (Object.values(keyMap).includes(e.key)) {
            answered = true; clearTimeout(timer);
            document.removeEventListener('keydown', handleKey);
            Effects.screenFlash('rgba(255, 50, 50, 0.3)', 200);
            phase++; setTimeout(renderPhase, 300);
          }
        };
        document.addEventListener('keydown', handleKey);

        overlay.querySelectorAll('.trib-dir-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (answered) return;
            answered = true; clearTimeout(timer);
            document.removeEventListener('keydown', handleKey);
            if (btn.dataset.dir === correct) {
              score++;
              Effects.screenFlash('rgba(74, 218, 212, 0.3)', 200);
            } else {
              Effects.screenFlash('rgba(255, 50, 50, 0.3)', 200);
            }
            phase++; setTimeout(renderPhase, 300);
          });
        });
      };

      document.body.appendChild(overlay);
      renderPhase();
    }

    // ==================== 世界地图面板 ====================

    renderWorldPanel() {
      const panel = document.getElementById('panel-world');
      if (!panel) return;
      const d = this.game.data;
      const curLoc = MAP_LOCATIONS.find(l => l.id === d.currentLocation);
      const staminaPct = ((d.stamina || 0) / (d.staminaMax || 20)) * 100;

      // First-time tutorial
      if (!d.worldTutorialShown) {
        d.worldTutorialShown = true;
        this.game.save();
        this._showWorldTutorial();
      }

      // Header
      let html = `<div class="world-header">
        <span style="font-size:1.5rem">${curLoc ? curLoc.icon : '📍'}</span>
        <div>
          <div class="world-location-name">${curLoc ? curLoc.name : '未知'}</div>
          <div class="world-location-desc">${curLoc ? curLoc.desc : ''}</div>
        </div>
        <div class="stamina-bar-wrap">
          <div class="stamina-bar-label"><span>体力</span><span>${d.stamina || 0}/${d.staminaMax || 20}</span></div>
          <div class="progress-bar stamina-bar"><div class="progress-fill" style="width:${staminaPct}%"></div></div>
        </div>
      </div>`;

      // Map toolbar + Region Map
      html += `<div style="display:flex;justify-content:flex-end;margin:8px 0 12px;">
        <button class="btn btn-outline btn-sm" id="btn-world-map-toggle">${this._worldMapCollapsed ? '展开地点列表' : '收起地点列表'}</button>
      </div>`;

      if (!this._worldMapCollapsed) {
        const regions = ['凡人域', '修仙界', '秘境', '仙域', '特殊'];
        for (const region of regions) {
          const locs = MAP_LOCATIONS.filter(l => l.region === region);
          html += `<div class="world-region"><div class="world-region-title">${region}</div><div class="world-region-grid">`;
          for (const loc of locs) {
            const locked = d.realm < loc.minRealm;
            const isCurrent = d.currentLocation === loc.id;
            const canReach = curLoc && curLoc.connectedTo.includes(loc.id);
            const cls = isCurrent ? 'current' : (locked ? 'locked' : '');
            html += `<div class="world-node ${cls}" data-loc="${loc.id}">
              <div class="world-node-icon">${loc.icon}</div>
              <div class="world-node-name">${loc.name}</div>
              ${locked ? `<div class="world-node-lock">🔒 需${REALMS[loc.minRealm].name}</div>` : ''}
              ${!locked && !isCurrent && !canReach ? '<div class="world-node-lock" style="color:var(--text-muted)">不相邻</div>' : ''}
            </div>`;
          }
          html += '</div></div>';
        }
      } else {
        html += `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:12px;text-align:right;">
          地点列表已收起（需要更换地点请展开）
        </div>`;
      }

      // Actions Panel - Card Style
      if (curLoc) {
        html += `<div class="world-actions"><div class="world-actions-title">${curLoc.icon} ${curLoc.name} — 可执行操作</div><div class="world-actions-grid world-card-grid">`;
        const actions = this.game.getLocationActions();
        if (actions.includes('battle') && curLoc.monsterPool.length > 0) {
          html += `<div class="world-action-card" data-action="battle">
            <div class="wac-icon">⚔️</div>
            <div class="wac-info"><div class="wac-name">战斗</div><div class="wac-desc">与此地妖兽搏斗</div></div>
            <div class="wac-cost">消耗 0 体力</div>
          </div>`;
        }
        if (actions.includes('gather') && GATHER_TABLE[curLoc.id]) {
          const gatherDisabled = d.stamina < 3;
          html += `<div class="world-action-card ${gatherDisabled ? 'disabled' : ''}" data-action="gather" ${gatherDisabled ? 'data-disabled-reason="体力不足（需要3）"' : ''}>
            <div class="wac-icon">🌿</div>
            <div class="wac-info"><div class="wac-name">采集</div><div class="wac-desc">搜寻此地灵材</div></div>
            <div class="wac-cost">消耗 3 体力</div>
          </div>`;
        }
        if (actions.includes('explore')) {
          const adventures = this.game.getAvailableAdventures();
          if (adventures.length > 0) {
            for (const adv of adventures) {
              const inProgress = d.adventureProgress && d.adventureProgress[adv.id] !== undefined;
              const advDisabled = d.stamina < 5 && !inProgress;
              html += `<div class="world-action-card ${advDisabled ? 'disabled' : ''}" data-action="adventure" data-chain="${adv.id}" ${advDisabled ? 'data-disabled-reason="体力不足（需要5）"' : ''}>
                <div class="wac-icon">${adv.icon}</div>
                <div class="wac-info"><div class="wac-name">${inProgress ? '继续' : ''}${adv.name}</div><div class="wac-desc">${adv.desc || '探索奇遇'}</div></div>
                <div class="wac-cost">${inProgress ? '继续探索' : '消耗 5 体力'}</div>
              </div>`;
            }
          } else {
            html += `<div class="world-action-card disabled" data-action="none" data-disabled-reason="暂无可探索事件">
              <div class="wac-icon">🔍</div>
              <div class="wac-info"><div class="wac-name">暂无可探索事件</div><div class="wac-desc">等待新的奇遇</div></div>
            </div>`;
          }
        }
        if (actions.includes('rest')) {
          html += `<div class="world-action-card" data-action="rest">
            <div class="wac-icon">🛏️</div>
            <div class="wac-info"><div class="wac-name">休息</div><div class="wac-desc">恢复全部生命灵力</div></div>
            <div class="wac-cost">消耗 0 体力</div>
          </div>`;
        }
        html += '</div>';

        // NPCs at this location
        const npcs = this.game.getVisibleNpcs();
        if (npcs.length > 0) {
          html += '<div class="world-npc-list"><div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">此地人物：</div>';
          for (const npc of npcs) {
            const favor = this.game._getNpcFavor(npc.id);
            const lvl = this.game._getFavorLevel(favor);
            html += `<span class="world-npc-item" data-npc="${npc.id}">${npc.icon} ${npc.name} <span style="font-size:0.65rem;color:${['#666','#4a7ad4','#4ad46a','#e0a030','#e04040'][lvl]}">[${FAVOR_LEVELS[lvl].name}]</span></span>`;
          }
          html += '</div>';
        }
        html += '</div>';

        // 道侣信息面板
        if (d.companion) {
          const companionNpc = NPC_DATA_MAP[d.companion.npcId];
          const companionFavor = this.game._getNpcFavor(d.companion.npcId);
          const dualCooldown = d.dualCultivationCooldown || 0;
          const canDual = Date.now() >= dualCooldown;
          const dualRemain = canDual ? 0 : Math.ceil((dualCooldown - Date.now()) / 60000);
          html += `<div class="companion-panel">
            <div class="companion-panel-header">
              <span class="companion-panel-icon">${d.companion.icon}</span>
              <div class="companion-panel-info">
                <div class="companion-panel-name">道侣：${d.companion.name}</div>
                <div class="companion-panel-relation">好感度：${companionFavor}/100 | ${companionNpc ? companionNpc.title : ''}</div>
              </div>
            </div>
            <div class="companion-panel-bonuses">
              <span>打坐经验 +10%</span><span>突破率 +5%</span><span>被动恢复 HP/灵力</span>
            </div>
            <button class="btn btn-sm companion-dual-btn" id="btn-dual-cultivate" ${canDual ? '' : 'disabled'}>
              🔥 双修 ${canDual ? '' : `(${dualRemain}分钟后)`}
            </button>
          </div>`;
        }

        // Location detail panel
        html += `<div class="world-loc-detail">
          <div class="wld-title">📍 地点信息</div>
          <div class="wld-row"><span class="wld-label">区域</span><span>${curLoc.region || '未知'}</span></div>
          <div class="wld-row"><span class="wld-label">描述</span><span>${curLoc.desc || '无'}</span></div>
          <div class="wld-row"><span class="wld-label">可用操作</span><span>${actions.join('、') || '无'}</span></div>
          <div class="wld-row"><span class="wld-label">NPC数量</span><span>${npcs ? npcs.length : 0}</span></div>
          <div class="wld-row"><span class="wld-label">相连地点</span><span>${(curLoc.connectedTo || []).map(id => { const l = MAP_LOCATIONS.find(x => x.id === id); return l ? l.name : id; }).join('、') || '无'}</span></div>
        </div>`;
      }

      panel.innerHTML = html;

      // Event listeners
      const toggleBtn = panel.querySelector('#btn-world-map-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this._worldMapCollapsed = !this._worldMapCollapsed;
          this.renderWorldPanel();
        });
      }

      panel.querySelectorAll('.world-node:not(.locked)').forEach(node => {
        node.addEventListener('click', () => {
          const locId = node.dataset.loc;
          if (locId === d.currentLocation) return;
          const result = this.game.travelTo(locId);
          if (result.success) {
            this._worldMapCollapsed = true;
            this._worldScrollToActions = true;
            this.renderWorldPanel();
            this.renderStatusBar();
            showToast(`到达 ${MAP_LOCATIONS.find(l => l.id === locId).name}`, 'info');
          } else {
            showToast(result.reason, 'warning');
          }
        });
      });
      panel.querySelectorAll('.world-node.locked').forEach(node => {
        node.addEventListener('click', () => {
          const locId = node.dataset.loc;
          const loc = MAP_LOCATIONS.find(l => l.id === locId);
          if (!loc) return;
          showToast(`需达到${REALMS[loc.minRealm].name}`, 'info');
        });
      });

      panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (btn.classList.contains('disabled')) {
            showToast(btn.dataset.disabledReason || '当前不可执行', 'warning');
            return;
          }
          if (action === 'none') {
            showToast(btn.dataset.disabledReason || '当前不可执行', 'info');
            return;
          }
          if (action === 'battle') {
            const state = this.game.startBattle('__location__');
            if (state) {
              // Switch to battle tab and render
              document.querySelectorAll('.cult-tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.cult-panel').forEach(p => p.classList.remove('active'));
              const battleTab = document.querySelector('[data-tab="battle"]');
              const battlePanel = document.getElementById('panel-battle');
              if (battleTab) battleTab.classList.add('active');
              if (battlePanel) { battlePanel.classList.add('active'); this.renderBattleField(battlePanel); }
            }
          } else if (action === 'gather') {
            const result = this.game.gatherAtLocation();
            if (result.success) {
              const items = result.results.map(r => `${r.icon} ${r.name} x${r.count}`).join(', ');
              showToast(`采集获得: ${items}`, 'info');
              this.renderWorldPanel();
              this.renderStatusBar();
            } else {
              showToast(result.reason, 'warning');
            }
          } else if (action === 'adventure') {
            const chainId = btn.dataset.chain;
            const result = this.game.triggerAdventure(chainId);
            if (result.success) {
              this.showAdventureModal(result.chain, result.step, result.stepIdx, result.totalSteps);
            } else {
              showToast(result.reason, 'warning');
            }
          } else if (action === 'rest') {
            this.game.data.hp = this.game.data.maxHp;
            if (this.game.data.spirit !== undefined) this.game.data.spirit = this.game.data.maxSpirit;
            this.game.save();
            showToast('休息完毕，生命灵力已恢复！', 'info');
            this.renderStatusBar();
          }
        });
      });

      panel.querySelectorAll('[data-npc]').forEach(item => {
        item.addEventListener('click', () => this.showNpcInteraction(item.dataset.npc));
      });

      // 双修按钮
      const dualBtn = panel.querySelector('#btn-dual-cultivate');
      if (dualBtn) {
        dualBtn.addEventListener('click', () => {
          const result = this.game.dualCultivate();
          if (result.success) {
            showToast(`双修成功！获得 ${formatNumber(result.exp)} 修为`, 'success');
            Effects.screenFlash('rgba(255, 105, 180, 0.2)');
            this.renderWorldPanel();
            this.renderStatusBar();
          } else {
            showToast(result.reason, 'warning');
          }
        });
      }

      if (this._worldScrollToActions) {
        this._worldScrollToActions = false;
        setTimeout(() => panel.querySelector('.world-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
      }
    }

    // ==================== 世界教程弹窗 ====================

    _showWorldTutorial() {
      const modal = document.createElement('div');
      modal.className = 'cult-modal-overlay';
      modal.innerHTML = `<div class="cult-modal" style="max-width:420px">
        <div class="cult-modal-title">🌍 世界探索指南</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6">
          <p><b>💪 体力系统</b><br>每次采集消耗3体力，探索奇遇消耗5体力。体力每5分钟恢复1点，上限为20点。</p>
          <p><b>🗺️ 操作指引</b><br>点击地图上的地点可以移动（需要相邻且未锁定）。每个地点有不同的操作：战斗、采集、探索、休息等。</p>
          <p><b>👥 NPC互动</b><br>各地会有NPC出现，点击可以与其交流、交易或接受任务。提升好感度可以解锁更多互动选项。</p>
          <p><b>⚔️ 战斗</b><br>在有妖兽的区域可以战斗，战斗不消耗体力但消耗生命。低生命时记得休息恢复。</p>
        </div>
        <button class="cult-btn" style="width:100%;margin-top:12px" onclick="this.closest('.cult-modal-overlay').remove()">我知道了</button>
      </div>`;
      document.body.appendChild(modal);
    }

    // ==================== NPC交互模态框 ====================

    showNpcInteraction(npcId) {
      const npc = NPC_DATA_MAP[npcId];
      if (!npc) { showToast('找不到该NPC', 'error'); return; }
      const d = this.game.data;
      const favor = this.game._getNpcFavor(npcId);
      const favorLevel = this.game._getFavorLevel(favor);
      const favorInfo = FAVOR_LEVELS[favorLevel];
      const today = this.game._getTodayKey();
      const talksUsed = (d.npcDailyTalks && d.npcDailyTalks[`${npcId}_${today}`]) || 0;
      const giftGiven = d.npcDailyGifts && d.npcDailyGifts[`${npcId}_${today}`];
      const rumorsUsed = (d.npcDailyRumors && d.npcDailyRumors[`${npcId}_${today}`]) || 0;
      const practiceUsed = d.npcDailyPractice && d.npcDailyPractice[`${npcId}_${today}`];
      const adventureUsed = d.npcDailyAdventures && d.npcDailyAdventures[`${npcId}_${today}`];
      const practiceCost = 100 + d.realm * 60;
      const hasTeaching = npc.teachSkill && !((d.npcTeachings || []).includes(npc.teachSkill.id));
      const alreadyLearned = npc.teachSkill && (d.npcTeachings || []).includes(npc.teachSkill.id);
      const isCompanion = d.companion && d.companion.npcId === npcId;
      const canConfess = npc.canBeCompanion && favor >= 80 && !d.companion;

      const overlay = document.createElement('div');
      overlay.className = 'npc-modal-overlay';

      let html = `<div class="npc-modal">
        <div class="npc-modal-header">
          <div class="npc-modal-icon">${npc.icon}</div>
          <div class="npc-modal-info">
            <div class="npc-modal-name">${npc.name}</div>
            <div class="npc-modal-title">${npc.title}</div>
          </div>
          <button class="btn btn-outline btn-sm" id="npc-close-btn" style="margin-left:auto;">✕</button>
        </div>
        <div class="favor-bar-wrap">
          <div class="favor-label"><span>${favorInfo.name} (${favor}/100)</span><span>${FAVOR_LEVELS[favorLevel].name}</span></div>
          <div class="favor-bar"><div class="favor-fill ${favorInfo.color}" style="width:${favor}%"></div></div>
        </div>
        <div id="npc-dialogue-area"></div>
        <div class="npc-modal-actions">
          <div class="npc-action-row">
            <button class="btn btn-cyan btn-sm" id="npc-talk-btn" aria-disabled="${talksUsed >= 3 ? 'true' : 'false'}" ${talksUsed >= 3 ? 'data-disabled-reason="今日对话次数已满(3/3)"' : ''}>💬 对话 (${3 - talksUsed}/3)</button>
            <button class="btn btn-gold btn-sm" id="npc-gift-btn" aria-disabled="${favor < 20 || giftGiven ? 'true' : 'false'}" ${favor < 20 ? 'data-disabled-reason="需认识(好感≥20)"' : giftGiven ? 'data-disabled-reason="今日已送过礼物"' : ''}>🎁 送礼 ${favor < 20 ? '(需认识)' : giftGiven ? '(今日已送)' : ''}</button>
          </div>
          <div class="npc-action-row">
            <button class="btn btn-outline btn-sm" id="npc-rumor-btn" aria-disabled="${favor < 20 || rumorsUsed >= 2 ? 'true' : 'false'}" ${favor < 20 ? 'data-disabled-reason="需认识(好感≥20)"' : rumorsUsed >= 2 ? 'data-disabled-reason="今日打听次数已满(2/2)"' : ''}>🕵️ 打听传闻 (${2 - rumorsUsed}/2)</button>
            <button class="btn btn-outline btn-sm" id="npc-practice-btn" aria-disabled="${favor < 40 || practiceUsed || d.gold < practiceCost ? 'true' : 'false'}" ${favor < 40 ? 'data-disabled-reason="需友好(好感≥40)"' : practiceUsed ? 'data-disabled-reason="今日已请教过一次"' : d.gold < practiceCost ? 'data-disabled-reason="灵石不足"' : ''}>🧠 请教修炼 ${favor < 40 ? '(需友好)' : practiceUsed ? '(今日已请教)' : d.gold < practiceCost ? '(灵石不足)' : `(${practiceCost}灵石)`}</button>
          </div>
          <div class="npc-action-row">
            ${npc.sparPower > 0 ? `<button class="btn btn-outline btn-sm" id="npc-spar-btn" aria-disabled="${favor < 40 ? 'true' : 'false'}" ${favor < 40 ? 'data-disabled-reason="需友好(好感≥40)"' : ''}>⚔️ 切磋 ${favor < 40 ? '(需友好)' : ''}</button>` : ''}
            ${npc.teachSkill ? `<button class="btn btn-gold btn-sm" id="npc-learn-btn" aria-disabled="${favor < 60 || !hasTeaching ? 'true' : 'false'}" ${favor < 60 ? 'data-disabled-reason="需信任(好感≥60)"' : !hasTeaching ? 'data-disabled-reason="已传授过"' : ''}>${alreadyLearned ? '✅ 已传授' : `📖 拜师 ${favor < 60 ? '(需信任)' : ''}`}</button>` : ''}
          </div>
          <div class="npc-action-row">
            <button class="btn btn-outline btn-sm" id="npc-adventure-btn" aria-disabled="${favor < 40 || adventureUsed || (d.stamina || 0) < 2 ? 'true' : 'false'}" ${favor < 40 ? 'data-disabled-reason="需友好(好感≥40)"' : adventureUsed ? 'data-disabled-reason="今日已结伴历练过"' : (d.stamina || 0) < 2 ? 'data-disabled-reason="体力不足(需要2)"' : ''}>🧳 结伴历练</button>
            <button class="btn btn-outline btn-sm" id="npc-status-btn">📌 关系提示</button>
          </div>
          ${isCompanion ? '<div class="companion-badge-inline">💕 你的道侣</div>' : ''}
          ${canConfess ? '<div class="npc-action-row"><button class="btn btn-sm companion-confess-btn" id="npc-confess-btn">💕 表白心意</button></div>' : ''}
        </div>
        <div id="npc-gift-panel"></div>
      </div>`;

      overlay.innerHTML = html;
      document.body.appendChild(overlay);

      const dialogueArea = overlay.querySelector('#npc-dialogue-area');
      const giftPanel = overlay.querySelector('#npc-gift-panel');

      overlay.querySelector('#npc-close-btn').addEventListener('click', () => {
        overlay.remove();
        this.renderWorldPanel();
      });

      overlay.querySelector('#npc-talk-btn').addEventListener('click', () => {
        const talkBtn = overlay.querySelector('#npc-talk-btn');
        if (talkBtn && talkBtn.getAttribute('aria-disabled') === 'true') {
          showToast(talkBtn.dataset.disabledReason || '当前不可对话', 'warning');
          return;
        }
        const result = this.game.talkToNpc(npcId);
        if (result.success) {
          dialogueArea.innerHTML = `<div class="npc-dialogue">"${escapeHtml(result.dialogue)}"</div><div style="font-size:0.75rem;color:var(--green);margin-top:4px;">好感度 +${result.favorGain}</div>`;
          overlay.remove();
          this.showNpcInteraction(npcId);
        } else {
          showToast(result.reason, 'warning');
        }
      });

      overlay.querySelector('#npc-rumor-btn')?.addEventListener('click', () => {
        const rumorBtnEl = overlay.querySelector('#npc-rumor-btn');
        if (rumorBtnEl && rumorBtnEl.getAttribute('aria-disabled') === 'true') {
          showToast(rumorBtnEl.dataset.disabledReason || '当前不可打听', 'warning');
          return;
        }
        const result = this.game.askNpcRumor(npcId);
        if (!result.success) { showToast(result.reason, 'warning'); return; }
        dialogueArea.innerHTML = `<div class="npc-dialogue">"${escapeHtml(result.rumor)}"</div>
          <div style="font-size:0.75rem;color:var(--cyan);margin-top:4px;">悟道 +${result.insightGain} | 好感度 +${result.favorGain}</div>`;
        const used = (this.game.data.npcDailyRumors && this.game.data.npcDailyRumors[`${npcId}_${today}`]) || 0;
        const rumorBtn = overlay.querySelector('#npc-rumor-btn');
        if (rumorBtn) {
          rumorBtn.textContent = `🕵️ 打听传闻 (${Math.max(0, 2 - used)}/2)`;
          rumorBtn.setAttribute('aria-disabled', used >= 2 ? 'true' : 'false');
          if (used >= 2) rumorBtn.dataset.disabledReason = '今日打听次数已满(2/2)';
        }
        this.renderStatusBar();
      });

      overlay.querySelector('#npc-practice-btn')?.addEventListener('click', () => {
        const pracBtn = overlay.querySelector('#npc-practice-btn');
        if (pracBtn && pracBtn.getAttribute('aria-disabled') === 'true') {
          showToast(pracBtn.dataset.disabledReason || '当前不可请教', 'warning');
          return;
        }
        const result = this.game.practiceWithNpc(npcId);
        if (!result.success) { showToast(result.reason, 'warning'); return; }
        dialogueArea.innerHTML = `<div class="npc-dialogue">"${escapeHtml(npc.name)}指点了你几句修炼要诀，你对灵气运转的理解更深了。"</div>
          <div style="font-size:0.75rem;color:var(--gold);margin-top:4px;">修为 +${formatNumber(result.expGain)} | 悟道 +${result.insightGain} | 好感度 +${result.favorGain}（花费${result.cost}灵石）</div>`;
        if (pracBtn) {
          pracBtn.textContent = '🧠 请教修炼 (今日已请教)';
          pracBtn.setAttribute('aria-disabled', 'true');
          pracBtn.dataset.disabledReason = '今日已请教过一次';
        }
        this.renderStatusBar();
      });

      overlay.querySelector('#npc-gift-btn')?.addEventListener('click', () => {
        const giftBtn = overlay.querySelector('#npc-gift-btn');
        if (giftBtn && giftBtn.getAttribute('aria-disabled') === 'true') {
          showToast(giftBtn.dataset.disabledReason || '当前不可送礼', 'warning');
          return;
        }
        if (giftPanel.innerHTML) { giftPanel.innerHTML = ''; return; }
        const materials = ['herb', 'crystal', 'beast_core', 'ore'];
        let ghtml = '<div class="gift-panel"><div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">选择礼物：</div><div class="gift-grid">';
        for (const matId of materials) {
          const mat = MATERIALS[matId];
          const count = d.inventory[matId] || 0;
          if (count <= 0) continue;
          const isLike = npc.giftLikes && npc.giftLikes.includes(matId);
          const isDislike = npc.giftDislikes && npc.giftDislikes.includes(matId);
          const pref = isLike ? '<span class="gift-pref" style="color:#e04040">❤</span>' : isDislike ? '<span class="gift-pref" style="color:#666">💀</span>' : '';
          ghtml += `<div class="gift-item" data-gift="${matId}">${mat.icon} ${mat.name} (${count}) ${pref}</div>`;
        }
        ghtml += '</div></div>';
        giftPanel.innerHTML = ghtml;
        giftPanel.querySelectorAll('[data-gift]').forEach(gi => {
          gi.addEventListener('click', () => {
            const result = this.game.giveGiftToNpc(npcId, gi.dataset.gift);
            if (result.success) {
              const msg = result.pref === 'like' ? '非常喜欢！' : result.pref === 'dislike' ? '不太高兴...' : '收下了。';
              showToast(`${npc.name}${msg} 好感度 ${result.favorGain > 0 ? '+' : ''}${result.favorGain}`, result.pref === 'dislike' ? 'warning' : 'info');
              overlay.remove();
              this.showNpcInteraction(npcId);
            } else {
              showToast(result.reason, 'warning');
            }
          });
        });
      });

      const sparBtn = overlay.querySelector('#npc-spar-btn');
      if (sparBtn) {
        sparBtn.addEventListener('click', () => {
          if (sparBtn.getAttribute('aria-disabled') === 'true') {
            showToast(sparBtn.dataset.disabledReason || '当前不可切磋', 'warning');
            return;
          }
          const result = this.game.sparWithNpc(npcId);
          if (result.success) {
            let logHtml = '<div style="margin-top:12px;">';
            for (const r of result.rounds) {
              logHtml += `<div style="font-size:0.75rem;color:var(--text-secondary);padding:2px 0;">第${r.round}回合: 你造成${r.myDmg}伤害, 对方造成${r.npcDmg}伤害</div>`;
            }
            const resultMap = { win: '🏆 你胜利了！', close: '⚖️ 惜败', lose: '💫 完败' };
            logHtml += `<div style="font-size:0.9rem;color:var(--gold);margin-top:6px;">${resultMap[result.result]} 好感度 +${result.favorGain}</div></div>`;
            dialogueArea.innerHTML = logHtml;
            overlay.remove();
            this.showNpcInteraction(npcId);
          } else {
            showToast(result.reason, 'warning');
          }
        });
      }

      const learnBtn = overlay.querySelector('#npc-learn-btn');
      if (learnBtn && hasTeaching) {
        learnBtn.addEventListener('click', () => {
          if (learnBtn.getAttribute('aria-disabled') === 'true') {
            showToast(learnBtn.dataset.disabledReason || '当前不可拜师', 'warning');
            return;
          }
          const result = this.game.learnFromNpc(npcId);
          if (result.success) {
            showToast(`获得传承: ${result.skill.name} — ${result.skill.desc}`, 'info');
            Effects.screenFlash('rgba(255, 215, 0, 0.3)');
            overlay.remove();
            this.showNpcInteraction(npcId);
            this.renderStatusBar();
          } else {
            showToast(result.reason, 'warning');
          }
        });
      }

      // 表白心意按钮
      const confessBtn = overlay.querySelector('#npc-confess-btn');
      if (confessBtn) {
        confessBtn.addEventListener('click', () => {
          const result = this.game.confessToNpc(npcId);
          if (!result.success) { showToast(result.reason, 'warning'); return; }
          const dialogueArea = overlay.querySelector('#npc-dialogue-area');
          if (result.accepted) {
            dialogueArea.innerHTML = `<div class="companion-confess-result success">
              <div class="confess-icon">💕</div>
              <div class="confess-text">${result.name}含羞点头："愿与你携手同行修仙路。"</div>
              <div class="confess-bonus">你们结为道侣！打坐经验+10%，突破成功率+5%</div>
            </div>`;
            Effects.screenFlash('rgba(255, 105, 180, 0.3)');
            showToast(`${result.name}成为了你的道侣！`, 'success');
          } else {
            dialogueArea.innerHTML = `<div class="companion-confess-result failure">
              <div class="confess-icon">💔</div>
              <div class="confess-text">${result.name}摇了摇头："道心未定，此事以后再说。"</div>
              <div style="font-size:0.75rem;color:var(--red-light);margin-top:6px;">好感度 -5</div>
            </div>`;
          }
          setTimeout(() => { overlay.remove(); this.showNpcInteraction(npcId); this.renderStatusBar(); }, 2000);
        });
      }

      // 结伴历练玩法
      const advBtn = overlay.querySelector('#npc-adventure-btn');
      if (advBtn) {
        advBtn.addEventListener('click', () => {
          if (advBtn.getAttribute('aria-disabled') === 'true') {
            showToast(advBtn.dataset.disabledReason || '当前不可结伴历练', 'warning');
            return;
          }
          const r = this.game.adventureWithNpc(npcId);
          if (!r.success) { showToast(r.reason, 'warning'); return; }
          overlay.remove();
          const eo = document.createElement('div');
          eo.className = 'event-modal-overlay';
          eo.innerHTML = `<div class="event-modal">
            <div class="event-icon">🧳</div>
            <div class="event-title">结伴历练</div>
            <div class="event-desc">你与<strong>${escapeHtml(r.npcName)}</strong>结伴外出历练一番（消耗2体力）。</div>
            <div style="margin-top:10px;font-size:0.85rem;color:var(--text-secondary);line-height:1.8;">
              <div style="color:${r.ok ? 'var(--green)' : 'var(--red-light)'};">${r.ok ? '历练顺利，收获颇丰。' : '遭遇波折，险些受伤。'}</div>
              <div>收获：${r.rewards.map(x => `<span style="color:var(--gold);">${escapeHtml(x)}</span>`).join('，')}</div>
            </div>
            <div class="event-choices"><button class="event-choice-btn" id="npc-adv-close">返回</button></div>
          </div>`;
          document.body.appendChild(eo);
          eo.querySelector('#npc-adv-close').addEventListener('click', () => {
            eo.remove();
            this.renderWorldPanel();
            this.renderStatusBar();
          });
        });
      }

      // 关系提示
      overlay.querySelector('#npc-status-btn')?.addEventListener('click', () => {
        const hints = [];
        if (favor < 20) hints.push('认识(≥20)：可送礼、打听传闻');
        if (favor < 40) hints.push('友好(≥40)：可请教修炼、切磋、结伴历练');
        if (npc.teachSkill && favor < 60) hints.push('信任(≥60)：可拜师学习传承');
        if (npc.canBeCompanion && favor < 80) hints.push('至交(≥80)：可表白结为道侣');
        if (hints.length === 0) hints.push('当前关系已很高，可多互动积累收益');
        showToast(hints.join('；'), 'info', 5000);
      });
    }

    // ==================== 冒险事件模态框 ====================

    showAdventureModal(chain, step, stepIdx, totalSteps) {
      const overlay = document.createElement('div');
      overlay.className = 'adventure-modal-overlay';

      let dotsHtml = '';
      for (let i = 0; i < totalSteps; i++) {
        const cls = i < stepIdx ? 'done' : i === stepIdx ? 'current' : '';
        dotsHtml += `<div class="adventure-step-dot ${cls}"></div>`;
      }

      let choicesHtml = '';
      for (let i = 0; i < step.choices.length; i++) {
        const c = step.choices[i];
        let disabled = false;
        let reqText = '';
        if (c.requirement) {
          if (c.requirement.minAtk && this.game.data.atk < c.requirement.minAtk) { disabled = true; reqText = `需要攻击力 ${c.requirement.minAtk}`; }
          if (c.requirement.minRealm && this.game.data.realm < c.requirement.minRealm) { disabled = true; reqText = `需要${REALMS[c.requirement.minRealm].name}`; }
          if (c.requirement.gold && this.game.data.gold < c.requirement.gold) { disabled = true; reqText = `需要${c.requirement.gold}灵石`; }
          if (c.requirement.herb && (this.game.data.inventory.herb || 0) < c.requirement.herb) { disabled = true; reqText = `需要${c.requirement.herb}灵草`; }
        }
        choicesHtml += `<button class="adventure-choice-btn" data-choice="${i}" ${disabled ? 'disabled' : ''}>${c.label}${c.cost ? ` (消耗${c.cost.gold ? c.cost.gold + '灵石' : ''}${c.cost.herb ? c.cost.herb + '灵草' : ''})` : ''}${c.successRate !== undefined ? ` [成功率${Math.floor(c.successRate * 100)}%]` : ''}${reqText ? `<div class="adventure-choice-req">${reqText}</div>` : ''}</button>`;
      }

      overlay.innerHTML = `<div class="adventure-modal">
        <div class="adventure-title">${chain.icon} ${chain.name}</div>
        <div class="adventure-progress">${dotsHtml}</div>
        <div class="adventure-text">${step.text}</div>
        <div class="adventure-choices" id="adv-choices">${choicesHtml}</div>
      </div>`;

      document.body.appendChild(overlay);

      overlay.querySelectorAll('[data-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.choice);
          const result = this.game.makeAdventureChoice(chain.id, idx);
          if (!result) return;
          if (!result.success) { showToast(result.reason, 'warning'); return; }

          const choicesEl = overlay.querySelector('#adv-choices');
          const resultCls = result.isSuccess ? 'success' : 'failure';
          let rewardHtml = result.rewards.length > 0 ? `<div class="adventure-rewards">${result.isSuccess ? '获得' : ''}：${result.rewards.join(', ')}</div>` : '';

          choicesEl.innerHTML = `<div class="adventure-result ${resultCls}">${result.resultText}${rewardHtml}</div>
            ${result.completed
              ? `<div style="text-align:center;margin-top:12px;color:var(--gold);font-size:0.9rem;">${chain.name} — 完成！</div><button class="btn btn-gold btn-sm" id="adv-close" style="margin-top:12px;">完成</button>`
              : `<button class="btn btn-cyan btn-sm" id="adv-next" style="margin-top:12px;">继续</button>`}`;

          const closeBtn = overlay.querySelector('#adv-close');
          const nextBtn = overlay.querySelector('#adv-next');

          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              overlay.remove();
              this.renderWorldPanel();
              this.renderStatusBar();
            });
          }
          if (nextBtn) {
            nextBtn.addEventListener('click', () => {
              overlay.remove();
              const next = this.game.triggerAdventure(chain.id);
              if (next.success) {
                this.showAdventureModal(next.chain, next.step, next.stepIdx, next.totalSteps);
              }
              this.renderWorldPanel();
              this.renderStatusBar();
            });
          }
        });
      });
    }

    // --- 随机事件弹窗 & 事件簿系统 ---
    _getInboxCount() {
      return (this.game.data.eventInbox || []).length;
    }

    _updateInboxBadge() {
      const tab = document.getElementById('tab-inbox');
      if (!tab) return;
      const count = this._getInboxCount();
      let badge = tab.querySelector('.inbox-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'inbox-badge';
          tab.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        badge.remove();
      }
    }

    _openEventInbox() {
      const panel = document.getElementById('panel-inbox');
      if (!panel) return;
      const inbox = this.game.data.eventInbox || [];
      if (inbox.length === 0) {
        panel.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;">暂无待处理事件</div>';
        return;
      }
      let html = '<h3 style="color:var(--gold);margin-bottom:12px;">事件簿</h3><div class="event-inbox-list">';
      inbox.forEach((item, i) => {
        const timeStr = new Date(item.time).toLocaleTimeString();
        html += `<div class="inbox-item" data-inbox-idx="${i}">
          <span class="inbox-item-icon">${item.icon}</span>
          <span class="inbox-item-name">${item.name}<br><span style="font-size:0.7rem;color:var(--text-muted);">${timeStr}</span></span>
          <button class="inbox-item-btn" data-inbox-handle="${i}">处理</button>
        </div>`;
      });
      html += '</div>';
      panel.innerHTML = html;

      panel.querySelectorAll('[data-inbox-handle]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.inboxHandle);
          const inboxArr = this.game.data.eventInbox || [];
          if (idx < 0 || idx >= inboxArr.length) return;
          const inboxItem = inboxArr[idx];
          // 在RANDOM_EVENTS中查找完整事件对象
          const fullEvent = RANDOM_EVENTS.find(ev => ev.id === inboxItem.id);
          if (!fullEvent) {
            showToast('事件已失效', 'error');
            inboxArr.splice(idx, 1);
            this.game.save();
            this._openEventInbox();
            this._updateInboxBadge();
            return;
          }
          // 从收件箱移除
          inboxArr.splice(idx, 1);
          this.game.save();
          this._updateInboxBadge();
          // 弹出标准事件处理窗口
          this.showEventModal(fullEvent, true);
          // 重新渲染收件箱
          this._openEventInbox();
        });
      });
    }

    showEventModal(event, fromInbox) {
      this.eventPaused = true;
      if (!fromInbox) {
        this.game.data.totalEvents++;
        this.game.data.insight = (this.game.data.insight || 0) + 10;
        this.game.updateQuestProgress('event', 1);
        this.game.updateBountyProgress('event', 1);
      }

      // Avoid duplicate/stuck random-event overlays blocking UI.
      // Do not remove other overlays (e.g. enhance/mini-game panels) that reuse the same class.
      document.querySelectorAll('.event-modal-overlay[data-modal="random-event"]').forEach(el => el.remove());

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';
      overlay.dataset.modal = 'random-event';
      overlay.innerHTML = `<div class="event-modal">
        <div class="event-icon">${event.icon}</div>
        <div class="event-title">${event.name}</div>
        <div class="event-desc">${event.desc}</div>
        <div class="event-choices">
          ${event.options.map((o, i) => `<button class="event-choice-btn" data-choice="${i}">${o.text}</button>`).join('')}
          ${fromInbox ? '' : '<button class="event-choice-btn" id="event-defer" style="opacity:0.85;">稍后处理（加入事件簿）</button>'}
        </div>
      </div>`;
      document.body.appendChild(overlay);

      const cleanup = () => {
        document.removeEventListener('keydown', onKeyDown);
      };

      const closeAfterResult = () => {
        cleanup();
        overlay.remove();
        this.eventPaused = false;
        this.game.save();
        this.game.checkAchievements();
        this.renderStatusBar();
      };

      const onKeyDown = (e) => {
        if (e.key !== 'Escape') return;
        // Only allow ESC to close after the event already has a result screen.
        const canClose = !!overlay.querySelector('.event-close-btn');
        if (canClose) closeAfterResult();
      };
      document.addEventListener('keydown', onKeyDown);

      const deferBtn = overlay.querySelector('#event-defer');
      if (deferBtn) {
        deferBtn.addEventListener('click', () => {
          if (!this.game.data.eventInbox) this.game.data.eventInbox = [];
          this.game.data.eventInbox.push({ id: event.id, name: event.name, icon: event.icon, time: Date.now() });
          this.game.save();
          this._updateInboxBadge();
          cleanup();
          overlay.remove();
          this.eventPaused = false;
          showToast('已加入事件簿，可稍后处理', 'info');
          this.renderStatusBar();
        });
      }

      overlay.querySelectorAll('[data-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.choice);
          const resultText = event.options[idx].result(this.game);
          const modal = overlay.querySelector('.event-modal');
          const choices = modal.querySelector('.event-choices');
          choices.innerHTML = `<div class="event-result">${resultText}</div><button class="btn btn-gold btn-sm event-close-btn">确定</button>`;
          modal.querySelector('.event-close-btn').addEventListener('click', closeAfterResult);

          // If the UI somehow becomes unclickable (mobile overlay / pointer issues),
          // allow clicking on the backdrop to close once a result is shown.
          overlay.addEventListener('click', (e) => {
            if (e.target !== overlay) return;
            closeAfterResult();
          }, { once: true });
        });
      });
    }
  }

  // --- 初始化 ---
  initNav('cultivation');
  initParticles('#particles', 20);
  new CultivationUI();

  // 新手引导
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('cultivation', [
      { title: '欢迎来到修仙之路！', desc: '在这里你将选择灵根、拜入仙门，踏上修仙之旅。' },
      { title: '功能面板', desc: '通过顶部标签切换不同功能：修炼、历练、炼丹、商城等。', target: '#cult-tabs' },
      { title: '状态栏', desc: '这里显示你的角色境界、生命值、灵力等关键信息。', target: '#status-bar' },
      { title: '修炼面板', desc: '打坐修炼是获取经验的主要方式，境界提升后可解锁更多功能。', target: '#panel-cultivate' }
    ]);
  }

})();
