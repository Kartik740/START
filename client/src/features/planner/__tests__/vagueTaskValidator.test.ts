import { describe, it, expect } from 'vitest';
import {
  validateConcreteOutput,
  validateFirstPhysicalAction,
} from '../vagueTaskValidator.ts';

describe('Vague Task & Action Validator (START Behavioral Invariants)', () => {
  describe('validateConcreteOutput', () => {
    it('rejects empty or whitespace outputs', () => {
      expect(validateConcreteOutput('').isValid).toBe(false);
      expect(validateConcreteOutput('   ').isValid).toBe(false);
    });

    it('rejects overly brief outputs (< 5 chars)', () => {
      const res = validateConcreteOutput('work');
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('too vague');
    });

    it('rejects abstract mental states and vague deliverables', () => {
      const vagueExamples = [
        'understand',
        'learn',
        'feel good',
        'good progress',
        'get started',
        'some work',
        'everything',
        'done',
      ];
      for (const ex of vagueExamples) {
        const res = validateConcreteOutput(ex);
        expect(res.isValid).toBe(false);
        expect(res.reason).toBeDefined();
        expect(typeof res.reason).toBe('string');
      }
    });

    it('accepts specific, tangible physical outputs', () => {
      const validExamples = [
        'Complete 5 practice problems on sheet',
        'Write 400 words of essay introduction',
        'Implement the auth JWT verification endpoint',
        'Create Figma slides 1 to 4',
        'Outline 3 sections with bullet points',
      ];
      for (const ex of validExamples) {
        const res = validateConcreteOutput(ex);
        expect(res.isValid).toBe(true);
        expect(res.reason).toBeUndefined();
      }
    });
  });

  describe('validateFirstPhysicalAction', () => {
    it('rejects empty or brief action strings', () => {
      expect(validateFirstPhysicalAction('').isValid).toBe(false);
      expect(validateFirstPhysicalAction('do').isValid).toBe(false);
    });

    it('rejects traditional ambiguous starter tasks that trigger avoidance', () => {
      const vagueStarters = [
        'study',
        'studying more',
        'work on it',
        'code',
        'read notes',
        'review material',
        'think',
        'continue',
        'start project',
      ];
      for (const act of vagueStarters) {
        const res = validateFirstPhysicalAction(act);
        expect(res.isValid).toBe(false);
        expect(res.suggestion).toBeDefined();
      }
    });

    it('accepts unambiguous 15-second physical motions', () => {
      const validStarters = [
        'Open Tutorial 3 and solve Question 1',
        'Create models.ts and declare User interface',
        'Open Google Docs and type the header title',
        'Take out spiral notebook and pen',
        'Open terminal and execute npm test',
      ];
      for (const act of validStarters) {
        const res = validateFirstPhysicalAction(act);
        expect(res.isValid).toBe(true);
      }
    });
  });
});
