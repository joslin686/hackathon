import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// File filter to accept only PDF files
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Check MIME type
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDF files (application/pdf) are allowed.'
      )
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

// Error handling middleware for multer errors
export const handleUploadError = (
  err: any,
  req: Request,
  res: any,
  next: any
): void => {
  if (err instanceof multer.MulterError) {
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File size exceeds the limit of 10MB',
        error: 'FILE_TOO_LARGE',
      });
      return;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        message: 'Unexpected file field. Expected field name: pdf',
        error: 'INVALID_FIELD_NAME',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      error: 'UPLOAD_ERROR',
    });
    return;
  }

  // Custom file type validation errors
  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE',
    });
    return;
  }

  // Other errors
  if (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
      error: 'UPLOAD_FAILED',
    });
    return;
  }

  next();
};

// Export the upload middleware
export const uploadSingle = upload.single('pdf');

// Export upload configuration for potential reuse
export default upload;

