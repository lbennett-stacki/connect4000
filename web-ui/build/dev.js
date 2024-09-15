import { context } from 'esbuild';
import { config } from './build.js';

const main = async () => {
  const ctx = await context({ ...config, minify: false });

  await ctx.watch();
};

main();
