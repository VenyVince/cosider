import { Request } from 'express';

export interface ICookieRequest extends Request {
  user: { userId: string; email: string };
  cookies: { accessToken: string; refreshToken: string };
}
