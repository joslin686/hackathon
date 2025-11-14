import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../utils/prisma';

// Types
export interface PDFAnalysisResult {
  topics: string[];
  concepts: string[];
}

// Initialize Gemini API client
const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  return new GoogleGenerativeAI(apiKey);
};

// Helper function to get the correct model name
const getModelName = (): string => {
  // Use gemini-2.5-flash for standard API keys (most current and widely available)
  return 'gemini-2.5-flash';
};

/**
 * Convert Buffer to base64 string
 * @param buffer - File buffer
 * @returns Base64 string
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Processes a PDF file and extracts all text content using Gemini API
 * @param fileBuffer - The PDF file buffer to process
 * @returns Promise resolving to the extracted text content
 * @throws Error if API key is missing, file processing fails, or API call fails
 */
export async function processPDFFile(fileBuffer: Buffer): Promise<string> {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    // Convert PDF buffer to base64
    const base64Data = bufferToBase64(fileBuffer);

    // Initialize Gemini client
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: getModelName() });

    // Prepare the PDF data for Gemini
    const pdfPart = {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf',
      },
    };

    // Send to Gemini API with prompt to extract text
    const prompt =
      'Extract all text content from this PDF. Return only the text content, preserving the structure and formatting as much as possible.';

    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from the PDF');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      // Provide helpful error message for model not found errors
      if (error.message.includes('not found') || error.message.includes('404')) {
        throw new Error(
          `Model not found. Please check: 1) Your API key has access to Gemini models, 2) The model name is correct. Error: ${error.message}`
        );
      }
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
    throw new Error('Failed to process PDF: Unknown error occurred');
  }
}

/**
 * Analyzes PDF text content to identify main topics and key concepts
 * @param pdfText - The extracted text from the PDF
 * @returns Promise resolving to structured analysis with topics and concepts
 * @throws Error if analysis fails or API call fails
 */
export async function analyzePDFContent(
  pdfText: string
): Promise<PDFAnalysisResult> {
  try {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('PDF text content is empty');
    }

    // Initialize Gemini client
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: getModelName() });

    // Create prompt for analysis
    const prompt = `Analyze the following text content from a lecture PDF and identify:
1. Main topics (3-7 main topics covered in the lecture)
2. Key concepts (5-15 important concepts, terms, or ideas)

Return your response as a JSON object with this exact structure:
{
  "topics": ["topic1", "topic2", ...],
  "concepts": ["concept1", "concept2", ...]
}

Text content:
${pdfText.substring(0, 100000)}`; // Limit to first 100k chars to avoid token limits

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    try {
      const analysis = JSON.parse(jsonText) as PDFAnalysisResult;

      // Validate structure
      if (!Array.isArray(analysis.topics) || !Array.isArray(analysis.concepts)) {
        throw new Error('Invalid response structure from API');
      }

      // Ensure we have valid data
      return {
        topics: analysis.topics.filter(
          (t): t is string => typeof t === 'string' && t.length > 0
        ),
        concepts: analysis.concepts.filter(
          (c): c is string => typeof c === 'string' && c.length > 0
        ),
      };
    } catch (parseError) {
      throw new Error(
        `Failed to parse analysis response: ${
          parseError instanceof Error ? parseError.message : 'Unknown error'
        }`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze PDF content: ${error.message}`);
    }
    throw new Error('Failed to analyze PDF content: Unknown error occurred');
  }
}

/**
 * Saves PDF record to database with S3 URL
 * @param userId - User ID who owns the PDF
 * @param fileName - Original file name
 * @param fileSize - File size in bytes
 * @param fileUrl - S3 URL or file path
 * @param extractedText - Extracted text content from PDF
 * @param topics - Array of topics (will be stored as JSON)
 * @param concepts - Array of concepts (will be stored as JSON)
 * @returns Promise resolving to the created PDF record
 * @throws Error if database operation fails
 */
export async function savePDFToDatabase(
  userId: string,
  fileName: string,
  fileSize: number,
  fileUrl: string,
  extractedText: string,
  topics: string[],
  concepts: string[]
): Promise<{
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  topics: string[];
  concepts: string[];
  createdAt: Date;
  updatedAt: Date;
}> {
  try {
    // Validate inputs
    if (!userId || !fileName || !fileUrl || !extractedText) {
      throw new Error('Missing required fields: userId, fileName, fileUrl, or extractedText');
    }

    // Create PDF record in database
    // Note: Prisma client uses exact model name, so 'PDF' becomes 'pDF'
    const pdf = await prisma.pDF.create({
      data: {
        userId,
        fileName,
        fileSize,
        fileUrl,
        extractedText,
        topics: topics || [],
        concepts: concepts || [],
      },
      select: {
        id: true,
        userId: true,
        fileName: true,
        fileSize: true,
        fileUrl: true,
        topics: true,
        concepts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Convert JSON fields back to arrays for return
    return {
      ...pdf,
      topics: pdf.topics as string[],
      concepts: pdf.concepts as string[],
    };
  } catch (error) {
    console.error('Error saving PDF to database:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save PDF to database: ${error.message}`);
    }
    throw new Error('Failed to save PDF to database: Unknown error occurred');
  }
}

/**
 * Get PDF by ID
 * @param pdfId - PDF ID
 * @param userId - User ID (optional, for authorization check)
 * @returns Promise resolving to PDF record or null
 */
export async function getPDFById(
  pdfId: string,
  userId?: string
): Promise<{
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  extractedText: string;
  topics: string[];
  concepts: string[];
  createdAt: Date;
  updatedAt: Date;
} | null> {
  try {
    const where: any = { id: pdfId };
    if (userId) {
      where.userId = userId;
    }

    const pdf = await prisma.pDF.findUnique({
      where,
      select: {
        id: true,
        userId: true,
        fileName: true,
        fileSize: true,
        fileUrl: true,
        extractedText: true,
        topics: true,
        concepts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!pdf) {
      return null;
    }

    return {
      ...pdf,
      topics: pdf.topics as string[],
      concepts: pdf.concepts as string[],
    };
  } catch (error) {
    console.error('Error getting PDF by ID:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get PDF: ${error.message}`);
    }
    throw new Error('Failed to get PDF: Unknown error occurred');
  }
}

