import { useEffect, useState, useCallback } from 'react';
import { getDocs, DocItem } from '@/lib/api/docs';

export function useDocs(search?: string) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocs({ search, page: 1, pageSize: 100 });
      setDocs(data.list);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { docs, total, loading, error, refetch: fetch };
}
