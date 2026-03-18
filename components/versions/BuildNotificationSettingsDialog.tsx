'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getBuildEnhancementSettings, saveBuildEnhancementSettings } from '@/lib/api/versions';
import { NotifyOn, NotifyChannel } from '@/lib/api/types';

interface BuildNotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildNotificationSettingsDialog({ open, onOpenChange }: BuildNotificationSettingsDialogProps) {
  const [notifyOn, setNotifyOn] = useState<NotifyOn>('failure');
  const [notifyChannels, setNotifyChannels] = useState<NotifyChannel[]>(['feishu']);
  const [notifyEmails, setNotifyEmails] = useState<string>('');

  useEffect(() => {
    if (open) {
      const settings = getBuildEnhancementSettings();
      setNotifyOn(settings.notification.notifyOn);
      setNotifyChannels(settings.notification.notifyChannels);
      setNotifyEmails(settings.notification.notifyEmails?.join(', ') || '');
    }
  }, [open]);

  const handleChannelToggle = (channel: NotifyChannel) => {
    if (notifyChannels.includes(channel)) {
      setNotifyChannels(notifyChannels.filter(c => c !== channel));
    } else {
      setNotifyChannels([...notifyChannels, channel]);
    }
  };

  const handleSave = () => {
    saveBuildEnhancementSettings({
      notification: {
        notifyOn,
        notifyChannels,
        notifyEmails: notifyEmails ? notifyEmails.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="构建通知设置">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>通知时机</Label>
            <RadioGroup value={notifyOn} onValueChange={(v) => setNotifyOn(v as NotifyOn)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="always" id="notify-always" />
                <Label htmlFor="notify-always">总是通知</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="failure" id="notify-failure" />
                <Label htmlFor="notify-failure">仅失败时通知</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="notify-never" />
                <Label htmlFor="notify-never">不通知</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>通知渠道</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify-feishu"
                  checked={notifyChannels.includes('feishu')}
                  onCheckedChange={() => handleChannelToggle('feishu')}
                />
                <Label htmlFor="notify-feishu">飞书</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify-email"
                  checked={notifyChannels.includes('email')}
                  onCheckedChange={() => handleChannelToggle('email')}
                />
                <Label htmlFor="notify-email">邮件</Label>
              </div>
            </div>
          </div>

          {notifyChannels.includes('email') && (
            <div className="space-y-2">
              <Label htmlFor="notify-emails">通知邮箱（逗号分隔）</Label>
              <Input
                id="notify-emails"
                value={notifyEmails}
                onChange={(e) => setNotifyEmails(e.target.value)}
                placeholder="example@example.com, another@example.com"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
