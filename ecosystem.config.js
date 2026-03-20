module.exports = {
  apps: [
    {
      name: 'teamclaw-server',
      script: './server/src/index.ts',
      interpreter: '/Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw/server/node_modules/.bin/tsx',
      cwd: '/Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw',
      watch: ['/Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw/server/src'],
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
    },
    {
      name: 'teamclaw-dashboard',
      script: './.next/standalone/server.js',
      cwd: '/Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
