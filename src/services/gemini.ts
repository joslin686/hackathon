import { GoogleGenerativeAI } from '@google/generative-ai'

// Types
export interface PDFAnalysisResult {
  topics: string[]
  concepts: string[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  type: 'question' | 'answer' | 'explanation'
}

// Initialize Gemini API client
const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables')
  }

  return new GoogleGenerativeAI(apiKey)
}

// Helper function to get the correct model name based on API key type
// For standard (non-Pro) API keys, use gemini-2.5-flash (recommended as of Nov 2024)
// Alternative models to try if this doesn't work:
// - gemini-1.5-flash (older, may be deprecated)
// - gemini-1.5-pro (may require Pro API key)
// - gemini-pro (legacy model)
const getModelName = (): string => {
  // Use gemini-2.5-flash for standard API keys (most current and widely available)
  return 'gemini-2.5-flash'
}

// Convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (data:application/pdf;base64,)
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Processes a PDF file and extracts all text content using Gemini API
 * @param file - The PDF file to process
 * @returns Promise resolving to the extracted text content
 * @throws Error if API key is missing, file processing fails, or API call fails
 */
export async function processPDF(file: File): Promise<string> {
  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('File must be a PDF')
    }

    // Convert PDF to base64
    const base64Data = await fileToBase64(file)

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Prepare the PDF data for Gemini
    const pdfPart = {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf',
      },
    }

    // Send to Gemini API with prompt to extract text
    const prompt = 'Extract all text content from this PDF. Return only the text content, preserving the structure and formatting as much as possible.'

    const result = await model.generateContent([prompt, pdfPart])
    const response = await result.response
    const text = response.text()

    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from the PDF')
    }

    return text
  } catch (error) {
    if (error instanceof Error) {
      // Provide helpful error message for model not found errors
      if (error.message.includes('not found') || error.message.includes('404')) {
        throw new Error(
          `Model not found. Please check: 1) Your API key has access to Gemini models, 2) The model name is correct. Error: ${error.message}`
        )
      }
      throw new Error(`Failed to process PDF: ${error.message}`)
    }
    throw new Error('Failed to process PDF: Unknown error occurred')
  }
}

/**
 * Analyzes PDF text content to identify main topics and key concepts
 * @param pdfText - The extracted text from the PDF
 * @returns Promise resolving to structured analysis with topics and concepts
 * @throws Error if analysis fails or API call fails
 */
export async function analyzePDFContent(pdfText: string): Promise<PDFAnalysisResult> {
  try {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('PDF text content is empty')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

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
${pdfText.substring(0, 100000)}` // Limit to first 100k chars to avoid token limits

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    try {
      const analysis = JSON.parse(jsonText) as PDFAnalysisResult

      // Validate structure
      if (!Array.isArray(analysis.topics) || !Array.isArray(analysis.concepts)) {
        throw new Error('Invalid response structure from API')
      }

      // Ensure we have valid data
      return {
        topics: analysis.topics.filter((t): t is string => typeof t === 'string' && t.length > 0),
        concepts: analysis.concepts.filter((c): c is string => typeof c === 'string' && c.length > 0),
      }
    } catch (parseError) {
      throw new Error(`Failed to parse analysis response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze PDF content: ${error.message}`)
    }
    throw new Error('Failed to analyze PDF content: Unknown error occurred')
  }
}

/**
 * Generates an introductory explanation of the topic to start the learning session
 * @param pdfContent - The extracted text content from the PDF
 * @param difficultyLevel - Difficulty level from 1 to 4
 * @param currentTopic - Optional current topic to focus on
 * @returns Promise resolving to an introductory explanation string
 * @throws Error if generation fails or API call fails
 */
export async function generateIntroExplanation(
  pdfContent: string,
  difficultyLevel: number,
  currentTopic?: string
): Promise<string> {
  try {
    // Validate inputs
    if (!pdfContent || pdfContent.trim().length === 0) {
      throw new Error('PDF content is empty')
    }

    if (difficultyLevel < 1 || difficultyLevel > 4 || !Number.isInteger(difficultyLevel)) {
      throw new Error('Difficulty level must be an integer between 1 and 4')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Get first 6000 characters for a comprehensive intro
    const pdfContext = pdfContent.substring(0, 6000)

    // Define difficulty-based explanation styles
    const difficultyStyles = {
      1: {
        style: 'simple and straightforward',
        instruction: 'Use simple language, basic terms, and straightforward explanations. Keep it accessible and easy to understand.',
        length: '4-5 sentences',
      },
      2: {
        style: 'clear with some detail',
        instruction: 'Provide clear explanations with moderate detail. Include relationships and basic reasoning.',
        length: '5-6 sentences',
      },
      3: {
        style: 'detailed with connections',
        instruction: 'Provide detailed explanations that show connections between concepts. Include applications and relationships.',
        length: '6-7 sentences',
      },
      4: {
        style: 'comprehensive and nuanced',
        instruction: 'Provide comprehensive explanations with nuanced understanding. Include synthesis, critical analysis, and deeper insights.',
        length: '7-8 sentences',
      },
    }

    const styleInfo = difficultyStyles[difficultyLevel as keyof typeof difficultyStyles]

    // Build the intro explanation prompt
    const introPrompt = `You are a Socratic tutor starting a new learning session. Your job is to provide an engaging introductory explanation of the topic to help the student get oriented before we begin Socratic questioning.

CRITICAL REQUIREMENTS:
1. Provide a clear, engaging introduction to the main topic(s) covered in the material
2. Give an overview of key concepts that will be explored
3. Explain the topic as general knowledge without referencing "the lecture", "the PDF", "the material", or "the slides"
4. Match the difficulty level ${difficultyLevel} style: ${styleInfo.instruction}
5. Keep the explanation ${styleInfo.length} long (comprehensive but not overwhelming)
6. Use ${styleInfo.style} language appropriate for difficulty level ${difficultyLevel}
7. Present information as universal concepts, not as something from a specific source
8. Make it engaging and set the stage for deeper exploration through questions
9. End with a transition like "Let's explore this further through some questions" or "Now let's dive deeper with some questions"
${currentTopic ? `10. Focus primarily on the topic: "${currentTopic}"` : ''}

Difficulty Level ${difficultyLevel} Style: ${styleInfo.style}

Lecture Material (first 6000 characters):
${pdfContext}

Generate an engaging introductory explanation that:
- Introduces the main topic(s) and key concepts
- Provides context and sets the stage for learning
- Matches difficulty level ${difficultyLevel} complexity
- Is ${styleInfo.length} long
- Ends with a transition to questions
- Does NOT reference any external material or ask students to check anything

Return ONLY the explanation text, nothing else.`

    const result = await model.generateContent(introPrompt)
    const response = await result.response
    let explanation = response.text().trim()

    if (!explanation || explanation.length === 0) {
      throw new Error('Generated intro explanation is empty')
    }

    // Clean up the explanation
    explanation = explanation
      .replace(/^(Introduction|Intro|Explanation|Response):\s*/i, '') // Remove prefixes
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim()

    // Ensure it ends with a transition if not already present
    const transitionPhrases = ['question', 'explore', 'dive', 'let\'s']
    const hasTransition = transitionPhrases.some((phrase) =>
      explanation.toLowerCase().includes(phrase)
    )
    
    if (!hasTransition || !explanation.toLowerCase().includes('question')) {
      explanation += ' Let\'s explore this further through some questions.'
    }

    return explanation
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate intro explanation: ${error.message}`)
    }
    throw new Error('Failed to generate intro explanation: Unknown error occurred')
  }
}

/**
 * Generates a Socratic question based on PDF content, difficulty level, and conversation history
 * @param pdfContent - The extracted text content from the PDF
 * @param difficultyLevel - Difficulty level from 1 to 4
 * @param conversationHistory - Array of previous conversation messages
 * @param currentTopic - Optional current topic to focus on
 * @returns Promise resolving to a Socratic question string
 * @throws Error if generation fails or API call fails
 */
export async function generateSocraticQuestion(
  pdfContent: string,
  difficultyLevel: number,
  conversationHistory: ConversationMessage[],
  currentTopic?: string
): Promise<string> {
  try {
    // Validate inputs
    if (!pdfContent || pdfContent.trim().length === 0) {
      throw new Error('PDF content is empty')
    }

    if (difficultyLevel < 1 || difficultyLevel > 4 || !Number.isInteger(difficultyLevel)) {
      throw new Error('Difficulty level must be an integer between 1 and 4')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Get first 4000 characters of PDF content for context
    const pdfContext = pdfContent.substring(0, 4000)

    // Format conversation history
    const historyText = conversationHistory
      .map((msg) => {
        const prefix = msg.role === 'assistant' ? 'AI' : 'Student'
        return `${prefix} (${msg.type}): ${msg.content}`
      })
      .join('\n\n')

    // Define difficulty-based question styles
    const difficultyPrompts = {
      1: {
        style: 'simple recall questions',
        examples: '"What is X?" or "Define Y."',
        instruction: 'Ask simple, direct questions that test basic recall of facts, definitions, and key terms from the PDF content.',
      },
      2: {
        style: 'understanding questions',
        examples: '"Why does X happen?" or "What causes Y?"',
        instruction: 'Ask questions that require understanding of relationships, causes, and basic reasoning about concepts in the PDF.',
      },
      3: {
        style: 'application questions',
        examples: '"How does X relate to Y?" or "In what situation would you apply Z?"',
        instruction: 'Ask questions that require applying concepts to new situations, making connections between ideas, and analyzing relationships.',
      },
      4: {
        style: 'synthesis questions',
        examples: '"What if we combined X and Y?" or "How would you design a solution using concepts A, B, and C?"',
        instruction: 'Ask complex questions that require synthesizing multiple concepts, creating new connections, evaluating trade-offs, and thinking critically about the material.',
      },
    }

    const difficultyInfo = difficultyPrompts[difficultyLevel as keyof typeof difficultyPrompts]

// Build the system prompt
const systemPrompt = `You are a Socratic tutor helping a student learn. Your ONLY job is to ask questions using the Socratic method.

CRITICAL RULES:
1. You MUST ONLY ask questions - NEVER provide explanations, answers, or hints
2. Use ONLY the Socratic method: guide the student to discover answers through thoughtful questioning
3. Base your question on the concepts from the lecture material
4. Difficulty Level ${difficultyLevel}: ${difficultyInfo.instruction}
5. Question style: ${difficultyInfo.style} (examples: ${difficultyInfo.examples})
6. Build progressively on previous questions in the conversation
7. Do NOT repeat questions that have already been asked
8. DO NOT reference "the lecture", "the PDF", "the material", "the slides", or ask students to look at anything
9. Present concepts as general knowledge and ask questions about the concepts themselves
10. Make the question thought-provoking and encourage deeper thinking
11. Frame questions as if discussing general concepts, not specific lecture content
${currentTopic ? `12. Focus on the topic: "${currentTopic}"` : ''}

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}

Lecture Material (first 4000 characters):
${pdfContext}

Now generate a single Socratic question that:
- Follows difficulty level ${difficultyLevel} requirements
- Is based on the lecture material
- Builds on the conversation history (if any)
- Encourages the student to think deeply
- Is appropriate for the current learning stage
- Does NOT ask the student to check or reference any external material

Return ONLY the question text, nothing else. No explanations, no prefixes, just the question.`

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const question = response.text().trim()

    if (!question || question.length === 0) {
      throw new Error('Generated question is empty')
    }

    // Clean up the question (remove any unwanted prefixes or formatting)
    let cleanedQuestion = question
      .replace(/^(Question|Q:|Q\d+:)\s*/i, '') // Remove question prefixes
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim()

    // Ensure it ends with a question mark
    if (!cleanedQuestion.endsWith('?') && !cleanedQuestion.endsWith('.')) {
      cleanedQuestion += '?'
    }

    return cleanedQuestion
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate Socratic question: ${error.message}`)
    }
    throw new Error('Failed to generate Socratic question: Unknown error occurred')
  }
}

export interface ResponseEvaluation {
  quality: 'strong' | 'partial' | 'needs_work'
  feedback: string
}

/**
 * Evaluates a user's answer to a Socratic question
 * @param question - The question that was asked
 * @param userAnswer - The user's answer to evaluate
 * @param pdfContent - The PDF content for context
 * @param difficultyLevel - The difficulty level (1-4) of the question
 * @returns Promise resolving to evaluation result with quality and feedback
 * @throws Error if evaluation fails or API call fails
 */
export async function evaluateResponse(
  question: string,
  userAnswer: string,
  pdfContent: string,
  difficultyLevel: number
): Promise<ResponseEvaluation> {
  try {
    // Validate inputs
    if (!question || question.trim().length === 0) {
      throw new Error('Question is empty')
    }

    if (!userAnswer || userAnswer.trim().length === 0) {
      throw new Error('User answer is empty')
    }

    if (!pdfContent || pdfContent.trim().length === 0) {
      throw new Error('PDF content is empty')
    }

    if (difficultyLevel < 1 || difficultyLevel > 4 || !Number.isInteger(difficultyLevel)) {
      throw new Error('Difficulty level must be an integer between 1 and 4')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Get first 4000 characters of PDF content for context
    const pdfContext = pdfContent.substring(0, 4000)

    // Define difficulty-based expectations
    const difficultyExpectations = {
      1: 'Basic recall of facts, definitions, and key terms. Simple understanding is sufficient.',
      2: 'Understanding of relationships, causes, and basic reasoning. Should show comprehension of concepts.',
      3: 'Application of concepts to situations, making connections, and analyzing relationships. Should demonstrate deeper understanding.',
      4: 'Synthesis of multiple concepts, critical thinking, and evaluation. Should show advanced understanding and ability to connect ideas.',
    }

    const expectation = difficultyExpectations[difficultyLevel as keyof typeof difficultyExpectations]

    // Build the evaluation prompt
    const evaluationPrompt = `You are a Socratic tutor evaluating a student's answer. Your job is to evaluate the quality of the answer and provide constructive feedback.

CRITICAL RULES:
1. You MUST NOT provide explanations or answers - only evaluation and feedback
2. Evaluate based on:
   - Logical reasoning: Does the answer show logical thinking?
   - Understanding of concepts: Does it demonstrate grasp of the concepts?
   - Depth of understanding: Does it demonstrate understanding appropriate for difficulty level ${difficultyLevel}?
   - Correctness of concepts: Are the concepts mentioned accurate?

3. Quality levels:
   - "strong": Good understanding, demonstrates logical reasoning, shows grasp of concepts, shows appropriate depth for the difficulty level, concepts are correct. Ready for explanation.
   - "partial": Some understanding but incomplete or unclear. May have correct concepts but lacks depth, or has some inaccuracies.
   - "needs_work": Poor understanding, off-topic, incorrect concepts, or lacks logical reasoning. Needs more guidance.

4. Feedback format:
   - If "strong": Start with "Great thinking!" or similar positive reinforcement, then provide a gentle transition like "Let me explain this concept..." (but DO NOT actually explain - just indicate readiness for explanation)
   - If "partial": Start with "You're on the right track." then ask a follow-up question to guide them, like "Can you elaborate on [specific part]?" or "What do you think about [related aspect]?"
   - If "needs_work": Start with "Let's think about this differently." then provide a guiding question that helps redirect their thinking, like "What if we consider [alternative perspective]?" or "How does [concept from the lecture] relate to this?"

5. Your feedback should be:
   - Encouraging and supportive
   - A question or gentle nudge (NOT an explanation)
   - Specific to what they said
   - Appropriate for difficulty level ${difficultyLevel}
   - NEVER ask the student to check, look at, or reference any external material

Difficulty Level ${difficultyLevel} Expectations: ${expectation}

Lecture Material (first 4000 characters):
${pdfContext}

Question asked: ${question}

Student's answer: ${userAnswer}

Evaluate the answer and return your response as a JSON object with this exact structure:
{
  "quality": "strong" | "partial" | "needs_work",
  "feedback": "your feedback text here (as a question or gentle nudge, NOT an explanation)"
}

Return ONLY the JSON object, nothing else.`

    const result = await model.generateContent(evaluationPrompt)
    const response = await result.response
    const text = response.text().trim()

    // Parse JSON response
    let jsonText = text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    try {
      const evaluation = JSON.parse(jsonText) as ResponseEvaluation

      // Validate structure
      if (
        !evaluation.quality ||
        !['strong', 'partial', 'needs_work'].includes(evaluation.quality)
      ) {
        throw new Error('Invalid quality value in response')
      }

      if (!evaluation.feedback || typeof evaluation.feedback !== 'string') {
        throw new Error('Invalid feedback in response')
      }

      // Ensure feedback doesn't contain explanations (basic check)
      const feedbackLower = evaluation.feedback.toLowerCase()
      const explanationPhrases = [
        'the answer is',
        'the correct answer',
        'this is because',
        'it is',
        'they are',
        'this means',
      ]
      const hasExplanation = explanationPhrases.some((phrase) =>
        feedbackLower.includes(phrase)
      )

      if (hasExplanation) {
        // If it looks like an explanation, convert to a question
        evaluation.feedback = `Let's explore this further. ${evaluation.feedback}`
      }

      return {
        quality: evaluation.quality,
        feedback: evaluation.feedback.trim(),
      }
    } catch (parseError) {
      throw new Error(
        `Failed to parse evaluation response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to evaluate response: ${error.message}`)
    }
    throw new Error('Failed to evaluate response: Unknown error occurred')
  }
}

/**
 * Generates an explanation for a concept after the user has demonstrated strong understanding
 * @param question - The question that was asked
 * @param userAnswer - The user's answer that demonstrated good understanding
 * @param pdfContent - The PDF content for context
 * @param difficultyLevel - The difficulty level (1-4) of the question
 * @returns Promise resolving to explanation text
 * @throws Error if generation fails or API call fails
 */
export async function generateExplanation(
  question: string,
  userAnswer: string,
  pdfContent: string,
  difficultyLevel: number
): Promise<string> {
  try {
    // Validate inputs
    if (!question || question.trim().length === 0) {
      throw new Error('Question is empty')
    }

    if (!userAnswer || userAnswer.trim().length === 0) {
      throw new Error('User answer is empty')
    }

    if (!pdfContent || pdfContent.trim().length === 0) {
      throw new Error('PDF content is empty')
    }

    if (difficultyLevel < 1 || difficultyLevel > 4 || !Number.isInteger(difficultyLevel)) {
      throw new Error('Difficulty level must be an integer between 1 and 4')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Get first 4000 characters of PDF content for context
    const pdfContext = pdfContent.substring(0, 4000)

    // Define difficulty-based explanation styles
    const difficultyStyles = {
      1: {
        style: 'simple and straightforward',
        instruction: 'Use simple language, basic terms, and straightforward explanations. Keep it accessible and easy to understand.',
        length: '3-4 sentences',
      },
      2: {
        style: 'clear with some detail',
        instruction: 'Provide clear explanations with moderate detail. Include relationships and basic reasoning.',
        length: '4-5 sentences',
      },
      3: {
        style: 'detailed with connections',
        instruction: 'Provide detailed explanations that show connections between concepts. Include applications and relationships.',
        length: '4-5 sentences',
      },
      4: {
        style: 'comprehensive and nuanced',
        instruction: 'Provide comprehensive explanations with nuanced understanding. Include synthesis, critical analysis, and deeper insights.',
        length: '5 sentences',
      },
    }

    const styleInfo = difficultyStyles[difficultyLevel as keyof typeof difficultyStyles]

    // Build the explanation prompt
    const explanationPrompt = `You are now in EXPLANATION MODE. The student has demonstrated good understanding. Provide a clear explanation of the concept to confirm their learning. Keep it concise but complete.

CRITICAL REQUIREMENTS:
1. Confirm the user's understanding by acknowledging what they got right
2. Expand on the concept properly with additional context and deeper insights
3. Explain the concept as general knowledge without referencing "the lecture", "the PDF", or "the material"
4. Match the difficulty level ${difficultyLevel} style: ${styleInfo.instruction}
5. Keep the explanation ${styleInfo.length} long (concise but complete)
6. End with encouragement: "Ready for the next question?"
7. Use ${styleInfo.style} language appropriate for difficulty level ${difficultyLevel}
8. Present information as universal concepts, not as something from a specific source

Difficulty Level ${difficultyLevel} Style: ${styleInfo.style}

Lecture Material (first 4000 characters):
${pdfContext}

Question asked: ${question}

Student's answer (which demonstrated good understanding): ${userAnswer}

Generate a clear, concise explanation that:
- Confirms the student's understanding
- Expands on the concept with proper context
- References the lecture material naturally
- Matches difficulty level ${difficultyLevel} complexity
- Is ${styleInfo.length} long
- Ends with "Ready for the next question?"
- Does NOT ask the student to check or reference any external material

Return ONLY the explanation text, nothing else.`

    const result = await model.generateContent(explanationPrompt)
    const response = await result.response
    let explanation = response.text().trim()

    if (!explanation || explanation.length === 0) {
      throw new Error('Generated explanation is empty')
    }

    // Clean up the explanation
    explanation = explanation
      .replace(/^(Explanation|Response|Answer):\s*/i, '') // Remove prefixes
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim()

    // Ensure it ends with encouragement if not already present
    const encouragementPhrase = 'Ready for the next question?'
    if (!explanation.toLowerCase().includes(encouragementPhrase.toLowerCase())) {
      explanation += ` ${encouragementPhrase}`
    }

    return explanation
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate explanation: ${error.message}`)
    }
    throw new Error('Failed to generate explanation: Unknown error occurred')
  }
}

/**
 * Generates a progressive hint to guide the user without giving away the answer
 * @param question - The question that was asked
 * @param userAnswer - The user's current answer (may be incomplete or incorrect)
 * @param hintNumber - The hint number (1, 2, or 3) indicating hint progression
 * @param pdfContent - The PDF content for context
 * @param difficultyLevel - The difficulty level (1-4) of the question
 * @returns Promise resolving to hint text
 * @throws Error if generation fails or API call fails
 */
export async function generateHint(
  question: string,
  userAnswer: string,
  hintNumber: number,
  pdfContent: string,
  difficultyLevel: number
): Promise<string> {
  try {
    // Validate inputs
    if (!question || question.trim().length === 0) {
      throw new Error('Question is empty')
    }

    if (hintNumber < 1 || hintNumber > 3 || !Number.isInteger(hintNumber)) {
      throw new Error('Hint number must be 1, 2, or 3')
    }

    if (!pdfContent || pdfContent.trim().length === 0) {
      throw new Error('PDF content is empty')
    }

    if (difficultyLevel < 1 || difficultyLevel > 4 || !Number.isInteger(difficultyLevel)) {
      throw new Error('Difficulty level must be an integer between 1 and 4')
    }

    // Initialize Gemini client
    const genAI = getGeminiClient()
    // Use model name based on API key type
    const model = genAI.getGenerativeModel({ model: getModelName() })

    // Get first 4000 characters of PDF content for context
    const pdfContext = pdfContent.substring(0, 4000)

    // Define hint progression levels
    const hintLevels = {
      1: {
        specificity: 'gentle nudge, general direction',
        instruction: 'Provide a very gentle, general hint that points in the right direction without revealing specifics. Use broad concepts or general areas to consider.',
        examples: 'Questions like "What about X?" or suggestions like "Consider thinking about Y..." or references like "Look back at the part about Z in the lecture..."',
        helpfulness: 'minimal - just enough to get them thinking in the right direction',
      },
      2: {
        specificity: 'more specific, narrows down the concept',
        instruction: 'Provide a more specific hint that narrows down the concept or area they should focus on. Reference specific concepts or sections from the lecture.',
        examples: 'More specific questions like "How does X relate to Y?" or suggestions like "Focus on the relationship between A and B..." or references like "The section discussing C mentions..."',
        helpfulness: 'moderate - guides them to the right area without giving the answer',
      },
      3: {
        specificity: 'very specific, almost gives it away but still requires thinking',
        instruction: 'Provide a very specific hint that almost gives away the answer but still requires the student to think and connect the dots. Reference very specific concepts, examples, or relationships.',
        examples: 'Very specific questions like "What happens when X and Y combine?" or suggestions like "The key is understanding how A leads to B..." or references like "The example of C in the lecture demonstrates..."',
        helpfulness: 'high - very close to the answer but still requires synthesis',
      },
    }

    const hintInfo = hintLevels[hintNumber as keyof typeof hintLevels]

    // Build the hint prompt
    const hintPrompt = `You are a Socratic tutor providing a progressive hint to help a student. Your job is to guide them without giving away the answer.

CRITICAL RULES:
1. You MUST NOT provide the answer or explanation - only a hint
2. The hint should guide the student to discover the answer themselves
3. Hint ${hintNumber} should be: ${hintInfo.specificity}
4. Helpfulness level: ${hintInfo.helpfulness}
5. Phrase the hint as one of these styles:
   - Questions: "What about X?" or "How does Y relate to Z?"
   - Suggestions: "Consider thinking about Y..." or "Focus on the relationship between A and B..."
   - Guiding thoughts: "Think about the concept of Z..." or "Consider how C relates to this..."
6. Base the hint on the concepts from the material, but present them as general knowledge
7. DO NOT reference "the lecture", "the PDF", "the material", or "the slides"
8. Adjust the hint complexity to match difficulty level ${difficultyLevel}
9. The hint should build on what the student has already attempted (their current answer)
10. Guide them to think about the concepts themselves, not where they came from

Hint ${hintNumber} Requirements: ${hintInfo.instruction}

Examples of appropriate phrasing: ${hintInfo.examples}

Difficulty Level: ${difficultyLevel}

Lecture Material (first 4000 characters):
${pdfContext}

Question asked: ${question}

Student's current answer: ${userAnswer || '(No answer provided yet)'}

Generate Hint ${hintNumber} that:
- Provides ${hintInfo.specificity}
- Guides without giving away the answer
- Uses appropriate phrasing (question, suggestion, or reference)
- References the lecture material when helpful
- Matches difficulty level ${difficultyLevel}
- Helps the student think in the right direction
- Does NOT ask the student to check or reference any external material

Return ONLY the hint text, nothing else. No prefixes, no explanations, just the hint.`

    const result = await model.generateContent(hintPrompt)
    const response = await result.response
    let hint = response.text().trim()

    if (!hint || hint.length === 0) {
      throw new Error('Generated hint is empty')
    }

    // Clean up the hint
    hint = hint
      .replace(/^(Hint|Hint \d+|💡|💡 Hint):\s*/i, '') // Remove hint prefixes
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim()

    // Ensure it's phrased appropriately (should be a question, suggestion, or reference)
    // If it doesn't start with a question word or suggestion phrase, add one
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
    const suggestionPhrases = ['consider', 'think about', 'focus on', 'look at', 'remember', 'recall']
    const referencePhrases = ['the lecture', 'the section', 'the part about', 'as mentioned']

    const hintLower = hint.toLowerCase()
    const isQuestion = questionWords.some((word) => hintLower.startsWith(word))
    const isSuggestion = suggestionPhrases.some((phrase) => hintLower.startsWith(phrase))
    const isReference = referencePhrases.some((phrase) => hintLower.includes(phrase))

    // If it doesn't match any style, it's probably okay as-is (might be a statement hint)
    // We'll keep it as generated

    return hint
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate hint: ${error.message}`)
    }
    throw new Error('Failed to generate hint: Unknown error occurred')
  }
}

