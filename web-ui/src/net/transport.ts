import { Color } from '../colors';
import { uint8ArrayToU64 } from '../numbers';
import { deserializeSnapshot } from './deserialize';

export interface Coin {
  group: bigint;
  color: Color;
}

export type OnRead = (data: { coins: Array<Coin[]>; winnerId: bigint; columns: bigint; rows: bigint; }) => void;

export class StreamClosedError extends Error {
  constructor() {
    super('Stream closed');
  }
}

const readThread = async ({ readable, onRead }: { readable: ReadableStream; onRead: OnRead }) => {
  const reader = readable.getReader();
  const { value: joinedValue, done } = await reader.read();

  if (done) {
    throw new StreamClosedError();
  }

  const payloadType = joinedValue[0];
  if (payloadType !== 0) {
    throw new Error(`invalid joined payload type ${payloadType}`);
  }
  const playerIdSegment = joinedValue.slice(1, 9);
  const playerId = uint8ArrayToU64(playerIdSegment);
  const colorSegment = joinedValue.slice(9);
  const color = Color.deserialize(colorSegment[0]);

  console.log(`Your player id is ${playerId}#${color}`);

  while (true) {
    const { value: snapshotValue, done } = await reader.read();

    if (done) {
      throw new StreamClosedError();
    }

    const { coins, winnerId, columns, rows } =
      deserializeSnapshot(snapshotValue);

    console.log('winner id is', { winnerId, coins, columns, rows });

    onRead({ coins, winnerId, columns, rows });
  }
};

function writeFactory({ writable }: { writable: WritableStream }) {
  async function write(data: Uint8Array) {
    const writer = writable.getWriter();
    writer.write(data);
  }

  return write;
}

export async function connect({ onRead }: { onRead: OnRead }) {
  const port = 4014;
  const url = new URL(`https://localhost:${port}`);
  const transport = new WebTransport(url);

  await transport.ready;

  const stream = await transport.createBidirectionalStream();

  const readable = stream.readable;
  const writable = stream.writable;

  readThread({ readable, onRead });

  const write = writeFactory({ writable });

  return {
    write,
  };
}
