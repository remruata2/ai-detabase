module.exports = {
  apps: [
    {
      name: 'cid-ai',
      script: 'npm',
      args: 'start',
      exec_mode: 'fork', // Use fork mode for better compatibility
      cwd: 'F:\\cid-ai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003, // Ensure the port is set here if needed by 'npm start'
      },
    },
  ],
};
