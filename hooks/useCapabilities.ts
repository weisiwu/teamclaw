import { useEffect, useState } from 'react';
import { getAbilities } from '@/lib/api/capabilities';

export interface Ability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredRole: string;
}

export function useCapabilities() {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await getAbilities();
      setAbilities(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return { abilities, loading, error, refetch: fetch };
}
