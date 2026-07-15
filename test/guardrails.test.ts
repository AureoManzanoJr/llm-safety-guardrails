import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectEmergency,
  evaluateMedicalCompliance,
  guardCapabilityPromise,
  checkInbound,
  checkOutbound,
} from "../src/index.js";

const cfg = {
  productName: "Clinexa",
  honestCapability: "Trabalhamos com agenda própria e confirmação no WhatsApp.",
};

describe("emergency detection", () => {
  for (const m of [
    "socorro, estou com dor no peito e falta de ar",
    "acho que não aguento mais viver",
    "meu marido está me batendo agora",
    "tomei remédio demais, foi overdose",
  ]) {
    it(`fires: "${m.slice(0, 30)}..."`, () =>
      assert.equal(detectEmergency(m).isEmergency, true));
  }

  for (const m of [
    "quero marcar uma consulta para dor nas costas",
    "vou me matar de tanto estudar essa semana",
    "qual o valor da limpeza?",
  ]) {
    it(`does NOT fire: "${m.slice(0, 30)}..."`, () =>
      assert.equal(detectEmergency(m).isEmergency, false));
  }
});

describe("medical compliance (output)", () => {
  it("blocks a dosage recommendation", () => {
    const v = evaluateMedicalCompliance("Recomendo 500mg por dia de amoxicilina.");
    assert.ok(v.violations.length > 0);
    assert.notEqual(v.text, "Recomendo 500mg por dia de amoxicilina.");
  });
  it("allows an administrative reply", () => {
    const reply = "A consulta custa R$ 200 e temos horário na terça às 14h.";
    assert.deepEqual(evaluateMedicalCompliance(reply).violations, []);
  });
});

describe("capability hallucination (output)", () => {
  it("blocks a false integration promise", () => {
    const v = guardCapabilityPromise(
      "Claro! Estou integrando com o seu sistema Odontiva agora mesmo.",
      cfg,
    );
    assert.equal(v.violated, true);
    assert.match(v.text, /não faz integração automática/i);
  });
  it("does not flag a normal reply", () => {
    const v = guardCapabilityPromise("Vou te ajudar a montar a agenda aqui.", cfg);
    assert.equal(v.violated, false);
  });
});

describe("reference pipeline", () => {
  it("inbound emergency short-circuits to handoff", () => {
    const r = checkInbound("estou com dor no peito");
    assert.ok(r && r.handoff);
  });
  it("clean message proceeds (null)", () => {
    assert.equal(checkInbound("quero remarcar minha consulta"), null);
  });
  it("outbound sanitizes a false promise", () => {
    const r = checkOutbound("Vou integrar com o seu sistema agora.", cfg);
    assert.ok(r.reasons.includes("capability:false_integration_promise"));
  });
});
