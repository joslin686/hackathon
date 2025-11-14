import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/authService';

// Extend Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Authentication middleware to verify JWT token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided or invalid format',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const result = verifyJWT(token);

    if (!result.valid || !result.payload) {
      res.status(401).json({
        success: false,
        message: result.error || 'Invalid or expired token',
      });
      return;
    }

    // Attach user ID to request
    req.userId = result.payload.userId;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

