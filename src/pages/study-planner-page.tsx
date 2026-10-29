import { useEffect, useState } from "react";
import { Clock3, Plus, Target, Trash2 } from "lucide-react";

type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  plannedMinutes: number;
  completedAt: string | null;
};
type FocusSession = { id: string; sessionType: "focus" | "break"; plannedMinutes: number; startedAt: string };
type Plan = {
  dailyTargetMinutes: number;
  tasks: StudyTask[];
  stats: { focusMinutes: number; todayFocusMinutes: number; todaySessions: number; weekSessions: number; weeklyMinutes: { date: string; focusMinutes: number }[] };
  activeSession: FocusSession | null;
};
type ApiResponse<T> = T & { error?: string };

async function requestApi<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

function studyDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function elapsedLabel(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function timerRemaining(session: FocusSession, now: number) {
  const end = Date.parse(session.startedAt) + session.plannedMinutes * 60_000;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export function StudyPlannerPage({ onCreateTutorSession }: { onCreateTutorSession: () => Promise<string> }) {
  const [token, setToken] = useState("");
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goalInput, setGoalInput] = useState("30");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(studyDateKey());
  const [plannedMinutes, setPlannedMinutes] = useState("30");
  const [now, setNow] = useState(Date.now());

  async function loadPlan(sessionToken: string) {
    const result = await requestApi<{ plan: Plan }>("/api/study/plan", sessionToken);
    setPlan(result.plan);
    setGoalInput(String(result.plan.dailyTargetMinutes));
  }

  useEffect(() => {
    let active = true;
    onCreateTutorSession()
      .then(async (sessionToken) => {
        if (!active) return;
        setToken(sessionToken);
        await loadPlan(sessionToken);
        if (active) setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Sign-in is required to load your study plan.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!plan?.activeSession) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [plan?.activeSession?.id]);

  const activeSession = plan?.activeSession ?? null;
  const remaining = activeSession ? timerRemaining(activeSession, now) : 0;
  const completeTaskCount = plan?.tasks.filter((task) => Boolean(task.completedAt)).length ?? 0;
  const todaysTasks = plan?.tasks.filter((task) => task.dueDate === studyDateKey()) ?? [];
  const todayFocusMinutes = plan?.stats.todayFocusMinutes ?? 0;
  const targetProgress = plan ? Math.min(100, Math.round((todayFocusMinutes / plan.dailyTargetMinutes) * 100)) : 0;

  async function refreshPlan() {
    if (!token) return;
    try {
      await loadPlan(token);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your plan could not be refreshed.");
    }
  }

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const dailyTargetMinutes = Number(goalInput);
      await requestApi("/api/study/goal", token, { method: "PUT", body: JSON.stringify({ dailyTargetMinutes }) });
      await refreshPlan();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Daily target could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await requestApi("/api/study/tasks", token, {
        method: "POST",
        body: JSON.stringify({ title, subject, dueDate, plannedMinutes: Number(plannedMinutes) }),
      });
      setTitle("");
      setSubject("");
      await refreshPlan();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The study task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function setTaskCompleted(task: StudyTask, completed: boolean) {
    try {
      await requestApi(`/api/study/tasks/${encodeURIComponent(task.id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
      await refreshPlan();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The study task could not be updated.");
    }
  }

  async function deleteTask(task: StudyTask) {
    try {
      await requestApi(`/api/study/tasks/${encodeURIComponent(task.id)}`, token, { method: "DELETE" });
      await refreshPlan();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The study task could not be deleted.");
    }
  }

  async function startTimer(sessionType: "focus" | "break", minutes: number) {
    setError("");
    try {
      await requestApi("/api/study/sessions/start", token, {
        method: "POST",
        body: JSON.stringify({ sessionType, plannedMinutes: minutes }),
      });
      await refreshPlan();
      setNow(Date.now());
    } catch (timerError) {
      setError(timerError instanceof Error ? timerError.message : "The timer could not start.");
    }
  }

  async function finishTimer(cancelled: boolean) {
    if (!activeSession) return;
    setSaving(true);
    try {
      const result = await requestApi<{ session: { counted: boolean } }>(`/api/study/sessions/${encodeURIComponent(activeSession.id)}/finish`, token, {
        method: "POST",
        body: JSON.stringify({ cancelled }),
      });
      await refreshPlan();
      if (!cancelled && !result.session.counted) setError("Less than one minute was recorded, so this timer did not count toward your study total.");
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "The timer result could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (activeSession && remaining === 0) void finishTimer(false);
  }, [activeSession?.id, remaining]);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) + index);
    const date = studyDateKey(monday);
    const minutes = plan?.stats.weeklyMinutes.find((entry) => entry.date === date)?.focusMinutes ?? 0;
    return { date, label: monday.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }), minutes };
  });
  const maxWeekMinutes = Math.max(1, ...weekDays.map((day) => day.minutes));

  return <div className="catalog-page study-planner-page">
    <header className="catalog-page-head"><div><span className="catalog-eyebrow"><Target size={15} /> PERSONAL STUDY PLAN</span><h1>Study planner</h1><p>Set a daily focus goal, plan upcoming topics and record completed focus time across devices when PostgreSQL is configured.</p></div></header>
    {error && <p className="study-planner-message" role="alert">{error}</p>}
    {loading && <p className="study-planner-message" role="status">Loading your saved study plan…</p>}
    {!loading && plan && <>
      <section className="study-planner-metrics">
        <article><span>Today’s focus</span><strong>{todayFocusMinutes} <small>/ {plan.dailyTargetMinutes} min</small></strong><div className="study-goal-progress" role="progressbar" aria-valuenow={targetProgress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${targetProgress}%` }} /></div></article>
        <article><span>Focus sessions this week</span><strong>{plan.stats.weekSessions}</strong><small>{plan.stats.focusMinutes} focused minutes</small></article>
        <article><span>Today’s planned topics</span><strong>{completeTaskCount}/{plan.tasks.length}</strong><small>{todaysTasks.length} due today</small></article>
      </section>

      <section className="study-planner-section">
        <div className="catalog-shelf-head"><h2><Clock3 size={18} /> Focus timer</h2><span>Time is measured by the server; paused timers are not supported.</span></div>
        {activeSession ? <div className="study-timer-active">
          <strong aria-live="polite">{elapsedLabel(remaining)}</strong><span>{activeSession.sessionType === "focus" ? "Focus session" : "Break"} · {activeSession.plannedMinutes} minutes</span>
          <button className="catalog-secondary" disabled={saving} onClick={() => void finishTimer(true)}>Cancel timer</button>
        </div> : <div className="study-timer-options">
          <div><strong>Focus</strong><button className="catalog-primary" disabled={saving} onClick={() => void startTimer("focus", 25)}>Start 25 min</button><button className="catalog-secondary" disabled={saving} onClick={() => void startTimer("focus", 50)}>Start 50 min</button></div>
          <div><strong>Break</strong><button className="catalog-secondary" disabled={saving} onClick={() => void startTimer("break", 5)}>5 min break</button><button className="catalog-secondary" disabled={saving} onClick={() => void startTimer("break", 10)}>10 min break</button></div>
        </div>}
      </section>

      <section className="study-planner-section">
        <div className="catalog-shelf-head"><h2>Daily target</h2><span>5–600 minutes</span></div>
        <form className="study-goal-form" onSubmit={(event) => void saveGoal(event)}>
          <label>Target minutes per day <input type="number" min="5" max="600" step="1" required value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /></label>
          <button className="catalog-primary" disabled={saving} type="submit">Save target</button>
        </form>
      </section>

      <section className="study-planner-section">
        <div className="catalog-shelf-head"><h2>Plan a topic</h2><span>Your tasks are private to your account</span></div>
        <form className="study-task-form" onSubmit={(event) => void addTask(event)}>
          <label>Topic or task <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Revise Fundamental Rights" /></label>
          <label>Subject <input maxLength={80} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional" /></label>
          <label>Due date <input type="date" min={studyDateKey()} max={studyDateKey(new Date(Date.now() + 366 * 24 * 60 * 60 * 1000))} required value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label>Planned minutes <input type="number" min="5" max="600" step="5" required value={plannedMinutes} onChange={(event) => setPlannedMinutes(event.target.value)} /></label>
          <button className="catalog-primary" type="submit" disabled={saving}><Plus size={15} /> Add to timetable</button>
        </form>
        <div className="study-task-list">
          {plan.tasks.length ? plan.tasks.map((task) => <article key={task.id} className={task.completedAt ? "task-completed" : ""}>
            <label><input type="checkbox" checked={Boolean(task.completedAt)} onChange={(event) => void setTaskCompleted(task, event.target.checked)} /><span><strong>{task.title}</strong><small>{task.subject || "General study"} · {task.dueDate} · {task.plannedMinutes} min</small></span></label>
            <button className="study-task-delete" aria-label={`Delete ${task.title}`} onClick={() => void deleteTask(task)}><Trash2 size={16} /></button>
          </article>) : <p className="study-planner-message">No upcoming study tasks yet. Add a topic above to start your timetable.</p>}
        </div>
      </section>

      <section className="study-planner-section">
        <div className="catalog-shelf-head"><h2>This week</h2><span>Completed focus sessions only</span></div>
        <div className="study-week-chart" aria-label="Weekly focus minutes">
          {weekDays.map((day) => <div key={day.date} aria-label={`${day.label}: ${day.minutes} focused minutes`}><span>{day.minutes}</span><i><b style={{ height: `${Math.max(day.minutes ? 8 : 0, Math.round((day.minutes / maxWeekMinutes) * 100))}%` }} /></i><small>{day.label}</small></div>)}
        </div>
      </section>
    </>}
    {!loading && !plan && !error && <p className="study-planner-message">Your study plan is not available yet.</p>}
  </div>;
}
