import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-500 mt-1">系统配置与管理</p>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <SettingsIcon className="w-5 h-5" />
          <span>设置页面开发中...</span>
        </div>
      </div>
    </div>
  );
}
