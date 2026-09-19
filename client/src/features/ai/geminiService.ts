import { storage } from '../../lib/storage.ts';

/**
 * START AI Coach Core Gemini Service
 * Provides focused reasoning to reduce cognitive friction and eliminate ambiguity.
 * Strictly adheres to anti-procrastination behavioral rules:
 * - NOT a casual conversational chatbot
 * - Concise, specific, practical, uncertainty-aware
 * - Zero psychological diagnoses or mental health claims
 * - Zero guilt, shame, or manipulative cheerleading
 * - Grounded in actual user data
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiApiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  const settingsKey = storage.getSettings().geminiApiKey;
  if (settingsKey && typeof settingsKey === 'string' && settingsKey.trim().length > 0) {
    return settingsKey.trim();
  }
  return '';
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export const AI_COACH_SYSTEM_PROMPT = `
You are the AI Coach within the START Anti-Procrastination Operating System.
Your job is NOT casual conversation or friendly chatting. You are an executive-function reasoning layer.
Your sole purpose is to reduce friction, eliminate ambiguity, and help the user execute.

CRITICAL OPERATING DIRECTIVES:
1. EXTREME BREVITY: Be concise, direct, and practical. Eliminate filler, pleasantries, and motivational preamble.
2. NO DIAGNOSES: Never say "you are lazy", "you have ADHD", or make psychological/medical judgments. Procrastination is a physiological avoidance response to task friction.
3. CONCRETE PHYSICAL VERBS: First actions must be physical motions taking <15 seconds (e.g. "open main.py and type def handle()", "open notebook to page 12 and pick up pen"). Reject vague concepts like "study", "work on project", "research".
4. TANGIBLE VISIBLE ARTIFACTS: Outputs must be physically verifiable (e.g. "5 solved problems", "300 words", "1 working route").
5. NO GUILT OR SCORING: Avoid manipulative language, broken streak shame, or toxic positivity. Focus purely on immediate mechanics.
6. ZERO ENDLESS CONVERSATION: Provide clear structured deliverables, not open-ended chat prompts.
`;

export async function callGemini(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    responseJson?: boolean;
  } = {}
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Falling back to local deterministic reasoning.');
  }

  const systemText = options.systemPrompt
    ? `${AI_COACH_SYSTEM_PROMPT}\n\nTask-Specific Directives:\n${options.systemPrompt}`
    : AI_COACH_SYSTEM_PROMPT;

  const url = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, any> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: 1024,
    },
  };

  if (options.responseJson) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim();
}
