import { Member, CreateMemberRequest, UpdateMemberRequest, MemberListResponse } from "./types";

// 模拟数据
const mockMembers: Member[] = [
  {
    id: "m_001",
    name: "卫思伍",
    role: "admin",
    weight: 100,
    createdAt: "2026-01-15 10:00:00",
  },
  {
    id: "m_002",
    name: "张三",
    role: "sub_admin",
    weight: 80,
    createdAt: "2026-01-20 14:30:00",
  },
  {
    id: "m_003",
    name: "李四",
    role: "member",
    weight: 60,
    createdAt: "2026-02-01 09:15:00",
  },
  {
    id: "m_004",
    name: "王五",
    role: "member",
    weight: 50,
    createdAt: "2026-02-10 16:45:00",
  },
  {
    id: "m_005",
    name: "赵六",
    role: "member",
    weight: 40,
    createdAt: "2026-03-01 11:20:00",
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 模拟 API 实现
let members = [...mockMembers];

export const memberApi = {
  // 获取成员列表
  async getList(): Promise<MemberListResponse> {
    await delay(300);
    return {
      data: [...members],
      total: members.length,
    };
  },

  // 获取成员详情
  async getById(id: string): Promise<Member | null> {
    await delay(200);
    return members.find((m) => m.id === id) || null;
  },

  // 创建成员
  async create(data: CreateMemberRequest): Promise<Member> {
    await delay(300);
    const newMember: Member = {
      id: `m_${Date.now()}`,
      name: data.name,
      role: data.role,
      weight: data.weight,
      createdAt: new Date().toLocaleString("zh-CN"),
    };
    members = [newMember, ...members];
    return newMember;
  },

  // 更新成员
  async update(id: string, data: UpdateMemberRequest): Promise<Member> {
    await delay(300);
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error("成员不存在");

    members[index] = { ...members[index], ...data };
    return members[index];
  },

  // 删除成员
  async delete(id: string): Promise<void> {
    await delay(300);
    members = members.filter((m) => m.id !== id);
  },
};

export default memberApi;
