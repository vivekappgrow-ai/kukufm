import { getProgress, saveProgress } from "./data/store.mjs";

const progressIdPattern = /^[a-z0-9-]{1,80}:[0-9]{1,4}$/;
const MAX_POSITION_SECONDS = 24 * 60 * 60;

export function registerProgressRoutes(app) {
  app.get("/api/progress", async (request, response) => {
    try {
      const progress = await getProgress(String(request.user.sub));
      response.json({ progress });
    } catch (error) {
      console.error("Learning progress could not be loaded.", error);
      response.status(503).json({ error: "Learning progress is temporarily unavailable." });
    }
  });

  app.put("/api/progress", async (request, response) => {
    const { lessonId, positionSeconds, completed = false } = request.body ?? {};
    if (typeof lessonId !== "string" || !progressIdPattern.test(lessonId)) {
      return response.status(400).json({ error: "Choose a valid course and chapter." });
    }
    if (!Number.isInteger(positionSeconds) || positionSeconds < 0 || positionSeconds > MAX_POSITION_SECONDS) {
      return response.status(400).json({ error: "Playback position must be a whole number between 0 and 86,400 seconds." });
    }
    if (typeof completed !== "boolean") {
      return response.status(400).json({ error: "Completion status must be true or false." });
    }

    try {
      await saveProgress(String(request.user.sub), lessonId, positionSeconds, completed);
      response.json({ saved: true });
    } catch (error) {
      console.error("Learning progress could not be saved.", error);
      response.status(503).json({ error: "Learning progress could not be saved. Try again later." });
    }
  });
}
