import assert from "node:assert/strict";
import { once } from "node:events";
import { after, test } from "node:test";
import express from "express";
import { registerProgressRoutes } from "../server/progress.mjs";

const servers = new Set();
after(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function startProgressApi(userId) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.user = { sub: userId };
    next();
  });
  registerProgressRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  servers.add(server);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/api/progress`;
}

test("progress is saved and returned only for the authenticated user", async () => {
  const userId = `progress-test-${crypto.randomUUID()}`;
  const otherUserId = `progress-test-${crypto.randomUUID()}`;
  const url = await startProgressApi(userId);
  const otherUrl = await startProgressApi(otherUserId);
  const save = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId: "class5-fractions:2", positionSeconds: 54, completed: true }),
  });
  assert.equal(save.status, 200);
  assert.deepEqual(await save.json(), { saved: true });

  const ownProgress = await fetch(url);
  assert.deepEqual((await ownProgress.json()).progress.map(({ lessonId, positionSeconds, completed }) =>
    ({ lessonId, positionSeconds, completed })), [
    { lessonId: "class5-fractions:2", positionSeconds: 54, completed: true },
  ]);
  const updatePosition = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId: "class5-fractions:2", positionSeconds: 12 }),
  });
  assert.equal(updatePosition.status, 200);
  const updatedProgress = await fetch(url);
  assert.deepEqual((await updatedProgress.json()).progress.map(({ lessonId, positionSeconds, completed }) =>
    ({ lessonId, positionSeconds, completed })), [
    { lessonId: "class5-fractions:2", positionSeconds: 12, completed: true },
  ]);
  const otherProgress = await fetch(otherUrl);
  assert.deepEqual((await otherProgress.json()).progress, []);
});

test("progress rejects invalid identifiers, positions, and completion values", async () => {
  const url = await startProgressApi(`progress-test-${crypto.randomUUID()}`);
  const request = (body) => fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal((await request({ lessonId: "../other:0", positionSeconds: 0 })).status, 400);
  assert.equal((await request({ lessonId: "maths:0", positionSeconds: -1 })).status, 400);
  assert.equal((await request({ lessonId: "maths:0", positionSeconds: 1.5 })).status, 400);
  assert.equal((await request({ lessonId: "maths:0", positionSeconds: 2, completed: "yes" })).status, 400);
});
