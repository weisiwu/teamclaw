const BASE = '/api/v1';

export interface Ability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredRole: string;
}

export async function getAbilities(): Promise<Ability[]> {
  const res = await fetch(`${BASE}/abilities`);
  const data = await res.json();
  return data.data?.list || [];
}

export async function toggleAbility(id: string, enabled: boolean, userRole: string): Promise<Ability> {
  const res = await fetch(`${BASE}/abilities/${id}/toggle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
  return data.data;
}
