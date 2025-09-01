module.exports = {
  apps: [
    {
      name: 'cid-ai',
      script: 'npm',
      args: 'start',
      // IMPORTANT: Replace this with the actual path to your project on the Windows server
      cwd: 'C:\\path\\to\\your\\project\\cid-ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NODE_OPTIONS: '--max_old_space_size=2048',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
    },
  ],
};
