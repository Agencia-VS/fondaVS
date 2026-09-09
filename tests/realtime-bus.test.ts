import { beforeEach, expect, it, vi } from 'vitest';
import { Bus } from '@/lib/realtime/bus';

const remote = vi.hoisted(() => ({
  status: undefined as undefined | ((status: string, error?: Error) => void),
  listener: undefined as undefined | ((message: { payload: unknown }) => void),
  send: vi.fn(async () => 'ok'),
  remove: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/supabase/browser', () => ({
  supabase: () => ({
    channel: () => {
      remote.create();
      return {
        on: (_type: string, _filter: unknown, listener: typeof remote.listener) => {
          remote.listener = listener;
        },
        subscribe: (status: typeof remote.status) => {
          remote.status = status;
        },
        send: remote.send,
      };
    },
    removeChannel: remote.remove,
  }),
}));
beforeEach(() => {
  remote.status = undefined;
  remote.send.mockClear();
  remote.remove.mockReset();
  remote.create.mockClear();
});

it('can send after Supabase recovers from an initial subscription failure', async () => {
  const received = vi.fn();
  const disconnected = vi.fn();
  const bus = new Bus('room', false, disconnected);
  const subscription = bus.listen('state', received);
  remote.status!('CHANNEL_ERROR', new Error('temporary connection failure'));
  await expect(subscription).rejects.toThrow();
  remote.status!('SUBSCRIBED');
  remote.listener!({ payload: { version: 1 } });
  expect(received).toHaveBeenCalledWith({ version: 1 });
  await expect(bus.send('state', { hello: 'recovered' })).resolves.toBeUndefined();
  expect(remote.send).toHaveBeenCalledOnce();
  expect(disconnected).toHaveBeenCalledOnce();
  bus.close();
});

it('waits for the previous subscription to close before recreating a controller channel', async () => {
  let removed!: () => void;
  remote.remove.mockReturnValue(
    new Promise<void>((resolve) => {
      removed = resolve;
    }),
  );
  const first = new Bus('reconnection', false);
  const initial = first.listen('state', vi.fn());
  remote.status!('SUBSCRIBED');
  await initial;
  first.close();
  const second = new Bus('reconnection', false);
  const reconnecting = second.listen('state', vi.fn());
  expect(remote.create).toHaveBeenCalledTimes(1);
  removed();
  await vi.waitFor(() => expect(remote.create).toHaveBeenCalledTimes(2));
  remote.status!('SUBSCRIBED');
  await reconnecting;
  await expect(second.send('state', { hello: true })).resolves.toBeUndefined();
  second.close();
});
