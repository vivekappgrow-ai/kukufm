import { randomUUID } from "node:crypto";
import {
  createStudyPlanTask,
  deleteStudyPlanTask,
  finishStudyFocusSession,
  getStudyPlan,
  saveStudyGoal,
  startStudyFocusSession,
  updateStudyPlanTask,
} from "./data/store.mjs";

const taskIdPattern = /^[0-9a-f-]{36}$/i;

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function ownerId(request) {
  return String(request.user.sub);
}

export function registerStudyPlanRoutes(app) {
  app.get("/api/study/plan", async (request, response) => {
    try {
      response.json({ plan: await getStudyPlan(ownerId(request)) });
    } catch (error) {
      console.error("Study plan could not be loaded.", error);
      response.status(503).json({ error: "Your study plan is temporarily unavailable." });
    }
  });

  app.put("/api/study/goal", async (request, response) => {
    const minutes = request.body?.dailyTargetMinutes;
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) {
      return response.status(400).json({ error: "Daily study target must be a whole number between 5 and 600 minutes." });
    }
    try {
      await saveStudyGoal(ownerId(request), minutes);
      response.json({ saved: true, dailyTargetMinutes: minutes });
    } catch (error) {
      console.error("Daily study target could not be saved.", error);
      response.status(503).json({ error: "Your study target could not be saved." });
    }
  });

  app.post("/api/study/tasks", async (request, response) => {
    const { title, subject = "", dueDate, plannedMinutes = 30 } = request.body ?? {};
    if (typeof title !== "string" || !title.trim() || title.trim().length > 160
      || typeof subject !== "string" || subject.trim().length > 80
      || !validDate(dueDate) || dueDate < new Date().toISOString().slice(0, 10)
      || dueDate > new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      || !Number.isInteger(plannedMinutes) || plannedMinutes < 5 || plannedMinutes > 600) {
      return response.status(400).json({ error: "Enter a task, optional subject, valid date within the next year, and duration between 5 and 600 minutes." });
    }
    try {
      const task = await createStudyPlanTask({
        id: randomUUID(),
        userId: ownerId(request),
        title: title.trim(),
        subject: subject.trim(),
        dueDate,
        plannedMinutes,
      });
      response.status(201).json({ task });
    } catch (error) {
      console.error("Study task could not be saved.", error);
      response.status(503).json({ error: "The study task could not be saved." });
    }
  });

  app.patch("/api/study/tasks/:id", async (request, response) => {
    if (!taskIdPattern.test(request.params.id) || typeof request.body?.completed !== "boolean") {
      return response.status(400).json({ error: "Choose a valid task and completion state." });
    }
    try {
      const task = await updateStudyPlanTask(ownerId(request), request.params.id, request.body.completed);
      if (!task) return response.status(404).json({ error: "The task was not found." });
      response.json({ task });
    } catch (error) {
      console.error("Study task could not be updated.", error);
      response.status(503).json({ error: "The study task could not be updated." });
    }
  });

  app.delete("/api/study/tasks/:id", async (request, response) => {
    if (!taskIdPattern.test(request.params.id)) return response.status(400).json({ error: "Choose a valid task." });
    try {
      if (!await deleteStudyPlanTask(ownerId(request), request.params.id)) {
        return response.status(404).json({ error: "The task was not found." });
      }
      response.json({ deleted: true });
    } catch (error) {
      console.error("Study task could not be deleted.", error);
      response.status(503).json({ error: "The study task could not be deleted." });
    }
  });

  app.post("/api/study/sessions/start", async (request, response) => {
    const { sessionType, plannedMinutes } = request.body ?? {};
    const maxMinutes = sessionType === "focus" ? 120 : sessionType === "break" ? 30 : 0;
    if (!maxMinutes || !Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > maxMinutes) {
      return response.status(400).json({ error: "Choose a focus session up to 120 minutes or a break up to 30 minutes." });
    }
    try {
      const session = await startStudyFocusSession({
        id: randomUUID(),
        userId: ownerId(request),
        sessionType,
        plannedMinutes,
      });
      if (!session) return response.status(409).json({ error: "You already have an active timer. Finish or cancel it first." });
      response.status(201).json({ session });
    } catch (error) {
      if (error?.code === "23505") return response.status(409).json({ error: "You already have an active timer. Finish or cancel it first." });
      console.error("Study timer could not be started.", error);
      response.status(503).json({ error: "The study timer could not be started." });
    }
  });

  app.post("/api/study/sessions/:id/finish", async (request, response) => {
    if (!taskIdPattern.test(request.params.id) || (request.body?.cancelled !== undefined && typeof request.body.cancelled !== "boolean")) {
      return response.status(400).json({ error: "Choose a valid timer and completion state." });
    }
    try {
      const session = await finishStudyFocusSession(ownerId(request), request.params.id, request.body?.cancelled === true);
      if (!session) return response.status(404).json({ error: "This active timer was not found." });
      if (session.tooEarly) return response.status(409).json({ error: "The planned timer has not finished yet. Cancel it if you want to stop early." });
      response.json({
        session: {
          ...session,
          counted: session.status === "completed" && session.sessionType === "focus" && session.elapsedSeconds >= 60,
        },
      });
    } catch (error) {
      console.error("Study timer could not be finished.", error);
      response.status(503).json({ error: "The timer result could not be saved." });
    }
  });
}
