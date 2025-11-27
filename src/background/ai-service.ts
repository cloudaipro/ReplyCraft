/**
 * AI Service
 *
 * Handles communication with OpenAI API for thread analysis and draft rewriting
 */

import OpenAI from 'openai';

import { AI_CONFIG, API_KEY_CONFIG, TONE_DESCRIPTIONS } from '@shared/constants';
import { buildAnalyzeThreadPrompt } from '@shared/prompts/analyze-thread';
import { buildRewriteDraftPrompt } from '@shared/prompts/rewrite-draft';

import type {
  ThreadContext,
  Tone,
  TonePreset,
  AISuggestion,
  Response,
  ApiKeyValidationResponseData,
  ErrorCode,
} from '@shared/types';

// =============================================================================
// Types
// =============================================================================

interface AnalyzeResult {
  suggestions: AISuggestion[];
  threadSummary: string;
}

interface RewriteResult {
  rewrittenText: string;
}

// =============================================================================
// API Key Validation
// =============================================================================

export function isValidApiKeyFormat(apiKey: string): boolean {
  return API_KEY_CONFIG.PATTERN.test(apiKey);
}

export async function validateApiKey(
  apiKey: string
): Promise<Response<ApiKeyValidationResponseData>> {
  if (!isValidApiKeyFormat(apiKey)) {
    return {
      success: false,
      error: {
        code: 'API_KEY_INVALID',
        message: 'Invalid API key format. OpenAI keys should start with "sk-"',
      },
    };
  }

  try {
    const client = new OpenAI({ apiKey });

    // Make a minimal API call to verify the key works
    const response = await client.models.list();

    // Check if gpt-4 is available
    const hasGPT4 = response.data.some((model) => model.id.includes('gpt-4'));

    return {
      success: true,
      data: {
        valid: true,
        model: hasGPT4 ? AI_CONFIG.MODEL : AI_CONFIG.FALLBACK_MODEL,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('401') || errorMessage.includes('Incorrect API key')) {
      return {
        success: false,
        error: {
          code: 'API_KEY_INVALID',
          message: 'Invalid API key. Please check your key and try again.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: `Failed to validate API key: ${errorMessage}`,
      },
    };
  }
}

// =============================================================================
// Thread Analysis
// =============================================================================

export async function analyzeThread(
  context: ThreadContext,
  tone: Tone,
  customToneText: string | undefined,
  apiKey: string
): Promise<Response<AnalyzeResult>> {
  try {
    const client = new OpenAI({ apiKey });

    const toneDescription = getToneDescription(tone, customToneText);
    const prompt = buildAnalyzeThreadPrompt(context, toneDescription);

    const response = await client.chat.completions.create({
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: AI_CONFIG.MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return createError('API_ERROR', 'No response from AI');
    }

    const result = parseAnalysisResponse(content, tone === 'custom' ? customToneText ?? '' : tone);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return handleApiError(error);
  }
}

// =============================================================================
// Draft Rewriting
// =============================================================================

export async function rewriteDraft(
  draftText: string,
  context: ThreadContext | null,
  tone: Tone,
  customToneText: string | undefined,
  apiKey: string
): Promise<Response<RewriteResult>> {
  try {
    const client = new OpenAI({ apiKey });

    const toneDescription = getToneDescription(tone, customToneText);
    const prompt = buildRewriteDraftPrompt(draftText, context, toneDescription);

    const response = await client.chat.completions.create({
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: 'system',
          content: getRewriteSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: AI_CONFIG.MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return createError('API_ERROR', 'No response from AI');
    }

    return {
      success: true,
      data: {
        rewrittenText: content.trim(),
      },
    };
  } catch (error) {
    return handleApiError(error);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSystemPrompt(): string {
  return `You are a helpful assistant that generates reply suggestions for social media conversations.

Your responses should:
- Be contextually relevant to the thread
- Match the requested tone
- Be appropriate for the platform
- Be concise but meaningful
- Avoid controversial or inflammatory content
- Never include harmful, hateful, or inappropriate content

When generating suggestions, provide ${AI_CONFIG.SUGGESTION_COUNT.DEFAULT} distinct options that offer different approaches or angles on the topic.

Format your response as JSON with the following structure:
{
  "summary": "A brief 1-2 sentence summary of the thread/conversation",
  "suggestions": [
    "First suggestion text",
    "Second suggestion text",
    "Third suggestion text",
    "Fourth suggestion text"
  ]
}`;
}

function getRewriteSystemPrompt(): string {
  return `You are a helpful writing assistant that improves draft text for social media replies.

Your task is to:
- Maintain the original meaning and intent
- Apply the requested tone
- Improve clarity and flow
- Fix any grammar or spelling issues
- Keep the response appropriate in length for the platform

Return ONLY the rewritten text, nothing else.`;
}

function getToneDescription(tone: Tone, customToneText?: string): string {
  if (tone === 'custom' && customToneText) {
    return customToneText;
  }

  return TONE_DESCRIPTIONS[tone as TonePreset] || TONE_DESCRIPTIONS.friendly;
}

function parseAnalysisResponse(content: string, tone: string): AnalyzeResult {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content) as {
      summary?: string;
      suggestions?: string[];
    };

    const suggestions: AISuggestion[] = (parsed.suggestions ?? []).map(
      (text: string, index: number) => ({
        id: `suggestion_${Date.now()}_${index}`,
        text: text.trim(),
        tone,
        generatedAt: Date.now(),
      })
    );

    return {
      suggestions,
      threadSummary: parsed.summary ?? '',
    };
  } catch {
    // Fallback: try to extract suggestions from plain text
    const lines = content
      .split('\n')
      .filter((line) => line.trim())
      .filter((line) => !line.startsWith('{') && !line.startsWith('}'));

    const suggestions: AISuggestion[] = lines.slice(0, AI_CONFIG.SUGGESTION_COUNT.MAX).map(
      (text, index) => ({
        id: `suggestion_${Date.now()}_${index}`,
        text: text.replace(/^\d+\.\s*/, '').trim(),
        tone,
        generatedAt: Date.now(),
      })
    );

    return {
      suggestions,
      threadSummary: '',
    };
  }
}

function handleApiError<T>(error: unknown): Response<T> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Check for specific error types
  if (errorMessage.includes('401')) {
    return createError('API_KEY_INVALID', 'Invalid API key');
  }

  if (errorMessage.includes('429')) {
    return createError('API_RATE_LIMITED', 'Rate limit exceeded. Please wait and try again.');
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return createError('API_TIMEOUT', 'Request timed out. Please try again.');
  }

  if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
    return createError('NETWORK_ERROR', 'Network error. Please check your connection.');
  }

  return createError('API_ERROR', `API error: ${errorMessage}`);
}

function createError<T>(code: ErrorCode, message: string): Response<T> {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
