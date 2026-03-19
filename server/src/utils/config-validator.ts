/**
 * Environment Variable Validator
 * Run on startup to validate required env vars are present
 * 
 * Usage: node server/dist/utils/config-validator.js
 * Exits 0 if OK, 1 if validation fails
 */

const required = [
  'PORT',
  'NODE_ENV',
];

const recommended = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'DEEPSEEK_API_KEY',
  'SERVER_URL',
];

function validate() {
  const errors = [];
  const warnings = [];

  // Check required vars
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // Check recommended vars
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`Missing recommended env var: ${key}`);
    }
  }

  // Validate JWT_SECRET in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production') {
      errors.push('JWT_SECRET must be changed from default in production');
    }
  }

  // Validate API keys format
  if (process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.startsWith('sk-')) {
    errors.push('DEEPSEEK_API_KEY appears invalid (should start with sk-)');
  }
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    errors.push('OPENAI_API_KEY appears invalid (should start with sk-)');
  }
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-')) {
    errors.push('ANTHROPIC_API_KEY appears invalid (should start with sk-)');
  }

  // Print results
  if (warnings.length > 0) {
    console.warn('[config-validator] Warnings:');
    warnings.forEach(w => console.warn('  -', w));
  }

  if (errors.length > 0) {
    console.error('[config-validator] Errors:');
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  console.log('[config-validator] All checks passed!');
  process.exit(0);
}

validate();
