import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Layers, 
  GitBranch, 
  Zap, 
  Clock, 
  FileText, 
  Key, 
  Users,
  Activity
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  { href: "/tasks", label: "任务管理", icon: Layers, description: "管理自动化任务" },
  { href: "/versions", label: "版本管理", icon: GitBranch, description: "版本发布控制" },
  { href: "/capabilities", label: "能力配置", icon: Zap, description: "AI 能力配置" },
  { href: "/cron", label: "定时任务", icon: Clock, description: "定时任务调度" },
  { href: "/docs", label: "文档中心", icon: FileText, description: "知识库文档" },
  { href: "/tokens", label: "Token 管理", icon: Key, description: "API 令牌管理" },
  { href: "/members", label: "成员管理", icon: Users, description: "团队成员管理" },
];

export default function Home() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">控制台</h1>
          <p className="text-gray-500 mt-1">欢迎使用 TeamClaw 管理后台</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>系统运行正常</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
