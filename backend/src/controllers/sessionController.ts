import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Create Session - Start new learning session for PDF
 * POST /api/sessions
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { pdfId, difficulty } = req.body;

    // Validate input
    if (!pdfId) {
      res.status(400).json({
        success: false,
        message: 'pdfId is required',
      });
      return;
    }

    if (difficulty !== undefined && (difficulty < 1 || difficulty > 4)) {
      res.status(400).json({
        success: false,
        message: 'Difficulty must be between 1 and 4',
      });
      return;
    }

    // Verify PDF exists and belongs to user
    const pdf = await prisma.pDF.findUnique({
      where: {
        id: pdfId,
        userId: user.id,
      },
    });

    if (!pdf) {
      res.status(404).json({
        success: false,
        message: 'PDF not found',
      });
      return;
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        pdfId,
        difficulty: difficulty || 1,
        currentQuestion: 1,
      },
      include: {
        pdf: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            topics: true,
            concepts: true,
          },
        },
      },
    });

    // Create initial progress record
    await prisma.progress.create({
      data: {
        sessionId: session.id,
        questionsAsked: 0,
        correctAnswers: 0,
        hintsUsed: 0,
        thinkingScore: null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session: {
          ...session,
          pdf: {
            ...session.pdf,
            topics: session.pdf.topics as string[],
            concepts: session.pdf.concepts as string[],
          },
        },
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
    });
  }
};

/**
 * Get User Sessions - Get all sessions for the authenticated user
 * GET /api/sessions
 */
export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Optional query parameters
    const pdfId = req.query.pdfId as string | undefined;
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

    // Build where clause
    const where: any = {
      userId: user.id,
    };
    if (pdfId) {
      where.pdfId = pdfId;
    }

    // Get sessions with pagination
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          pdf: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
            },
          },
          progress: true,
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.session.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          id: session.id,
          userId: session.userId,
          pdfId: session.pdfId,
          difficulty: session.difficulty,
          currentQuestion: session.currentQuestion,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          pdf: session.pdf,
          progress: session.progress,
          messageCount: session._count.messages,
        })),
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
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
    });
  }
};

/**
 * Get Session by ID - Get a specific session by ID
 * GET /api/sessions/:id
 */
export const getSessionById = async (req: Request, res: Response): Promise<void> => {
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

    // Get session with related data
    const session = await prisma.session.findUnique({
      where: {
        id,
        userId: user.id, // Ensure user owns the session
      },
      include: {
        pdf: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            topics: true,
            concepts: true,
          },
        },
        progress: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          ...session,
          pdf: {
            ...session.pdf,
            topics: session.pdf.topics as string[],
            concepts: session.pdf.concepts as string[],
          },
        },
      },
    });
  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session',
    });
  }
};

/**
 * Update Session - Save progress and update session state
 * PUT /api/sessions/:id
 */
export const updateSession = async (req: Request, res: Response): Promise<void> => {
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
    const { difficulty, currentQuestion, progress } = req.body;

    // Check if session exists and user owns it
    const existingSession = await prisma.session.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        progress: true,
      },
    });

    if (!existingSession) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Build update data
    const sessionUpdateData: any = {};
    if (difficulty !== undefined) {
      if (difficulty < 1 || difficulty > 4) {
        res.status(400).json({
          success: false,
          message: 'Difficulty must be between 1 and 4',
        });
        return;
      }
      sessionUpdateData.difficulty = difficulty;
    }
    if (currentQuestion !== undefined) {
      if (currentQuestion < 1) {
        res.status(400).json({
          success: false,
          message: 'Current question must be positive',
        });
        return;
      }
      sessionUpdateData.currentQuestion = currentQuestion;
    }

    // Update session if there are changes
    let updatedSession = existingSession;
    if (Object.keys(sessionUpdateData).length > 0) {
      updatedSession = await prisma.session.update({
        where: { id },
        data: sessionUpdateData,
        include: {
          progress: true,
        },
      });
    }

    // Update progress if provided
    if (progress) {
      const progressUpdateData: any = {};
      if (progress.questionsAsked !== undefined) {
        progressUpdateData.questionsAsked = progress.questionsAsked;
      }
      if (progress.correctAnswers !== undefined) {
        progressUpdateData.correctAnswers = progress.correctAnswers;
      }
      if (progress.hintsUsed !== undefined) {
        progressUpdateData.hintsUsed = progress.hintsUsed;
      }
      if (progress.thinkingScore !== undefined) {
        progressUpdateData.thinkingScore = progress.thinkingScore;
      }

      if (Object.keys(progressUpdateData).length > 0) {
        if (existingSession.progress) {
          await prisma.progress.update({
            where: { sessionId: id },
            data: progressUpdateData,
          });
        } else {
          await prisma.progress.create({
            data: {
              sessionId: id,
              questionsAsked: progress.questionsAsked || 0,
              correctAnswers: progress.correctAnswers || 0,
              hintsUsed: progress.hintsUsed || 0,
              thinkingScore: progress.thinkingScore || null,
            },
          });
        }
      }
    }

    // Fetch updated session with all relations
    const finalSession = await prisma.session.findUnique({
      where: { id },
      include: {
        pdf: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            topics: true,
            concepts: true,
          },
        },
        progress: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: finalSession
          ? {
              ...finalSession,
              pdf: {
                ...finalSession.pdf,
                topics: finalSession.pdf.topics as string[],
                concepts: finalSession.pdf.concepts as string[],
              },
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
    });
  }
};

/**
 * Save Message - Add message to conversation
 * POST /api/sessions/:id/messages
 */
export const saveMessage = async (req: Request, res: Response): Promise<void> => {
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
    const { type, content } = req.body;

    // Validate input
    if (!type || !content) {
      res.status(400).json({
        success: false,
        message: 'type and content are required',
      });
      return;
    }

    // Validate message type
    const validTypes = ['ai-question', 'user-answer', 'ai-explanation', 'intro'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: `Invalid message type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Check if session exists and user owns it
    const session = await prisma.session.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found',
      });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        sessionId: id,
        type,
        content: content.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Message saved successfully',
      data: {
        message,
      },
    });
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save message',
    });
  }
};

