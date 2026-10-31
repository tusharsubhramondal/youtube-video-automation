import crypto from 'crypto';
import { prisma } from './prisma.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export class AuthService {
  /**
   * Hashes a password with a secure random salt using scrypt
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a password against the stored salt:hash string
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  /**
   * Generates a signed JWT with expiration
   */
  static generateToken(payload: UserPayload, expiresInHours = 48): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies a signed JWT and returns the payload
   */
  static verifyToken(token: string): UserPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'creator',
      };
    } catch {
      return null;
    }
  }

  /**
   * Gets or initializes the default admin creator user
   */
  static async getOrCreateDefaultUser() {
    const defaultEmail = 'creator@autotube.ai';
    let user = await prisma.user.findUnique({ where: { email: defaultEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: defaultEmail,
          name: 'AI Studio Creator',
          passwordHash: this.hashPassword('autotube123'),
          role: 'admin',
        },
      });
      logger.info(`Default studio user created: ${defaultEmail}`);
    }

    return user;
  }
}

