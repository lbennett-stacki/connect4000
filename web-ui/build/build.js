import { build } from 'esbuild';
import { utf8Plugin } from './plugins/utf8.js';

export const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  sourcemap: true,
  outfile: 'public/js/connect4000.js',
  plugins: [utf8Plugin],
  format: 'esm',
  platform: 'browser',
  minify: true,
  treeShaking: true,
  logLevel: 'info',
};

const main = async () => {
  await build(config);
};

main();
