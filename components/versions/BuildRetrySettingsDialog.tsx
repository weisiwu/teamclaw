'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { getBuildEnhancementSettings, saveBuildEnhancementSettings } from '@/lib/api/versions';
import { DEFAULT_BUILD_RETRY_SETTINGS } from '@/lib/api/types';

interface BuildRetrySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildRetrySettingsDialog({ open, onOpenChange }: BuildRetrySettingsDialogProps) {
  const [maxRetries, setMaxRetries] = useState(0);
  const [retryDelays, setRetryDelays] = useState<number[]>(DEFAULT_BUILD_RETRY_SETTINGS.retryDelays);

  useEffect(() => {
    if (open) {
      const settings = getBuildEnhancementSettings();
      setMaxRetries(settings.retry.maxRetries);
      setRetryDelays(settings.retry.retryDelays);
    }
  }, [open]);

  const handleSave = () => {
    saveBuildEnhancementSettings({
      retry: { maxRetries, retryDelays },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="构建重试设置">
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-retry">自动重试</Label>
            <Switch
              id="auto-retry"
              checked={maxRetries > 0}
              onCheckedChange={(checked) => setMaxRetries(checked ? 1 : 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max-retries">最大重试次数</Label>
            <Input
              id="max-retries"
              type="number"
              min={0}
              max={3}
              value={maxRetries}
              disabled={maxRetries === 0}
              onChange={(e) => setMaxRetries(Math.min(3, Math.max(0, parseInt(e.target.value) || 0)))}
            />
            <p className="text-sm text-muted-foreground">设置为 0 禁用自动重试，最多 3 次</p>
          </div>

          {maxRetries > 0 && (
            <div className="space-y-2">
              <Label>重试延迟（秒）</Label>
              <div className="grid grid-cols-3 gap-2">
                {retryDelays.map((delay, i) => (
                  <div key={i}>
                    <Label className="text-xs">第{i + 1}次</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={delay}
                      onChange={(e) => {
                        const newDelays = [...retryDelays];
                        newDelays[i] = Math.min(60, Math.max(1, parseInt(e.target.value) || 3));
                        setRetryDelays(newDelays);
                      }}
                    />
                  </div>
                ))}
              </div>
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
