module.exports = {
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  },
  rateLimit: {
    emailsPerBatch: parseInt(process.env.EMAILS_PER_BATCH) || 25,
    delayBetweenBatchesMinutes: parseInt(process.env.BATCH_DELAY_MINUTES) || 5,
    maxRetriesPerEmail: parseInt(process.env.MAX_RETRIES) || 3
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel']
  },
  cronSchedule: '*/5 * * * *'
};