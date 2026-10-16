import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = 'd3259214a9e0340c4a6cff9ec5f8ff5953eee6f2';
const root = new URL('../src/obd/signals/vendor/', import.meta.url);
await mkdir(root, { recursive: true });
for (const [source, target] of [['signalsets/v3/default.json', 'saej1979.json'], ['LICENSE', 'LICENSE.txt']]) {
  const response = await fetch(`https://raw.githubusercontent.com/OBDb/SAEJ1979/${revision}/${source}`);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const text = await response.text();
  if (source.endsWith('.json')) JSON.parse(text);
  await writeFile(new URL(target, root), text);
  console.log(target, createHash('sha256').update(text).digest('hex'));
}
