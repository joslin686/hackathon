import { Request, Response } from 'express';
import {
  processPDFFile,
  analyzePDFContent,
  savePDFToDatabase,
  getPDFById as getPDFByIdService,
} from '../services/pdfService';
import { uploadFile, deleteFile, getPublicUrl } from '../services/s3Service';
import prisma from '../utils/prisma';

/**
 * Upload PDF - Handle file upload, process with Gemini, save to S3, save to DB
 * POST /api/pdfs/upload
 */
export const uploadPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No PDF file uploaded',
      });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Step 1: Process PDF with Gemini to extract text
    const extractedText = await processPDFFile(fileBuffer);

    // Step 2: Analyze content to get topics and concepts
    const analysis = await analyzePDFContent(extractedText);

    // Step 3: Upload file to S3
    const s3Key = await uploadFile(
      fileBuffer,
      'application/pdf',
      fileName,
      'pdfs'
    );
    const s3Url = getPublicUrl(s3Key);

    // Step 4: Save to database
    const pdf = await savePDFToDatabase(
      user.id,
      fileName,
      fileSize,
      s3Url,
      extractedText,
      analysis.topics,
      analysis.concepts
    );

    res.status(201).json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      data: {
        pdf,
      },
    });
  } catch (error) {
    console.error('Upload PDF error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: `Failed to upload PDF: ${error.message}`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload PDF: Unknown error',
    });
  }
};

/**
 * Get User PDFs - Get all PDFs for the authenticated user with pagination
 * GET /api/pdfs
 */
export const getUserPDFs = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters. Page and limit must be positive, limit max 100',
      });
      return;
    }

    // Get PDFs with pagination
    const [pdfs, total] = await Promise.all([
      prisma.pDF.findMany({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileUrl: true,
          topics: true,
          concepts: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.pDF.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    // Convert JSON fields to arrays
    const pdfsWithArrays = pdfs.map((pdf) => ({
      ...pdf,
      topics: pdf.topics as string[],
      concepts: pdf.concepts as string[],
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        pdfs: pdfsWithArrays,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get user PDFs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDFs',
    });
  }
};

/**
 * Get PDF by ID - Get a specific PDF by ID
 * GET /api/pdfs/:id
 */
export const getPDFById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { id } = req.params;

    // Get PDF (with userId check for authorization)
    const pdf = await getPDFByIdService(id, user.id);

    if (!pdf) {
      res.status(404).json({
        success: false,
        message: 'PDF not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        pdf,
      },
    });
  } catch (error) {
    console.error('Get PDF by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDF',
    });
  }
};

/**
 * Delete PDF - Delete PDF from S3 and database
 * DELETE /api/pdfs/:id
 */
export const deletePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { id } = req.params;

    // Get PDF to verify ownership and get S3 key
    const pdf = await prisma.pDF.findUnique({
      where: {
        id,
        userId: user.id, // Ensure user owns the PDF
      },
    });

    if (!pdf) {
      res.status(404).json({
        success: false,
        message: 'PDF not found',
      });
      return;
    }

    // Extract S3 key from URL and delete from S3
    // URL format: https://bucket.s3.region.amazonaws.com/pdfs/filename
    try {
      const urlObj = new URL(pdf.fileUrl);
      // Remove leading slash and get path after domain
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      // Reconstruct key (should be 'pdfs/filename')
      const s3Key = pathParts.join('/');
      
      // Delete from S3
      await deleteFile(s3Key);
    } catch (s3Error) {
      console.error('S3 delete error (continuing with DB delete):', s3Error);
      // Continue with DB delete even if S3 delete fails
    }

    // Delete from database
    await prisma.pDF.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'PDF deleted successfully',
    });
  } catch (error) {
    console.error('Delete PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete PDF',
    });
  }
};

/**
 * Update PDF - Update PDF metadata
 * PUT /api/pdfs/:id
 */
export const updatePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { id } = req.params;
    const { fileName } = req.body;

    // Validate input
    if (fileName && (typeof fileName !== 'string' || fileName.trim().length === 0)) {
      res.status(400).json({
        success: false,
        message: 'Invalid fileName',
      });
      return;
    }

    // Check if PDF exists and user owns it
    const existingPDF = await prisma.pDF.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingPDF) {
      res.status(404).json({
        success: false,
        message: 'PDF not found',
      });
      return;
    }

    // Update PDF
    const updateData: any = {};
    if (fileName) {
      updateData.fileName = fileName.trim();
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    const updatedPDF = await prisma.pDF.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        fileUrl: true,
        topics: true,
        concepts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'PDF updated successfully',
      data: {
        pdf: {
          ...updatedPDF,
          topics: updatedPDF.topics as string[],
          concepts: updatedPDF.concepts as string[],
        },
      },
    });
  } catch (error) {
    console.error('Update PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update PDF',
    });
  }
};

