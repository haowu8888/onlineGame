#!/usr/bin/env node
// 零依赖运行器：每个测试文件都有独立进程和 60 秒硬超时。
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const TEST_TIMEOUT_MS = 60_000;
const dir = __dirname;
const files = readdirSync(dir).filter(file => file.endsWith('.test.js')).sort();

if (files.length === 0) {
  console.error('未找到测试文件（tests/*.test.js），验证未执行。');
  process.exit(1);
}

function runTestFile(file) {
  console.log('\n▶ ' + file);
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', join(dir, file)], {
    stdio: 'inherit',
    timeout: TEST_TIMEOUT_MS,
  });
  if (result.error) {
    const reason = result.error.code === 'ETIMEDOUT'
      ? '超过 ' + TEST_TIMEOUT_MS / 1000 + ' 秒，已终止'
      : (result.error.code || '启动失败') + ': ' + result.error.message;
    console.error('✖ ' + file + ' 失败：' + reason);
    return false;
  }
  if (result.status !== 0) {
    console.error('✖ ' + file + ' 失败 (exit ' + (result.status ?? result.signal) + ')');
    return false;
  }
  return true;
}

const failed = files.filter(file => !runTestFile(file)).length;
console.log('\n' + (files.length - failed) + '/' + files.length + ' 个测试文件通过');
process.exit(failed ? 1 : 0);
