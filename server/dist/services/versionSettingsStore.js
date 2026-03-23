let settings = {
    autoBump: true,
    bumpType: 'patch',
    autoTag: true,
    tagPrefix: 'v',
    tagOnStatus: ['published'],
};
export function getSettings() { return { ...settings }; }
export function updateSettings(patch) {
    settings = { ...settings, ...patch };
    return { ...settings };
}
export function getVersionSettings() {
    return settings;
}
