import { readFile } from "node:fs/promises";
import { io } from "socket.io-client";

const baseUrl = process.env.LIVE_ROOMS_API ?? "http://127.0.0.1:8787";
const bank = JSON.parse(await readFile(new URL("../server/data/room-question-bank.json", import.meta.url), "utf8")).questions;

async function post(path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.error ?? response.status}`);
  return data;
}

const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
if (!health.ok) throw new Error("Room service health check failed.");
const session = await post("/api/session", { name: "Smoke test host", ageBand: "adult" });
const created = await post("/api/rooms", { name: "Live room smoke test", roomType: "duel", subject: "Science", classRange: "Class 8" }, session.token);
if (!/^\d{6}$/.test(created.room.code)) throw new Error("Room code was not six digits.");
const minorSession = await fetch(`${baseUrl}/api/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Child", ageBand: "under18", parentConsent: false }),
});
if (minorSession.status !== 403) throw new Error("Under-18 session without consent was not blocked.");

const socket = io(baseUrl, { auth: { token: session.token }, transports: ["websocket", "polling"], timeout: 3000 });
try {
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket.IO quiz smoke test timed out.")), 8_000);
    socket.on("connect_error", reject);
    socket.on("game:question", (question) => {
      const seededQuestion = bank.find((item) => item.prompt === question.prompt);
      if (!seededQuestion) return reject(new Error("Question did not come from the server seed bank."));
      socket.emit("game:answer", { choice: seededQuestion.answer }, (answer) => {
        if (answer?.error) reject(new Error(answer.error));
      });
    });
    socket.on("game:result", (gameResult) => {
      clearTimeout(timeout);
      resolve(gameResult);
    });
    socket.on("connect", () => {
      socket.emit("room:join", { code: created.room.code, displayName: "Smoke test host", hostSecret: created.hostSecret }, (joinResult) => {
        if (joinResult?.error) return reject(new Error(joinResult.error));
        socket.emit("game:start", { mode: "duel" }, (gameResult) => {
          if (gameResult?.error) reject(new Error(gameResult.error));
        });
      });
    });
  });
  if (!result.fastestIdentity || result.awarded <= 0) throw new Error("Server-side quiz scoring did not award points.");
  console.log(JSON.stringify({ health: health.ok, roomCreated: true, codeLength: created.room.code.length, minorConsentGate: true, socketQuizScored: true, score: result.awarded }));
} finally {
  socket.disconnect();
}
