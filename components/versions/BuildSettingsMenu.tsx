'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, RotateCcw, Bell, Globe } from 'lucide-react';
import { BuildRetrySettingsDialog } from './BuildRetrySettingsDialog';
import { BuildNotificationSettingsDialog } from './BuildNotificationSettingsDialog';

interface BuildSettingsMenuProps {
  onEnvSelect?: () => void;
}

export function BuildSettingsMenu({ onEnvSelect }: BuildSettingsMenuProps) {
  const [retryOpen, setRetryOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            构建设置
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRetryOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            自动重试设置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setNotifyOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            通知设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEnvSelect}>
            <Globe className="h-4 w-4 mr-2" />
            默认环境
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BuildRetrySettingsDialog open={retryOpen} onOpenChange={setRetryOpen} />
      <BuildNotificationSettingsDialog open={notifyOpen} onOpenChange={setNotifyOpen} />
    </>
  );
}
