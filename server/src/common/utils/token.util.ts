import { createHash } from 'node:crypto';

export const hashToken = (token: string, pepper: string): string => {
  return createHash('sha256').update(`${token}.${pepper}`).digest('hex');
};
