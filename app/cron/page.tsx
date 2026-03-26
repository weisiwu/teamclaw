'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CronRedirectContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings?tab=cron');
  }, [router]);
  return null;
}

export default function CronRedirectPage() {
  return (
    <Suspense>
      <CronRedirectContent />
    </Suspense>
  );
}
