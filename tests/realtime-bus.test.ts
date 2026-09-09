import { beforeEach, expect, it, vi } from 'vitest';
import { Bus } from '@/lib/realtime/bus';

const remote = vi.hoisted(() => ({
  status: undefined as undefined | ((status: string, error?: Error) => void),
  listener: undefined as undefined | ((message: { payload: unknown }) => void),
  send: vi.fn(async () => 'ok'),
  remove: vi.fn(),
  create: vi.fn(),
  authenticate: vi.fn(async () => {}),
}));
vi.mock('@/lib/supabase/browser', () => ({
  realtimeSession: remote.authenticate,
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
  remote.authenticate.mockClear();
});

it('can send after Supabase recovers from an initial subscription failure', async () => {
  const received = vi.fn();
  const disconnected = vi.fn();
  const bus = new Bus('room', false, disconnected);
  const subscription = bus.listen('state', received);
  await vi.waitFor(() => expect(remote.status).toBeTypeOf('function'));
  remote.status!('CHANNEL_ERROR', new Error('You do not have permissions to read this topic'));
  await expect(subscription).rejects.toThrow(
    'canal de estado (CHANNEL_ERROR). Detalle de Supabase: You do not have permissions',
  );
  remote.status!('SUBSCRIBED');
  remote.listener!({ payload: { version: 1 } });
  expect(received).toHaveBeenCalledWith({ version: 1 });
  await expect(bus.send('state', { hello: 'recovered' })).resolves.toBeUndefined();
  expect(remote.send).toHaveBeenCalledOnce();
  expect(disconnected).toHaveBeenCalledOnce();
  bus.close();
});

it('sets the authenticated Realtime session before creating a private channel', async () => {
  let authenticated!: () => void;
  remote.authenticate.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      authenticated = resolve;
    }),
  );
  const bus = new Bus('authenticated-room', false);
  const subscription = bus.listen('state', vi.fn());
  expect(remote.authenticate).toHaveBeenCalledOnce();
  expect(remote.create).not.toHaveBeenCalled();
  authenticated();
  await vi.waitFor(() => expect(remote.create).toHaveBeenCalledOnce());
  remote.status!('SUBSCRIBED');
  await subscription;
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
  await vi.waitFor(() => expect(remote.status).toBeTypeOf('function'));
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
