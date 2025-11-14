/**
 * Calculate thinking score based on performance metrics
 * @param correctAnswers - Number of correct answers
 * @param hintsUsed - Number of hints used
 * @param timeSpentMinutes - Time spent in minutes (optional)
 * @param totalQuestions - Total questions asked
 * @returns Thinking score between 0-100
 */
export function calculateThinkingScore(
  correctAnswers: number,
  hintsUsed: number,
  timeSpentMinutes?: number,
  totalQuestions: number = 1
): number {
  // Base score from correctness (0-60 points)
  const correctnessScore = totalQuestions > 0 
    ? (correctAnswers / totalQuestions) * 60 
    : 0;

  // Penalty for hints used (0-20 points deducted)
  // More hints = lower score
  const hintsPenalty = Math.min(hintsUsed * 2, 20);

  // Time efficiency bonus (0-20 points)
  // Faster completion with good accuracy = bonus
  let timeBonus = 0;
  if (timeSpentMinutes && timeSpentMinutes > 0 && totalQuestions > 0) {
    const avgTimePerQuestion = timeSpentMinutes / totalQuestions;
    // Ideal time is 2-5 minutes per question
    if (avgTimePerQuestion >= 2 && avgTimePerQuestion <= 5) {
      timeBonus = 20;
    } else if (avgTimePerQuestion < 2) {
      // Too fast might indicate guessing
      timeBonus = 10;
    } else if (avgTimePerQuestion <= 10) {
      // Reasonable time
      timeBonus = 15;
    } else {
      // Too slow
      timeBonus = 5;
    }
  } else {
    // Default bonus if no time data
    timeBonus = 10;
  }

  // Calculate final score
  const score = Math.max(0, Math.min(100, correctnessScore - hintsPenalty + timeBonus));

  // Round to 1 decimal place
  return Math.round(score * 10) / 10;
}

/**
 * Calculate time spent in minutes from two dates
 * @param startDate - Start date
 * @param endDate - End date (defaults to now)
 * @returns Time spent in minutes
 */
export function calculateTimeSpent(
  startDate: Date,
  endDate: Date = new Date()
): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60); // Convert to minutes
}

