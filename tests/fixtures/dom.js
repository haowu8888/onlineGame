// DOM 依赖测试桩：解析真实页面标签，保留节点替换、事件与焦点行为。
function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}

function simpleMatch(node, selector) {
  const id = selector.match(/#([\w-]+)/);
  const tag = selector.match(/^[\w-]+/);
  const classes = [...selector.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
  const attributes = [...selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)];
  return (!id || node.id === id[1]) && (!tag || node.tagName === tag[0].toUpperCase()) &&
    classes.every(name => node.className.split(/\s+/).includes(name)) &&
    attributes.every(([, name, value]) => node.hasAttribute(name) &&
      (value === undefined || node.getAttribute(name) === value));
}

function matches(node, selector) {
  const parts = selector.trim().split(/\s+/);
  if (!simpleMatch(node, parts.pop())) return false;
  let parent = node.parentNode;
  while (parts.length) {
    const part = parts.pop();
    while (parent && !simpleMatch(parent, part)) parent = parent.parentNode;
    if (!parent) return false;
    parent = parent.parentNode;
  }
  return true;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function parseMarkup(parent, markup) {
  const stack = [parent];
  for (const token of markup.matchAll(/<!--[\s\S]*?-->|<\/?([A-Za-z][\w:-]*)\b[^>]*>|([^<]+)/g)) {
    if (token[2]) { stack[stack.length - 1]._text += token[2]; continue; }
    if (!token[1]) continue;
    const tag = token[1].toLowerCase();
    if (token[0].startsWith('</')) {
      const index = stack.map(node => node.tagName).lastIndexOf(tag.toUpperCase());
      if (index > 0) stack.splice(index);
      continue;
    }
    const node = createElement(tag, parent.ownerDocument);
    const text = token[0].slice(tag.length + 1, -1);
    const attributes = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    for (const [, key, quoted, single, bare] of text.matchAll(attributes)) {
      node.setAttribute(key, quoted ?? single ?? bare ?? '');
    }
    stack[stack.length - 1].appendChild(node);
    if (!VOID_TAGS.has(tag) && !token[0].endsWith('/>')) stack.push(node);
  }
}

function createClassList(node) {
  return {
    contains(name) { return node.className.split(/\s+/).includes(name); },
    add(...names) {
      node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...names])].join(' ');
    },
    remove(...names) {
      node.className = node.className.split(/\s+/).filter(name => !names.includes(name)).join(' ');
    },
    toggle(name, force) {
      const active = force ?? !this.contains(name);
      active ? this.add(name) : this.remove(name);
      return active;
    },
  };
}

function attachEvents(node) {
  const listeners = new Map();
  node.addEventListener = (name, callback) => {
    listeners.set(name, [...(listeners.get(name) ?? []), callback]);
  };
  node.removeEventListener = (name, callback) => {
    listeners.set(name, (listeners.get(name) ?? []).filter(value => value !== callback));
  };
  node.dispatchEvent = event => {
    for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event);
  };
  node.click = () => node.dispatchEvent({
    type: 'click', target: node, currentTarget: node, preventDefault() {}, stopPropagation() {},
  });
}

function createDataset(node) {
  return new Proxy({}, {
    set(target, key, value) {
      const name = 'data-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
      node.attrs[name] = String(value);
      target[key] = String(value);
      return true;
    },
  });
}

function setNodeAttribute(node, key, value) {
  node.attrs[key] = String(value);
  if (key === 'id') node.id = String(value);
  if (key === 'class') node.className = String(value);
  if (key === 'value') node.value = String(value);
  if (key === 'hidden') node.hidden = true;
  if (key.startsWith('data-')) {
    node.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = String(value);
  }
}

function createTreeMethods() {
  return {
    appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; },
    append(...children) { children.forEach(child => this.appendChild(child)); },
    insertBefore(child, reference) {
      if (reference === null) return this.appendChild(child);
      if (!this.children.includes(reference)) throw new Error('Reference node is not a child');
      child.remove();
      child.parentNode = this;
      this.children.splice(this.children.indexOf(reference), 0, child);
      return child;
    },
    replaceChildren(...children) {
      this._text = '';
      [...this.children].forEach(child => child.remove());
      this.append(...children);
    },
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    },
    querySelectorAll(selector) { return descendants(this).filter(child => selector.split(',').some(part => matches(child, part))); },
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; },
    contains(child) { return child === this || descendants(this).includes(child); },
    closest(selector) { return matches(this, selector) ? this : this.parentNode?.closest(selector) ?? null; },
  };
}

function attachContent(node) {
  Object.defineProperty(node, 'textContent', {
    get() { return this._text + this.children.map(child => child.textContent).join(''); },
    set(value) { this.replaceChildren(); this._text = String(value); },
  });
  Object.defineProperty(node, 'innerHTML', {
    get() { return this._markup ?? ''; },
    set(value) { this._markup = String(value); this.replaceChildren(); parseMarkup(this, this._markup); },
  });
}

function createElement(tag, ownerDocument) {
  const node = {
    tagName: tag.toUpperCase(), ownerDocument, id: '', className: '', children: [], parentNode: null,
    attrs: {}, dataset: {}, value: '', hidden: false, _text: '',
    style: { setProperty() {}, removeProperty() {} },
    ...createTreeMethods(),
    setAttribute(key, value) { setNodeAttribute(this, key, value); },
    getAttribute(key) { return this.attrs[key] ?? null; },
    hasAttribute(key) { return Object.hasOwn(this.attrs, key); },
    removeAttribute(key) { delete this.attrs[key]; if (key === 'hidden') this.hidden = false; },
    focus() { this.ownerDocument.activeElement = this; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
  };
  node.dataset = createDataset(node);
  node.classList = createClassList(node);
  attachEvents(node);
  attachContent(node);
  return node;
}

function makeDom(html = '') {
  const document = { readyState: 'loading', activeElement: null };
  const body = createElement('body', document);
  Object.assign(document, {
    body, documentElement: body,
    createElement: tag => createElement(tag, document),
    createDocumentFragment: () => createElement('fragment', document),
    getElementById: id => descendants(body).find(node => node.id === id) ?? null,
    querySelector: selector => body.querySelector(selector),
    querySelectorAll: selector => body.querySelectorAll(selector),
  });
  attachEvents(document);
  body.innerHTML = html;
  return document;
}

module.exports = { makeDom };
