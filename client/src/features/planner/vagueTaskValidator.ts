/**
 * START — Vague Task & Action Validator
 *
 * Core Principle:
 * The brain flees ambiguity. When a task or action is vague ("Work on paper", "Study chapter 3"),
 * the nervous system perceives discomfort/uncertainty and escapes into high-dopamine distractions.
 * START enforces physical objects, specific numbers, and 15-second physical motions.
 */

// Prefixes and phrases that disguise procrastination as work
const VAGUE_ACTION_PREFIXES = [
  /^(work\s+on|working\s+on)/i,
  /^(do\s+some|do\s+more|doing)/i,
  /^(study\s+for|study|studying)/i,
  /^(research|researching|look\s+into|look\s+up|browse|search\s+for)/i,
  /^(review|reviewing|look\s+at|look\s+over|go\s+through)/i,
  /^(read\s+about|read\s+through|reading)/i,
  /^(prepare\s+for|preparing|prep)/i,
  /^(learn\s+about|learning)/i,
  /^(think\s+about|brainstorm|brainstorming)/i,
  /^(try\s+to|continue\s+with|finish\s+up|start\s+on)/i,
  /^(watch\s+lectures?|watch\s+videos?)/i,
];

const VAGUE_ACTION_EXACT = [
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

// Internal mental states or non-verifiable outputs
const VAGUE_OUTPUT_SUBSTRINGS = [
  /\b(understand|understanding|comprehend)\b/i,
  /\b(learn|learning|know\s+more)\b/i,
  /\b(feel\s+good|feel\s+better|confidence)\b/i,
  /\b(progress|some\s+work|good\s+chunk)\b/i,
  /\b(get\s+started|start\s+on|starting)\b/i,
  /\b(research\s+done|reading\s+done)\b/i,
  /\b(look\s+over|ideas|thoughts)\b/i,
  /\b(better\s+at|grasp)\b/i,
];

const VAGUE_OUTPUT_EXACT = [
  /^(understand|learn|know|be better|feel good|progress|get started|some work|good progress)$/i,
  /^(done|finish|completed|everything|stuff|all of it)$/i,
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

  if (trimmed.length < 5) {
    return {
      isValid: false,
      reason: 'Action description is too brief to direct physical behavior.',
      suggestion: 'Name a specific application, file, or physical object (e.g. "Open Tutorial 3").',
    };
  }

  // Check exact vague patterns
  for (const pattern of VAGUE_ACTION_EXACT) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: `Vague action rejected: "${trimmed}" leaves the brain in ambiguity, which triggers avoidance.`,
        suggestion: getConcreteActionSuggestion(trimmed),
      };
    }
  }

  // Check vague starting prefixes that lack immediate physical grounding
  for (const prefix of VAGUE_ACTION_PREFIXES) {
    if (prefix.test(trimmed)) {
      // Allow if it contains an exact physical target object (e.g. "Open VS Code", "Write in doc")
      const hasPhysicalTarget = /\b(open|write|type|draw|click|terminal|file|folder|editor|sheet|vscode|doc|pdf|notebook|pen|page\s+\d+|function|class|query)\b/i.test(trimmed);
      if (!hasPhysicalTarget) {
        return {
          isValid: false,
          reason: `"${trimmed}" describes an abstract process, not a 15-second physical bodily movement.`,
          suggestion: getConcreteActionSuggestion(trimmed),
        };
      }
    }
  }

  // Single vague words
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && ['study', 'work', 'code', 'read', 'math', 'project', 'paper', 'homework', 'prep'].includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      reason: `"${trimmed}" is an abstract category, not a 15-second physical action.`,
      suggestion: `Try: "Open ${trimmed.toLowerCase()} file and write the first heading."`,
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

  for (const pattern of VAGUE_OUTPUT_EXACT) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        reason: `"${trimmed}" is an internal mental state, not visible proof.`,
        suggestion: 'Specify measurable evidence: e.g. "3 pages written", "1 working script", "5 solved problems".',
      };
    }
  }

  for (const pattern of VAGUE_OUTPUT_SUBSTRINGS) {
    if (pattern.test(trimmed)) {
      // If it contains a measurable number or artifact, allow it (e.g. "5 practice problems to understand recursion")
      const hasTangibleArtifact = /\b(\d+\s*(problems|questions|pages|words|slides|functions|tests|lines)|draft|summary|diagram|table|spreadsheet|recording)\b/i.test(trimmed);
      if (!hasTangibleArtifact) {
        return {
          isValid: false,
          reason: `Output mentions an internal mental state without physical proof.`,
          suggestion: 'Name the tangible artifact: e.g. "5 solved problems", "400 written words", "1 diagram drafted".',
        };
      }
    }
  }

  return { isValid: true };
}

function getConcreteActionSuggestion(vagueText: string): string {
  const lower = vagueText.toLowerCase();
  if (lower.includes('study') || lower.includes('learn')) {
    return 'Try: "Open chapter notes PDF and highlight the first 3 definitions" or "Open blank notebook page".';
  }
  if (lower.includes('code') || lower.includes('program') || lower.includes('debug')) {
    return 'Try: "Open VS Code, open server/index.ts, and write the route handler skeleton".';
  }
  if (lower.includes('read') || lower.includes('review')) {
    return 'Try: "Open document at page 12 and read the first paragraph out loud".';
  }
  if (lower.includes('project') || lower.includes('work') || lower.includes('research')) {
    return 'Try: "Open Google Doc and type the 3 bulleted section headers".';
  }
  return 'Name an exact physical object or application (e.g. "Open Google Doc and type introduction heading").';
}
