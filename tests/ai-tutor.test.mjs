import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import express from "express";
import { registerTutorRoutes, buildTutorSystemPrompt, inspectTutorQuestion } from "../server/ai-tutor.mjs";
import { consumeTutorRequest, getStoreMode } from "../server/data/store.mjs";

test("tutor input validation rejects empty, oversized, unsafe, and personal questions", () => {
  assert.equal(inspectTutorQuestion("").ok, false);
  assert.equal(inspectTutorQuestion("x".repeat(1001)).ok, false);
  assert.equal(inspectTutorQuestion("What is my password?").ok, false);
  assert.equal(inspectTutorQuestion("My email is learner@example.com").ok, false);
  assert.deepEqual(inspectTutorQuestion("Explain fractions"), { ok: true, question: "Explain fractions" });
});

test("tutor prompts use the learner language and approved lesson context", () => {
  const prompt = buildTutorSystemPrompt({
    classLevel: 5,
    language: "Hinglish",
    lesson: { title: "Equivalent fractions", subject: "Maths", class: 5, transcript: "Use equal-sized parts.", keyPoints: ["Same whole", "Same value"] },
  });
  assert.match(prompt, /Class 5/);
  assert.match(prompt, /Hinglish/);
  assert.match(prompt, /Equivalent fractions/);
  assert.match(prompt, /Same value/);
});

test("memory tutor quota is enforced per user, date, and feature", { skip: getStoreMode() !== "memory" }, async () => {
  const userId = `quota-test-${crypto.randomUUID()}`;
  assert.equal(await consumeTutorRequest(userId, "chat", 2), true);
  assert.equal(await consumeTutorRequest(userId, "chat", 2), true);
  assert.equal(await consumeTutorRequest(userId, "chat", 2), false);
  assert.equal(await consumeTutorRequest(userId, "vision", 2), true);
});

test("chat uses approved lesson context, moderates output, and enforces the daily limit", async (t) => {
  const originalFetch = globalThis.fetch;
  const manifestDirectory = await mkdtemp(join(tmpdir(), "studyai-ai-tutor-"));
  const manifestPath = join(manifestDirectory, "manifest.json");
  const userId = `integration-${randomUUID()}`;
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.user = { sub: userId, classLevel: 5, language: "Hindi", plan: "free" };
    next();
  });
  registerTutorRoutes(app, { apiKey: "test-provider-key", manifestPath });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await Promise.all([
      new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
      rm(manifestDirectory, { recursive: true, force: true }),
    ]);
  });
  await writeFile(manifestPath, JSON.stringify([
    { id: "approved-fractions", status: "approved", title: "Equivalent fractions", subject: "Maths", class: 5, transcript: "Fractions with equal values.", keyPoints: ["Same whole"] },
    { id: "draft-fractions", status: "draft - needs teacher review", title: "Draft lesson", subject: "Maths", class: 5, transcript: "Not approved.", keyPoints: [] },
  ]));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  let providerCalls = 0;
  globalThis.fetch = async (input, init) => {
    const target = String(input);
    if (!target.startsWith("https://api.openai.com/")) return originalFetch(input, init);
    providerCalls += 1;
    const body = JSON.parse(init.body);
    if (target.endsWith("/moderations")) return new Response(JSON.stringify({ results: [{ flagged: false }] }), { headers: { "Content-Type": "application/json" } });
    if (target.endsWith("/chat/completions")) {
      assert.match(body.messages[0].content, /Equivalent fractions/);
      assert.match(body.messages[0].content, /Fractions with equal values/);
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hint: compare equal-sized parts. A pizza cut into equal slices is one example." } }] }), { headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`Unexpected provider endpoint: ${target}`);
  };
  const request = (lessonId) => originalFetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId, question: "Explain this simply" }),
  });

  const draftResponse = await request("draft-fractions");
  assert.equal(draftResponse.status, 404);
  assert.equal(providerCalls, 0);

  const first = await request("approved-fractions");
  assert.equal(first.status, 200);
  assert.match(first.headers.get("content-type"), /text\/event-stream/);
  assert.match(await first.text(), /pizza cut into equal slices/);

  assert.equal((await request("approved-fractions")).status, 200);
  assert.equal((await request("approved-fractions")).status, 200);
  const overQuota = await request("approved-fractions");
  assert.equal(overQuota.status, 429);
  assert.equal(providerCalls, 9);
});
