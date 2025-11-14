import { Router } from 'express';
import {
  getOverallStats,
  getPDFProgress,
} from '../controllers/progressController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get overall statistics
router.get('/stats', getOverallStats);

// Get progress for specific PDF
router.get('/pdfs/:pdfId', getPDFProgress);

export default router;

