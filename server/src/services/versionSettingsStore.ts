import { VersionSettings } from '../models/version.js';

let settings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

export function getSettings(): VersionSettings { return { ...settings }; }

export function updateSettings(patch: Partial<VersionSettings>): VersionSettings {
  settings = { ...settings, ...patch };
  return { ...settings };
}

export function getVersionSettings(): VersionSettings {
  return settings;
}
