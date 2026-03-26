'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AdminAuditRedirectContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings?tab=audit');
  }, [router]);
  return null;
}

export default function AdminAuditRedirectPage() {
  return (
    <Suspense>
      <AdminAuditRedirectContent />
    </Suspense>
  );
}
