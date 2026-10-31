import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const jsRoot = join(projectRoot, 'js');
const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
}
collect(jsRoot);
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout || ('Syntax check failed: ' + file + '\n'));
  }
}
for (const page of ['index.html', 'taste-lab.html']) {
  const html = readFileSync(join(projectRoot, page), 'utf8');
  const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  for (let i = 0; i < inlineScripts.length; i++) {
    const source = inlineScripts[i][1].trim();
    if (!source) continue;
    try { new vm.Script(source, { filename: page + ':inline-script-' + (i + 1) }); }
    catch (error) {
      failed = true;
      process.stderr.write(page + ': inline script ' + (i + 1) + ': ' + error.message + '\n');
    }
  }
}
if (failed) process.exit(1);
console.log('JavaScript syntax checks passed for ' + files.length + ' files and inline scripts in both pages.');
