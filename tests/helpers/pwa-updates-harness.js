const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class BrowserCustomEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail;
  }
}

class TestElement extends EventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
  }

  setAttribute(name, value) { this.attributes.set(name, value); }

  append(...elements) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }

  remove() {
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
  }
}

class TestWorker extends EventTarget {
  constructor() {
    super();
    this.state = 'installed';
    this.messages = [];
  }

  postMessage(message) { this.messages.push(message); }

  changeState(state) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

function findElement(root, predicate) {
  const queue = [root];
  while (queue.length) {
    const element = queue.shift();
    if (predicate(element)) return element;
    queue.push(...element.children);
  }
  return undefined;
}

async function createUpdateHarness(options = {}) {
  const state = { registrations: [], reloads: 0, errors: [] };
  const worker = new TestWorker();
  const registration = Object.assign(new EventTarget(), {
    waiting: options.waiting === false ? null : worker,
    installing: options.installing ? worker : null,
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: options.firstInstall ? null : {},
    async register(url, config) {
      state.registrations.push({ url, config });
      if (options.registerError) throw options.registerError;
      return registration;
    },
  });
  const document = Object.assign(new EventTarget(), {
    body: new TestElement('body'),
    currentScript: { src: 'https://example.test/app/js/pwa-updates.js' },
    createElement(tag) { return new TestElement(tag); },
  });
  const context = vm.createContext({
    navigator: { serviceWorker }, document, URL, CustomEvent: BrowserCustomEvent,
    location: { reload() { state.reloads += 1; } },
    console: { error(...args) { state.errors.push(args); } },
  });
  const source = fs.readFileSync(path.resolve(__dirname, '../../js/pwa-updates.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'pwa-updates.js' });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    state, worker, serviceWorker, registration, document,
    button(label) {
      return findElement(document.body, (node) => node.tagName === 'button' && node.textContent === label);
    },
    notice() { return findElement(document.body, (node) => node.className === 'pwa-update-notice'); },
  };
}

module.exports = { createUpdateHarness };
