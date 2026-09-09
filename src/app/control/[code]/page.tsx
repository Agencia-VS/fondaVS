import Control from '@/components/Control';
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Control code={code.toUpperCase()} />;
}
