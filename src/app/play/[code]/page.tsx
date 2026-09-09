import PlayerScreen from '@/components/PlayerScreen';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ code }, { team }] = await Promise.all([params, searchParams]);
  return <PlayerScreen code={code.toUpperCase()} initialTeam={team} />;
}
