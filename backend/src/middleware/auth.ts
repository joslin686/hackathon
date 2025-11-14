import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/authService';
import prisma from '../utils/prisma';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
      };
    }
  }
}

/**
 * Authentication middleware that verifies JWT token from Authorization header
 * and attaches the full user object to req.user
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authorization header is missing',
      });
      return;
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7).trim();

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token is missing',
      });
      return;
    }

    // Verify token
    const result = verifyJWT(token);

    if (!result.valid || !result.payload) {
      // Handle specific error cases
      if (result.error === 'Token has expired') {
        res.status(401).json({
          success: false,
          message: 'Token has expired. Please refresh your token or login again',
          error: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (result.error === 'Invalid token') {
        res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: result.error || 'Token verification failed',
        error: 'TOKEN_VERIFICATION_FAILED',
      });
      return;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: result.payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user to request
    req.user = user;

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'AUTH_ERROR',
    });
  }
};

