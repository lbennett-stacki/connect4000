import { Color } from '../colors';
import {
  deserializeSnapshot,
  u64FromBigEndianBytes,
  u64ToBigEndianBytes,
} from './serialize';

export enum PayloadType {
  JOINED = 0,
  SNAPSHOT = 1,
  PLAY_COIN = 2,
}

export interface NetEvent {
  type: PayloadType;
}

export class PlayCoinCommand implements NetEvent {
  type = PayloadType.PLAY_COIN;

  constructor(public readonly column: bigint) { }

  serialize(): ArrayBuffer {
    const column = u64ToBigEndianBytes(this.column);

    const buffer = new Int8Array([
      this.type,
      ...column
    ]);

    return buffer;
  }
}

export interface SnapshotView extends NetEvent {
  type: PayloadType.SNAPSHOT;
  winnerId: bigint;
  columns: bigint;
  rows: bigint;
  coins: Coin[][];
}

export type View = SnapshotView;

export type PublishCommand = (data: PlayCoinCommand) => Promise<void>;
export type ViewSubscription = (onView: OnView) => Promise<void>;

export interface Coin {
  group: bigint;
  color: Color;
}

export type OnView = (view: View) => void;

export class StreamClosedError extends Error {
  constructor() {
    super('Stream closed');
  }
}

const joinServer = async (readable: ReadableStream) => {
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
  const playerId = u64FromBigEndianBytes(playerIdSegment);
  const colorSegment = joinedValue.slice(9);
  const color = Color.deserialize(colorSegment[0]);

  reader.releaseLock();

  return { playerId, color };
};

const readThread = async ({
  readable,
  onView,
}: {
  readable: ReadableStream;
  onView: OnView;
}) => {
  const { color, playerId } = await joinServer(readable);

  console.info('joined server', { color, id: playerId })

  const reader = readable.getReader();

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      throw new StreamClosedError();
    }

    const view =
      deserializeSnapshot(value);

    onView(view);
  }
};

export const initNetStream = ({
  writable,
  readable,
}: {
  writable: WritableStream;
  readable: ReadableStream;
}) => {
  const writer = writable.getWriter();

  const publishCommand = async (data: PlayCoinCommand) => {
    await writer.write(data.serialize());
  };

  const viewSubscription = async (onView: OnView) => {
    await readThread({
      readable,
      onView,
    });
  };

  return { publishCommand, viewSubscription };
};
