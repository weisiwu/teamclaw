import express, { Router } from 'express';
import { join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { success } from './utils/response.js';
import { requireAdmin } from './middleware/auth.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import projectRouter from './routes/project.js';
import userRouter from './routes/user.js';
import versionRouter from './routes/version.js';
import agentRouter from './routes/agent.js';
import messageRouter from './routes/message.js';
import taskRouter from './routes/task.js';
import abilityRouter from './routes/ability.js';
import docRouter from './routes/doc.js';
import searchRouter from './routes/search.js';
import cronJobRouter from './routes/cronJob.js';
import tokenStatsRouter from './routes/tokenStats.js';
import dashboardRouter from './routes/dashboard.js';
import adminConfigRouter from './routes/adminConfig.js';
import auditLogRouter from './routes/auditLog.js';
import webhookRouter from './routes/webhook.js';
import tagRouter from './routes/tag.js';
import buildRouter from './routes/build.js';
import artifactRouter from './routes/artifact.js';
import branchRouter from './routes/branch.js';
import llmRouter from './routes/llm.js';
import downloadRouter from './routes/download.js';
import feishuRouter from './routes/feishu.js';
import { getArtifactsRootDir } from './services/artifactStore.js';
import './services/taskInit.js'; // 初始化任务机制钩子
import { registerAutoBumpHook } from './hooks/autoBumpOnTaskDone.js';

const app = express();
const PORT = process.env.PORT || 9700;

// ========== Security Headers (Helmet) ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ========== CORS Configuration ==========
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow any localhost origin
    if (process.env.NODE_ENV !== 'production' && origin?.includes('localhost')) return callback(null, true);
    callback(new Error(`CORS policy violation: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
}));

app.use(express.json());

// ========== Rate Limiting ==========
// 全局默认限流：100 req/min
const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      data: null,
      message: '请求过于频繁，请稍后再试'
    });
  }
});

// 严格限流：10 req/min（用于敏感接口）
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      data: null,
      message: '请求过于频繁，请稍后再试'
    });
  }
});

// 应用全局限流
app.use('/api/v1', defaultLimiter);

// 敏感接口单独应用更严格限流
app.use('/api/v1/auth/login', strictLimiter);
app.use('/api/v1/users', strictLimiter);

// Static artifact downloads
app.use('/artifacts', express.static(getArtifactsRootDir(), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  },
}));

// Static package downloads (zip/tar.gz)
const ARCHIVE_ROOT = join(process.env.HOME || '/tmp', '.openclaw', 'packages');
app.use('/packages', express.static(ARCHIVE_ROOT, {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  },
}));

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/auth', userRouter); // 权限校验也用 user router (共享 /check 端点)
app.use('/api/v1/versions', versionRouter);
app.use('/api/v1/agents', agentRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/abilities', abilityRouter);
app.use('/api/v1/docs', docRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/cron-jobs', cronJobRouter);
app.use('/api/v1/token-stats', tokenStatsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/feishu', feishuRouter);
// Admin routes — all protected by requireAdmin middleware
const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use('/config', adminConfigRouter);
adminRouter.use('/audit-logs', auditLogRouter);
adminRouter.use('/webhooks', webhookRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/tags', tagRouter);
app.use('/api/v1/builds', buildRouter);
app.use('/api/v1/artifacts', artifactRouter);
app.use('/api/v1/branches', branchRouter);
app.use('/api/v1/downloads', downloadRouter);
app.use('/api/v1/llm', llmRouter);

// Root
app.get('/', (req, res) => {
  res.json(success({ service: 'TeamClaw Server', version: '0.1.0' }));
});

// Global error handlers — must be after all routes
app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`TeamClaw server running on port ${PORT}`);
  // 注册自动版本升级钩子
  registerAutoBumpHook();
});

export default app;
