import { mount } from './app/mount.js';
import { initNetStream } from './net/stream.js';
import { connect } from './net/transport.js';

const main = async () => {
  const connection = connect();

  let onStop: (() => void) | null = null;

  const onDomContentLoaded = async () => {
    const { writable, readable } = await connection;

    const { publishCommand, viewSubscription } = initNetStream({
      writable,
      readable,
    });

    const result = await mount({ document, publishCommand, viewSubscription });

    onStop = result.tearDown;
  };

  document.addEventListener('DOMContentLoaded', onDomContentLoaded);

  const onBeforeUnload = async () => {
    const { disconnect } = await connection;
    const promise = disconnect();
    onStop?.();
    document.removeEventListener('DOMContentLoaded', onDomContentLoaded);
    await promise;
  };

  window.addEventListener('beforeunload', onBeforeUnload);

  const tearDown = () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    onBeforeUnload();
  };

  return { tearDown };
};

main();
