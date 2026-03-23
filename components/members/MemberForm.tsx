"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegacySelect as Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { Member, MemberRole, MemberStatus, CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types";
import { MEMBER_ROLE_OPTIONS } from "@/lib/api/constants";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  onSubmit: (data: CreateMemberRequest | UpdateMemberRequest) => void;
  isLoading?: boolean;
}

export function MemberForm({ open, onOpenChange, member, onSubmit, isLoading }: MemberFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [weight, setWeight] = useState(50);
  const [status, setStatus] = useState<MemberStatus>("active");

  // Reset form when opening/closing or when member changes
  useEffect(() => {
    if (open) {
      if (member) {
        setName(member.name);
        setRole(member.role);
        setWeight(member.weight);
        setStatus(member.status || "active");
      } else {
        setName("");
        setRole("member");
        setWeight(50);
        setStatus("active");
      }
    }
  }, [open, member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (member) {
      onSubmit({
        name: name.trim(),
        role,
        weight,
        status,
      } as UpdateMemberRequest);
    } else {
      onSubmit({
        name: name.trim(),
        role,
        weight,
        status,
      } as CreateMemberRequest);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={member ? "编辑成员" : "添加成员"}
        onClose={() => onOpenChange(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入成员姓名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                options={MEMBER_ROLE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权重
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                placeholder="请输入权重 (0-100)"
              />
              <p className="text-xs text-gray-500 mt-1">权重范围: 0-100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                options={[
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "禁用" },
                ]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "保存中..." : member ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
