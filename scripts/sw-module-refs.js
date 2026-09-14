// 仅使用 V8 解析模块语法，不链接或执行任何游戏代码。
const fs = require('node:fs');
const { SourceTextModule } = require('node:vm');
const { literalDynamicImports } = require('./sw-dynamic-imports.js');

function parseModule({ filename, source }) {
  const module = new SourceTextModule(source, { identifier: filename });
  return { filename, references: [...module.dependencySpecifiers, ...literalDynamicImports(source)] };
}

const sources = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(sources.map(parseModule)));
