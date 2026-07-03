# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

### Money Correctness *(MANDATORY when the feature reads, computes, or displays monetary values)*

<!--
  Constitution Principle IV (Money Is Exact — NON-NEGOTIABLE) + Principle VIII (Fresh or Flagged).
  Delete this section ONLY if the feature touches no monetary values — and state that explicitly.
-->

- **Numeric representation**: [integer minor units (cents) | arbitrary-precision decimal — NEVER binary floating point]
- **Rounding rules**: [explicit rule per calculation, e.g. half-up to nearest cent; where each is applied; how intermediate products are handled]
- **Currency & locale**: CAD; locale-correct formatting for en-CA and fr-CA (e.g. `1 234,56 $`)
- **Determinism & fixtures**: [which calculations are pure & deterministic; the known-value fixtures they are verified against, including Canadian tax / fee / interest / FX / points edge cases]
- **Idempotency**: [which state writes (ledgers, reminders, goal progress) must be idempotent and safe to retry; the idempotency key/strategy]
- **Recommend-only**: Confirm the feature only recommends actions and never executes money movement on the user's behalf. [Confirmed / N/A]

### Security & Privacy Threat Model *(MANDATORY when the feature touches credentials, aggregation tokens, or another person's financial data)*

<!--
  Constitution Principle V (Security & Least Privilege). REQUIRED for any feature in the scope above.
  If genuinely out of scope, state why here and delete the table.
-->

- **Assets**: [credentials, aggregation/OAuth tokens, PII, balances, another user's data, ...]
- **Trust boundaries / actors**: [user, household member, circle member, external feed, service, ...]
- **Threats & mitigations**:

  | Threat (e.g. token exfiltration, IDOR, account takeover) | Affected asset | Mitigation | Enforced server-side? |
  |----------------------------------------------------------|----------------|------------|-----------------------|
  | [threat] | [asset] | [mitigation] | [yes/no — client-only filtering does NOT satisfy this] |

- **AuthZ enforcement**: [confirm every cross-user boundary check is enforced server-side, independent of any client-supplied identifier]
- **Data minimization, retention & revocation**: [what is retained, for how long, the dormant-account bound, and what deletion cascades on consent/access revocation — within the stated SLA]
- **Data residency**: [Canadian-region storage/processing; any cross-border transfer disclosed and covered by an accountability/transfer agreement]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- [Assumption about target users, e.g., "Users have stable internet connectivity"]
- [Assumption about scope boundaries, e.g., "Mobile support is out of scope for v1"]
- [Assumption about data/environment, e.g., "Existing authentication system will be reused"]
- [Dependency on existing system/service, e.g., "Requires access to the existing user profile API"]
