import pg from 'pg';
import { onShutdown } from './shutdown.js';

const { Pool } = pg;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/teamclaw',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('⚠️  数据库连接池空闲客户端异常:', err.message);
});

// ── 关键表清单 ────────────────────────────────────────────────
const CRITICAL_TABLES = [
  'users', 'projects', 'tasks', 'agents', 'messages',
  'versions', 'branches', 'tags', 'skills', 'tools',
  'api_token', 'agent_token_binding',
  'build_records', 'experiment_sessions', 'experiment_results',
  'import_tasks', 'settings', 'token_stats', 'version_tags',
  '_migrations',
];

/**
 * 严格检查所有关键表是否存在
 * @returns true if all tables exist, false otherwise
 */
async function strictCheckTables(): Promise<boolean> {
  console.log('\n🔍 检查关键数据表...');

  const missing: string[] = [];
  const existing: string[] = [];

  for (const table of CRITICAL_TABLES) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (result.rows.length === 0) {
        missing.push(table);
      } else {
        existing.push(table);
      }
    } catch (err) {
      console.error(`  ❌ 检查表 '${table}' 时出错:`, (err as Error).message);
      missing.push(table);
    }
  }

  console.log(`  ✅ 已存在: ${existing.length} 个表`);
  if (existing.length > 0) {
    for (const t of existing.slice(0, 5)) {
      console.log(`     - ${t}`);
    }
    if (existing.length > 5) {
      console.log(`     ... 还有 ${existing.length - 5} 个`);
    }
  }

  if (missing.length > 0) {
    console.error(`\n  ❌ 缺失 ${missing.length} 个关键表:`);
    for (const t of missing) {
      console.error(`     - ${t}`);
    }

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⚠️  数据库初始化未完成');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('请按以下步骤修复（任选其一）:');
    console.error('');
    console.error('  方法1 - 一键修复（推荐）:');
    console.error('    ./scripts/setup-db.sh --reset');
    console.error('');
    console.error('  方法2 - 仅检查（不修复）:');
    console.error('    ./scripts/setup-db.sh --dry-run');
    console.error('');
    console.error('  方法3 - 手动迁移:');
    console.error('    cd server && npx tsx src/db/migrations/run.ts');
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return false;
  }

  console.log('  ✅ 所有关键表已就绪\n');
  return true;
}

/**
 * 检查关键数据表是否存在（兼容旧接口）
 */
async function checkKeyTables(): Promise<void> {
  try {
    for (const table of ['tasks', 'projects', 'users', 'agents', 'versions']) {
      const result = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (result.rows.length === 0) {
        console.warn(`⚠️  关键表 '${table}' 不存在，建议运行数据库迁移: npm run migrate`);
      } else {
        console.log(`   ✅ 表 '${table}' 存在`);
      }
    }
  } catch (err) {
    console.warn('⚠️  无法检查数据表，可能需要先运行迁移');
  }
}

/**
 * 等待数据库并严格检查所有关键表
 * 如果表缺失，延迟5秒后重试一次，仍缺失则报错退出
 */
export async function waitForDatabaseAndCheck(): Promise<void> {
  // 先等待数据库连接
  await waitForDatabase();

  // 严格检查所有关键表
  const allExist = await strictCheckTables();

  if (!allExist) {
    console.log('⏳ 数据库表不完整，等待修复...');
    console.log('   5秒后重试，或按 Ctrl+C 退出并运行修复命令\n');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const secondCheck = await strictCheckTables();
    if (!secondCheck) {
      console.error('❌ 数据库表仍不完整，请运行修复命令后重启服务');
      console.error('   ./scripts/setup-db.sh --reset\n');
      throw new Error('DATABASE_TABLES_MISSING');
    }
  }
}

/**
 * 等待数据库就绪，带指数退避重试
 * 最多重试 MAX_RETRIES 次，首次失败后等待 BASE_DELAY_MS，之后每次翻倍
 */
export async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ 数据库连接成功');
      await checkKeyTables();
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const error = err as Error;

      if (attempt === MAX_RETRIES) {
        console.error(
          `❌ 数据库连接失败（已用尽 ${MAX_RETRIES} 次重试）: ${error.message}`
        );
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('请按以下步骤排查:');
        console.error('  1. PostgreSQL 服务是否已启动:');
        console.error('     docker compose up -d postgres');
        console.error('  2. DATABASE_URL 是否正确:');
        console.error(`     当前: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/teamclaw'}`);
        console.error('  3. 数据库是否已创建:');
        console.error('     ./scripts/setup-db.sh --dry-run');
        console.error('  4. 端口 5432 是否被占用:');
        console.error('     lsof -i :5432');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw error;
      }

      console.warn(
        `⚠️  数据库连接失败（第 ${attempt}/${MAX_RETRIES} 次）: ${error.message}`
      );
      console.warn(`   将在 ${delay}ms 后重试...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// 注册优雅关闭
onShutdown('PostgreSQL', async () => {
  console.log('正在关闭数据库连接池...');
  await pool.end();
  console.log('数据库连接池已关闭');
});

// Re-export pool for use in other modules
export { pool };
