module.exports = {
  apps: [
    {
      name: 'chamcong',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 9000',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 9000,
      },
    },
  ],
};
