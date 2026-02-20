import { Buffer } from 'node:buffer';

function isControllerClosedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybe = error as { code?: unknown; message?: unknown };
  if (maybe.code === 'ERR_INVALID_STATE') return true;
  if (typeof maybe.message === 'string' && /controller is already closed/i.test(maybe.message)) {
    return true;
  }

  return false;
}

export function nodeStreamToWeb(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  const textEncoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const destroyStream = () => {
        const destroy = (stream as { destroy?: (error?: Error) => void }).destroy;
        if (typeof destroy === 'function') {
          try {
            destroy.call(stream);
          } catch {
            // ignore
          }
        }
      };

      const cleanup = () => {
        const off = (stream as { off?: (event: string, listener: (...args: unknown[]) => void) => void }).off;
        if (typeof off === 'function') {
          off.call(stream, 'data', onData);
          off.call(stream, 'end', onEnd);
          off.call(stream, 'close', onClose);
          off.call(stream, 'error', onError);
          return;
        }

        const removeListener = (stream as {
          removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
        }).removeListener;
        if (typeof removeListener === 'function') {
          removeListener.call(stream, 'data', onData);
          removeListener.call(stream, 'end', onEnd);
          removeListener.call(stream, 'close', onClose);
          removeListener.call(stream, 'error', onError);
        }
      };

      const closeController = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      const onData = (chunk: unknown) => {
        if (closed) return;

        let payload: Uint8Array;
        if (chunk instanceof Uint8Array) {
          payload = chunk;
        } else if (Buffer.isBuffer(chunk)) {
          payload = new Uint8Array(chunk);
        } else if (typeof chunk === 'string') {
          payload = textEncoder.encode(chunk);
        } else {
          payload = textEncoder.encode(String(chunk ?? ''));
        }

        try {
          controller.enqueue(payload);
        } catch (error) {
          cleanup();
          if (isControllerClosedError(error)) {
            closed = true;
            destroyStream();
            return;
          }

          try {
            controller.error(error);
          } catch {
            // ignore
          }
          closed = true;
          destroyStream();
        }
      };

      const onEnd = () => {
        cleanup();
        closeController();
      };

      const onClose = () => {
        cleanup();
        closeController();
      };

      const onError = (error: unknown) => {
        cleanup();

        if (isControllerClosedError(error)) {
          closeController();
          return;
        }

        try {
          controller.error(error);
        } catch {
          // ignore
        }
        closed = true;
      };

      stream.on('data', onData);
      stream.on('end', onEnd);
      stream.on('close', onClose);
      stream.on('error', onError);
    },

    cancel() {
      const destroy = (stream as { destroy?: (error?: Error) => void }).destroy;
      if (typeof destroy === 'function') {
        try {
          destroy.call(stream);
        } catch {
          // ignore
        }
      }
    },
  });
}
