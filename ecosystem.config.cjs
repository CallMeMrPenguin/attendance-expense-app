module.exports = {
  apps: [
    {
      name: 'chamcong',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 9000',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      time: true,
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 9000,
      },
    },
  ],
};
