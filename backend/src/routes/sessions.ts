import { Router } from 'express';
import {
  createSession,
  getUserSessions,
  getSessionById,
  updateSession,
  saveMessage,
} from '../controllers/sessionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create new session
router.post('/', createSession);

// Get all user's sessions
router.get('/', getUserSessions);

// Get session by ID
router.get('/:id', getSessionById);

// Update session
router.put('/:id', updateSession);

// Save message to session
router.post('/:id/messages', saveMessage);

export default router;

