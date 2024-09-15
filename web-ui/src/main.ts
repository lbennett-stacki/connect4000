import { mount } from './app/mount.js';
import { initNetStream } from './net/stream.js';
import { connect, OnRead } from './net/transport.js';

const main = async () => {
  const { publishCommand, viewSubscription } = initNetStream();

  const onRead: OnRead = ({ coins, winnerId, columns, rows }) => {
    console.log('BACKEND READ SYNC', { coins, winnerId, columns, rows });
  }

  const connection = connect({ onRead });

  document.addEventListener('DOMContentLoaded', async () => {
    const { write } = await connection;

    await mount({ document, write, publishCommand, viewSubscription });
  });

};

main();
