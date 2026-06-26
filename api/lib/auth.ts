import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'sunsip-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getAuthTokenFromHeaders(headers: Record<string, string>): string | null {
  const cookie = headers.cookie || headers.Cookie || '';
  const match = cookie.match(/sunsip_token=([^;]+)/);
  if (match) return match[1];
  
  const auth = headers.authorization || headers.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  
  return null;
}

export function getAuthUserFromHeaders(headers: Record<string, string>): AuthUser | null {
  const token = getAuthTokenFromHeaders(headers);
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string): string {
  return `sunsip_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearAuthCookie(): string {
  return `sunsip_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}