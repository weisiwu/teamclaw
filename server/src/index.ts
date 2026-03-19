import express from 'express';
import cors from 'cors';
import { success } from './utils/response.js';
import healthRouter from './routes/health.js';
import projectRouter from './routes/project.js';
import userRouter from './routes/user.js';
import versionRouter from './routes/version.js';
import agentRouter from './routes/agent.js';
import messageRouter from './routes/message.js';
import taskRouter from './routes/task.js';
import './services/taskInit.js'; // 初始化任务机制钩子

const app = express();
const PORT = process.env.PORT || 9700;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/auth', userRouter); // 权限校验也用 user router (共享 /check 端点)
app.use('/api/v1/versions', versionRouter);
app.use('/api/v1/agents', agentRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/tasks', taskRouter);

// Root
app.get('/', (req, res) => {
  res.json(success({ service: 'TeamClaw Server', version: '0.1.0' }));
});

app.listen(PORT, () => {
  console.log(`TeamClaw server running on port ${PORT}`);
});

export default app;
