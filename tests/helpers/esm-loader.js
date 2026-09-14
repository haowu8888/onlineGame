const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL, fileURLToPath } = require('node:url');

async function loadESModule(entryPath, globals = {}) {
  if (!vm.SourceTextModule) throw new Error('ES 模块测试需要 node --experimental-vm-modules');
  const root = path.resolve(__dirname, '../..');
  const entry = path.resolve(root, entryPath);
  const context = vm.createContext({ console, URL, setTimeout, clearTimeout, ...globals });
  const modules = new Map();
  function readModule(filename) {
    if (modules.has(filename)) return modules.get(filename);
    const identifier = pathToFileURL(filename).href;
    const source = fs.readFileSync(filename, 'utf8');
    const module = new vm.SourceTextModule(source, {
      context, identifier,
      initializeImportMeta(meta) { meta.url = identifier; },
    });
    modules.set(filename, module);
    return module;
  }
  const module = readModule(entry);
  await module.link((specifier, referencingModule) => {
    const url = new URL(specifier, referencingModule.identifier);
    if (url.protocol !== 'file:') throw new Error(`测试模块只支持本地导入：${specifier}`);
    return readModule(fileURLToPath(url));
  });
  await module.evaluate({ timeout: 1000 });
  return { namespace: module.namespace, context };
}

module.exports = { loadESModule };
