import { StreamClosedError } from "./transport";

export enum PayloadType {
  JOINED = 0,
  SNAPSHOT = 1,
  PLAY_COIN = 2,
}

export interface NetEvent {
  type: PayloadType;
}

export interface PlayCoinCommand extends NetEvent {
  type: PayloadType.PLAY_COIN;
  column: bigint;
}

export type Command = PlayCoinCommand;

export interface SnapshotView extends NetEvent {
  type: PayloadType.SNAPSHOT;
  winnerId: bigint;
  columns: bigint;
  rows: bigint;
}

export type View = SnapshotView;

export const initNetStream = () => {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  function publishCommand(data: Command) {
    writer.write(data);
  }

  async function viewSubscription(onView: (view: SnapshotView) => void) {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        throw new StreamClosedError();
      }

      console.log('Received event:', value);
    }
  }

  return { publishCommand, viewSubscription }
}
