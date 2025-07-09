module.exports = {
  apps: [
    {
      name: 'cid-ai',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/cid-ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max_old_space_size=1024',
        PORT: 3002
      },
      error_file: '/var/www/cid-ai/logs/error.log',
      out_file: '/var/www/cid-ai/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ]
};
