import { Milestone } from '../../types/models.ts';

export interface BreakdownTemplate {
  id: string;
  name: string;
  description: string;
  milestones: Array<{
    title: string;
    intendedOutput: string;
    estimatedHours: number;
    nextAction: string;
  }>;
}

export const BREAKDOWN_TEMPLATES: BreakdownTemplate[] = [
  {
    id: 'technical_project',
    name: 'Technical / Engineering Project (7 Stages)',
    description: 'Research → Plan → Implement → Test → Write report → Review → Submit',
    milestones: [
      {
        title: '1. Research',
        intendedOutput: 'Documented requirements, algorithm papers, and technical spec notes',
        estimatedHours: 2,
        nextAction: 'Open assignment rubric and paper PDF; highlight core requirements',
      },
      {
        title: '2. Plan',
        intendedOutput: '1-page system architecture diagram and milestone breakdown',
        estimatedHours: 2,
        nextAction: 'Open blank notes file and sketch system architecture and data flow',
      },
      {
        title: '3. Implement',
        intendedOutput: 'Working baseline code with core algorithms executing without errors',
        estimatedHours: 6,
        nextAction: 'Open IDE, create main file, and write initial function signature',
      },
      {
        title: '4. Test',
        intendedOutput: 'Test suite passing on test dataset with logged metrics and benchmark outputs',
        estimatedHours: 3,
        nextAction: 'Run baseline test script and record accuracy / performance in notes',
      },
      {
        title: '5. Write report',
        intendedOutput: 'Complete draft of technical report with generated figures and method summary',
        estimatedHours: 4,
        nextAction: 'Create report document, insert headings, and paste figure 1',
      },
      {
        title: '6. Review',
        intendedOutput: 'Self-review checklist against grading rubric with all defects resolved',
        estimatedHours: 2,
        nextAction: 'Read through report once without editing and flag awkward passages',
      },
      {
        title: '7. Submit',
        intendedOutput: 'Final deliverables package uploaded with submission confirmation timestamp',
        estimatedHours: 1,
        nextAction: 'Verify zip file contents and check course submission portal requirements',
      },
    ],
  },
  {
    id: 'academic_paper',
    name: 'Writing / Research Paper',
    description: 'Sources → Outline → Rough Draft → Figures → Revision → Submit',
    milestones: [
      {
        title: '1. Literature Review & Evidence Gathering',
        intendedOutput: 'Summary table of 5 core references with key findings annotated',
        estimatedHours: 3,
        nextAction: 'Open Google Scholar and download 3 seminal papers on the topic',
      },
      {
        title: '2. Structured Outline & Thesis Statement',
        intendedOutput: 'Detailed 2-page outline with subsection arguments and evidence points',
        estimatedHours: 2,
        nextAction: 'Open blank document and type out the 5 main section headings',
      },
      {
        title: '3. Rough First Draft (No Polishing)',
        intendedOutput: 'Complete ugly first draft spanning introduction to conclusion',
        estimatedHours: 6,
        nextAction: 'Start writing the introductory paragraph without editing sentences',
      },
      {
        title: '4. Evidence, Data & Citations',
        intendedOutput: 'All citations linked with accurate bibliography and figure captions',
        estimatedHours: 2,
        nextAction: 'Format the reference list and verify citation bracket numbers',
      },
      {
        title: '5. Revision & Critical Editing',
        intendedOutput: 'Clean, coherent revised manuscript resolving flow and argument gaps',
        estimatedHours: 4,
        nextAction: 'Read section 1 aloud and mark passive sentences for rewriting',
      },
      {
        title: '6. Proofread & Final Submission',
        intendedOutput: 'Final PDF uploaded to course submission system',
        estimatedHours: 1,
        nextAction: 'Run spellcheck and export final PDF with proper naming convention',
      },
    ],
  },
  {
    id: 'problem_set_exam',
    name: 'Problem Set / Exam Preparation',
    description: 'Concepts → Core Problems → Hard Problems → Timed Practice → Review',
    milestones: [
      {
        title: '1. Core Concepts & Formula Sheet',
        intendedOutput: '1-page handwritten summary cheat sheet of formulas and key theorems',
        estimatedHours: 2,
        nextAction: 'Open lecture slides and copy theorem 1 and formula 2 into notebook',
      },
      {
        title: '2. Foundational Practice Problems',
        intendedOutput: 'Problems 1 through 5 fully solved with step-by-step arithmetic',
        estimatedHours: 3,
        nextAction: 'Open textbook to page 45 and solve problem 1',
      },
      {
        title: '3. Complex / Advanced Problems',
        intendedOutput: 'Problems 6 through 10 solved and verified against solution keys',
        estimatedHours: 4,
        nextAction: 'Identify the hardest assigned problem and write down the given variables',
      },
      {
        title: '4. Timed Mock Session',
        intendedOutput: 'Timed past paper completed without consulting notes',
        estimatedHours: 2,
        nextAction: 'Print past exam paper, set 45-minute timer, and begin question 1',
      },
      {
        title: '5. Error Log Correction & Submission',
        intendedOutput: 'All mistakes re-solved from scratch and clean solution scanned to PDF',
        estimatedHours: 1,
        nextAction: 'Scan handwritten solution pages using phone scanner app',
      },
    ],
  },
];

export function buildTemplateMilestones(
  templateId: string,
  assignmentId: string
): Milestone[] {
  const template = BREAKDOWN_TEMPLATES.find((t) => t.id === templateId) || BREAKDOWN_TEMPLATES[0];
  return template.milestones.map((m, idx) => ({
    id: crypto.randomUUID(),
    assignmentId,
    title: m.title,
    intendedOutput: m.intendedOutput,
    sequence: idx,
    estimatedHours: m.estimatedHours,
    status: idx === 0 ? 'in_progress' : 'not_started',
    nextAction: m.nextAction,
  }));
}
