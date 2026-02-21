import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  AUTH_ACCESS_TTL_MINUTES: Joi.number().integer().min(1).max(120).default(15),
  AUTH_REFRESH_TTL_DAYS: Joi.number().integer().min(1).max(365).default(30),
  AUTH_TOKEN_PEPPER: Joi.string().min(16).required(),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(100),
  AUTH_RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60000),
  AUTH_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(10),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
});
