/**
 * Deterministic emergency detection for patient/customer messages, designed to
 * run BEFORE any LLM call. In health-adjacent assistants an LLM must never be
 * the first responder to "I have chest pain" or self-harm ideation — a
 * conservative, auditable classifier decides, and hands off to a human.
 *
 * Patterns are intentionally high-precision (few false positives) while always
 * firing on unambiguous signals. Portuguese-first because that is the domain it
 * was built for; extend `PATTERNS` for other locales.
 */

export type EmergencyCategory =
  | "MEDICAL"
  | "SUICIDE_SELF_HARM"
  | "VIOLENCE";

export interface EmergencyResult {
  isEmergency: boolean;
  category: EmergencyCategory | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const PATTERNS: Array<{ category: EmergencyCategory; re: RegExp }> = [
  {
    category: "SUICIDE_SELF_HARM",
    // "quero me matar", "tirar minha vida", "me machucar", "nao aguento mais viver"
    // Negative lookaheads drop hyperbole ("me matar de rir/estudar").
    re: /\b(quero (me )?morrer|quero me matar(?! de (rir|estudar|trabalhar))|tirar minha vida|acabar com tudo|me machucar|me cortar|suicidio|nao aguento mais viver)\b/,
  },
  {
    category: "MEDICAL",
    re: /\b(dor no peito(?! do pe)|infarto|nao consigo respirar|falta de ar|hemorragia|sangrando sem parar|desmaiei|desmaio|convuls|inconsciente|avc|boca torta|fala enrolada|overdose|envenenamento|intoxica)\b/,
  },
  {
    category: "VIOLENCE",
    re: /\b(esta me batendo|fui agredid|fui esfaquead|ameacou me matar|violencia domestica|estao me atacando)\b/,
  },
];

export function detectEmergency(text: string): EmergencyResult {
  const t = normalize(text);
  for (const { category, re } of PATTERNS) {
    if (re.test(t)) return { isEmergency: true, category };
  }
  return { isEmergency: false, category: null };
}

/**
 * Fixed, reviewable response. Never LLM-generated: legal/clinical teams must be
 * able to audit the exact wording. Numbers are Brazilian emergency services.
 */
export const EMERGENCY_RESPONSE_MESSAGE =
  "Percebi que sua mensagem pode indicar uma situação de urgência. Este é um " +
  "atendimento virtual e não substitui avaliação médica. Se houver risco à " +
  "vida, procure atendimento imediato: SAMU 192 (emergência médica), CVV 188 " +
  "(apoio emocional) ou 190 (polícia). Vou direcionar você para uma pessoa da " +
  "nossa equipe agora.";
