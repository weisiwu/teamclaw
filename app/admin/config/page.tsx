'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AdminConfigRedirectContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings?tab=system');
  }, [router]);
  return null;
}

export default function AdminConfigRedirectPage() {
  return (
    <Suspense>
      <AdminConfigRedirectContent />
    </Suspense>
  );
}
