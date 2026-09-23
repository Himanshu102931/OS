---
name: adaptive-engine
description: Designs and modifies the deterministic PlacementOS recommendation and prioritization engine using explicit placement, performance, deadline, review, time, and mode rules.
---

# Adaptive Engine Skill

Use this skill whenever changing recommendation, scheduling, priority, skill-readiness, review, or adaptation logic.

## Core principle

The adaptation engine must be:

- deterministic;
- explainable;
- reproducible;
- testable;
- user-overridable.

Do not use an LLM for runtime decisions in V1.

## Inputs

Consider only explicit application data such as:

- current phase;
- available time;
- energy;
- deadlines;
- assessment dates;
- company requirements;
- skill state;
- recent performance;
- independent problem-solving performance;
- review dates;
- mistakes;
- missed tasks;
- current mode;
- manual overrides.

## Priority factors

Possible priority factors include:

- urgency;
- weakness;
- core importance;
- company relevance;
- review due;
- repeated failures;
- consistency;
- available time.

The exact weights must be centralized and documented.

Do not scatter priority numbers throughout UI components.

## Constraints

Never:

- schedule more work than available time;
- erase the master roadmap because of a temporary weakness;
- create unreasonable catch-up workloads;
- let one weak topic permanently dominate all other core topics;
- silently override a user's explicit decision.

## Recommendation explanation

Every generated recommendation should be able to answer:

"Why was this task selected?"

The explanation should reference actual input data.

Example:

"DSA was prioritized because recent independent-solving performance is below the configured threshold."

Do not write explanations based on invented reasoning.

## Adaptation loop

Use:

data
→ candidate tasks
→ scoring
→ constraints
→ selected tasks
→ explanation

## Testing

Every important rule change must add or update scenario tests.

Test:

- weak skill;
- urgent deadline;
- exam mode;
- low available time;
- low energy;
- repeated failure;
- improvement;
- missed task;
- company-specific gap;
- manual override.

Changing recommendation logic without updating tests is not acceptable.
