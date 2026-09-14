'use strict';
{
  function makeText(className, text) {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createCard(view) {
    const card = document.createElement('div');
    card.className = 'exchange-item' + (view.soldOut ? ' sold-out' : '');
    card.dataset.id = view.item.id;
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-disabled', String(!view.available));
    card.setAttribute('aria-label', view.item.name + '，' + (view.available ? view.cost + '仙缘' : view.reason));
    const count = view.item.repeatable && view.count > 0 ? '（已买' + view.count + '次）' : '';
    card.append(
      makeText('exchange-item-icon', view.item.icon),
      makeText('exchange-item-name', view.item.name),
      makeText('exchange-item-desc', view.item.desc + count),
      makeText('exchange-item-desc', view.available ? view.reward.recipient : view.reason),
      makeText('exchange-item-cost', view.soldOut ? '已兑换' : view.cost + ' 仙缘'),
    );
    return card;
  }

  function init({ model, onChange }) {
    const grid = document.getElementById('exchange-grid');
    const balance = document.getElementById('exchange-balance');
    const points = document.createElement('span');
    points.id = 'exchange-pts';
    points.className = 'exchange-balance-text';
    balance.replaceChildren(points);

    function refresh() {
      points.textContent = '仙缘点: ' + model.getBalance();
      grid.replaceChildren(...model.list().map(createCard));
    }
    function purchase(event) {
      const card = event.target.closest('.exchange-item');
      if (!card || !grid.contains(card)) return;
      try {
        const result = model.purchase(card.dataset.id);
        refresh();
        onChange();
        if (typeof SoundManager !== 'undefined') SoundManager.play('purchase');
        showToast('兑换成功：' + result.item.name + ' · ' + result.recipient, 'success');
      } catch (error) {
        if (!(error instanceof PortalExchangeModel.ExchangeUnavailableError)) {
          console.error('仙缘兑换失败：', error);
        }
        showToast(error.message, 'error');
        refresh();
      }
    }
    grid.addEventListener('click', purchase);
    grid.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      purchase(event);
    });
    refresh();
    return Object.freeze({ refresh });
  }

  const api = Object.freeze({ init });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalExchange = api;
}
