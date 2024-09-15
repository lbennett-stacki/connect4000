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

  constructor(public readonly column: bigint) {}

  serialize(): ArrayBuffer {
    const column = u64ToBigEndianBytes(this.column);

    const buffer = new Int8Array([this.type, ...column]);

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

export interface JoinedView extends NetEvent {
  type: PayloadType.JOINED;
  playerId: bigint;
  color: number;
}

export type View = SnapshotView | JoinedView;

export type PublishCommand = (data: PlayCoinCommand) => Promise<void>;
export type ViewSubscription = (config: { onView: OnView }) => {
  run: () => Promise<void>;
  abortController: AbortController;
};

export interface Coin {
  color: Color;
}

export type OnView = (view: View) => void;

export class StreamClosedError extends Error {
  constructor() {
    super('Stream closed');
  }
}

const joinServer = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  const { value: bytes, done } = await reader.read();

  if (done) {
    throw new StreamClosedError();
  }

  const payloadType = bytes[0];
  if (payloadType !== 0) {
    throw new Error(`invalid joined payload type ${payloadType}`);
  }
  const playerIdSegment = bytes.slice(1, 9);
  const playerId = u64FromBigEndianBytes(playerIdSegment);
  const color = Color.deserialize(bytes[9]);

  const remainingBytes = bytes.slice(10);

  return { playerId, color, remainingBytes };
};

const readThread = ({
  readable,
  onView,
}: {
  readable: ReadableStream;
  onView: OnView;
}) => {
  const abortController = new AbortController();

  const run = async () => {
    const reader = readable.getReader();

    const { color, playerId, remainingBytes } = await joinServer(reader);

    onView({ type: PayloadType.JOINED, color: color.serialize(), playerId });

    if (remainingBytes) {
      const view = deserializeSnapshot(remainingBytes);
      onView(view);
    }

    while (!abortController.signal.aborted) {
      const { value, done } = await reader.read();

      if (done) {
        throw new StreamClosedError();
      }

      const view = deserializeSnapshot(value);

      onView(view);
    }
  };

  return { abortController, run };
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

  const viewSubscription: ViewSubscription = ({ onView }) => {
    const thread = readThread({
      readable,
      onView,
    });

    return thread;
  };

  return { publishCommand, viewSubscription };
};
