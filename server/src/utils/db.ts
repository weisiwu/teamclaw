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
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const error = err as Error;

      if (attempt === MAX_RETRIES) {
        console.error(
          `❌ 数据库连接失败（已用尽 ${MAX_RETRIES} 次重试）: ${error.message}`
        );
        console.error('   请检查：');
        console.error('   1. PostgreSQL 服务是否已启动（docker compose up -d postgres）');
        console.error('   2. .env 中的 DATABASE_URL 是否正确');
        console.error('   3. 数据库是否已创建（参考 scripts/setup-db.sh）');
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
