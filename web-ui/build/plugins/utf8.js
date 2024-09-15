import { readFile } from 'fs/promises';
import { isAbsolute, join } from 'path';

export const utf8Plugin = {
  name: 'utf8-plugin',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'raw-ns',
        pluginData: {
          resolveDir: args.resolveDir,
        },
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'raw-ns' }, async (args) => {
      const filePath = args.path.replace(/\?raw$/, '');

      const absolutePath = isAbsolute(filePath)
        ? filePath
        : join(args.pluginData.resolveDir, filePath);

      const contents = await readFile(absolutePath, 'utf8');

      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: 'js',
      };
    });
  },
};
