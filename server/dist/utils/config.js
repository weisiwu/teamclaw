import fs from 'fs';
import path from 'path';
const REQUIRED_FIELDS = [
    'server.port',
    'database.postgres.host',
    'database.postgres.database',
    'database.postgres.user',
    'database.redis.host',
    'database.chromadb.host',
    'models.light.api_key',
    'models.medium.api_key',
    'models.strong.api_key',
];
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object') {
            return acc[key];
        }
        return undefined;
    }, obj);
}
function validateConfig(config) {
    const errors = [];
    for (const field of REQUIRED_FIELDS) {
        const value = getNestedValue(config, field);
        if (value === undefined || value === null || value === '') {
            errors.push(`Missing required config: ${field}`);
        }
    }
    // Validate port range
    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push('server.port must be between 1 and 65535');
    }
    return { valid: errors.length === 0, errors };
}
export function loadConfig(configPath) {
    const configFile = configPath || path.join(process.cwd(), 'config.json');
    const exampleFile = path.join(process.cwd(), 'config.example.json');
    // Try user config first
    if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf-8');
        const config = JSON.parse(content);
        const { valid, errors } = validateConfig(config);
        if (!valid) {
            console.error('❌ Configuration validation failed:');
            errors.forEach(e => console.error(`   - ${e}`));
            process.exit(1);
        }
        console.log('✅ Configuration loaded from', configFile);
        return config;
    }
    // Fall back to example config
    if (fs.existsSync(exampleFile)) {
        console.warn('⚠️ No config.json found, using config.example.json');
        console.warn('⚠️ Please copy config.example.json to config.json and fill in your values');
        const content = fs.readFileSync(exampleFile, 'utf-8');
        return JSON.parse(content);
    }
    console.error('❌ No configuration file found!');
    console.error(`   Expected: ${configFile}`);
    console.error(`   Or: ${exampleFile}`);
    process.exit(1);
}
export function checkRequiredEnvVars() {
    const required = ['POSTGRES_PASSWORD'];
    const missing = [];
    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        console.warn('⚠️ Missing environment variables:', missing.join(', '));
        console.warn('   Set them in .env or config.json');
    }
}
