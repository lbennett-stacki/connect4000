import {
  PlayCoinCommand,
  PublishCommand,
  ViewSubscription,
} from '../net/stream.js';
import { runApp } from './run.js';

export const App = async ({
  document,
  publishCommand,
  viewSubscription,
}: {
  document: Document;
  publishCommand: PublishCommand;
  viewSubscription: ViewSubscription;
}) => {
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';

  const init = async () => {
    const result = runApp({
      viewSubscription,
      canvas,
      dropCoin: async (column: bigint) => {
        await publishCommand(new PlayCoinCommand(column));
      },
    });

    return result;
  };

  return { canvas, init };
};
