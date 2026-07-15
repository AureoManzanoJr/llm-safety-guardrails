/**
 * Output guardrail against capability hallucination: LLMs happily promise
 * features they don't have ("I'm integrating with your system now"). For a
 * product assistant this creates false expectations and broken trust. This
 * guard catches false promises of integration/sync with third-party systems
 * and replaces them with an honest clarification.
 *
 * Configure `productName` and `honestCapability` for your product.
 */

export interface CapabilityGuardConfig {
  productName: string;
  /** One honest sentence describing what the product actually does instead. */
  honestCapability: string;
}

export type CapabilityVerdict = {
  text: string;
  violated: boolean;
};

// verb (integrar/sincronizar/conectar/vincular) close to an external "system"
const INTEGRATION_SYSTEM =
  /\b(integr\w+|sincroniz\w+|conect\w+|vincul\w+)\b[^.!?\n]{0,60}\b((seu|sua|o seu|a sua|do seu|outro)\s+)?(sistema|software|plataforma|prontuario|sistema de gestao)\b/i;

// verb + "com a/o <ProperNoun>" — catches "integrando com a Odontiva"
const INTEGRATION_NAMED =
  /\b(integr\w+|sincroniz\w+|conect\w+|vincul\w+)\b[^.!?\n]{0,30}\bcom\s+(a|o)\s+[A-ZÀ-Þ][A-Za-zÀ-ÿ]{2,}/;

function strip(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function guardCapabilityPromise(
  text: string,
  config: CapabilityGuardConfig,
): CapabilityVerdict {
  const probe = strip(text);
  if (INTEGRATION_SYSTEM.test(probe) || INTEGRATION_NAMED.test(text)) {
    return {
      violated: true,
      text:
        `Preciso esclarecer uma coisa: o ${config.productName} ainda não faz ` +
        `integração automática com outros sistemas. ${config.honestCapability} ` +
        `Posso te ajudar por aqui ou chamar nossa equipe.`,
    };
  }
  return { violated: false, text };
}
