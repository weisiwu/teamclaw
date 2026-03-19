'use client';

import { Badge } from '@/components/ui/badge';

interface PriorityBadgeProps {
  priority: number;
  showValue?: boolean;
  className?: string;
}

function getPriorityLevel(priority: number): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
} {
  if (priority >= 30) return { label: '紧急', variant: 'error' };
  if (priority >= 15) return { label: '高', variant: 'warning' };
  if (priority >= 7) return { label: '中', variant: 'info' };
  return { label: '低', variant: 'default' };
}

export function PriorityBadge({ priority, showValue = true, className }: PriorityBadgeProps) {
  const { label, variant } = getPriorityLevel(priority);

  return (
    <Badge variant={variant} className={className}>
      {showValue ? `P${priority} ${label}` : label}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'suspended' | 'merged';
  className?: string;
}

function getStatusConfig(status: StatusBadgeProps['status']): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
} {
  switch (status) {
    case 'pending': return { label: '排队中', variant: 'default' };
    case 'processing': return { label: '处理中', variant: 'info' };
    case 'completed': return { label: '已完成', variant: 'success' };
    case 'suspended': return { label: '已挂起', variant: 'warning' };
    case 'merged': return { label: '已合并', variant: 'default' };
    default: return { label: status, variant: 'default' };
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, variant } = getStatusConfig(status);
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

interface RoleBadgeProps {
  role: 'admin' | 'vice_admin' | 'employee';
  className?: string;
}

function getRoleConfig(role: RoleBadgeProps['role']): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
} {
  switch (role) {
    case 'admin': return { label: '管理员', variant: 'error' };
    case 'vice_admin': return { label: '副管理员', variant: 'warning' };
    case 'employee': return { label: '员工', variant: 'default' };
    default: return { label: role, variant: 'default' };
  }
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { label, variant } = getRoleConfig(role);
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
