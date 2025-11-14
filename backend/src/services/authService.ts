import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// JWT verification result
export interface VerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns Promise resolving to boolean indicating if passwords match
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT access and refresh tokens
 * @param payload - JWT payload containing userId and email
 * @returns Token pair with access and refresh tokens
 * @throws Error if JWT secrets are not configured
 */
export function generateJWT(payload: JWTPayload): TokenPair {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }

  // Access token expires in 15 minutes
  const accessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: '15m',
  });

  // Refresh token expires in 7 days
  const refreshToken = jwt.sign(payload, jwtRefreshSecret, {
    expiresIn: '7d',
  });

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify a JWT access token
 * @param token - JWT access token
 * @returns Verification result with payload if valid
 */
export function verifyJWT(token: string): VerifyResult {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return {
      valid: false,
      error: 'JWT_SECRET environment variable is not set',
    };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    } else if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      };
    } else {
      return {
        valid: false,
        error: 'Token verification failed',
      };
    }
  }
}

/**
 * Verify a JWT refresh token
 * @param token - JWT refresh token
 * @returns Verification result with payload if valid
 */
export function verifyRefreshToken(token: string): VerifyResult {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    return {
      valid: false,
      error: 'JWT_REFRESH_SECRET environment variable is not set',
    };
  }

  try {
    const decoded = jwt.verify(token, jwtRefreshSecret) as JWTPayload;
    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Refresh token has expired',
      };
    } else if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid refresh token',
      };
    } else {
      return {
        valid: false,
        error: 'Refresh token verification failed',
      };
    }
  }
}

