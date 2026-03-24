import { VersionBumpType } from "./types";

export const API_BASE = '/api/v1';

// 统一的 fetch + JSON 解析
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || `API error: ${res.status}`);
}

// 自动递增版本号（纯函数，无状态依赖）
export function autoBumpVersion(currentVersion: string, bumpType: VersionBumpType): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`;
  }

  let [, major, minor, patch] = match.map(Number);

  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }

  return `v${major}.${minor}.${patch}`;
}
