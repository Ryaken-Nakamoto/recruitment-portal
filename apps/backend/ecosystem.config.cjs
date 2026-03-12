module.exports = {
  apps: [
    {
      name: 'recruitment-portal-backend',
      script: 'dist/apps/backend/main.js',
      cwd: '/home/ubuntu/recruitment-portal',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/ubuntu/logs/backend-error.log',
      out_file: '/home/ubuntu/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
