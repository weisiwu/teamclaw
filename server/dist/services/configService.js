/**
 * Config Service
 * 后台管理平台 - 系统配置服务
 */
import { DEFAULT_SYSTEM_CONFIG } from '../models/systemConfig.js';
import { auditService } from './auditService.js';
import * as fs from 'fs';
import * as path from 'path';
const DATA_FILE = path.join(process.cwd(), 'data', 'systemConfig.json');
function loadConfig() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch {
        // ignore
    }
    return {
        id: 'system',
        ...DEFAULT_SYSTEM_CONFIG,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
    };
}
function saveConfig(config) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
let configCache = null;
function getConfig() {
    if (!configCache) {
        configCache = loadConfig();
    }
    return configCache;
}
export class ConfigService {
    /**
     * 获取系统配置
     */
    async get() {
        return getConfig();
    }
    /**
     * 更新系统配置
     */
    async update(req, updatedBy = 'admin') {
        const current = getConfig();
        const updated = {
            ...current,
            llm: { ...current.llm, ...req.llm },
            features: { ...current.features, ...req.features },
            security: { ...current.security, ...req.security },
            updatedAt: new Date().toISOString(),
            updatedBy,
        };
        saveConfig(updated);
        configCache = updated;
        // 记录审计日志
        await auditService.log({
            action: 'config.change',
            actor: updatedBy,
            target: 'system',
            details: { changes: req },
        });
        return updated;
    }
    /**
     * 重置为默认配置
     */
    async reset(resetBy = 'admin') {
        const original = loadConfig();
        const reset = {
            id: 'system',
            ...DEFAULT_SYSTEM_CONFIG,
            updatedAt: new Date().toISOString(),
            updatedBy: resetBy,
        };
        saveConfig(reset);
        configCache = reset;
        await auditService.log({
            action: 'config.change',
            actor: resetBy,
            target: 'system',
            details: { action: 'reset', previous: original },
        });
        return reset;
    }
    /**
     * 导出配置
     */
    async export() {
        return JSON.stringify(getConfig(), null, 2);
    }
    /**
     * 导入配置
     */
    async import(configJson, importedBy = 'admin') {
        const imported = JSON.parse(configJson);
        imported.updatedAt = new Date().toISOString();
        imported.updatedBy = importedBy;
        saveConfig(imported);
        configCache = imported;
        await auditService.log({
            action: 'config.change',
            actor: importedBy,
            target: 'system',
            details: { action: 'import' },
        });
        return imported;
    }
}
export const configService = new ConfigService();
