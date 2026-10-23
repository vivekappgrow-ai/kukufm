import "dotenv/config";
import { randomInt, randomUUID, timingSafeEqual, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { AccessToken, LiveKitAPI, RoomServiceClient } from "livekit-server-sdk";
import { rateLimit } from "express-rate-limit";

const PORT = Number(process.env.ROOMS_PORT ?? 8787);
const HOST = process.env.ROOMS_HOST ?? "127.0.0.1";
const DEMO_MODE = process.env.ROOMS_DEMO_MODE === "true";
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const AUTH_JWT_ISSUER = process.env.AUTH_JWT_ISSUER;
const AUTH_JWT_AUDIENCE = process.env.AUTH_JWT_AUDIENCE;
const DEMO_JWT_SECRET = AUTH_JWT_SECRET ?? "studyai-local-demo-session-do-not-deploy";
const LIVEKIT_HTTP_URL = LIVEKIT_URL?.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
const LIVEKIT_WS_URL = LIVEKIT_URL?.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
const roomService = LIVEKIT_HTTP_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
  ? new RoomServiceClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : undefined;
const livekitApi = LIVEKIT_HTTP_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
  ? new LiveKitAPI({ host: LIVEKIT_HTTP_URL, apiKey: LIVEKIT_API_KEY, secret: LIVEKIT_API_SECRET })
  : undefined;
const rooms = new Map();
const VOICE_AGENT_NAME = process.env.VOICE_AGENT_NAME ?? "studyai-voice-tutor";
const CALL_INTERNAL_SECRET = process.env.CALL_INTERNAL_SECRET ?? "studyai-call-secret";
const CALL_MAX_SECONDS = Number(process.env.VOICE_CALL_MAX_SECONDS ?? 600);
const callUsage = new Map();
const roomSeed = JSON.parse(await readFile(new URL("./data/room-question-bank.json", import.meta.url), "utf8"));
const questions = roomSeed.questions;
const blockedChatWords = ["fuck", "shit", "bitch", "asshole"];

function cleanText(value, max = 48) {
  return typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, max) : "";
}

function safeCodeEquals(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function validateJwt(token) {
  const secret = DEMO_MODE ? DEMO_JWT_SECRET : AUTH_JWT_SECRET;
  if (!secret || typeof token !== "string") return undefined;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return undefined;
  try {
    if (JSON.parse(Buffer.from(header, "base64url").toString("utf8")).alg !== "HS256") return undefined;
  } catch {
    return undefined;
  }
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  if (!safeCodeEquals(signature, expected)) return undefined;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 < Date.now()) return undefined;
    if (claims.nbf && claims.nbf * 1000 > Date.now()) return undefined;
    if (AUTH_JWT_ISSUER && claims.iss !== AUTH_JWT_ISSUER) return undefined;
    if (AUTH_JWT_AUDIENCE && !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(AUTH_JWT_AUDIENCE)) return undefined;
    return claims;
  } catch {
    return undefined;
  }
}

function issueDemoJwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ...claims, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60 })).toString("base64url");
  const signature = createHmac("sha256", DEMO_JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function authenticate(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const claims = validateJwt(token);
  if (!claims?.sub) {
    response.status(401).json({ error: "A valid authenticated session is required." });
    return;
  }
  if (claims.ageBand === "under18" && claims.parentConsent !== true) {
    response.status(403).json({ error: "Parent consent is required before joining live rooms." });
    return;
  }
  request.user = claims;
  next();
}

function roomSummary(room) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    roomType: room.roomType,
    subject: room.subject,
    classRange: room.classRange,
    scheduledAt: room.scheduledAt,
    joinUrl: `${process.env.ROOMS_PUBLIC_URL ?? "http://localhost:5173"}/?room=${room.code}`,
    locked: room.locked,
    waitingRoom: room.waitingRoom,
    participants: [...room.participants.values()].map(({ identity, name, role, handRaised }) => ({ identity, name, role, handRaised })),
  };
}

function filterProfanity(message) {
  const safe = cleanText(message, 500);
  const expression = new RegExp(`\\b(${blockedChatWords.join("|")})\\b`, "gi");
  return safe.replace(expression, (word) => "*".repeat(word.length));
}

const app = express();
app.use(express.json({ limit: "16kb" }));
const sessionLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: "draft-8", legacyHeaders: false });
app.get("/api/health", (_request, response) => response.json({ ok: true, provider: roomService ? "livekit" : "unconfigured" }));
app.post("/api/session", sessionLimiter, (request, response) => {
  if (!DEMO_MODE) {
    response.status(404).json({ error: "Use the configured identity provider to sign in." });
    return;
  }
  const ageBand = request.body?.ageBand === "under18" ? "under18" : "adult";
  const parentConsent = request.body?.parentConsent === true;
  if (ageBand === "under18" && !parentConsent) {
    response.status(403).json({ error: "A parent or guardian must provide consent before demo room access." });
    return;
  }
  response.json({
    token: issueDemoJwt({ sub: `demo-${randomUUID()}`, name: cleanText(request.body?.name, 48) || "Demo learner", ageBand, parentConsent }),
    demoOnly: true,
    warning: "This signed demo session is for local development only and is not a production student account.",
  });
});
app.use("/api", apiLimiter);
app.use("/api", authenticate);

app.post("/api/call/token", async (request, response) => {
  if (!request.user?.sub) {
    response.status(401).json({ error: "A valid session is required to start a call." });
    return;
  }
  if (request.user.ageBand === "under18" && !request.user.parentConsent && request.body?.parentConsent !== true) {
    response.status(403).json({ error: "A parent or guardian must grant consent before the first voice call." });
    return;
  }
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    response.status(503).json({ error: "LiveKit is not configured. Set the server-side voice-call env vars." });
    return;
  }
  const childId = cleanText(String(request.user.sub), 120) || `student-${randomUUID()}`;
  const studentName = cleanText(request.body?.name ?? request.user.name, 48) || "Learner";
  const classLevel = Number.isFinite(Number(request.body?.classLevel)) ? Number(request.body?.classLevel) : 5;
  const board = cleanText(request.body?.board, 24) || "NCERT";
  const language = cleanText(request.body?.language, 24) || "Hindi";
  const voiceId = cleanText(request.body?.voiceId, 32) || "guru-ji";
  const lessonId = cleanText(request.body?.lessonId, 120) || "general";
  const usageDate = new Date().toISOString().slice(0, 10);
  const existingUsage = Number(callUsage.get(`${childId}:${usageDate}`) ?? 0);
  const dailyAllowance = Math.max(60, CALL_MAX_SECONDS);
  if (existingUsage >= dailyAllowance) {
    response.status(429).json({ error: "Daily call time limit reached. Try again tomorrow." });
    return;
  }
  const remaining = Math.max(0, dailyAllowance - existingUsage);
  const roomName = `studyai-call-${randomUUID().slice(0, 8)}`;
  try {
    await livekitApi.room.createRoom({ name: roomName, emptyTimeout: 60, maxParticipants: 2 });
  } catch (error) {
    console.error("LiveKit room creation failed for call.", error);
    response.status(502).json({ error: "The call room could not be created. Try again in a moment." });
    return;
  }
  try {
    const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: `call-${childId}`, name: studentName, ttl: "30m" });
    accessToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: false });
    const token = await accessToken.toJwt();
    const metadata = JSON.stringify({ childId, classLevel, board, language, voiceId, lessonId, owner: studentName, parentConsent: Boolean(request.user.parentConsent || request.body?.parentConsent) });
    try {
      await livekitApi.agentDispatch.createDispatch(roomName, VOICE_AGENT_NAME, { metadata });
    } catch (error) {
      console.warn("Voice agent dispatch is unavailable; the room will still allow a learner to connect.", error);
    }
    response.json({
      ok: true,
      token,
      roomName,
      serverUrl: LIVEKIT_WS_URL,
      agentReady: true,
      usageSecondsLeft: remaining,
      maxSeconds: dailyAllowance,
      voiceId,
    });
  } catch (error) {
    console.error("LiveKit token generation failed for call.", error);
    response.status(500).json({ error: "A secure call token could not be issued." });
  }
});

app.get("/api/admin/room-reports", (request, response) => {
  if (request.user.role !== "admin") {
    response.status(403).json({ error: "An admin role is required." });
    return;
  }
  response.json({ reports: [...rooms.values()].flatMap((room) => room.reports) });
});

app.post("/api/rooms", async (request, response) => {
  const roomType = ["duel", "study-group", "classroom", "public"].includes(request.body?.roomType) ? request.body.roomType : "study-group";
  const name = cleanText(request.body?.name, 80) || "Study room";
  const subject = cleanText(request.body?.subject, 40) || "General";
  const classRange = cleanText(request.body?.classRange, 24) || "All classes";
  const scheduledAt = request.body?.scheduledAt ? new Date(request.body.scheduledAt) : undefined;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    response.status(400).json({ error: "The scheduled date and time is invalid." });
    return;
  }
  if (scheduledAt && scheduledAt.getTime() < Date.now() + 60_000) {
    response.status(400).json({ error: "Schedule the room at least one minute in the future." });
    return;
  }
  if (roomType === "public") {
    response.status(501).json({ error: "Public matchmaking is disabled until verified class-matched accounts are connected." });
    return;
  }
  let code;
  do { code = String(randomInt(100000, 1_000_000)); } while (rooms.has(code));
  const room = {
    id: randomUUID(),
    code,
    name,
    subject,
    classRange,
    roomType,
    scheduledAt: scheduledAt?.toISOString(),
    hostId: String(request.user.sub),
    hostSecret: randomUUID(),
    createdAt: Date.now(),
    locked: false,
    waitingRoom: roomType === "classroom",
    waiting: new Map(),
    participants: new Map(),
    reports: [],
    scores: {},
    game: undefined,
  };
  rooms.set(code, room);
  if (roomService) {
    try {
      await roomService.createRoom({ name: code, emptyTimeout: 300, maxParticipants: roomType === "duel" ? 2 : roomType === "study-group" ? 6 : 100 });
    } catch (error) {
      rooms.delete(code);
      console.error("LiveKit room creation failed.", error);
      response.status(502).json({ error: "The video room could not be provisioned. Check LiveKit configuration." });
      return;
    }
  }
  response.status(201).json({ room: roomSummary(room), hostSecret: room.hostSecret, mediaReady: Boolean(roomService) });
});

app.post("/api/rooms/:code/token", async (request, response) => {
  const room = rooms.get(request.params.code);
  if (!room) {
    response.status(404).json({ error: "This room was not found or has expired." });
    return;
  }
  if (room.locked && !safeCodeEquals(request.body?.hostSecret, room.hostSecret)) {
    response.status(423).json({ error: "This room is locked." });
    return;
  }
  if (!roomService || !LIVEKIT_URL) {
    response.status(503).json({ error: "LiveKit is not configured. Set the server-side LiveKit environment variables." });
    return;
  }
  const isHost = safeCodeEquals(request.body?.hostSecret, room.hostSecret) && String(request.user.sub) === room.hostId;
  const identity = cleanText(String(request.user.sub), 100);
  const capacity = room.roomType === "duel" ? 2 : room.roomType === "study-group" ? 6 : 100;
  if (!room.participants.has(identity) && room.participants.size + room.waiting.size >= capacity) {
    response.status(409).json({ error: "This room has reached its participant limit." });
    return;
  }
  const displayName = cleanText(request.user.name ?? request.body?.displayName, 48) || "Learner";
  try {
    const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, name: displayName, ttl: "2h" });
    accessToken.addGrant({ roomJoin: true, room: room.code, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: isHost });
    response.json({ token: await accessToken.toJwt(), serverUrl: LIVEKIT_WS_URL, identity, displayName, isHost, room: roomSummary(room) });
  } catch (error) {
    console.error("LiveKit token generation failed.", error);
    response.status(500).json({ error: "A secure media token could not be issued." });
  }
});

app.post("/api/rooms/:code/moderate", async (request, response) => {
  const room = rooms.get(request.params.code);
  if (!room || !safeCodeEquals(request.body?.hostSecret, room.hostSecret) || String(request.user.sub) !== room.hostId) {
    response.status(403).json({ error: "Only the authenticated room host can moderate this room." });
    return;
  }
  const action = request.body?.action;
  if (action === "lock") room.locked = Boolean(request.body.locked);
  else if (action === "waiting") room.waitingRoom = Boolean(request.body.enabled);
  else if (action === "remove" && typeof request.body.identity === "string" && roomService) {
    try { await roomService.removeParticipant(room.code, cleanText(request.body.identity, 100)); }
    catch (error) {
      console.error("Participant removal failed.", error);
      response.status(502).json({ error: "Participant removal failed." });
      return;
    }
    const removedSocket = [...io.sockets.sockets.values()].find((client) => client.data.roomCode === room.code && client.data.identity === request.body.identity);
    removedSocket?.disconnect(true);
  } else if (action === "mute-all" && roomService) {
    try {
      const participants = await roomService.listParticipants(room.code);
      const muted = request.body?.muted !== false;
      await Promise.all(participants.filter((participant) => participant.identity !== String(request.user.sub)).flatMap((participant) =>
        participant.tracks.filter((track) => track.type === 0).map((track) => roomService.mutePublishedTrack(room.code, participant.identity, track.sid, muted))));
    } catch (error) {
      console.error("Room mute-all failed.", error);
      response.status(502).json({ error: "The room could not mute all participants." });
      return;
    }
  } else if (action !== "lock") {
    if (action !== "waiting") {
      response.status(400).json({ error: "Unsupported moderation action or LiveKit is unavailable." });
      return;
    }
  }
  if (action === "waiting" && !room.waitingRoom) {
    for (const waiting of room.waiting.values()) {
      waiting.socket.emit("room:admitted", { room: roomSummary(room) });
    }
    room.waiting.clear();
  }
  io.to(room.code).emit("room:state", roomSummary(room));
  response.json({ room: roomSummary(room) });
});

app.get("/api/rooms/:code/ics", (request, response) => {
  const room = rooms.get(request.params.code);
  if (!room?.scheduledAt) {
    response.status(404).json({ error: "No scheduled session is available for this room." });
    return;
  }
  const start = new Date(room.scheduledAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(new Date(room.scheduledAt).getTime() + 60 * 60_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  response.type("text/calendar").send(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyAI//Live Room//EN\r\nBEGIN:VEVENT\r\nUID:${room.id}@studyai\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${room.name.replace(/[,;]/g, " ")}\r\nURL:${process.env.ROOMS_PUBLIC_URL ?? "http://localhost:5173"}?room=${room.code}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`);
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.ROOMS_CORS_ORIGIN?.split(",") ?? false } });
const activeQuestionTimers = new Map();
const joinAttempts = new Map();

io.use((socket, next) => {
  const claims = validateJwt(socket.handshake.auth?.token);
  if (!claims?.sub || (claims.ageBand === "under18" && claims.parentConsent !== true)) {
    next(new Error("Authenticated session and required parent consent are needed."));
    return;
  }
  socket.data.user = claims;
  next();
});

io.on("connection", (socket) => {
  socket.on("room:join", ({ code, displayName, hostSecret } = {}, callback = () => {}) => {
    const sourceIp = socket.handshake.address;
    const attempts = (joinAttempts.get(sourceIp) ?? []).filter((timestamp) => timestamp > Date.now() - 60_000);
    if (attempts.length >= 10) return callback({ error: "Too many room attempts. Wait a minute and try again." });
    attempts.push(Date.now());
    joinAttempts.set(sourceIp, attempts);
    const room = rooms.get(String(code));
    if (!room) return callback({ error: "Room not found." });
    const isHost = safeCodeEquals(hostSecret, room.hostSecret) && String(socket.data.user.sub) === room.hostId;
    if (room.locked && !isHost) return callback({ error: "This room is locked." });
    const name = cleanText(socket.data.user.name ?? displayName, 48) || "Learner";
    const identity = String(socket.data.user.sub);
    if (room.waitingRoom && !isHost) {
      socket.data.roomCode = room.code;
      socket.data.identity = identity;
      socket.data.isHost = false;
      socket.join(room.code);
      room.waiting.set(identity, { identity, name, socket });
      io.to(room.code).emit("room:waiting", [...room.waiting.values()].map(({ identity: id, name: displayName }) => ({ identity: id, name: displayName })));
      callback({ waiting: true, message: "Waiting for the host to admit you." });
      return;
    }
    socket.data.roomCode = room.code;
    socket.data.identity = identity;
    socket.data.isHost = isHost;
    socket.join(room.code);
    room.participants.set(identity, { identity, name, role: isHost ? "host" : "student", handRaised: false });
    io.to(room.code).emit("room:state", roomSummary(room));
    callback({ room: roomSummary(room), isHost, game: room.game });
  });

  socket.on("room:admit", ({ identity, admit } = {}, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    const waiting = room?.waiting.get(identity);
    if (!room || !socket.data.isHost || !waiting) return callback({ error: "Only the host can admit a waiting participant." });
    room.waiting.delete(identity);
    if (admit) {
      room.participants.set(identity, { identity, name: waiting.name, role: "student", handRaised: false });
      waiting.socket.data.isHost = false;
      waiting.socket.emit("room:admitted", { room: roomSummary(room) });
    } else {
      waiting.socket.emit("room:denied", { message: "The host did not admit this request." });
      waiting.socket.disconnect(true);
    }
    io.to(room.code).emit("room:waiting", [...room.waiting.values()].map(({ identity: id, name }) => ({ identity: id, name })));
    io.to(room.code).emit("room:state", roomSummary(room));
    callback({ ok: true });
  });

  socket.on("room:leave", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    room?.participants.delete(socket.data.identity);
    socket.leave(code);
    io.to(code).emit("room:state", room ? roomSummary(room) : undefined);
    socket.data.roomCode = undefined;
  });

  socket.on("room:report", ({ identity, reason } = {}, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.participants.has(socket.data.identity)) return callback({ error: "Join the room before reporting." });
    const target = room.participants.get(identity);
    if (!target || identity === socket.data.identity) return callback({ error: "Choose a participant in this room." });
    const report = { id: randomUUID(), reporter: socket.data.identity, reporterName: room.participants.get(socket.data.identity).name, target: identity, targetName: target.name, reason: cleanText(reason, 160) || "Safety concern", reportedAt: Date.now() };
    room.reports.push(report);
    const host = [...io.sockets.sockets.values()].find((client) => client.data.roomCode === room.code && client.data.isHost);
    host?.emit("room:report", report);
    callback({ ok: true });
  });

  socket.on("chat:send", ({ text } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.participants.has(socket.data.identity)) return;
    if (Date.now() - (socket.data.lastChatAt ?? 0) < 700) {
      socket.emit("chat:error", { message: "Please wait before sending another message." });
      return;
    }
    socket.data.lastChatAt = Date.now();
    io.to(room.code).emit("chat:message", { id: randomUUID(), identity: socket.data.identity, name: room.participants.get(socket.data.identity).name, text: filterProfanity(text), sentAt: Date.now() });
  });

  socket.on("participant:hand", ({ raised } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const participant = room?.participants.get(socket.data.identity);
    if (!participant) return;
    participant.handRaised = Boolean(raised);
    io.to(room.code).emit("room:state", roomSummary(room));
  });

  socket.on("participant:reaction", ({ emoji } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room?.participants.has(socket.data.identity)) return;
    const safeEmoji = ["👏", "👍", "❤️", "😂", "🎉"].includes(emoji) ? emoji : undefined;
    if (safeEmoji) io.to(room.code).emit("participant:reaction", { identity: socket.data.identity, emoji: safeEmoji });
  });

  socket.on("game:start", ({ mode } = {}, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !socket.data.isHost) return callback({ error: "Only the host can start a quiz." });
    if (activeQuestionTimers.has(room.code)) clearTimeout(activeQuestionTimers.get(room.code));
    const question = questions[randomInt(questions.length)];
    room.submittedAnswers = new Set();
    room.game = { mode: ["duel", "ask-friend", "group", "ludo", "carrom", "chess", "team"].includes(mode) ? mode : "group", prompt: question.prompt, options: question.options, subject: question.subject, questionNumber: (room.game?.questionNumber ?? 0) + 1, deadline: Date.now() + 15_000, scores: room.scores };
    io.to(room.code).emit("game:question", { ...room.game, prompt: question.prompt, options: question.options });
    activeQuestionTimers.set(room.code, setTimeout(() => {
      io.to(room.code).emit("game:result", { correctIndex: question.answer, scores: room.scores, timedOut: true });
      room.game = undefined;
      activeQuestionTimers.delete(room.code);
    }, 15_000));
    callback({ ok: true });
  });

  socket.on("game:answer", ({ choice } = {}, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room?.game || !room.participants.has(socket.data.identity) || !Number.isInteger(choice)) return callback({ error: "No active question." });
    if (room.submittedAnswers?.has(socket.data.identity)) return callback({ error: "Your answer has already been submitted." });
    const gameQuestion = questions.find((item) => item.prompt === room.game.prompt);
    if (!gameQuestion || Date.now() > room.game.deadline) return callback({ error: "Answer window has closed." });
    room.submittedAnswers?.add(socket.data.identity);
    const correct = choice === gameQuestion.answer;
    const elapsedMs = Math.max(0, 15_000 - (room.game.deadline - Date.now()));
    const awarded = correct ? Math.max(100, 1000 - Math.floor(elapsedMs / 30)) : 0;
    room.scores[socket.data.identity] = (room.scores[socket.data.identity] ?? 0) + awarded;
    callback({ accepted: true });
    if (correct) {
      if (activeQuestionTimers.has(room.code)) clearTimeout(activeQuestionTimers.get(room.code));
      io.to(room.code).emit("game:result", { correctIndex: gameQuestion.answer, fastestIdentity: socket.data.identity, scores: room.scores, awarded });
      room.game = undefined;
      activeQuestionTimers.delete(room.code);
    }
  });

  socket.on("game:stop", (_payload, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !socket.data.isHost) return callback({ error: "Only the host can stop the game." });
    if (activeQuestionTimers.has(room.code)) clearTimeout(activeQuestionTimers.get(room.code));
    activeQuestionTimers.delete(room.code);
    room.game = undefined;
    io.to(room.code).emit("game:stopped", { scores: room.scores });
    callback({ ok: true });
  });

  socket.on("room:end", (_payload, callback = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !socket.data.isHost) return callback({ error: "Only the host can end the room." });
    if (activeQuestionTimers.has(room.code)) clearTimeout(activeQuestionTimers.get(room.code));
    activeQuestionTimers.delete(room.code);
    io.to(room.code).emit("room:ended", { message: "The host ended this room." });
    if (roomService) roomService.deleteRoom(room.code).catch((error) => console.error("LiveKit room could not be deleted.", error));
    rooms.delete(room.code);
    callback({ ok: true });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (room.waiting.delete(socket.data.identity)) {
      io.to(code).emit("room:waiting", [...room.waiting.values()].map(({ identity, name }) => ({ identity, name })));
      return;
    }
    room.participants.delete(socket.data.identity);
    io.to(code).emit("room:state", roomSummary(room));
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`StudyAI Live Rooms API listening on http://${HOST}:${PORT} (${DEMO_MODE ? "demo mode" : "authenticated mode"})`);
});
