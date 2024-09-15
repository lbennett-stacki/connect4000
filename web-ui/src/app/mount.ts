import { PublishCommand, ViewSubscription } from '../net/stream.js';
import { App } from './app.js';

export const mount = async ({
  document,
  publishCommand,
  viewSubscription,
}: {
  document: Document;
  publishCommand: PublishCommand;
  viewSubscription: ViewSubscription;
}) => {
  const mount = document.querySelector('#app');

  if (!mount) {
    throw new Error('No mount point');
  }

  const { canvas, init } = await App({
    document,
    publishCommand,
    viewSubscription,
  });

  mount.append(canvas);

  const result = init();

  return result;
};
