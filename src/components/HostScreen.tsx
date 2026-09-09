import WatchScreen from './WatchScreen';

export default function HostScreen({ code }: { code: string }) {
  // Old projector links remain usable as views; only /control owns the engine.
  return <WatchScreen code={code} />;
}
