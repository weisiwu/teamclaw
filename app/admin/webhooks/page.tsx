'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AdminWebhooksRedirectContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings?tab=webhooks');
  }, [router]);
  return null;
}

export default function AdminWebhooksRedirectPage() {
  return (
    <Suspense>
      <AdminWebhooksRedirectContent />
    </Suspense>
  );
}
