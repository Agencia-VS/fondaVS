import WatchScreen from '@/components/WatchScreen';
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <WatchScreen code={code.toUpperCase()} />;
}
