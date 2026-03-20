module.exports = {
  apps: [
    {
      name: 'teamclaw-server',
      script: './server/dist/index.js',
      cwd: '.',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'dist'],
      env: {
        NODE_ENV: 'production',
        PORT: 9700,
        HOST: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Health check: verify server responds on port 9700
      health_check_grace_period: 3000,
      exp_backoff_restart_delay: 100,
    },
    {
      name: 'teamclaw-dashboard',
      script: './.next/standalone/server.js',
      cwd: '.',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      // Health check: verify dashboard responds on port 3000
      health_check_grace_period: 3000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
