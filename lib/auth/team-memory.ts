/**
 * 团队成员记忆化
 * TeamClaw 人员与权限模块 - 记录成员角色、最近活动、偏好设置
 */

import { Role } from './roles';

export interface MemberActivity {
  id: string;
  type: 'task_created' | 'task_completed' | 'version_created' | 'build_triggered' | 'member_added' | 'setting_changed';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MemberPreferences {
  language: 'zh' | 'en';
  theme: 'light' | 'dark' | 'system';
  notificationEnabled: boolean;
  emailDigest: 'daily' | 'weekly' | 'never';
  defaultPageSize: number;
}

export interface TeamMemberMemory {
  memberId: string;
  role: Role;
  joinedAt: string;
  lastActiveAt: string;
  activityCount: number;
  recentActivities: MemberActivity[];
  preferences: MemberPreferences;
  stats: {
    tasksCreated: number;
    tasksCompleted: number;
    versionsCreated: number;
    buildsTriggered: number;
    lastTaskAt?: string;
    lastVersionAt?: string;
  };
  tags: string[]; // 自定义标签
  notes: string; // 管理员备注
}

const STORAGE_KEY = 'teamclaw_member_memory';

const DEFAULT_PREFERENCES: MemberPreferences = {
  language: 'zh',
  theme: 'system',
  notificationEnabled: true,
  emailDigest: 'weekly',
  defaultPageSize: 20,
};

const DEFAULT_MEMORY: Omit<TeamMemberMemory, 'memberId' | 'role' | 'joinedAt'> = {
  lastActiveAt: new Date().toISOString(),
  activityCount: 0,
  recentActivities: [],
  preferences: { ...DEFAULT_PREFERENCES },
  stats: {
    tasksCreated: 0,
    tasksCompleted: 0,
    versionsCreated: 0,
    buildsTriggered: 0,
  },
  tags: [],
  notes: '',
};

export function getMemberMemory(memberId: string): TeamMemberMemory | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${memberId}`);
    if (!stored) return null;
    return JSON.parse(stored) as TeamMemberMemory;
  } catch {
    return null;
  }
}

export function initMemberMemory(memberId: string, role: Role): TeamMemberMemory {
  const memory: TeamMemberMemory = {
    memberId,
    role,
    joinedAt: new Date().toISOString(),
    ...DEFAULT_MEMORY,
  };
  saveMemberMemory(memory);
  return memory;
}

export function saveMemberMemory(memory: TeamMemberMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}_${memory.memberId}`, JSON.stringify(memory));
}

export function updateLastActive(memberId: string): void {
  const memory = getMemberMemory(memberId);
  if (!memory) return;
  memory.lastActiveAt = new Date().toISOString();
  saveMemberMemory(memory);
}

export function recordActivity(
  memberId: string,
  activity: Omit<MemberActivity, 'id' | 'timestamp'>
): void {
  const memory = getMemberMemory(memberId);
  if (!memory) return;

  const newActivity: MemberActivity = {
    ...activity,
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  memory.activityCount += 1;
  memory.lastActiveAt = new Date().toISOString();
  memory.recentActivities = [newActivity, ...memory.recentActivities].slice(0, 50);

  // 更新统计数据
  switch (activity.type) {
    case 'task_created':
      memory.stats.tasksCreated += 1;
      memory.stats.lastTaskAt = newActivity.timestamp;
      break;
    case 'task_completed':
      memory.stats.tasksCompleted += 1;
      break;
    case 'version_created':
      memory.stats.versionsCreated += 1;
      memory.stats.lastVersionAt = newActivity.timestamp;
      break;
    case 'build_triggered':
      memory.stats.buildsTriggered += 1;
      break;
  }

  saveMemberMemory(memory);
}

export function updateMemberPreferences(
  memberId: string,
  preferences: Partial<MemberPreferences>
): MemberPreferences | null {
  const memory = getMemberMemory(memberId);
  if (!memory) return null;
  memory.preferences = { ...memory.preferences, ...preferences };
  saveMemberMemory(memory);
  return memory.preferences;
}

export function updateMemberRole(memberId: string, newRole: Role): void {
  const memory = getMemberMemory(memberId);
  if (!memory) return;
  memory.role = newRole;
  saveMemberMemory(memory);
}

export function updateMemberNotes(memberId: string, notes: string): void {
  const memory = getMemberMemory(memberId);
  if (!memory) return;
  memory.notes = notes;
  saveMemberMemory(memory);
}

export function updateMemberTags(memberId: string, tags: string[]): void {
  const memory = getMemberMemory(memberId);
  if (!memory) return;
  memory.tags = tags;
  saveMemberMemory(memory);
}

export function getAllMemberMemories(): TeamMemberMemory[] {
  if (typeof window === 'undefined') return [];
  const memories: TeamMemberMemory[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY)) {
      try {
        const val = localStorage.getItem(key);
        if (val) memories.push(JSON.parse(val) as TeamMemberMemory);
      } catch {
        // skip
      }
    }
  }
  return memories;
}

export function deleteMemberMemory(memberId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY}_${memberId}`);
}
