import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { calculateThinkingScore, calculateTimeSpent } from '../utils/progressCalculator';

/**
 * Get Overall Stats - Get overall statistics for the user
 * GET /api/progress/stats
 */
export const getOverallStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Get total PDFs
    const totalPDFs = await prisma.pDF.count({
      where: {
        userId: user.id,
      },
    });

    // Get total sessions
    const totalSessions = await prisma.session.count({
      where: {
        userId: user.id,
      },
    });

    // Get all progress records with sessions
    const sessionsWithProgress = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
      include: {
        progress: true,
      },
    });

    // Calculate overall thinking score
    let totalThinkingScore = 0;
    let sessionsWithScore = 0;
    let totalCorrectAnswers = 0;
    let totalHintsUsed = 0;
    let totalQuestionsAsked = 0;

    sessionsWithProgress.forEach((session) => {
      if (session.progress) {
        const timeSpent = calculateTimeSpent(session.createdAt, session.updatedAt);
        const questionsAsked = session.progress.questionsAsked || 0;
        const correctAnswers = session.progress.correctAnswers || 0;
        const hintsUsed = session.progress.hintsUsed || 0;

        if (questionsAsked > 0) {
          const score = calculateThinkingScore(
            correctAnswers,
            hintsUsed,
            timeSpent,
            questionsAsked
          );
          totalThinkingScore += score;
          sessionsWithScore++;
        }

        totalCorrectAnswers += correctAnswers;
        totalHintsUsed += hintsUsed;
        totalQuestionsAsked += questionsAsked;
      }
    });

    const averageThinkingScore =
      sessionsWithScore > 0 ? totalThinkingScore / sessionsWithScore : 0;

    // Get active sessions (sessions with messages in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeSessions = await prisma.session.count({
      where: {
        userId: user.id,
        messages: {
          some: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPDFs,
          totalSessions,
          activeSessions,
          averageThinkingScore: Math.round(averageThinkingScore * 10) / 10,
          totalQuestionsAsked,
          totalCorrectAnswers,
          totalHintsUsed,
          overallAccuracy:
            totalQuestionsAsked > 0
              ? Math.round((totalCorrectAnswers / totalQuestionsAsked) * 100 * 10) / 10
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get overall stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
    });
  }
};

/**
 * Get PDF Progress - Get progress statistics for a specific PDF
 * GET /api/progress/pdfs/:pdfId
 */
export const getPDFProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { pdfId } = req.params;

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

    // Get all sessions for this PDF
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        pdfId,
      },
      include: {
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
    });

    // Calculate aggregated statistics
    let totalSessions = sessions.length;
    let totalQuestionsAsked = 0;
    let totalCorrectAnswers = 0;
    let totalHintsUsed = 0;
    let totalTimeSpent = 0;
    let sessionsWithScore = 0;
    let totalThinkingScore = 0;

    const sessionStats = sessions.map((session) => {
      const progress = session.progress;
      const timeSpent = calculateTimeSpent(session.createdAt, session.updatedAt);
      const questionsAsked = progress?.questionsAsked || 0;
      const correctAnswers = progress?.correctAnswers || 0;
      const hintsUsed = progress?.hintsUsed || 0;

      // Calculate thinking score for this session
      let thinkingScore = null;
      if (questionsAsked > 0) {
        thinkingScore = calculateThinkingScore(
          correctAnswers,
          hintsUsed,
          timeSpent,
          questionsAsked
        );
        totalThinkingScore += thinkingScore;
        sessionsWithScore++;
      }

      // Aggregate totals
      totalQuestionsAsked += questionsAsked;
      totalCorrectAnswers += correctAnswers;
      totalHintsUsed += hintsUsed;
      totalTimeSpent += timeSpent;

      return {
        sessionId: session.id,
        difficulty: session.difficulty,
        currentQuestion: session.currentQuestion,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        timeSpentMinutes: Math.round(timeSpent * 10) / 10,
        progress: {
          questionsAsked,
          correctAnswers,
          hintsUsed,
          thinkingScore,
        },
        messageCount: session._count.messages,
      };
    });

    const averageThinkingScore =
      sessionsWithScore > 0 ? totalThinkingScore / sessionsWithScore : 0;
    const averageTimeSpent =
      totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

    res.status(200).json({
      success: true,
      data: {
        pdf: {
          id: pdf.id,
          fileName: pdf.fileName,
        },
        statistics: {
          totalSessions,
          totalQuestionsAsked,
          totalCorrectAnswers,
          totalHintsUsed,
          averageThinkingScore: Math.round(averageThinkingScore * 10) / 10,
          averageTimeSpentMinutes: Math.round(averageTimeSpent * 10) / 10,
          overallAccuracy:
            totalQuestionsAsked > 0
              ? Math.round((totalCorrectAnswers / totalQuestionsAsked) * 100 * 10) / 10
              : 0,
        },
        sessions: sessionStats,
      },
    });
  } catch (error) {
    console.error('Get PDF progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve PDF progress',
    });
  }
};

