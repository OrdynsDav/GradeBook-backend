export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  swaggerEnabled:
    (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() === 'true',
  auth: {
    accessTtlMinutes: Number(process.env.AUTH_ACCESS_TTL_MINUTES ?? 15),
    refreshTtlDays: Number(process.env.AUTH_REFRESH_TTL_DAYS ?? 30),
    tokenPepper: process.env.AUTH_TOKEN_PEPPER ?? '',
  },
  rateLimit: {
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
    limit: Number(process.env.RATE_LIMIT_LIMIT ?? 100),
    authTtlMs: Number(process.env.AUTH_RATE_LIMIT_TTL_MS ?? 60_000),
    authLimit: Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10),
  },
});
