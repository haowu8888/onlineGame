(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardBattleDeckView = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DECK_SIZE = 30;
  const CURVE_HEIGHT = 68;

  function create({ escape: escapeHtml, art, tactics }) {
    function deckOption({ deck, index, activeIndex, defaultSize }) {
      const active = index === activeIndex;
      const name = deck ? deck.name : '默认牌组';
      const count = deck ? deck.cards.length + ' / ' + DECK_SIZE : defaultSize + ' 张初始卡牌';
      return '<article class="cb-deck-option' + (active ? ' active' : '') + '"><button type="button" class="deck-select"'
        + ' data-idx="' + index + '" aria-pressed="' + active + '"><span><strong>' + escapeHtml(name) + '</strong><small>'
        + count + '</small></span><span class="cb-deck-use">' + (active ? '使用中' : '点击使用') + '</span></button>'
        + (deck ? '<div class="cb-deck-tools"><button type="button" class="btn btn-outline btn-sm deck-edit" data-idx="'
          + index + '">编辑</button><button type="button" class="btn btn-outline btn-sm deck-del" data-idx="' + index
          + '" aria-label="删除 ' + escapeHtml(name) + '">删除</button></div>' : '') + '</article>';
    }

    function list({ decks, activeIndex, defaultSize }) {
      return '<header class="cb-deck-heading"><div><p>布阵之前</p><h2>套牌管理</h2></div><div class="cb-deck-heading-actions">'
        + '<button type="button" class="btn btn-gold btn-sm" id="deck-new">新建套牌</button>'
        + '<button type="button" class="btn btn-outline btn-sm" id="deck-back">返回</button></div></header>'
        + '<p class="cb-deck-intro">自定义套牌需要恰好 30 张。组合随从与法术，安排每回合的灵力支出。</p>'
        + '<div class="cb-deck-list">' + deckOption({ deck: null, index: -1, activeIndex, defaultSize })
        + decks.map((deck, index) => deckOption({ deck, index, activeIndex })).join('') + '</div>';
    }

    function curve(summary) {
      const peak = Math.max(1, ...summary.curve.map(item => item.count));
      return '<section class="cb-deck-analysis" aria-label="套牌分析"><div class="cb-deck-metrics">'
        + '<span><small>随从</small><strong>' + summary.minions + '</strong></span>'
        + '<span><small>法术</small><strong>' + summary.spells + '</strong></span>'
        + '<span><small>平均费用</small><strong>' + summary.average.toFixed(1) + '</strong></span></div>'
        + '<h3>灵力费用曲线</h3><div class="cb-cost-curve">'
        + summary.curve.map(item => '<div class="cb-cost-column" aria-label="' + item.label + ' 费 ' + item.count
          + ' 张"><span>' + item.count + '</span><i style="height:' + item.count / peak * CURVE_HEIGHT
          + 'px"></i><small>' + item.label + '</small></div>').join('') + '</div></section>';
    }

    function currentCards({ deck, catalog }) {
      const counts = deck.cards.reduce((result, id) => ({ ...result, [id]: (result[id] || 0) + 1 }), {});
      const known = Object.entries(counts).filter(([id]) => catalog[id]);
      const unknown = Object.keys(counts).filter(id => !catalog[id]);
      const rows = known.sort(([a], [b]) => catalog[a].cost - catalog[b].cost).map(([id, count]) => {
        const card = catalog[id];
        return '<button type="button" class="de-remove" data-cid="' + escapeHtml(id) + '" aria-label="移除一张 '
          + escapeHtml(card.name) + '"><span class="cb-deck-cost">' + card.cost + '</span><span class="cb-deck-card-name">'
          + escapeHtml(card.name) + '</span><small>×' + count + '</small><span aria-hidden="true">−</span></button>';
      }).join('');
      const errors = unknown.map(id => '<p class="cb-deck-error">无法识别卡牌：' + escapeHtml(id) + '</p>').join('');
      return '<section class="cb-current-deck"><h3>当前套牌 <span>点击移除一张</span></h3>'
        + (rows || '<p class="cb-deck-empty">套牌为空<br>从卡牌库添加你的第一张牌</p>') + errors + '</section>';
    }

    function availableCard({ card, count, owned, deckSize }) {
      const available = count < owned && deckSize < DECK_SIZE;
      const reason = deckSize >= DECK_SIZE ? '套牌已满（30/30）' : '已达到拥有上限';
      return '<button type="button" class="de-add-item' + (available ? ' de-add' : '') + '" data-cid="'
        + escapeHtml(card.id) + '" aria-disabled="' + !available + '"'
        + (available ? '' : ' data-disabled-reason="' + reason + '"') + '><span class="cb-deck-cost">' + card.cost
        + '</span><span class="cb-deck-card-art">' + art(card) + '</span><span class="cb-deck-card-copy"><strong>'
        + escapeHtml(card.name) + '</strong><small>' + (card.type === 'minion' ? '攻击 ' + card.atk + ' · 生命 ' + card.hp
          : escapeHtml(card.desc)) + '</small></span><span class="cb-deck-owned">' + count + ' / ' + owned
        + '<small>已用 / 拥有</small></span><span class="cb-deck-add-symbol" aria-hidden="true">' + (available ? '+' : '—') + '</span></button>';
    }

    function library({ deck, collection, catalog }) {
      const counts = deck.cards.reduce((result, id) => ({ ...result, [id]: (result[id] || 0) + 1 }), {});
      const available = Object.values(catalog).filter(card => collection[card.id] > 0).sort((a, b) => a.cost - b.cost);
      return '<section class="cb-deck-library"><h3>卡牌库 <span>按灵力费用排列</span></h3><div class="cb-deck-library-grid">'
        + available.map(card => availableCard({ card, count: counts[card.id] || 0, owned: collection[card.id], deckSize: deck.cards.length }))
          .join('') + '</div></section>';
    }

    function editor({ deck, collection, catalog }) {
      const summary = tactics.deckSummary({ ids: deck.cards, catalog });
      return '<header class="cb-deck-heading"><div><p>套牌工坊</p><h2>' + escapeHtml(deck.name)
        + '</h2></div><span class="cb-deck-size' + (summary.total === DECK_SIZE ? ' complete' : '') + '">'
        + summary.total + '<small> / ' + DECK_SIZE + ' 张</small></span><div class="cb-deck-heading-actions">'
        + '<button type="button" class="btn btn-outline btn-sm" id="de-export">导出</button>'
        + '<button type="button" class="btn btn-outline btn-sm" id="de-import">导入</button>'
        + '<button type="button" class="btn btn-gold btn-sm" id="de-back">完成</button></div></header>'
        + '<div class="cb-deck-workbench"><aside class="cb-deck-sidebar">' + curve(summary)
        + currentCards({ deck, catalog }) + '</aside>' + library({ deck, collection, catalog }) + '</div>';
    }

    return Object.freeze({ list, editor });
  }

  return Object.freeze({ create });
});
