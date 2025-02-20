import jwt from 'jsonwebtoken';
import { Context } from 'koa';

interface TokenPayload {
  id: number;
  username: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = process.env.JWT_EXPIRES_IN as string;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};

export const authMiddleware = async (ctx: Context, next: () => Promise<any>) => {
  try {
    const token = ctx.headers.authorization?.split(' ')[1];
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供认证令牌',
        data: null
      };
      return;
    }

    const decoded = verifyToken(token);
    ctx.state.user = decoded;
    await next();
  } catch (err) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '无效的认证令牌',
      data: null
    };
  }
};

export const adminAuthMiddleware = async (ctx: Context, next: () => Promise<any>) => {
  await authMiddleware(ctx, async () => {
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '需要管理员权限',
        data: null
      };
      return;
    }
    await next();
  });
};