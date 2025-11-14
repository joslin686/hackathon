import { Router } from 'express';
import {
  uploadPDF,
  getUserPDFs,
  getPDFById,
  deletePDF,
  updatePDF,
} from '../controllers/pdfController';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Upload PDF
router.post(
  '/upload',
  uploadSingle,
  handleUploadError,
  uploadPDF
);

// Get all user's PDFs with pagination
router.get('/', getUserPDFs);

// Get PDF by ID
router.get('/:id', getPDFById);

// Delete PDF
router.delete('/:id', deletePDF);

// Update PDF
router.put('/:id', updatePDF);

export default router;

