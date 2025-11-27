/**
 * Draft Rewrite Prompt Template
 *
 * Builds the prompt for rewriting user draft text
 */

import { PLATFORM_NAMES } from '@shared/constants';

import type { ThreadContext } from '@shared/types';

/**
 * Build the prompt for draft rewriting
 */
export function buildRewriteDraftPrompt(
  draftText: string,
  context: ThreadContext | null,
  toneDescription: string
): string {
  const contextSection = context ? formatContextForRewrite(context) : '';

  return `Rewrite the following draft text to improve it while maintaining the original meaning.

## Tone to Apply
${toneDescription}

## Original Draft
${draftText}
${contextSection}
## Instructions
- Maintain the original meaning and intent of the message
- Apply the requested tone consistently
- Improve clarity, flow, and readability
- Fix any grammar, spelling, or punctuation issues
- Keep the length appropriate (don't significantly expand or reduce)
- Make it sound natural, not robotic
- Keep it appropriate for social media

## Response
Return ONLY the rewritten text, nothing else. No explanations, no quotes, just the improved text.`;
}

/**
 * Format thread context for rewrite prompt (optional context)
 */
function formatContextForRewrite(context: ThreadContext): string {
  const platformName = PLATFORM_NAMES[context.platform];

  let contextText = `\n## Conversation Context (${platformName})\n`;

  if (context.postTitle) {
    contextText += `**Post Title**: ${truncate(context.postTitle, 200)}\n`;
  }

  if (context.postBody) {
    contextText += `**Post Content**: ${truncate(context.postBody, 500)}\n`;
  }

  if (context.comments.length > 0) {
    const recentComments = context.comments
      .slice(-3) // Get last 3 comments for context
      .map((c) => `- ${c.author}: ${truncate(c.text, 200)}`)
      .join('\n');
    contextText += `**Recent Comments**:\n${recentComments}\n`;
  }

  return contextText;
}

/**
 * Simple truncation helper
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}
