import { Capability, CapabilityListResponse } from "./types";

// 模拟数据
const mockCapabilities: Capability[] = [
  {
    id: "cap_001",
    name: "查看项目文档库",
    description: "允许查看项目文档库中的所有文档",
    enabled: true,
    icon: "FileText",
    createdAt: "2026-03-01 10:00:00",
    updatedAt: "2026-03-15 14:30:00",
  },
  {
    id: "cap_002",
    name: "查看项目详情",
    description: "允许查看项目的详细信息和配置",
    enabled: true,
    icon: "Info",
    createdAt: "2026-03-01 10:00:00",
    updatedAt: "2026-03-15 14:30:00",
  },
  {
    id: "cap_003",
    name: "查看任务列表",
    description: "允许查看所有任务及其状态",
    enabled: true,
    icon: "ListTodo",
    createdAt: "2026-03-01 10:00:00",
    updatedAt: "2026-03-15 14:30:00",
  },
  {
    id: "cap_004",
    name: "下载文件",
    description: "允许从项目中下载文件",
    enabled: false,
    icon: "Download",
    createdAt: "2026-03-01 10:00:00",
    updatedAt: "2026-03-16 09:00:00",
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 模拟 API 实现（使用 let 以支持状态更新）
// eslint-disable-next-line prefer-const
let capabilities: Capability[] = [...mockCapabilities];

export const capabilityApi = {
  // 获取能力列表
  async getList(): Promise<CapabilityListResponse> {
    await delay(200);
    return {
      data: capabilities,
      total: capabilities.length,
    };
  },

  // 更新能力状态
  async update(id: string, enabled: boolean): Promise<Capability> {
    await delay(300);
    const index = capabilities.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("能力不存在");

    capabilities[index] = {
      ...capabilities[index],
      enabled,
      updatedAt: new Date().toLocaleString("zh-CN"),
    };
    return capabilities[index];
  },
};

export default capabilityApi;
