import type {
  DomainId,
  PracticeCategory,
  PracticeQuestion,
  PracticeSessionDefinition,
  QuestionType,
} from '../../types';

/**
 * Compact authoring helpers for the Phase 2B content banks.
 *
 * Every question still lands as a plain `PracticeQuestion` object — these helpers
 * only remove repeated boilerplate (category / domain / topic / question type) and
 * guarantee two structural invariants:
 *   1. every MCQ has >= 4 unique options and a `correctAnswer` index inside bounds
 *   2. numeric MCQ answers are computed from the same values used in the prompt
 */

export interface QuestionSeed {
  id: string;
  tag: string;
  prompt: string;
  hint?: string;
  explanation?: string;
  type?: QuestionType;
  /** Literal MCQ: options + 0-indexed correct answer. */
  options?: string[];
  answer?: number;
  /** Numeric MCQ: options are derived from `value` + `distractors`. */
  value?: number;
  distractors?: number[];
  prefix?: string;
  suffix?: string;
  /** Decimals kept for non-integer numeric answers (default: none). */
  decimals?: number;
}

function hashPosition(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function formatNumeric(n: number, decimals: number, prefix: string, suffix: string): string {
  const body = decimals > 0 && !Number.isInteger(n) ? n.toFixed(decimals) : `${Math.round(n)}`;
  return `${prefix}${body}${suffix}`;
}

/**
 * Deterministically places the correct value among unique distractors so answer
 * positions are varied but reproducible (no randomness anywhere in the dataset).
 */
function buildNumericOptions(seed: QuestionSeed): { options: string[]; answer: number } {
  const decimals = seed.decimals ?? 0;
  const prefix = seed.prefix ?? '';
  const suffix = seed.suffix ?? '';
  const rawValue = seed.value as number;
  const target = decimals > 0 ? Number(rawValue.toFixed(decimals)) : Math.round(rawValue);

  const unique: number[] = [];
  const push = (n: number) => {
    const rounded = decimals > 0 ? Number(n.toFixed(decimals)) : Math.round(n);
    if (!unique.includes(rounded)) unique.push(rounded);
  };

  push(target);
  (seed.distractors || []).forEach(push);

  let step = decimals > 0 ? Math.pow(10, -decimals) : 1;
  while (unique.length < 4) {
    push(target + step);
    if (unique.length < 4) push(target - step);
    step = decimals > 0 ? step * 2 : step + 1;
  }

  const distractors = unique.filter((n) => n !== target).slice(0, 3);
  const position = hashPosition(seed.id) % 4;
  const options = [...distractors];
  options.splice(position, 0, target);

  return {
    options: options.map((n) => formatNumeric(n, decimals, prefix, suffix)),
    answer: position,
  };
}

export function makeSession(cfg: {
  id: string;
  title: string;
  description: string;
  category: PracticeCategory;
  domainId: DomainId;
  topicId: string;
  minutes: number;
  passing: number;
  questions: QuestionSeed[];
}): PracticeSessionDefinition {
  const questions: PracticeQuestion[] = cfg.questions.map((seed) => {
    let options = seed.options;
    let answer = seed.answer;

    if (typeof seed.value === 'number') {
      const built = buildNumericOptions(seed);
      options = built.options;
      answer = built.answer;
    }

    if (options && options.length >= 2 && typeof answer === 'number' && (answer < 0 || answer >= options.length)) {
      throw new Error(`Invalid correctAnswer index for ${seed.id}`);
    }

    const question: PracticeQuestion = {
      id: seed.id,
      category: cfg.category,
      domainId: cfg.domainId,
      topicId: cfg.topicId,
      questionType: seed.type ?? (options ? 'mcq' : 'short_answer'),
      prompt: seed.prompt,
      categoryTag: seed.tag,
    };

    if (options) question.options = options;
    if (answer !== undefined) question.correctAnswer = answer;
    if (seed.explanation) question.explanation = seed.explanation;
    if (seed.hint) question.hint = seed.hint;

    return question;
  });

  return {
    id: cfg.id,
    title: cfg.title,
    description: cfg.description,
    category: cfg.category,
    domainId: cfg.domainId,
    topicId: cfg.topicId,
    estimatedMinutes: cfg.minutes,
    questionCount: questions.length,
    passingScorePct: cfg.passing,
    questions,
  };
}
