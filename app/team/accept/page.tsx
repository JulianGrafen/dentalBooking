import { AcceptInviteCard } from '@/components/team/accept-invite-card';

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <AcceptInviteCard token={params.token ?? null} />
    </main>
  );
}
