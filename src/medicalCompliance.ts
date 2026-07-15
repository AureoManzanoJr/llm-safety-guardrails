/**
 * Output guardrail: an administrative assistant (receptionist, scheduler) must
 * not diagnose, prescribe, or guarantee clinical results — even if the LLM
 * drifts there. This runs on the MODEL OUTPUT and replaces violating text with
 * a safe fallback, recording the violation for audit. It is defense-in-depth,
 * not the only barrier: keep the rules in the system prompt too.
 */

export type ComplianceVerdict = {
  allowed: boolean;
  text: string;
  violations: string[];
};

const DIAGNOSIS =
  /\b(voce tem|diagnostico|prescrevo|tome \d|\d+ ?mg (por|ao) dia|antibiotico|confirmo que e|cancer|tumor|gravidez confirmada)\b/i;

const PRESCRIPTION =
  /\b(receita medica|prescricao|dosagem|tomar \d+ comprimido)\b/i;

const RESULT_GUARANTEE =
  /\b(garantimos? resultado|100% de resultado|cura garantida|sem efeito colateral nenhum)\b/i;

const FALLBACK =
  "Entendo sua preocupação. Não posso avaliar isso por mensagem — nossa equipe " +
  "ou um profissional de saúde pode orientar você com segurança. Posso ajudar a " +
  "agendar uma avaliação?";

function strip(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function evaluateMedicalCompliance(text: string): ComplianceVerdict {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: false, text: "", violations: ["empty"] };

  const probe = strip(trimmed);
  const violations: string[] = [];

  if (DIAGNOSIS.test(probe)) violations.push("diagnosis");
  else if (PRESCRIPTION.test(probe)) violations.push("prescription");
  if (RESULT_GUARANTEE.test(probe)) violations.push("result_guarantee");

  if (violations.length > 0) {
    return { allowed: true, text: FALLBACK, violations };
  }
  return { allowed: true, text: trimmed, violations: [] };
}
