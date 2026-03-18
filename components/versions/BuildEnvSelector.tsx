'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getBuildEnvironments, getBuildEnhancementSettings, saveBuildEnhancementSettings } from '@/lib/api/versions';
import { BuildEnvironment } from '@/lib/api/types';

interface BuildEnvSelectorProps {
  value?: BuildEnvironment['name'];
  onChange?: (env: BuildEnvironment['name']) => void;
}

export function BuildEnvSelector({ value, onChange }: BuildEnvSelectorProps) {
  const [selectedEnv, setSelectedEnv] = useState<BuildEnvironment['name']>(value || 'development');
  const [isOpen, setIsOpen] = useState(false);
  const environments = getBuildEnvironments();

  useEffect(() => {
    if (value) {
      setSelectedEnv(value);
    } else {
      const settings = getBuildEnhancementSettings();
      if (settings.defaultEnv) {
        setSelectedEnv(settings.defaultEnv);
      }
    }
  }, [value]);

  const currentEnv = environments.find(e => e.name === selectedEnv);

  const handleSelect = (envName: BuildEnvironment['name']) => {
    setSelectedEnv(envName);
    onChange?.(envName);
    saveBuildEnhancementSettings({ defaultEnv: envName });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          {currentEnv?.label || '选择环境'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <Label>构建环境</Label>
          <RadioGroup value={selectedEnv} onValueChange={(v) => handleSelect(v as BuildEnvironment['name'])}>
            {environments.map((env) => (
              <div key={env.name} className="flex items-center space-x-2">
                <RadioGroupItem value={env.name} id={`env-${env.name}`} />
                <Label htmlFor={`env-${env.name}`} className="cursor-pointer">
                  {env.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {currentEnv && (
            <div className="text-xs text-muted-foreground mt-2">
              <div>NODE_ENV: {currentEnv.envVars.NODE_ENV}</div>
              <div>API_URL: {currentEnv.envVars.API_URL}</div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
