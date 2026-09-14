const vm = require('node:vm');

const TEMPLATE_QUOTE = '\x60';
const STRING_QUOTES = new Set(["'", '"', TEMPLATE_QUOTE]);
const REGEX_PREFIX_WORDS = new Set(['return', 'throw', 'case', 'typeof', 'void', 'delete', 'yield', 'await']);
const REGEX_PREFIX_SYMBOLS = new Set(['(', '[', '{', ',', ':', '=', '!', '?', ';', '&', '|']);

function quotedEnd(source, start) {
  const quote = source[start];
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === '\\') { index += 1; continue; }
    if (source[index] === quote) return index + 1;
  }
  throw new Error('模块字符串没有结束引号');
}

function regexEnd(source, start) {
  let characterClass = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\') { index += 1; continue; }
    if (character === '[') characterClass = true;
    if (character === ']') characterClass = false;
    if (character === '/' && !characterClass) return index + 1;
    if (character === '\n' || character === '\r') return start + 1;
  }
  return start + 1;
}

function canStartRegex(previous) {
  return !previous || REGEX_PREFIX_WORDS.has(previous.raw) || REGEX_PREFIX_SYMBOLS.has(previous.raw);
}

function commentEnd(source, index) {
  if (source.startsWith('//', index)) {
    const end = source.indexOf('\n', index + 2);
    return end < 0 ? source.length : end;
  }
  if (source.startsWith('/*', index)) return source.indexOf('*/', index + 2) + 2;
  return index;
}

function nextToken(source, index, previous) {
  const comment = commentEnd(source, index);
  if (comment > index) return { kind: 'skip', end: comment };
  const character = source[index];
  if (/\s/.test(character)) return { kind: 'skip', end: index + 1 };
  if (STRING_QUOTES.has(character)) {
    const end = quotedEnd(source, index);
    return { kind: 'string', raw: source.slice(index, end), end };
  }
  if (character === '/' && canStartRegex(previous)) {
    const end = regexEnd(source, index);
    if (end > index + 1) return { kind: 'regex', raw: source.slice(index, end), end };
  }
  const word = source.slice(index).match(/^[A-Za-z_$][\w$]*/);
  const raw = word ? word[0] : character;
  return { kind: word ? 'word' : 'symbol', raw, end: index + raw.length };
}

function tokenize(source) {
  const tokens = [];
  let previous = null;
  for (let index = 0; index < source.length;) {
    const token = nextToken(source, index, previous);
    index = token.end;
    if (token.kind === 'skip') continue;
    tokens.push(token);
    previous = token;
  }
  return tokens;
}

function literalDynamicImports(source) {
  const tokens = tokenize(source);
  const references = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const keyword = tokens[index];
    if (keyword.raw !== 'import' || tokens[index - 1]?.raw === '.') continue;
    if (tokens[index + 1]?.raw !== '(' || tokens[index + 2]?.kind !== 'string') continue;
    const literal = tokens[index + 2].raw;
    if (literal.startsWith(TEMPLATE_QUOTE) && literal.includes('$' + '{')) continue;
    references.push(vm.runInNewContext(literal));
  }
  return references;
}

module.exports = { literalDynamicImports };
