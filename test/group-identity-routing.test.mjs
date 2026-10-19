import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createMemoryDb } from "./support/memoryMongo.mjs";
import { getGroupMetadata, groupRoles } from "../lib/groupIdentity.mjs";

const phone = "263771234567@s.whatsapp.net";
const lid = "991234567890123@lid";
const bot = "263770000000@s.whatsapp.net";
globalThis.routingIdentityDb = createMemoryDb({ users: [],
  pokemon_owned: [{ _id: "legacy", ownerJid: lid.split("@")[0], whatsappNumber: lid }],
});
globalThis.adminRuns = [];
registerHooks({
  load(url, context, nextLoad) {
    let source;
    if (url === "node:fs") source = `export const existsSync=()=>true; export const statSync=()=>({isDirectory:()=>true}); export const readdirSync=p=>p.endsWith("/plugins")?["group"]:["fixture.js"];`;
    if (url.includes("/plugins/group/fixture.js")) source = `export default {name:"fixture",isAdmin:true,cooldown:0,run:async c=>globalThis.adminRuns.push(c.sender)};`;
    if (url.endsWith("/lib/logger.mjs")) source = "export const log=()=>{};";
    if (url.endsWith("/lib/mongo.mjs")) source = "export const getDb=()=>globalThis.routingIdentityDb; export const ensureDb=async()=>{};";
    if (url.endsWith("/lib/permissions.mjs")) source = "export const getPermissions=async()=>({isOwner:false,isStaff:false,isMod:false});";
    if (url.endsWith("/lib/groupSettings.js")) source = "export const groupSettings={get:()=>({})};";
    if (url.endsWith("/lib/websiteAuth.mjs")) source = "export const syncWebsiteProfilePicture=async()=>{};";
    if (url.endsWith("/lib/economyPreview.mjs")) source = "export const buildEconomyLinkPreview=()=>({}); export const getEconomyPreviewConfig=()=>({});";
    return source ? { format: "module", shortCircuit: true, source } : nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.includes("/plugins/group/fixture.js")) return { url: `file://${specifier}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { loadPlugins, routeMessage } = await import("../lib/pluginManager.mjs");
const { resolveLidToJid, resolveMessageSender } = await import("../lib/identity.mjs");
await loadPlugins();
const meta = { participants: [{ id: lid, phoneNumber: phone, admin: "admin" }, { id: bot, admin: "admin" }] };
function socket(metadata = meta) {
  const sent = [];
  return { sent, user: { id: bot }, groupMetadata: async () => metadata,
    sendMessage: async (_, message) => sent.push(message), profilePictureUrl: async () => null,
    signalRepository: { lidMapping: { getPNForLID: async () => phone, getLIDForPN: async () => lid } } };
}
function message(sender = lid) {
  return { key: { participant: sender, remoteJid: "123@g.us" }, message: { conversation: ".fixture" } };
}
test("actual command router authorizes LID admin after resolving its data phone", async () => {
  await routeMessage(socket(), message());
  assert.deepEqual(globalThis.adminRuns, [phone]);
});
test("equal digits in different namespaces do not grant group-admin rights", async () => {
  const sock = socket({ participants: [{ id: "263771234567@lid", admin: "admin" }, { id: bot, admin: "admin" }] });
  sock.signalRepository = {};
  const roles = await groupRoles(sock, await sock.groupMetadata(), phone);
  assert.equal(roles.senderIsAdmin, false);
  await routeMessage(sock, message(phone));
  assert.equal(globalThis.adminRuns.length, 1);
  assert.match(sock.sent.at(-1).text, /Group admins only/);
});
test("metadata failure denies admin command instead of failing open", async () => {
  const sock = socket();
  sock.groupMetadata = async () => { throw new Error("unavailable"); };
  await routeMessage(sock, message());
  assert.equal(globalThis.adminRuns.length, 1);
  assert.match(sock.sent.at(-1).text, /Could not verify/);
});
test("new id=LID phoneNumber=PN metadata survives a failing native mapping cache", async () => {
  const sock = socket();
  sock.signalRepository.lidMapping.getPNForLID = async () => { throw new Error("cache miss"); };
  assert.equal(await resolveLidToJid(lid, sock, "123@g.us", "999@g.us"), phone);
});
test("phone-only messages persist reverse mapping even before economy registration", async () => {
  const sock = socket();
  assert.equal(await resolveMessageSender(phone, "", sock, "123@g.us"), phone);
  assert.equal((await globalThis.routingIdentityDb.collection("identity_links").findOne({ _id: lid })).phoneId, phone);
  assert.equal(globalThis.routingIdentityDb.data.users.length, 0);
  assert.equal(globalThis.routingIdentityDb.data.pokemon_owned[0].whatsappNumber, lid,
    "learning a phone mapping must preserve legacy full-LID ownership evidence");
});
test("simultaneous moderation/admin metadata reads share one live group request", async () => {
  let calls = 0;
  const sock = socket();
  sock.groupMetadata = async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return meta;
  };
  const results = await Promise.all(Array.from({ length: 8 }, () => getGroupMetadata(sock, "123@g.us")));
  assert.equal(calls, 1);
  assert.ok(results.every(result => result === meta));
});
