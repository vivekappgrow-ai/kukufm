import { randomUUID } from "node:crypto";
import {
  listCompetitiveAttempts,
  listCompetitiveQuestions,
  listCurrentAffairsArticles,
  listCurrentAffairsBookmarks,
  listCurrentAffairsSources,
  reviewCompetitiveQuestion,
  reviewCurrentAffairsArticle,
  saveCompetitiveAttempt,
  saveCompetitiveQuestion,
  saveCurrentAffairsBookmark,
  saveCurrentAffairsSource,
} from "./data/store.mjs";
import { isTrustedFeedUrl, syncCurrentAffairs } from "./current-affairs.mjs";

function isAdmin(request, response) {
  if (request.user?.role === "admin") return true;
  response.status(403).json({ error: "An admin role is required." });
  return false;
}

function safeFilter(value, maxLength = 80) {
  return typeof value === "string" && value.trim().length <= maxLength ? value.trim() : undefined;
}

export function registerCurrentAffairsRoutes(app) {
  app.get("/api/current-affairs/articles", async (request, response) => {
    const category = safeFilter(request.query.category);
    const language = request.query.language;
    if (request.query.category !== undefined && category === undefined) return response.status(400).json({ error: "The category filter is invalid." });
    if (language !== undefined && !["en", "hi"].includes(language)) return response.status(400).json({ error: "Choose English or Hindi." });
    try {
      const articles = await listCurrentAffairsArticles({ category, language, limit: 50 });
      response.json({ articles });
    } catch (error) {
      console.error("Current affairs articles could not be loaded.", error);
      response.status(503).json({ error: "Current affairs are temporarily unavailable." });
    }
  });

  app.get("/api/current-affairs/bookmarks", async (request, response) => {
    try {
      response.json({ articles: await listCurrentAffairsBookmarks(String(request.user.sub)) });
    } catch (error) {
      console.error("Current affairs bookmarks could not be loaded.", error);
      response.status(503).json({ error: "Bookmarks are temporarily unavailable." });
    }
  });

  app.put("/api/current-affairs/bookmarks", async (request, response) => {
    const { articleId, saved } = request.body ?? {};
    if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId) || typeof saved !== "boolean") {
      return response.status(400).json({ error: "Choose an article and a valid saved state." });
    }
    try {
      const updated = await saveCurrentAffairsBookmark(String(request.user.sub), articleId, saved);
      if (!updated && saved) return response.status(404).json({ error: "Only an approved article can be bookmarked." });
      response.json({ saved });
    } catch (error) {
      console.error("Current affairs bookmark could not be saved.", error);
      response.status(503).json({ error: "The bookmark could not be saved." });
    }
  });

  app.get("/api/competitive/questions", async (request, response) => {
    const exam = safeFilter(request.query.exam);
    const subject = safeFilter(request.query.subject);
    const count = request.query.count === undefined ? 50 : Number(request.query.count);
    if ((request.query.exam !== undefined && exam === undefined) || (request.query.subject !== undefined && subject === undefined)) {
      return response.status(400).json({ error: "The exam or subject filter is invalid." });
    }
    if (![10, 25, 50].includes(count)) return response.status(400).json({ error: "Choose a 10, 25 or 50-question daily quiz." });
    try {
      response.json({ questions: await listCompetitiveQuestions({ exam, subject, limit: count }) });
    } catch (error) {
      console.error("Approved competitive questions could not be loaded.", error);
      response.status(503).json({ error: "The question bank is temporarily unavailable." });
    }
  });

  app.post("/api/competitive/attempts", async (request, response) => {
    const submitted = request.body?.answers;
    if (!Array.isArray(submitted) || submitted.length < 1 || submitted.length > 100) {
      return response.status(400).json({ error: "Submit between 1 and 100 question answers." });
    }
    const ids = submitted.map((answer) => answer?.questionId);
    if (ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) || new Set(ids).size !== ids.length
      || submitted.some((answer) => answer.selectedOption !== null && (!Number.isInteger(answer.selectedOption) || answer.selectedOption < 0 || answer.selectedOption > 5))) {
      return response.status(400).json({ error: "One or more submitted answers are invalid." });
    }
    try {
      const questions = await listCompetitiveQuestions({ includeAnswers: true });
      const byId = new Map(questions.map((question) => [question.id, question]));
      const selectedQuestions = submitted.map(({ questionId }) => byId.get(questionId));
      if (selectedQuestions.some((question) => !question)) {
        return response.status(400).json({ error: "Attempts can include only currently approved questions." });
      }
      const exams = new Set(selectedQuestions.map((question) => question.exam));
      if (exams.size !== 1) return response.status(400).json({ error: "A single exam can be selected per attempt." });
      let correctCount = 0;
      let wrongCount = 0;
      let score = 0;
      const results = submitted.map(({ questionId, selectedOption }, index) => {
        const question = selectedQuestions[index];
        const correct = selectedOption === question.correctAnswer;
        if (correct) {
          correctCount += 1;
          score += 1;
        } else if (selectedOption !== null) {
          wrongCount += 1;
          score -= Number(question.negativeMarks);
        }
        return {
          questionId,
          selectedOption,
          correct,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          negativeMarks: Number(question.negativeMarks),
        };
      });
      const attempt = {
        id: randomUUID(),
        userId: String(request.user.sub),
        exam: selectedQuestions[0].exam,
        questionCount: submitted.length,
        correctCount,
        wrongCount,
        score: Number(score.toFixed(2)),
        answers: results,
      };
      await saveCompetitiveAttempt(attempt);
      response.status(201).json({ attempt: { ...attempt, userId: undefined } });
    } catch (error) {
      console.error("Competitive test attempt could not be scored and saved.", error);
      response.status(503).json({ error: "The test result could not be saved. Please try again." });
    }
  });

  app.get("/api/competitive/attempts", async (request, response) => {
    try {
      response.json({ attempts: await listCompetitiveAttempts(String(request.user.sub)) });
    } catch (error) {
      console.error("Competitive test history could not be loaded.", error);
      response.status(503).json({ error: "Test history is temporarily unavailable." });
    }
  });

  app.get("/api/admin/current-affairs/sources", async (request, response) => {
    if (!isAdmin(request, response)) return;
    try {
      response.json({ sources: await listCurrentAffairsSources() });
    } catch (error) {
      console.error("Current affairs sources could not be loaded.", error);
      response.status(503).json({ error: "Feed sources are temporarily unavailable." });
    }
  });

  app.post("/api/admin/current-affairs/sources", async (request, response) => {
    if (!isAdmin(request, response)) return;
    const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
    const feedUrl = typeof request.body?.feedUrl === "string" ? request.body.feedUrl.trim() : "";
    const language = request.body?.language;
    if (!name || name.length > 100 || !isTrustedFeedUrl(feedUrl) || !["en", "hi"].includes(language)) {
      return response.status(400).json({ error: "Provide a name, English/Hindi language, and an HTTPS RSS feed on an approved source host." });
    }
    try {
      const sources = await listCurrentAffairsSources();
      if (sources.some((source) => source.feedUrl === feedUrl)) return response.status(409).json({ error: "This RSS feed is already configured." });
      const source = await saveCurrentAffairsSource({ id: randomUUID(), name, feedUrl, language, active: true });
      response.status(201).json({ source });
    } catch (error) {
      console.error("Current affairs feed source could not be saved.", error);
      response.status(503).json({ error: "The feed source could not be saved." });
    }
  });

  app.post("/api/admin/current-affairs/sync", async (request, response) => {
    if (!isAdmin(request, response)) return;
    try {
      response.json(await syncCurrentAffairs());
    } catch (error) {
      console.error("Manual current affairs sync could not complete.", error);
      response.status(503).json({ error: "RSS sync is temporarily unavailable." });
    }
  });

  app.get("/api/admin/current-affairs/articles", async (request, response) => {
    if (!isAdmin(request, response)) return;
    try {
      response.json({ articles: await listCurrentAffairsArticles({ status: "pending", limit: 100 }) });
    } catch (error) {
      console.error("Pending current affairs articles could not be loaded.", error);
      response.status(503).json({ error: "Pending articles are temporarily unavailable." });
    }
  });

  app.put("/api/admin/current-affairs/articles/:id", async (request, response) => {
    if (!isAdmin(request, response)) return;
    const status = request.body?.status;
    if (!["approved", "rejected"].includes(status)) return response.status(400).json({ error: "Choose approved or rejected." });
    try {
      const article = await reviewCurrentAffairsArticle(request.params.id, status, String(request.user.sub));
      if (!article) return response.status(404).json({ error: "The article was not found." });
      response.json({ article });
    } catch (error) {
      console.error("Current affairs article review could not be saved.", error);
      response.status(503).json({ error: "The article review could not be saved." });
    }
  });

  app.get("/api/admin/competitive/questions", async (request, response) => {
    if (!isAdmin(request, response)) return;
    try {
      response.json({ questions: await listCompetitiveQuestions({ status: "pending", includeAnswers: true }) });
    } catch (error) {
      console.error("Pending competitive questions could not be loaded.", error);
      response.status(503).json({ error: "Pending questions are temporarily unavailable." });
    }
  });

  app.post("/api/admin/competitive/questions", async (request, response) => {
    if (!isAdmin(request, response)) return;
    const { exam, subject, topic, language, prompt, options, correctAnswer, explanation, negativeMarks = 0 } = request.body ?? {};
    if (![exam, subject, topic, prompt, explanation].every((value) => typeof value === "string" && value.trim().length > 0)
      || exam.length > 80 || subject.length > 80 || topic.length > 100 || prompt.length > 1000 || explanation.length > 2000
      || !["en", "hi"].includes(language) || !Array.isArray(options) || options.length < 2 || options.length > 6
      || options.some((option) => typeof option !== "string" || !option.trim() || option.length > 300)
      || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length
      || typeof negativeMarks !== "number" || !Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 10) {
      return response.status(400).json({ error: "Question content, options, answer, language, and marking values are invalid." });
    }
    try {
      const question = {
        id: randomUUID(), exam: exam.trim(), subject: subject.trim(), topic: topic.trim(), language,
        prompt: prompt.trim(), options: options.map((option) => option.trim()), correctAnswer,
        explanation: explanation.trim(), negativeMarks,
      };
      await saveCompetitiveQuestion(question);
      response.status(201).json({ question: { ...question, correctAnswer: undefined, explanation: undefined, status: "pending" } });
    } catch (error) {
      console.error("Competitive question could not be saved.", error);
      response.status(503).json({ error: "The question could not be saved." });
    }
  });

  app.put("/api/admin/competitive/questions/:id", async (request, response) => {
    if (!isAdmin(request, response)) return;
    const status = request.body?.status;
    if (!["approved", "rejected"].includes(status)) return response.status(400).json({ error: "Choose approved or rejected." });
    try {
      const question = await reviewCompetitiveQuestion(request.params.id, status, String(request.user.sub));
      if (!question) return response.status(404).json({ error: "The question was not found." });
      response.json({ question });
    } catch (error) {
      console.error("Competitive question review could not be saved.", error);
      response.status(503).json({ error: "The question review could not be saved." });
    }
  });
}
