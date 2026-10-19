import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const lid = "263771234567@lid";
const phone = "263772223344@s.whatsapp.net";
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith("/lib/identity.mjs")) return nextLoad(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: `
        export function normalizeJid(value) {
          const digits = String(value || "").match(/\\\\d+/)?.[0];
          return digits ? digits + "@s.whatsapp.net" : "";
        }
        export async function resolveAndMigrateIdentity(value, sock, chatId) {
          if (value !== ${JSON.stringify(lid)} || !sock || chatId !== "room@g.us") return value;
          return ${JSON.stringify(phone)};
        }
      `,
    };
  },
});

const { challengeMentionJid, resolveChallengeTarget } = await import("../lib/pokemon/challengeTarget.mjs");

test("WhatsApp challenge mentions resolve LIDs only through the verified identity resolver", async () => {
  const target = await resolveChallengeTarget({ jid: lid, sock: {}, chatJid: "room@g.us" });
  assert.equal(target, phone);
  assert.equal(challengeMentionJid(lid, target), phone);
  assert.equal(await resolveChallengeTarget({ jid: "bad-target", sock: {}, chatJid: "room@g.us" }), null);
});
