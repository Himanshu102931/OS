import { makeSession } from './bank';

/**
 * Phase 2B — Communication prompt bank (topic `prep-comm`), 26 self-rated prompts.
 * These are practice prompts with model-answer outlines, evaluated via self-rating.
 */

export const COMMUNICATION_SESSIONS = [
  makeSession({
    id: 'practice-comm-01',
    title: 'Communication Foundations: Clarity, Structure & Delivery',
    description: 'Thirteen spoken-communication drills: explaining concepts, structuring answers, listening and written updates.',
    category: 'communication',
    domainId: 'communication',
    topicId: 'prep-comm',
    minutes: 20,
    passing: 70,
    questions: [
      {
        id: 'q-cm-01',
        tag: 'Explanation',
        type: 'interview_question',
        prompt: 'Explain "rate limiting" to a non-technical stakeholder in 60 seconds, without jargon.',
        explanation:
          'Analogy first: a bouncer letting only a set number of people in per minute. Then why it matters: protects the service from overload and keeps it fair for everyone. Close with the business effect: fewer outages.',
        hint: 'Use an everyday analogy, then the business impact.',
      },
      {
        id: 'q-cm-02',
        tag: 'Explanation',
        type: 'interview_question',
        prompt: 'Explain the difference between a Python list and a tuple to an intern who has never heard of either.',
        explanation:
          'Framing: a list is a checklist you can edit; a tuple is a sealed envelope. Conclude with the rule: use a tuple for fixed records (coordinates), a list for collections that change.',
        hint: 'Contrast editability, then give a usage rule.',
      },
      {
        id: 'q-cm-03',
        tag: 'Storytelling',
        type: 'interview_question',
        prompt: 'Describe your best project in two minutes using Problem → Approach → Result.',
        explanation:
          'Problem: the concrete pain and who felt it. Approach: your specific contribution and one key decision. Result: a number (time saved, users, accuracy) and one thing you would improve.',
        hint: 'End with a measurable result.',
      },
      {
        id: 'q-cm-04',
        tag: 'Explanation',
        type: 'interview_question',
        prompt: 'What is an API? Explain it as if to a marketing team.',
        explanation:
          'A restaurant waiter: you order from the menu (the contract), the kitchen (the system) prepares it, and you never walk into the kitchen. Keep to one analogy and one sentence of mechanism.',
        hint: 'One analogy, one mechanism sentence.',
      },
      {
        id: 'q-cm-05',
        tag: 'Think Aloud',
        type: 'interview_question',
        prompt: 'You are given a vague coding problem. Narrate your first 60 seconds before writing any code.',
        explanation:
          'State the input/output, restate constraints in your own words, name two edge cases, propose the brute-force approach, then name the optimisation you will attempt and why.',
        hint: 'Clarify → edge cases → brute force → optimise.',
      },
      {
        id: 'q-cm-06',
        tag: 'Clarifying',
        type: 'interview_question',
        prompt: 'What clarifying questions do you ask when requirements are ambiguous?',
        explanation:
          'Ask about scope (which users?), success metric (how measured?), constraints (latency, data size?), and priority (what can we cut?). Then confirm by summarising back in one sentence.',
        hint: 'Scope, metric, constraints, priority.',
      },
      {
        id: 'q-cm-07',
        tag: 'Structured Answer',
        type: 'interview_question',
        prompt: 'Tell me about a difficult bug you fixed. Structure your answer so an interviewer can follow it in 90 seconds.',
        explanation:
          'Symptom → how you isolated it (logs, repro, bisect) → root cause → fix → how you prevented recurrence. Keep the tooling details to one clause each.',
        hint: 'Symptom, isolation, cause, fix, prevention.',
      },
      {
        id: 'q-cm-08',
        tag: 'Listening',
        type: 'interview_question',
        prompt: 'How do you confirm you understood a stakeholder\'s request before starting work?',
        explanation:
          'Paraphrase it back ("So the goal is X by Friday, ignoring the export feature?"), name the acceptance criteria, and restate the deadline and owner in writing afterwards.',
        hint: 'Paraphrase, criteria, written confirmation.',
      },
      {
        id: 'q-cm-09',
        tag: 'Pitching',
        type: 'interview_question',
        prompt: 'Pitch the most useful feature you built to a product manager in three sentences.',
        explanation:
          'Sentence 1: the user problem and frequency. Sentence 2: what the feature does in one line. Sentence 3: the measured outcome or the hypothesis you will test.',
        hint: 'Problem, feature, outcome.',
      },
      {
        id: 'q-cm-10',
        tag: 'Delivery',
        type: 'self_evaluation',
        prompt: 'Record yourself giving a 2-minute technical explanation. What filler words did you use most, and how will you reduce them?',
        explanation:
          'Count "um", "like", "basically". Replace them with a 1-second pause. Slowing to ~140 words per minute and ending sentences with a falling pitch signals confidence.',
        hint: 'Pauses beat fillers; watch your pace.',
      },
      {
        id: 'q-cm-11',
        tag: 'Written Communication',
        type: 'self_evaluation',
        prompt: 'Write a status update for a task that is 70% done and blocked on a dependency. Keep it under 80 words.',
        explanation:
          'Structure: progress in one line (what works now), blocker in one line (who owns it, since when), next step with a date, and a clear ask.',
        hint: 'Progress, blocker, next step, ask.',
      },
      {
        id: 'q-cm-12',
        tag: 'Summarising',
        type: 'self_evaluation',
        prompt: 'Summarise any long technical document you have read into exactly three bullets: what it is, why it matters, what changes for you.',
        explanation:
          'Bullet 1 identifies the artifact in one clause. Bullet 2 gives the impact on users or the system. Bullet 3 states the action or decision required from you.',
        hint: 'Identity, impact, action.',
      },
      {
        id: 'q-cm-13',
        tag: 'Difficult Questions',
        type: 'interview_question',
        prompt: 'You do not know the answer to an interviewer\'s question. What do you say?',
        explanation:
          'Say plainly that you have not used it, then show how you would reason about it or how you would find out quickly. Never bluff — interviewers reward honesty plus a thinking method.',
        hint: 'Admit, reason, resolve.',
      },
    ],
  }),

  makeSession({
    id: 'practice-comm-02',
    title: 'Communication in Action: Disagreement, Conflict & Remote Work',
    description: 'Twelve scenarios: pushing back politely, giving feedback, handling blockers, saying no and closing interviews.',
    category: 'communication',
    domainId: 'communication',
    topicId: 'prep-comm',
    minutes: 20,
    passing: 70,
    questions: [
      {
        id: 'q-cm-14',
        tag: 'Disagreement',
        type: 'interview_question',
        prompt: 'An interviewer proposes a design you disagree with. How do you respond without being combative?',
        explanation:
          'Acknowledge the merit first, state your concern as data or a scenario ("Under a 10x load this queue would grow unbounded"), then offer an alternative and invite their judgement.',
        hint: 'Agree → evidence → alternative.',
      },
      {
        id: 'q-cm-15',
        tag: 'Feedback',
        type: 'interview_question',
        prompt: 'Give constructive feedback to a teammate who keeps submitting unreviewed code.',
        explanation:
          'Use behaviour → impact → request: "When a PR lands without a description, reviewers re-read the diff (impact); please add a summary and self-review first (request)." Private, specific, forward-looking.',
        hint: 'Behaviour, impact, request.',
      },
      {
        id: 'q-cm-16',
        tag: 'Meetings',
        type: 'interview_question',
        prompt: 'You are interrupted repeatedly while presenting. What do you do in the moment?',
        explanation:
          'Finish your sentence, then: "Let me finish this point and I will come back to yours." Offer to take it to the parking lot or chat. Stay even-toned; control the agenda, not the person.',
        hint: 'Defer, do not confront.',
      },
      {
        id: 'q-cm-17',
        tag: 'Failure',
        type: 'interview_question',
        prompt: 'Explain a project failure without blaming colleagues or circumstances.',
        explanation:
          'Own the decision you controlled, describe what you learned, and name the process change you made afterwards. Never name another person as the cause.',
        hint: 'Ownership, learning, change.',
      },
      {
        id: 'q-cm-18',
        tag: 'Remote Work',
        type: 'interview_question',
        prompt: 'You are blocked and your teammate is in another timezone. How do you communicate it?',
        explanation:
          'Async message with context: what you are blocked on, what you tried, the exact ask, the deadline, and the impact if it slips. Attach a repro or screenshot; assume no follow-up call is possible.',
        hint: 'Context, attempts, ask, deadline, impact.',
      },
      {
        id: 'q-cm-19',
        tag: 'Closing',
        type: 'interview_question',
        prompt: 'What smart questions do you ask at the end of an interview?',
        explanation:
          'Ask about the team\'s current technical problem, how success is measured in the first 90 days, and how decisions are made. Avoid questions answerable by the website.',
        hint: 'Problem, metrics, decision-making.',
      },
      {
        id: 'q-cm-20',
        tag: 'Stakeholders',
        type: 'interview_question',
        prompt: 'Explain a build-vs-buy trade-off to a stakeholder who only understands cost and risk.',
        explanation:
          'Frame as: upfront cost vs ongoing maintenance, time to market, and risk of owning a component nobody understands. Give a recommendation with one number each for cost and time.',
        hint: 'Cost, time, ownership risk — then recommend.',
      },
      {
        id: 'q-cm-21',
        tag: 'Priorities',
        type: 'interview_question',
        prompt: 'You are two days from a deadline and blocked by another team. What do you communicate, and to whom?',
        explanation:
          'Notify your manager the same day with options: reduce scope, extend, or escalate. Propose the option you recommend. Escalate with a specific, time-boxed ask rather than a complaint.',
        hint: 'Same day, with options and a recommendation.',
      },
      {
        id: 'q-cm-22',
        tag: 'Conflict',
        type: 'interview_question',
        prompt: 'Your manager wants a fast, fragile fix; you want a robust one. How do you handle it?',
        explanation:
          'Align on the shared goal (shipping date), state the risk of the fragile fix in concrete terms (failure mode, rollback cost), propose a middle path (fix behind a flag + follow-up ticket), and commit to the decision once made.',
        hint: 'Shared goal, concrete risk, middle path.',
      },
      {
        id: 'q-cm-23',
        tag: 'Post-mortems',
        type: 'interview_question',
        prompt: 'Explain a production incident to your team in a blameless post-mortem format.',
        explanation:
          'Timeline of observable events, root cause as a system property (not a person), contributing factors, what went well in the response, and actions with owners and dates.',
        hint: 'Timeline, systemic cause, actions with owners.',
      },
      {
        id: 'q-cm-24',
        tag: 'Saying No',
        type: 'interview_question',
        prompt: 'A stakeholder keeps adding scope to a fixed-deadline project. How do you say no politely?',
        explanation:
          'Show the trade-off as arithmetic: "This adds roughly 3 days; the deadline has 0. Which of these two do we drop?" Offer a later phase for the new item. Say no to the timing, not the person.',
        hint: 'Quantify, then offer a choice.',
      },
      {
        id: 'q-cm-25',
        tag: 'Video Interviews',
        type: 'self_evaluation',
        prompt: 'Audit your video-interview setup: lighting, camera at eye level, background, and eye contact. List three fixes you will make today.',
        explanation:
          'Face a light source (window or lamp in front of you), place the camera at eye height so you look straight ahead, and clear the background. Eye contact means looking at the camera, not the faces.',
        hint: 'Light in front, camera at eye level, clean background.',
      },
      {
        id: 'q-cm-26',
        tag: 'HR Round',
        type: 'interview_question',
        prompt: 'Give your strengths in 30 seconds for an HR round, with evidence for each claim.',
        explanation:
          'Three strengths maximum, each as claim + one-line proof: "I debug systematically — I found the root cause of our memory leak using a heap profile." Evidence converts adjectives into credibility.',
        hint: 'Claim plus proof, never bare adjectives.',
      },
    ],
  }),
];
