import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, test } from "node:test";
import express from "express";
import { registerStudyPlanRoutes } from "../server/study-plan.mjs";

const servers = new Set();
after(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function startApi() {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.user = { sub: request.headers["x-user"] ?? "study-plan-learner" };
    next();
  });
  registerStudyPlanRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  servers.add(server);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

function headers(userId, body = true) {
  return {
    ...(body ? { "Content-Type": "application/json" } : {}),
    "x-user": userId,
  };
}

test("study goals and timetable tasks validate input and remain owner-scoped", async () => {
  const api = await startApi();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const initial = await fetch(`${api}/api/study/plan`, { headers: headers(userId, false) });
  assert.equal((await initial.json()).plan.dailyTargetMinutes, 30);

  const invalidGoal = await fetch(`${api}/api/study/goal`, {
    method: "PUT", headers: headers(userId), body: JSON.stringify({ dailyTargetMinutes: 4 }),
  });
  assert.equal(invalidGoal.status, 400);
  const savedGoal = await fetch(`${api}/api/study/goal`, {
    method: "PUT", headers: headers(userId), body: JSON.stringify({ dailyTargetMinutes: 45 }),
  });
  assert.equal((await savedGoal.json()).dailyTargetMinutes, 45);

  const invalidDate = await fetch(`${api}/api/study/tasks`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ title: "Review", subject: "History", dueDate: "2026-02-31", plannedMinutes: 20 }),
  });
  assert.equal(invalidDate.status, 400);

  const dueDate = new Date().toISOString().slice(0, 10);
  const savedTask = await fetch(`${api}/api/study/tasks`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ title: "Review constitutional basics", subject: "Polity", dueDate, plannedMinutes: 30 }),
  });
  assert.equal(savedTask.status, 201);
  const { task } = await savedTask.json();
  const otherPlan = await fetch(`${api}/api/study/plan`, { headers: headers(otherUserId, false) });
  assert.deepEqual((await otherPlan.json()).plan.tasks, []);

  const otherUpdate = await fetch(`${api}/api/study/tasks/${task.id}`, {
    method: "PATCH", headers: headers(otherUserId), body: JSON.stringify({ completed: true }),
  });
  assert.equal(otherUpdate.status, 404);
  const completeTask = await fetch(`${api}/api/study/tasks/${task.id}`, {
    method: "PATCH", headers: headers(userId), body: JSON.stringify({ completed: true }),
  });
  assert.ok((await completeTask.json()).task.completedAt);
  const deleteTask = await fetch(`${api}/api/study/tasks/${task.id}`, {
    method: "DELETE", headers: headers(userId, false),
  });
  assert.deepEqual(await deleteTask.json(), { deleted: true });
});

test("focus sessions are server-timed, exclusive per user and exclude cancelled/short sessions", async () => {
  const api = await startApi();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const invalidStart = await fetch(`${api}/api/study/sessions/start`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ sessionType: "focus", plannedMinutes: 121 }),
  });
  assert.equal(invalidStart.status, 400);

  const started = await fetch(`${api}/api/study/sessions/start`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ sessionType: "focus", plannedMinutes: 1 }),
  });
  assert.equal(started.status, 201);
  const { session } = await started.json();
  const conflict = await fetch(`${api}/api/study/sessions/start`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ sessionType: "break", plannedMinutes: 5 }),
  });
  assert.equal(conflict.status, 409);

  const tooSoon = await fetch(`${api}/api/study/sessions/${session.id}/finish`, {
    method: "POST", headers: headers(userId), body: JSON.stringify({ cancelled: false }),
  });
  assert.equal(tooSoon.status, 409);
  const beforeFinishPlan = await fetch(`${api}/api/study/plan`, { headers: headers(userId, false) });
  assert.equal((await beforeFinishPlan.json()).plan.stats.focusMinutes, 0);

  const wrongOwnerStart = await fetch(`${api}/api/study/sessions/start`, {
    method: "POST",
    headers: headers(otherUserId),
    body: JSON.stringify({ sessionType: "break", plannedMinutes: 1 }),
  });
  assert.equal(wrongOwnerStart.status, 201);
  const actualNow = Date.now;
  let finished;
  try {
    Date.now = () => actualNow() + 61_000;
    finished = await fetch(`${api}/api/study/sessions/${session.id}/finish`, {
      method: "POST", headers: headers(userId), body: JSON.stringify({ cancelled: false }),
    });
  } finally {
    Date.now = actualNow;
  }
  assert.equal((await finished.json()).session.counted, true);

  const completedPlan = await fetch(`${api}/api/study/plan`, { headers: headers(userId, false) });
  const stats = (await completedPlan.json()).plan.stats;
  assert.equal(stats.focusMinutes, 1);
  assert.equal(stats.todayFocusMinutes, 1);
  assert.equal(stats.todaySessions, 1);
  assert.equal(stats.weekSessions, 1);

  const wrongOwnerFinish = await fetch(`${api}/api/study/sessions/${session.id}/finish`, {
    method: "POST", headers: headers(otherUserId), body: JSON.stringify({ cancelled: false }),
  });
  assert.equal(wrongOwnerFinish.status, 404);
});
