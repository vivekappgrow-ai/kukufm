import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, Newspaper, RefreshCw, ShieldCheck } from "lucide-react";

type Article = {
  id: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  category: string;
  language: "en" | "hi";
  publishedAt: string;
};
type Question = {
  id: string;
  exam: string;
  subject: string;
  topic: string;
  language: "en" | "hi";
  prompt: string;
  options: string[];
  negativeMarks: number;
  correctAnswer?: number;
  explanation?: string;
};
type AttemptResult = {
  id: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  questionCount: number;
  answers: { questionId: string; selectedOption: number | null; correct: boolean; correctAnswer: number; explanation: string; negativeMarks: number }[];
};
type Source = { id: string; name: string; feedUrl: string; language: "en" | "hi"; active: boolean; lastFetchedAt?: string; lastError?: string | null };
type ApiResponse<T> = T & { error?: string };

const categories = ["All", "Exam Alerts", "Politics", "Economy", "Science & Technology", "Sports", "Awards & Appointments", "Government Schemes", "Environment", "International", "General"];

async function requestApi<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Publication date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function CurrentAffairsPage({ onCreateTutorSession }: { onCreateTutorSession: () => Promise<string> }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [category, setCategory] = useState("All");
  const [language, setLanguage] = useState("all");
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [quizLength, setQuizLength] = useState("10");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [attempt, setAttempt] = useState<AttemptResult>();
  const [attempts, setAttempts] = useState<{ id: string; exam: string; score: number; correctCount: number; questionCount: number; createdAt: string }[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<"en" | "hi">("en");
  const [questionForm, setQuestionForm] = useState({ exam: "", subject: "", topic: "", prompt: "", options: "", correctAnswer: "0", explanation: "", negativeMarks: "0", language: "en" as "en" | "hi" });

  useEffect(() => {
    let active = true;
    onCreateTutorSession().then((sessionToken) => {
      if (active) setToken(sessionToken);
    }).catch((sessionError: unknown) => {
      if (active) {
        setError(sessionError instanceof Error ? sessionError.message : "Sign-in is required to load current affairs.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    const query = new URLSearchParams();
    if (category !== "All") query.set("category", category);
    if (language !== "all") query.set("language", language);
    requestApi<{ articles: Article[] }>(`/api/current-affairs/articles?${query}`, token)
      .then(({ articles: loadedArticles }) => { if (active) { setArticles(loadedArticles); setError(""); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Current affairs could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, category, language]);

  useEffect(() => {
    if (!token) return;
    requestApi<{ articles: Article[] }>("/api/current-affairs/bookmarks", token)
      .then(({ articles: savedArticles }) => setBookmarks(savedArticles))
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Bookmarks could not be loaded."));
    requestApi<{ attempts: typeof attempts }>("/api/competitive/attempts", token)
      .then(({ attempts: savedAttempts }) => setAttempts(savedAttempts))
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Test history could not be loaded."));
  }, [token]);

  async function toggleBookmark(article: Article) {
    const saved = !bookmarks.some((item) => item.id === article.id);
    try {
      await requestApi<{ saved: boolean }>("/api/current-affairs/bookmarks", token, {
        method: "PUT",
        body: JSON.stringify({ articleId: article.id, saved }),
      });
      setBookmarks((current) => saved ? [article, ...current] : current.filter((item) => item.id !== article.id));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Bookmark could not be saved.");
    }
  }

  async function loadQuestions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempt(undefined);
    setSelectedAnswers({});
    setError("");
    try {
      const query = new URLSearchParams({ exam: exam.trim(), count: quizLength });
      if (subject.trim()) query.set("subject", subject.trim());
      const result = await requestApi<{ questions: Question[] }>(`/api/competitive/questions?${query}`, token);
      setQuestions(result.questions);
      if (!result.questions.length) setNotice("No approved questions match these filters yet. Unreviewed questions are never shown as practice content.");
      else setNotice(`${result.questions.length} approved question${result.questions.length === 1 ? "" : "s"} loaded.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The question bank could not be loaded.");
    }
  }

  async function submitAttempt() {
    try {
      const result = await requestApi<{ attempt: AttemptResult }>("/api/competitive/attempts", token, {
        method: "POST",
        body: JSON.stringify({
          answers: questions.map((question) => ({ questionId: question.id, selectedOption: selectedAnswers[question.id] ?? null })),
        }),
      });
      setAttempt(result.attempt);
      const history = await requestApi<{ attempts: typeof attempts }>("/api/competitive/attempts", token);
      setAttempts(history.attempts);
      setError("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your test result could not be saved.");
    }
  }

  async function loadAdminWorkspace() {
    setAdminError("");
    try {
      const [sourceResult, articleResult, questionResult] = await Promise.all([
        requestApi<{ sources: Source[] }>("/api/admin/current-affairs/sources", token),
        requestApi<{ articles: Article[] }>("/api/admin/current-affairs/articles", token),
        requestApi<{ questions: Question[] }>("/api/admin/competitive/questions", token),
      ]);
      setSources(sourceResult.sources);
      setPendingArticles(articleResult.articles);
      setPendingQuestions(questionResult.questions);
    } catch (adminLoadError) {
      setAdminError(adminLoadError instanceof Error ? adminLoadError.message : "Admin workspace could not be loaded.");
    }
  }

  async function addSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminError("");
    try {
      await requestApi<{ source: Source }>("/api/admin/current-affairs/sources", token, {
        method: "POST",
        body: JSON.stringify({ name: sourceName, feedUrl, language: sourceLanguage }),
      });
      setSourceName("");
      setFeedUrl("");
      await loadAdminWorkspace();
    } catch (saveError) {
      setAdminError(saveError instanceof Error ? saveError.message : "Feed source could not be saved.");
    }
  }

  async function syncFeeds() {
    setAdminError("");
    try {
      const result = await requestApi<{ sources: number; fetched: number; inserted: number; skipped: number; errors: { message: string }[] }>("/api/admin/current-affairs/sync", token, { method: "POST" });
      setNotice(`Sync complete: ${result.inserted} new item(s), ${result.skipped} duplicate/invalid item(s), ${result.errors.length} feed error(s). All new articles remain pending review.`);
      await loadAdminWorkspace();
    } catch (syncError) {
      setAdminError(syncError instanceof Error ? syncError.message : "RSS sync could not complete.");
    }
  }

  async function reviewItem(kind: "current-affairs/articles" | "competitive/questions", id: string, status: "approved" | "rejected") {
    setAdminError("");
    try {
      await requestApi(`/api/admin/${kind}/${encodeURIComponent(id)}`, token, { method: "PUT", body: JSON.stringify({ status }) });
      await loadAdminWorkspace();
    } catch (reviewError) {
      setAdminError(reviewError instanceof Error ? reviewError.message : "The review decision could not be saved.");
    }
  }

  async function addQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options = questionForm.options.split("\n").map((option) => option.trim()).filter(Boolean);
    setAdminError("");
    try {
      await requestApi("/api/admin/competitive/questions", token, {
        method: "POST",
        body: JSON.stringify({
          ...questionForm,
          options,
          correctAnswer: Number(questionForm.correctAnswer),
          negativeMarks: Number(questionForm.negativeMarks),
        }),
      });
      setQuestionForm((current) => ({ ...current, prompt: "", options: "", explanation: "" }));
      await loadAdminWorkspace();
      setNotice("Question saved as pending. It will not appear in tests until reviewed and approved.");
    } catch (saveError) {
      setAdminError(saveError instanceof Error ? saveError.message : "Question could not be saved.");
    }
  }

  const visibleArticles = showBookmarks ? bookmarks : articles;

  return <div className="catalog-page current-affairs-page">
    <header className="catalog-page-head">
      <div><span className="catalog-eyebrow"><Newspaper size={15} /> VERIFIED SOURCES · EXAM PRACTICE</span>
        <h1>Current Affairs &amp; Practice</h1>
        <p>Articles retain their original source, publication date and link. New feed items and questions require human review before learners can see or use them.</p>
      </div>
      <button className="catalog-secondary" onClick={() => { setShowBookmarks((value) => !value); }}><Bookmark size={15} />{showBookmarks ? "All articles" : "Saved articles"} ({bookmarks.length})</button>
    </header>

    {error && <p className="current-affairs-message error" role="alert">{error}</p>}
    {notice && <p className="current-affairs-message" role="status">{notice}</p>}

    <section className="current-affairs-section">
      <div className="catalog-shelf-head"><h2>Source-reviewed updates</h2><span>English and Hindi feeds</span></div>
      <div className="current-affairs-filters">
        <label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Language <select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="all">All</option><option value="en">English</option><option value="hi">Hindi</option></select></label>
        <span><ShieldCheck size={15} />Only admin-approved articles are published</span>
      </div>
      {loading ? <p className="current-affairs-empty">Loading verified articles…</p> : visibleArticles.length ? <div className="current-affairs-list">
        {visibleArticles.map((article) => <article className="current-affairs-card" key={article.id}>
          <div className="current-affairs-card-meta"><span>{article.category}</span><span>{article.language === "hi" ? "Hindi" : "English"}</span><time dateTime={article.publishedAt}>{dateLabel(article.publishedAt)}</time></div>
          <h3>{article.title}</h3>
          {article.summary && <p>{article.summary}</p>}
          <div className="current-affairs-card-footer"><span>Source: {article.sourceName}</span>
            <div><button className="current-affairs-icon-button" aria-label="Save article" onClick={() => void toggleBookmark(article)}><Bookmark size={16} fill={bookmarks.some((item) => item.id === article.id) ? "currentColor" : "none"} /></button>
              <a href={article.url} target="_blank" rel="noopener noreferrer">Original source <ExternalLink size={14} /></a></div>
          </div>
        </article>)}
      </div> : <p className="current-affairs-empty">{showBookmarks ? "No saved articles yet." : "No approved articles are available yet. An administrator must configure an approved RSS source and review its items."}</p>}
    </section>

    <section className="current-affairs-section">
      <div className="catalog-shelf-head"><h2>Competitive practice</h2><span>Human-reviewed questions · negative marking applied</span></div>
      <form className="current-affairs-filters" onSubmit={(event) => void loadQuestions(event)}>
        <label>Exam <input required maxLength={80} value={exam} onChange={(event) => setExam(event.target.value)} placeholder="Enter an exam configured by your admin" /></label>
        <label>Subject <input maxLength={80} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional subject filter" /></label>
        <label>Quiz length <select value={quizLength} onChange={(event) => setQuizLength(event.target.value)}><option value="10">10 questions</option><option value="25">25 questions</option><option value="50">50 questions</option></select></label>
        <button className="catalog-primary" type="submit" disabled={!token}>Load approved questions</button>
      </form>
      {questions.length > 0 && !attempt && <div className="current-affairs-quiz">
        {questions.map((question, index) => <fieldset key={question.id} className="current-affairs-question">
          <legend>{index + 1}. {question.prompt}</legend>
          <p>{question.exam} · {question.subject} · {question.topic} · {question.language === "hi" ? "Hindi" : "English"} · −{question.negativeMarks} for a wrong answer</p>
          {question.options.map((option, optionIndex) => <label key={`${question.id}-${optionIndex}`}>
            <input type="radio" name={question.id} checked={selectedAnswers[question.id] === optionIndex} onChange={() => setSelectedAnswers((answers) => ({ ...answers, [question.id]: optionIndex }))} />
            {option}
          </label>)}
        </fieldset>)}
        <button className="catalog-primary" onClick={() => void submitAttempt()}>Submit &amp; see reviewed explanations</button>
      </div>}
      {attempt && <div className="current-affairs-quiz-result" role="status">
        <h3>Result: {attempt.score} points</h3><p>{attempt.correctCount} correct · {attempt.wrongCount} incorrect · {attempt.questionCount} questions. Skipped answers carry no penalty.</p>
        {attempt.answers.map((answer) => {
          const question = questions.find((item) => item.id === answer.questionId);
          return <article key={answer.questionId}><strong>{question?.prompt}</strong><p>{answer.correct ? "Correct" : answer.selectedOption === null ? "Skipped" : `Incorrect · correct option ${answer.correctAnswer + 1}`}: {answer.explanation}</p></article>;
        })}
      </div>}
      {attempts.length > 0 && <details className="current-affairs-history"><summary>Your saved test history ({attempts.length})</summary>
        {attempts.map((item) => <p key={item.id}>{item.exam} · {item.score} points · {item.correctCount}/{item.questionCount} correct · {dateLabel(item.createdAt)}</p>)}
      </details>}
    </section>

    <section className="current-affairs-section current-affairs-admin">
      <button className="catalog-secondary" onClick={() => { setAdminOpen((value) => !value); if (!adminOpen) void loadAdminWorkspace(); }}>
        <ShieldCheck size={16} />{adminOpen ? "Hide content review tools" : "Admin: manage sources & review content"}
      </button>
      {adminOpen && <div className="current-affairs-admin-panel">
        {adminError && <p className="current-affairs-message error" role="alert">{adminError}</p>}
        <div className="catalog-shelf-head"><h2>RSS sources</h2><button className="catalog-secondary" onClick={() => void syncFeeds()}><RefreshCw size={15} /> Fetch feeds now</button></div>
        <p>HTTPS feed URLs are restricted to configured public-service and publisher hosts. RSS titles, descriptions, source links and publication dates are preserved; fetched items stay pending until reviewed.</p>
        <form className="current-affairs-admin-form" onSubmit={(event) => void addSource(event)}>
          <label>Source name <input required maxLength={100} value={sourceName} onChange={(event) => setSourceName(event.target.value)} /></label>
          <label>RSS / Atom feed URL <input required type="url" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://pib.gov.in/..." /></label>
          <label>Feed language <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value as "en" | "hi")}><option value="en">English</option><option value="hi">Hindi</option></select></label>
          <button className="catalog-primary" type="submit">Add trusted feed</button>
        </form>
        {sources.map((source) => <p className="current-affairs-admin-row" key={source.id}><strong>{source.name}</strong> · {source.language === "hi" ? "Hindi" : "English"} · {source.active ? "Active" : "Inactive"} · {source.lastError || (source.lastFetchedAt ? `Last fetch ${dateLabel(source.lastFetchedAt)}` : "Not fetched yet")}</p>)}

        <div className="catalog-shelf-head"><h2>Pending article review ({pendingArticles.length})</h2></div>
        {pendingArticles.map((article) => <article className="current-affairs-review" key={article.id}><strong>{article.title}</strong><p>{article.sourceName} · {dateLabel(article.publishedAt)}</p><a href={article.url} target="_blank" rel="noopener noreferrer">Check original source <ExternalLink size={14} /></a><div><button className="catalog-primary" onClick={() => void reviewItem("current-affairs/articles", article.id, "approved")}>Approve</button><button className="catalog-secondary" onClick={() => void reviewItem("current-affairs/articles", article.id, "rejected")}>Reject</button></div></article>)}
        {!pendingArticles.length && <p>No articles awaiting review.</p>}

        <div className="catalog-shelf-head"><h2>Add a question for review</h2></div>
        <form className="current-affairs-admin-form" onSubmit={(event) => void addQuestion(event)}>
          <label>Exam <input required maxLength={80} value={questionForm.exam} onChange={(event) => setQuestionForm({ ...questionForm, exam: event.target.value })} /></label>
          <label>Subject <input required maxLength={80} value={questionForm.subject} onChange={(event) => setQuestionForm({ ...questionForm, subject: event.target.value })} /></label>
          <label>Topic <input required maxLength={100} value={questionForm.topic} onChange={(event) => setQuestionForm({ ...questionForm, topic: event.target.value })} /></label>
          <label>Language <select value={questionForm.language} onChange={(event) => setQuestionForm({ ...questionForm, language: event.target.value as "en" | "hi" })}><option value="en">English</option><option value="hi">Hindi</option></select></label>
          <label className="current-affairs-wide-field">Question <textarea required maxLength={1000} value={questionForm.prompt} onChange={(event) => setQuestionForm({ ...questionForm, prompt: event.target.value })} /></label>
          <label className="current-affairs-wide-field">Answer options (one per line) <textarea required value={questionForm.options} onChange={(event) => setQuestionForm({ ...questionForm, options: event.target.value })} /></label>
          <label>Correct option number (starting at 1) <input type="number" min="1" max="6" value={Number(questionForm.correctAnswer) + 1} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: String(Number(event.target.value) - 1) })} /></label>
          <label>Penalty for a wrong answer <input type="number" min="0" max="10" step="0.25" value={questionForm.negativeMarks} onChange={(event) => setQuestionForm({ ...questionForm, negativeMarks: event.target.value })} /></label>
          <label className="current-affairs-wide-field">Explanation <textarea required maxLength={2000} value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} /></label>
          <button className="catalog-primary" type="submit">Save as pending review</button>
        </form>
        <div className="catalog-shelf-head"><h2>Pending question review ({pendingQuestions.length})</h2></div>
        {pendingQuestions.map((question) => <article className="current-affairs-review" key={question.id}><strong>{question.exam} · {question.subject} · {question.topic}</strong><p>{question.prompt}</p><p>Answer {Number(question.correctAnswer ?? 0) + 1}: {question.explanation}</p><div><button className="catalog-primary" onClick={() => void reviewItem("competitive/questions", question.id, "approved")}>Approve</button><button className="catalog-secondary" onClick={() => void reviewItem("competitive/questions", question.id, "rejected")}>Reject</button></div></article>)}
        {!pendingQuestions.length && <p>No questions awaiting review.</p>}
      </div>}
    </section>
  </div>;
}
