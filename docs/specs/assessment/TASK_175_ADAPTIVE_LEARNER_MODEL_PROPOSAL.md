# TASK 175 — ADAPTIVE LEARNER MODEL SPECIFICATION & DESIGN PROPOSAL

**Status:** Proposed Architecture & Design Specification (Task 174 Deliverable — Review for Task 175)
**Author:** Antigravity Engineering
**Target Subsystems:** `src/engine/assessmentEngine.ts`, `src/engine/skillsEngine.ts`, `src/engine/adaptiveEngine.ts`
**Related Documents:** [ASSESSMENT_SPEC_V1.md](file:///d:/Placement/OS/docs/specs/assessment/ASSESSMENT_SPEC_V1.md), [DIAGNOSTIC_ASSESSMENT_SPEC_V1.md](file:///d:/Placement/OS/docs/specs/assessment/DIAGNOSTIC_ASSESSMENT_SPEC_V1.md)

---

## 1. Executive Summary

In Task 173 and Task 174, PlacementOS established a clear visual and architectural separation between **Track A (Diagnostic Capability / Ability Score)** and **Track B (Demonstrated Practical Mastery)**.

Currently:
1. **Track A (Diagnostic Ability)** is calculated via a discrete Rasch/provisional capability scale (`scoreAssessmentAttempt`) producing an ability score $\in [0, 100]$ and discrete level $\in [0, 5]$ tied directly to a single assessment attempt. Subsequent short quizzes or diagnostic checks replace or overlay this estimate rather than performing a smooth, Bayesian-weighted evidence update.
2. **Track B (Practical Mastery)** is calculated via pure task and DSA problem completions (`calculateTopicReadiness` and `calculateDomainReadinessList`), where completed items generate evidence logs that update Exponential Moving Average (EMA) skill states.

This proposal specifies the mathematical and architectural design for **Task 175**: a multi-factor, deterministic, adaptive learner ability estimation model that increases or decreases estimated capability gracefully over time based on repeated independent performance, question difficulty, metacognitive self-evaluations (confidence and topic unfamiliarity), practical evidence, recency, and uncertainty dampening.

---

## 2. Audit of Existing Algorithms

### 2.1 Current Assessment Scoring (`src/engine/assessmentEngine.ts`)
- **Item Scoring:** Each multiple-choice item is evaluated as `correct` (1.0), `incorrect` (0.0), or `dont_know` (0.0).
- **Domain Ability Score:** Calculated as a weighted proportion of correct items adjusted by item difficulty band weights ($w_b \in [1.0, 1.5]$):
  $$\text{RawScore} = \frac{\sum_{i \in \text{Domain}} w_i \cdot \text{credit}_i}{\sum_{i \in \text{Domain}} w_i}$$
  Mapped to an ability scale $S \in [0, 100]$:
  $$\text{AbilityScore} = \text{round}(\text{RawScore} \times 100)$$
- **Standard Error:** Approximated as:
  $$\text{SE} = \frac{100}{2 \sqrt{N}}$$
- **Limitations:**
  - Independent attempts currently overwrite previous domain results rather than blending with historical priors.
  - A single aberrant session (e.g., testing while fatigued or lucky guessing) can swing the score too aggressively.
  - Does not factor in the diagnostic unfamiliarity flag (`unfamiliarTopic`) into the Bayesian prior.

### 2.2 Current Topic Readiness (`src/engine/skillsEngine.ts`)
- Evaluates practical evidence ($E \in [0, 100]$) from task completions and DSA attempts using Exponential Moving Average ($\alpha = 0.3$):
  $$S_{t} = (1 - \alpha) S_{t-1} + \alpha E_t$$
- Decays evidence based on days elapsed since last activity ($decay = \exp(-\lambda \Delta t)$).
- **Limitation:** There is zero informational cross-talk from diagnostic assessments to practical mastery (which is correct to maintain integrity), but conversely, robust practical mastery does not validate or recalibrate a depressed diagnostic baseline.

---

## 3. Strict Separation of Three Core Constructs

To protect data integrity, the system strictly separates three distinct concepts:

| Construct | Definition | Mutability | Storage Location |
| :--- | :--- | :--- | :--- |
| **Current Estimated Ability ($\theta_t$)** | Model's latent belief about the learner's true current competency in a domain. | Continuously updated (smooth adaptation). | `assessmentState.domainResults[d].abilityScore` |
| **Demonstrated Practical Mastery ($M_t$)** | Cumulative percentage of curriculum tasks completed and Leitner Box $\ge 2$ DSA problems mastered. | Monotonically earned via real work; decays only if inactive. | `DomainReadiness.overallReadiness` |
| **Historical Achievements & Sealed Attempts** | Immutable historical facts (diagnostic attempts, test submissions, sealed day records). | **Immutable** (Append-only). | `assessmentState.attempts`, `dailyCheckIns` |

---

## 4. Multi-Factor Ability Update Model (Task 175 Design)

### 4.1 Latent State Representation
For each domain $d$, the state maintains:
$$\theta_d \in [0, 100] \quad \text{(Latent ability estimate)}$$
$$\sigma_d^2 \in [\sigma_{\min}^2, \sigma_{\max}^2] \quad \text{(Uncertainty / variance of belief, default } \sigma_0^2 = 25\text{)}$$

### 4.2 Factor 1: Item-Level Evidence with 2PL IRT
When a learner answers an item $j$ with calibrated difficulty $b_j \in [0, 100]$ and discrimination $a_j \in [0.8, 2.0]$:
The probability of a correct response under the two-parameter logistic model is:
$$P(Y_j = 1 \mid \theta) = \frac{1}{1 + \exp(-a_j(\theta - b_j) / 15)}$$

The prediction error (innovation) is:
$$\delta_j = y_j - P(Y_j = 1 \mid \theta)$$
where $y_j = 1.0$ if correct, $0.0$ if incorrect, and $0.0$ if `dont_know`.

### 4.3 Factor 2: Metacognitive Calibration (Confidence & Unfamiliarity)
The innovation is weighted by metacognitive alignment:
- **Confidence Modifier ($c_j$):**
  - High confidence + Correct: $c_j = 1.15$ (validates mastery).
  - High confidence + Incorrect: $c_j = 1.30$ (strong negative update; penalizes misconceptions).
  - Low confidence + Correct: $c_j = 0.50$ (dampened; likely a lucky guess).
  - Low confidence + Incorrect: $c_j = 0.85$ (expected struggle; calibrated self-awareness).
  - Don't Know: $c_j = 0.70$ (honest concession; no negative overreaction).
- **Unfamiliarity Flag Modifier ($u_j$):**
  - When `unfamiliarTopic = true`:
    - If incorrect or don't know: $u_j = 0.60$ (dampens score penalty; the learner acknowledged they haven't studied it yet, routing to learning-gap remediation).
    - If correct: $u_j = 0.40$ (heavily dampens upward ability surge; prevents an unlearned topic from falsely inflating latent ability).

### 4.4 Factor 3: Variance-Dampened Update (Kalman Filter Formulation)
To prevent single-test overreaction, updates follow a Kalman/Bayesian updating step:
$$K_j = \frac{\sigma_d^2}{\sigma_d^2 + R_j}$$
where $R_j = \frac{15}{a_j \cdot c_j \cdot u_j}$ is the observation variance.

The updated ability is:
$$\theta_{new} = \theta_{old} + K_j \cdot \delta_j \cdot 15$$
$$\sigma_{new}^2 = (1 - K_j) \sigma_{old}^2$$

### 4.5 Factor 4: Practical Evidence Cross-Calibration
When a learner demonstrates consistent practical success on a topic in Domain $d$ (e.g., passes 3 consecutive Box-2/3 DSA problems or completes a Phase preparation milestone without hints):
- An upward capability floor adjustment is applied:
  $$\theta_d \ge \min(100, M_d \times 0.85)$$
This guarantees that a user who has demonstrated 70% practical curriculum mastery cannot be permanently trapped at a 13/100 diagnostic score merely because they have not retaken a 100-question multiple-choice exam.

### 4.6 Factor 5: Retention & Recency Decay
If no evidence is logged in domain $d$ for $\Delta t > 14$ days:
$$\theta_d(t) = \theta_{baseline} + (\theta_d(t_0) - \theta_{baseline}) \cdot \exp(-\gamma \cdot (\Delta t - 14))$$
$$\sigma_d^2(t) = \min(\sigma_{\max}^2, \sigma_d^2(t_0) + \beta \Delta t)$$
where $\gamma = 0.015$ and $\theta_{baseline}$ is the authentic diagnostic anchor. As time passes without activity, ability regresses gently toward the baseline, while uncertainty ($\sigma^2$) increases.

---

## 5. Architectural Guardrails Against Overreaction

1. **Maximum Single-Session Step:** $\Delta \theta_{\max} = \pm 12$ points per session regardless of raw score.
2. **Floor Constraint:** Diagnostic ability cannot drop below 0 or exceed 100.
3. **Compound Competency Isolation:** Compound questions with multiple topics tag individual topic weakness signals without penalizing unrelated competencies.
4. **Offline & Deterministic:** No randomness, no floating-point clock dependencies; fully reproducible on any machine.

---

## 6. Implementation Plan for Task 175

1. **Step 1:** Add `latentVariance` and `priorAbility` fields to `DomainAssessmentResult` in `src/types/index.ts`.
2. **Step 2:** Implement pure function `updateLatentAbility` in `src/engine/assessmentEngine.ts`.
3. **Step 3:** Implement cross-subsystem calibration bridge in `src/engine/skillsEngine.ts`.
4. **Step 4:** Add comprehensive test suite in `src/test/adaptiveLearnerModel.test.ts` verifying all 5 factors and guardrail bounds.
