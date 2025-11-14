import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        name: string | null;
      };
    }
  }
}

