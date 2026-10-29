import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, test } from "node:test";
import express from "express";
import { registerCurrentAffairsRoutes } from "../server/current-affairs-routes.mjs";
import { syncCurrentAffairs } from "../server/current-affairs.mjs";

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
    request.user = {
      sub: request.headers["x-user"] ?? "current-affairs-learner",
      role: request.headers["x-role"] ?? "student",
    };
    next();
  });
  registerCurrentAffairsRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  servers.add(server);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

function headers(role = "student", user = "current-affairs-learner") {
  return { "Content-Type": "application/json", "x-role": role, "x-user": user };
}

test("RSS articles remain private until reviewed, preserve source data, deduplicate and support owner bookmarks", async () => {
  const api = await startApi();
  const sourceName = `PIB test ${randomUUID()}`;
  const sourceResponse = await fetch(`${api}/api/admin/current-affairs/sources`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ name: sourceName, feedUrl: `https://pib.gov.in/RssMain.aspx?test=${randomUUID()}`, language: "en" }),
  });
  assert.equal(sourceResponse.status, 201);
  const { source } = await sourceResponse.json();
  const publishedAt = new Date(Date.now() - 60_000).toUTCString();
  const xml = `<rss version="2.0"><channel><title>PIB</title>
    <item><title>Recruitment notification and exam dates</title>
      <link>https://pib.gov.in/PressReleasePage.aspx?PRID=42&amp;utm_source=rss</link>
      <description><![CDATA[<p>Official source description.</p>]]></description><pubDate>${publishedAt}</pubDate>
    </item>
    <item><title>Duplicate item</title>
      <link>https://pib.gov.in/PressReleasePage.aspx?PRID=42&amp;utm_medium=email</link>
      <pubDate>${publishedAt}</pubDate>
    </item>
    <item><title>Undated item</title><link>https://pib.gov.in/PressReleasePage.aspx?PRID=43</link></item>
  </channel></rss>`;
  const sync = await syncCurrentAffairs({ fetchImpl: async () => new Response(xml, { headers: { "Content-Type": "application/rss+xml" } }) });
  assert.equal(sync.inserted, 1);
  assert.equal(sync.skipped, 2);

  const publicBeforeReview = await fetch(`${api}/api/current-affairs/articles`);
  assert.deepEqual((await publicBeforeReview.json()).articles, []);
  const pendingResponse = await fetch(`${api}/api/admin/current-affairs/articles`, { headers: headers("admin") });
  const pending = (await pendingResponse.json()).articles;
  assert.equal(pending.length, 1);
  assert.equal(pending[0].sourceName, sourceName);
  assert.equal(pending[0].summary, "Official source description.");
  assert.equal(pending[0].category, "Exam Alerts");
  assert.equal(Date.parse(pending[0].publishedAt), Date.parse(publishedAt));

  const review = await fetch(`${api}/api/admin/current-affairs/articles/${pending[0].id}`, {
    method: "PUT",
    headers: headers("admin"),
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(review.status, 200);
  const articles = (await (await fetch(`${api}/api/current-affairs/articles?category=Exam+Alerts`)).json()).articles;
  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, "https://pib.gov.in/PressReleasePage.aspx?PRID=42");

  const bookmarkResponse = await fetch(`${api}/api/current-affairs/bookmarks`, {
    method: "PUT",
    headers: headers("student", "learner-one"),
    body: JSON.stringify({ articleId: articles[0].id, saved: true }),
  });
  assert.equal(bookmarkResponse.status, 200);
  assert.equal((await (await fetch(`${api}/api/current-affairs/bookmarks`, { headers: headers("student", "learner-one") })).json()).articles.length, 1);
  assert.equal((await (await fetch(`${api}/api/current-affairs/bookmarks`, { headers: headers("student", "learner-two") })).json()).articles.length, 0);

  const rejectedSource = await fetch(`${api}/api/admin/current-affairs/sources`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ name: "untrusted", feedUrl: "https://example.com/feed.xml", language: "en" }),
  });
  assert.equal(rejectedSource.status, 400);
  assert.equal(source.active, true);
});

test("only admins manage source and question approval; quiz answers are hidden until scoring", async () => {
  const api = await startApi();
  const forbidden = await fetch(`${api}/api/admin/current-affairs/sources`, { headers: headers() });
  assert.equal(forbidden.status, 403);
  const exam = `Test Exam ${randomUUID()}`;
  const created = await fetch(`${api}/api/admin/competitive/questions`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({
      exam,
      subject: "Polity",
      topic: "Constitution",
      language: "en",
      prompt: "Which option is the reviewed answer?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 2,
      explanation: "This explanation was supplied by a reviewer.",
      negativeMarks: 0.25,
    }),
  });
  assert.equal(created.status, 201);
  const pendingQuestion = (await (await fetch(`${api}/api/admin/competitive/questions`, { headers: headers("admin") })).json()).questions
    .find((question) => question.exam === exam);
  assert.equal(pendingQuestion.correctAnswer, 2);
  assert.deepEqual((await (await fetch(`${api}/api/competitive/questions?exam=${encodeURIComponent(exam)}`)).json()).questions, []);

  const approved = await fetch(`${api}/api/admin/competitive/questions/${pendingQuestion.id}`, {
    method: "PUT",
    headers: headers("admin"),
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(approved.status, 200);
  const publicQuestions = (await (await fetch(`${api}/api/competitive/questions?exam=${encodeURIComponent(exam)}`)).json()).questions;
  assert.equal(publicQuestions.length, 1);
  assert.equal("correctAnswer" in publicQuestions[0], false);
  assert.equal("explanation" in publicQuestions[0], false);

  const scored = await fetch(`${api}/api/competitive/attempts`, {
    method: "POST",
    headers: headers("student", "quiz-learner"),
    body: JSON.stringify({ answers: [{ questionId: pendingQuestion.id, selectedOption: 0 }] }),
  });
  assert.equal(scored.status, 201);
  const { attempt } = await scored.json();
  assert.equal(attempt.score, -0.25);
  assert.equal(attempt.wrongCount, 1);
  assert.equal(attempt.answers[0].correctAnswer, 2);
  assert.equal(attempt.answers[0].explanation, "This explanation was supplied by a reviewer.");
  const ownHistory = await fetch(`${api}/api/competitive/attempts`, { headers: headers("student", "quiz-learner") });
  assert.equal((await ownHistory.json()).attempts.length, 1);
  const otherHistory = await fetch(`${api}/api/competitive/attempts`, { headers: headers("student", "another-learner") });
  assert.deepEqual((await otherHistory.json()).attempts, []);

  const invalidAttempt = await fetch(`${api}/api/competitive/attempts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ answers: [{ questionId: pendingQuestion.id, selectedOption: 9 }] }),
  });
  assert.equal(invalidAttempt.status, 400);
});

test("RSS sync retries transient feed failures before inserting new items", async () => {
  const api = await startApi();
  const sourceResponse = await fetch(`${api}/api/admin/current-affairs/sources`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ name: `Retry source ${randomUUID()}`, feedUrl: `https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?test=${randomUUID()}`, language: "en" }),
  });
  assert.equal(sourceResponse.status, 201);
  const { source } = await sourceResponse.json();
  let calls = 0;
  const xml = `<rss version="2.0"><channel><item><title>Central bank release</title>
    <link>https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?PRID=${randomUUID()}</link>
    <pubDate>${new Date(Date.now() - 10_000).toUTCString()}</pubDate>
  </item></channel></rss>`;
  const result = await syncCurrentAffairs({
    fetchImpl: async (url) => {
      if (url !== source.feedUrl) return new Response(xml, { status: 200 });
      calls += 1;
      if (calls < 3) return new Response("temporarily unavailable", { status: 503 });
      return new Response(xml, { status: 200 });
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.errors.length, 0);
  assert.equal(result.inserted, 1);
});
