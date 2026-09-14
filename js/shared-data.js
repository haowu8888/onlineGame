/* 跨游戏成就、联动奖励与每日任务的固定定义。 */

const SHARED_ACHIEVEMENTS = [
  { id: 'traveler', name: '七界行者', desc: '游玩全部7款游戏', icon: '🌏', check: d => d.games_played_cultivation && d.games_played_knife && d.games_played_guigu && d.games_played_lifesim && d.games_played_cardtower && d.games_played_cardbattle && d.games_played_cardcollect },
  { id: 'golden_core', name: '金丹大道', desc: '修仙之路突破金丹期', icon: '💊', check: d => (d.cultivation_max_realm || d.cultivation_realm || 0) >= 3 },
  { id: 'ascension', name: '飞升成仙', desc: '修仙之路达到大乘期', icon: '🌟', check: d => (d.cultivation_max_realm || d.cultivation_realm || 0) >= 7 },
  { id: 'wave_10', name: '十波斩', desc: '转转刀存活10波', icon: '⚔️', check: d => (d.knife_max_wave || 0) >= 10 },
  { id: 'wave_30', name: '三十波无双', desc: '转转刀存活30波', icon: '🗡️', check: d => (d.knife_max_wave || 0) >= 30 },
  { id: 'guigu_sect', name: '宗门弟子', desc: '鬼谷八荒加入宗门', icon: '🏯', check: d => !!d.guigu_joined_sect },
  { id: 'lifesim_rebirth', name: '轮回修士', desc: '仙途模拟器完成一次轮回', icon: '🔄', check: d => (d.lifesim_rebirths || 0) >= 1 },
  { id: 'tower_clear', name: '仙塔登顶', desc: '斩仙塔通关全部五层', icon: '🗼', check: d => !!d.cardtower_cleared },
  { id: 'battle_master', name: '灵卡宗师', desc: '灵卡对决击败金丹对手', icon: '🏆', check: d => !!d.cardbattle_cleared },
  { id: 'card_collector', name: '万卡归宗', desc: '仙卡录收集20张角色卡', icon: '📖', check: d => (d.cardcollect_cards || 0) >= 20 },
  // Phase 6 新增成就
  { id: 'five_elements', name: '五行宗师', desc: '鬼谷八荒全部悟道达25', icon: '☯️', check: d => (d.guigu_min_enlighten || 0) >= 25 },
  { id: 'card_master', name: '卡牌大师', desc: '灵卡对决竞技场连胜9场', icon: '🃏', check: d => (d.cardbattle_arena_best || 0) >= 9 },
  { id: 'all_star', name: '全明星阵容', desc: '仙卡录集齐全部圣级角色', icon: '⭐', check: d => (d.cardcollect_holy_count || 0) >= 4 },
  { id: 'three_lives', name: '轮回三世', desc: '仙途模拟器完成3次轮回', icon: '🔄', check: d => (d.lifesim_rebirths || 0) >= 3 },
  { id: 'tower_ascend', name: '飞升之路', desc: '斩仙塔飞升难度3通关', icon: '🏔️', check: d => (d.cardtower_max_ascension || 0) >= 3 },
  { id: 'wave_50', name: '五十波无敌', desc: '转转刀存活50波', icon: '🌊', check: d => (d.knife_max_wave || 0) >= 50 },
  { id: 'mount_master', name: '灵兽御者', desc: '鬼谷八荒拥有5种以上坐骑', icon: '🐉', check: d => (d.guigu_mounts || 0) >= 5 },
  { id: 'total_power', name: '万仙之力', desc: '综合实力达到5000分', icon: '💪', check: d => (d.total_power || 0) >= 5000 },
];

const SHARED_REWARDS = [
  { id: 'cult_to_battle', condition: d => (d.cultivation_max_realm || 0) >= 4, targetGame: 'cardbattle', reward: { type: 'hp_bonus', value: 5 }, name: '金丹之力', desc: '修仙之路突破金丹期 → 灵卡对决HP+5' },
  { id: 'knife_to_tower', condition: d => (d.knife_max_wave || 0) >= 20, targetGame: 'cardtower', reward: { type: 'hp_bonus', value: 10 }, name: '百战之躯', desc: '转转刀存活20波 → 斩仙塔HP+10' },
  { id: 'tower_to_cult', condition: d => !!d.cardtower_cleared, targetGame: 'cultivation', reward: { type: 'equipment', value: 'tower_relic' }, name: '仙塔之证', desc: '斩仙塔通关 → 修仙之路获赠仙塔灵器' },
  { id: 'battle_to_collect', condition: d => !!d.cardbattle_cleared, targetGame: 'cardcollect', reward: { type: 'free_pulls', value: 5 }, name: '对决之名', desc: '灵卡对决通关 → 仙卡录免费5连抽' },
  { id: 'lifesim_to_guigu', condition: d => (d.lifesim_max_age || 0) >= 80, targetGame: 'guigu', reward: { type: 'exp_mult', value: 0.1 }, name: '轮回之悟', desc: '仙途模拟器活过80岁 → 鬼谷八荒经验+10%' },
  { id: 'collect_to_knife', condition: d => (d.cardcollect_cards || 0) >= 15, targetGame: 'knife', reward: { type: 'extra_blade', value: 1 }, name: '百卡之缘', desc: '仙卡录收集15张 → 转转刀初始多1把刀' },
  { id: 'guigu_to_lifesim', condition: d => (d.guigu_max_realm || 0) >= 2, targetGame: 'lifesim', reward: { type: 'stat_bonus', value: 2 }, name: '入世之缘', desc: '鬼谷八荒筑基 → 仙途模拟器属性+2' }
];

const SHARED_MISSION_TEMPLATES = [
  { game: 'cultivation', icon: '🧘', name: '静心打坐', desc: '在修仙之路中打坐修炼', statKey: 'cultivation_meditate_count', target: 1, reward: 10 },
  { game: 'cultivation', icon: '⚔️', name: '斩妖除魔', desc: '在修仙之路中击败3个敌人', statKey: 'cultivation_kills', target: 3, reward: 15 },
  { game: 'cultivation', icon: '💊', name: '炼丹一炉', desc: '在修仙之路中炼制1颗丹药', statKey: 'cultivation_pills_crafted', target: 1, reward: 10 },
  { game: 'knife', icon: '🗡️', name: '试剑江湖', desc: '在转转刀中进行1局', statKey: 'knife_games_played', target: 1, reward: 10 },
  { game: 'knife', icon: '💥', name: '十波挑战', desc: '在转转刀中存活到第10波', statKey: 'knife_max_wave', target: 10, reward: 20 },
  { game: 'cardtower', icon: '🃏', name: '攀塔一试', desc: '挑战斩仙塔1次', statKey: 'cardtower_runs', target: 1, reward: 10 },
  { game: 'cardbattle', icon: '⚔️', name: '灵卡交锋', desc: '进行1场灵卡对决', statKey: 'cardbattle_games', target: 1, reward: 10 },
  { game: 'cardcollect', icon: '📖', name: '翻阅仙录', desc: '在仙卡录中抽卡1次', statKey: 'cardcollect_pulls', target: 1, reward: 10 },
  { game: 'guigu', icon: '⛩️', name: '探索鬼谷', desc: '在鬼谷八荒中探索3个地点', statKey: 'guigu_explored', target: 3, reward: 15 },
  { game: 'lifesim', icon: '🌙', name: '轮回一生', desc: '在仙途模拟器中活过30岁', statKey: 'lifesim_max_age', target: 30, reward: 15 },
  { game: 'cultivation', icon: '💰', name: '灵石满袋', desc: '修仙之路中累计拥有500灵石', statKey: 'cultivation_gold', target: 500, reward: 15 },
  { game: 'guigu', icon: '🗡️', name: '鬼谷斩敌', desc: '在鬼谷八荒中击败2个敌人', statKey: 'guigu_kills', target: 2, reward: 15 },
  { game: 'guigu', icon: '🐴', name: '骑乘远行', desc: '在鬼谷八荒中骑乘坐骑移动', statKey: 'guigu_mount_rides', target: 1, reward: 10 },
  { game: 'guigu', icon: '📋', name: '完成悬赏', desc: '在鬼谷八荒中完成1个悬赏', statKey: 'guigu_bounties_done', target: 1, reward: 20 },
  { game: 'cardbattle', icon: '🏟️', name: '竞技场三胜', desc: '灵卡对决竞技场连胜3场', statKey: 'cardbattle_arena_best', target: 3, reward: 25 },
  { game: 'cardtower', icon: '🏔️', name: '灵塔十层', desc: '斩仙塔探索到第10层', statKey: 'cardtower_max_floor', target: 10, reward: 20 },
  { game: 'knife', icon: '💰', name: '淘金猎人', desc: '转转刀单局获得50金币', statKey: 'knife_run_gold', target: 50, reward: 15 },
  { game: 'lifesim', icon: '🎮', name: '试炼高手', desc: '仙途模拟器试炼小游戏得分6+', statKey: 'lifesim_minigame_score', target: 6, reward: 15 }
];
