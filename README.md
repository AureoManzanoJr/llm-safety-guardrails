# llm-safety-guardrails

![CI](https://github.com/AureoManzanoJr/llm-safety-guardrails/actions/workflows/ci.yml/badge.svg)

Deterministic safety guardrails for LLM-powered assistants in **regulated and
health-adjacent domains** — the kind of assistant where "let the model decide"
is not an acceptable answer.

Extracted and generalized from a production **AI receptionist for clinics**
(WhatsApp), where an LLM answers patients and books appointments. The lessons
that survived production are here as small, dependency-free, testable modules.

> TypeScript · zero runtime dependencies · Node.js built-in test runner · runnable eval harness

## Why

LLMs are helpful but they will happily do three dangerous things in a
health/product context:

1. **Respond to an emergency** ("I have chest pain", self-harm ideation) as if it
   were small talk.
2. **Diagnose or prescribe** — outside the mandate of an administrative
   assistant, and a legal liability.
3. **Promise capabilities that don't exist** ("I'm integrating with your system
   now") — breaking customer trust.

A model prompt alone does not reliably prevent any of these. This library adds a
**deterministic layer** around the model: a fast, auditable classifier decides
the dangerous cases, and the model's output is sanitized before it reaches the
user.

## Architecture

```
inbound message ──▶ detectEmergency (pre-LLM)
                        │ emergency?  ──▶ fixed safe reply + human handoff  (LLM never runs)
                        ▼ no
                     LLM generates a draft (your code)
                        │
                        ▼
                 checkOutbound: evaluateMedicalCompliance ──▶ capability guard ──▶ safe reply
```

Guardrails are **defense-in-depth**: keep the same rules in your system prompt.
These modules are the barrier that holds when the prompt doesn't.

## Modules

| Module | Runs on | Blocks |
|---|---|---|
| `detectEmergency` | inbound user message | medical emergencies, self-harm, violence → forces human handoff with a fixed, auditable message |
| `evaluateMedicalCompliance` | model output | diagnosis, prescription, dosage, guaranteed clinical results |
| `guardCapabilityPromise` | model output | false promises of integration/sync with third-party systems |

## Usage

```ts
import { checkInbound, checkOutbound } from "llm-safety-guardrails";

const config = {
  productName: "Clinexa",
  honestCapability: "Trabalhamos com agenda própria e confirmação no WhatsApp.",
};

// 1. before calling the LLM
const emergency = checkInbound(userMessage);
if (emergency) {
  await send(emergency.reply);      // fixed emergency message
  await handoffToHuman();           // emergency.handoff === true
  return;
}

// 2. after the LLM produced a draft
const draft = await llm.generate(userMessage);
const safe = checkOutbound(draft, config);
await send(safe.reply);             // sanitized; safe.reasons lists any violations
```

## Design notes

- **High precision over recall on false positives.** "dor nas costas há meses,
  quero marcar" must NOT trigger an emergency; "dor no peito" must. Patterns use
  negative lookaheads to drop hyperbole ("me matar de estudar").
- **Fixed emergency copy.** The emergency response is a reviewable constant, never
  LLM-generated — legal and clinical teams sign off on the exact wording.
- **Portuguese-first.** Detection patterns target Brazilian Portuguese, the
  domain this came from. Extend the pattern tables for other locales.
- **Auditable.** Every guardrail returns the violations it found, so you can log
  them (without logging message content) for review.

## Develop

```bash
npm install
npm test       # node --test over the built-in runner
npm run evals   # labeled dataset, per-category accuracy
npm run typecheck
```

## Scope & limitations

Regex-based detection is a pragmatic first barrier, not a semantic classifier —
a determined user can phrase around it, which is why it is one layer among
several (system prompt, tool allowlist, human handoff). For higher recall, pair
it with a lightweight classification model. This library deliberately stays
dependency-free so it can drop into any Node/TypeScript backend.

## License

MIT © Aureo Manzano Junior
