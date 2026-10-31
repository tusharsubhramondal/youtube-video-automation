import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { AuthService } from '../services/auth.service.js';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const passwordHash = AuthService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'creator',
      },
    });

    const token = AuthService.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isValid = AuthService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = AuthService.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Current User profile
router.get('/me', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const defaultUser = await AuthService.getOrCreateDefaultUser();
      const token = AuthService.generateToken({
        id: defaultUser.id,
        email: defaultUser.email,
        name: defaultUser.name,
        role: defaultUser.role,
      });
      return res.json({
        success: true,
        data: {
          user: { id: defaultUser.id, email: defaultUser.email, name: defaultUser.name, role: defaultUser.role },
          token,
        },
      });
    }

    res.json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

