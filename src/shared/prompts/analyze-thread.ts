/**
 * Thread Analysis Prompt Template
 *
 * Builds the prompt for analyzing a social media thread and generating suggestions
 */

import { AI_CONFIG, PLATFORM_NAMES } from '@shared/constants';

import type { ThreadContext } from '@shared/types';

/**
 * Build the prompt for thread analysis
 */
export function buildAnalyzeThreadPrompt(context: ThreadContext, toneDescription: string): string {
  const platformName = PLATFORM_NAMES[context.platform];
  const threadContent = formatThreadContent(context);

  return `Analyze the following ${platformName} thread and generate ${AI_CONFIG.SUGGESTION_COUNT.DEFAULT} distinct reply suggestions.

## Tone
${toneDescription}

## Thread Content
${threadContent}

## Instructions
1. First, provide a brief 1-2 sentence summary of what the thread is about
2. Then, generate ${AI_CONFIG.SUGGESTION_COUNT.DEFAULT} unique reply suggestions that:
   - Are contextually relevant to the conversation
   - Match the requested tone
   - Offer different perspectives or approaches
   - Are appropriate for ${platformName}
   - Are concise but meaningful (typically 1-3 sentences each)

## Response Format
Respond with valid JSON in this exact format:
{
  "summary": "A brief summary of the thread",
  "suggestions": [
    "First reply suggestion",
    "Second reply suggestion",
    "Third reply suggestion",
    "Fourth reply suggestion"
  ]
}`;
}

/**
 * Format thread content for the prompt
 */
function formatThreadContent(context: ThreadContext): string {
  const parts: string[] = [];

  // Add post title if present
  if (context.postTitle) {
    parts.push(`### Post Title\n${truncateForPrompt(context.postTitle, 500)}`);
  }

  // Add post body
  if (context.postBody) {
    parts.push(`### Post Content\n${truncateForPrompt(context.postBody, 3000)}`);
  }

  // Add comments if present
  if (context.comments.length > 0) {
    const commentsText = context.comments
      .slice(0, 20) // Limit comments in prompt
      .map((comment) => {
        const indent = '  '.repeat(comment.depth);
        return `${indent}**${comment.author}**: ${truncateForPrompt(comment.text, 500)}`;
      })
      .join('\n\n');

    parts.push(`### Comments (${context.comments.length} total)\n${commentsText}`);
  }

  // Ensure total doesn't exceed context limit
  const combined = parts.join('\n\n');
  return truncateForPrompt(combined, AI_CONFIG.MAX_CONTEXT_CHARS);
}

/**
 * Truncate text for prompt while preserving meaning
 */
function truncateForPrompt(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to cut at a sentence boundary
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = Math.max(lastPeriod, lastNewline);

  if (cutPoint > maxLength * 0.7) {
    return truncated.slice(0, cutPoint + 1) + '\n[Content truncated]';
  }

  return truncated + '... [Content truncated]';
}
