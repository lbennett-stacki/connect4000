import { App } from './app.js';

export const mount = async ({ document }: { document: Document }) => {
  const mount = document.querySelector('#app');

  if (!mount) {
    throw new Error('No mount point');
  }

  const { canvas, init } = await App({ document });

  mount.append(canvas);

  await init();
};
