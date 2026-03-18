/**
 * BranchSelector Component
 * 分支选择器 - 用于在表单中选择分支
 */
"use client";

import { GitBranch } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
}

interface BranchSelectorProps {
  branches: Branch[];
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
}

export function BranchSelector({ branches, value, onChange, disabled }: BranchSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <GitBranch className="w-4 h-4 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">选择分支</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.name}>
            {branch.name} {branch.isMain ? '(主分支)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default BranchSelector;
