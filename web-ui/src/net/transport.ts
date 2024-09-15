export async function connect() {
  const port = 4001;
  const url = new URL(`https://localhost:${port}`);
  const transport = new WebTransport(url);

  await transport.ready;

  const stream = await transport.createBidirectionalStream();

  const readable = stream.readable;
  const writable = stream.writable;

  const waitForDuration = (ms: number) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  const waitForUnlock = async (
    stream: ReadableStream | WritableStream
  ): Promise<boolean> => {
    if (!stream.locked) {
      return true;
    }

    await waitForDuration(1000);

    const result = await waitForUnlock(stream);

    return result;
  };

  const disconnect = async () => {
    transport.close();

    const closeReadable = async () => {
      await waitForUnlock(readable);
      await readable.cancel();
    };

    const closeWritable = async () => {
      await waitForUnlock(writable);
      await writable.close();
    };

    await Promise.all([closeReadable(), closeWritable()]);
  };

  return {
    writable,
    readable,
    disconnect,
  };
}
