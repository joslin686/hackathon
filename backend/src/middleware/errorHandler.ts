import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import jwt from 'jsonwebtoken';

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  statusCode: number;
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ForbiddenError extends Error {
  statusCode: number;
  constructor(message: string = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: Error | ValidationError | AuthenticationError | NotFoundError | ForbiddenError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle custom errors
  if (err instanceof ValidationError || 
      err instanceof AuthenticationError || 
      err instanceof NotFoundError || 
      err instanceof ForbiddenError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.name,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      error: 'VALIDATION_ERROR',
    });
    return;
  }

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    handleMulterError(err, res);
    return;
  }

  // Handle JWT errors
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN',
    });
    return;
  }

  if (err instanceof jwt.TokenExpiredError) {
    res.status(401).json({
      success: false,
      message: 'Token has expired',
      error: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    error: 'INTERNAL_SERVER_ERROR',
  });
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
        error: 'DUPLICATE_ENTRY',
      });
      break;
    case 'P2025':
      // Record not found
      res.status(404).json({
        success: false,
        message: 'Record not found',
        error: 'NOT_FOUND',
      });
      break;
    case 'P2003':
      // Foreign key constraint violation
      res.status(400).json({
        success: false,
        message: 'Invalid reference to related record',
        error: 'FOREIGN_KEY_CONSTRAINT',
      });
      break;
    default:
      res.status(500).json({
        success: false,
        message: 'Database error occurred',
        error: 'DATABASE_ERROR',
      });
  }
}

/**
 * Handle Multer-specific errors
 */
function handleMulterError(err: multer.MulterError, res: Response): void {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      res.status(400).json({
        success: false,
        message: 'File size exceeds the limit of 10MB',
        error: 'FILE_TOO_LARGE',
      });
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        error: 'INVALID_FIELD_NAME',
      });
      break;
    default:
      res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
        error: 'UPLOAD_ERROR',
      });
  }
}

