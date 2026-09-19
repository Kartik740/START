/**
 * START — Vague Task & Action Validator
 *
 * Core Principle:
 * The brain flees ambiguity. When a task or action is vague ("Study", "Work on it"),
 * the nervous system perceives discomfort/uncertainty and escapes into high-dopamine distractions.
 * START enforces physical objects, specific numbers, and 15-second physical motions.
 */

const VAGUE_ACTION_PATTERNS = [
  /^(study|studying)(\s+(more|harder|stuff|things))?$/i,
  /^(work|working)(\s+(on\s+)?(it|this|that|project|assignment|stuff|things))?$/i,
  /^(do|doing)(\s+(the\s+)?(project|assignment|homework|work|it|stuff|things))?$/i,
  /^(code|coding|program|programming)$/i,
  /^(read|reading)(\s+(book|chapter|notes))?$/i,
  /^(prepare|preparing|prep)$/i,
  /^(review|reviewing)(\s+(notes|material))?$/i,
  /^(learn|learning)(\s+(it|stuff))?$/i,
  /^(think|thinking|brainstorm|brainstorming)$/i,
  /^(try|trying|continue|finish)(\s+(it|up))?$/i,
  /^(start|starting)(\s+(it|project|work))?$/i,
];

const VAGUE_OUTPUT_PATTERNS = [
  /^(understand|learn|know|be better|feel good|progress|get started|some work|good progress)$/i,
  /^(done|finish|completed|everything)$/i,
];

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

export function validateFirstPhysicalAction(action: string): ValidationResult {
  const trimmed = action.trim();

  if (!trimmed) {
    return {
      isValid: false,
      reason: 'First physical action cannot be empty.',
      suggestion: 'What is the physical motion you will perform in the first 15 seconds?',
    };
  }

  if (trimmed.length < 4) {
    return {
      isValid: false,
      reason: 'Action description is too brief to direct physical behavior.',
      suggestion: 'Name a specific application, file, or physical object (e.g. "Open Tutorial 3").',
    };
  }

  // Check vague patterns
  for (const pattern of VAGUE_ACTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: `Vague action rejected: "${trimmed}" leaves the brain in ambiguity, which triggers avoidance.`,
        suggestion: getConcreteActionSuggestion(trimmed),
      };
    }
  }

  // Check if it's purely a single vague word without a target
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && ['study', 'work', 'code', 'read', 'math', 'project', 'paper'].includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      reason: `"${trimmed}" is an abstract category, not a 15-second physical action.`,
      suggestion: `Try: "Open ${trimmed.toLowerCase()} notes and read the first paragraph."`,
    };
  }

  return { isValid: true };
}

export function validateConcreteOutput(output: string): ValidationResult {
  const trimmed = output.trim();

  if (!trimmed) {
    return {
      isValid: false,
      reason: 'A defined tangible output is required before starting.',
      suggestion: 'What artifact, file, or solved question will exist when the timer rings?',
    };
  }

  if (trimmed.length < 5) {
    return {
      isValid: false,
      reason: 'Output is too vague to count as proof of completion.',
      suggestion: 'Be specific: e.g. "Complete 5 problems" or "Write 400 words".',
    };
  }

  for (const pattern of VAGUE_OUTPUT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: `"${trimmed}" is an internal mental state, not visible proof.`,
        suggestion: 'Specify measurable evidence: e.g. "3 pages written", "1 working script", "5 solved problems".',
      };
    }
  }

  return { isValid: true };
}

function getConcreteActionSuggestion(vagueText: string): string {
  const lower = vagueText.toLowerCase();
  if (lower.includes('study')) {
    return 'Try: "Open Tutorial 3 PDF and read Section 1 heading" or "Open notebook to blank page".';
  }
  if (lower.includes('code') || lower.includes('program')) {
    return 'Try: "Open VS Code, create main.py, and write the first function signature".';
  }
  if (lower.includes('read')) {
    return 'Try: "Open Chapter 4 at page 112 and place notebook beside keyboard".';
  }
  if (lower.includes('project') || lower.includes('work')) {
    return 'Try: "Open assignment rubric and highlight the 3 mandatory grading criteria".';
  }
  return 'Name an exact physical object or application (e.g. "Open Google Doc and type title").';
}
