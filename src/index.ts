export {
  detectEmergency,
  EMERGENCY_RESPONSE_MESSAGE,
  type EmergencyCategory,
  type EmergencyResult,
} from "./emergency.js";

export {
  evaluateMedicalCompliance,
  type ComplianceVerdict,
} from "./medicalCompliance.js";

export {
  guardCapabilityPromise,
  type CapabilityGuardConfig,
  type CapabilityVerdict,
} from "./capability.js";

import { detectEmergency, EMERGENCY_RESPONSE_MESSAGE } from "./emergency.js";
import { evaluateMedicalCompliance } from "./medicalCompliance.js";
import {
  guardCapabilityPromise,
  type CapabilityGuardConfig,
} from "./capability.js";

export interface PipelineResult {
  /** Message to send back to the user. */
  reply: string;
  /** True when the AI must stop and a human should take over. */
  handoff: boolean;
  reasons: string[];
}

/**
 * Reference pipeline showing the intended ordering:
 *   1. inbound emergency check (pre-LLM) — decided before generation;
 *   2. LLM produces a draft (your code);
 *   3. output guardrails sanitize the draft (medical + capability).
 *
 * `checkInbound` runs on the user's message; `checkOutbound` on the draft.
 */
export function checkInbound(userMessage: string): PipelineResult | null {
  const emergency = detectEmergency(userMessage);
  if (emergency.isEmergency) {
    return {
      reply: EMERGENCY_RESPONSE_MESSAGE,
      handoff: true,
      reasons: [`emergency:${emergency.category}`],
    };
  }
  return null; // safe to proceed to the LLM
}

export function checkOutbound(
  draft: string,
  capabilityConfig: CapabilityGuardConfig,
): PipelineResult {
  const reasons: string[] = [];
  let reply = draft;

  const medical = evaluateMedicalCompliance(reply);
  if (medical.violations.length) {
    reply = medical.text;
    reasons.push(...medical.violations.map((v) => `medical:${v}`));
  }

  const capability = guardCapabilityPromise(reply, capabilityConfig);
  if (capability.violated) {
    reply = capability.text;
    reasons.push("capability:false_integration_promise");
  }

  return { reply, handoff: false, reasons };
}
