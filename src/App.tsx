import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import demoCatalog from "./data/demo-seed.json";
import liveRoomPresets from "./data/live-room-presets.json";
import { studyLessonCourses } from "./data/lessons";
import { studyVoices } from "./data/voices";
import type { Participant, Room as LiveKitRoom, Track as LiveKitTrack } from "livekit-client";
import type { Socket } from "socket.io-client";
import {
  Activity, ArrowLeft, ArrowRight, AudioLines, Bookmark, BookOpen, Check,
  BarChart3, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Command,
  Compass, Flame, Gamepad2, Hand, Headphones, Heart, Home, Languages, LockKeyhole, LogOut, Menu,
  Mic, MicOff, MoreHorizontal, Pause, Play, Plus, Search, Send, ShieldAlert, ScreenShare, Video, VideoOff,
  MessageCircle, Moon, PhoneOff, ShieldCheck, SkipBack, SkipForward, Sparkles, Star, Sun, Target, Timer, Upload, Users, Volume2, X,
} from "lucide-react";

type Chapter = { title: string; duration: string; body: string; audioSrc?: string; videoUrl?: string; captionsUrl?: string | null; coverImage?: string; diagramImage?: string; transcript?: string; keyPoints?: string[]; quiz?: { question: string; choices: [string, string, string]; answer: number; explanation: string }[]; difficulty?: string; status?: string; lessonId?: string; lessons?: string[]; slides?: { time: number; title: string; text: string }[] };
type Course = {
  id: string;
  title: string;
  instructor: string;
  subject: string;
  level: string;
  duration: string;
  lessons: number;
  rating: string;
  accent: string;
  icon: string;
  description: string;
  progress: number;
  coverImage?: string;
  publishedAt?: string;
  chapters: Chapter[];
  language?: "English" | "Hindi" | "Both";
};
type View = "home" | "explore" | "classic-home" | "classic-explore" | "new-hot" | "search" | "library" | "series" | "lesson" | "player" | "ai-tutor" | "my-learning" | "tutor" | "profile" | "profile-preferences" | "progress" | "parent" | "settings" | "games" | "dashboard" | "admin" | "admin-preview" | "live-rooms";
type ChatMessage = { role: "student" | "tutor"; text: string };
type ThemeName = "dark" | "light" | "amoled" | "sunrise" | "forest" | "ocean" | "kids";
type BoardName = "UP Board" | "NCERT" | "CBSE";
type StudyLanguage = "Hindi" | "Hinglish" | "English";
type SetupStage = "profile" | "class" | "board" | "language" | "voice" | null;

const initialCourses: Course[] = [
  {
    id: "physics",
    title: "Physics, made simple",
    instructor: "Ananya Mehta",
    subject: "Science",
    level: "Class 11",
    duration: "4h 20m",
    lessons: 12,
    rating: "4.9",
    accent: "lavender",
    icon: "◉",
    description: "Build a strong foundation in motion, forces and the ideas behind them—with clear, everyday examples.",
    progress: 0,
    chapters: [
      { title: "The language of motion", duration: "00:30", audioSrc: "/audio/physics-01.wav", body: "Welcome to the language of motion. Physics describes how objects move by tracking their position over time. Imagine watching a train pass a platform. A person on the platform sees the train move, while a passenger sees the platform move backwards. Motion depends on the observer's frame of reference. In this lesson, we will distinguish distance from displacement, speed from velocity, and explore what each tells us about a journey." },
      { title: "Distance & displacement", duration: "11:05", body: "Let's distinguish distance from displacement. If you walk one full lap around a track and return to your starting point, you've covered a distance equal to the track's length. But your displacement is zero, because your final position is the same as your starting position. Distance is a scalar: it has magnitude only. Displacement is a vector: it has both magnitude and direction. This simple distinction is essential for describing motion accurately." },
      { title: "Speed and velocity", duration: "09:42", body: "Speed tells us how much distance is covered per unit of time. Velocity tells us how much displacement occurs per unit of time, including direction. A car moving at sixty kilometres per hour has speed, but saying it moves at sixty kilometres per hour north gives us velocity. Average speed divides total distance by total time. Average velocity divides total displacement by total time. Keep direction in mind whenever you work with vectors." },
    ],
  },
  {
    id: "maths",
    title: "Calculus without the stress",
    instructor: "Rohan Iyer",
    subject: "Mathematics",
    level: "Class 12",
    duration: "6h 10m",
    lessons: 18,
    rating: "4.8",
    accent: "peach",
    icon: "∫",
    description: "Understand limits, derivatives and integrals through intuitive explanations and worked examples.",
    progress: 0,
    chapters: [
      { title: "A gentle start with limits", duration: "10:12", body: "A limit asks what value a function approaches as its input gets closer to a particular point. Think about walking toward a doorway: you can get closer and closer without needing to step through it. In the same way, a function may approach a value near a point even if the function is not defined exactly at that point. This idea is the foundation of calculus." },
      { title: "What a derivative means", duration: "12:30", body: "A derivative measures how quickly something changes at a particular instant. If position changes over time, its derivative is velocity. On a graph, the derivative at a point is the slope of the tangent line. We begin with average change over an interval, then shrink that interval toward zero to discover the instantaneous rate of change." },
    ],
  },
  {
    id: "history",
    title: "Modern India: a new chapter",
    instructor: "Kabir Sethi",
    subject: "History",
    level: "Exam prep",
    duration: "3h 45m",
    lessons: 10,
    rating: "4.9",
    accent: "sage",
    icon: "✳",
    description: "Connect key events, movements and ideas that shaped modern India with a clear timeline.",
    progress: 0,
    chapters: [
      { title: "A changing subcontinent", duration: "09:16", body: "The eighteenth century brought major political and economic changes to the Indian subcontinent. Regional powers rose as the Mughal empire weakened, while European trading companies expanded their influence. To understand this period, we'll look at the connections between trade, political alliances and local histories rather than treating each event in isolation." },
      { title: "The rise of new ideas", duration: "11:48", body: "New ideas about education, social reform and political participation circulated across India during the nineteenth century. Reformers debated questions of tradition, equality and modernity. These conversations did not have one single voice: they reflected varied regions, communities and experiences, and helped shape later public life." },
    ],
  },
  {
    id: "english",
    title: "Speak English with confidence",
    instructor: "Maya Thomas",
    subject: "Languages",
    level: "All levels",
    duration: "2h 55m",
    lessons: 9,
    rating: "4.7",
    accent: "blue",
    icon: "Aa",
    description: "Practice the little conversations that make a big difference—in class, interviews and everyday life.",
    progress: 0,
    chapters: [
      { title: "Start a conversation", duration: "07:32", body: "A good conversation begins with a friendly greeting and an open question. Instead of asking only, 'How are you?', you might ask, 'What have you been working on lately?' Listen to the answer, respond to something specific, and share a little about yourself. You do not need perfect grammar to communicate clearly. Confidence grows with practice." },
      { title: "Introduce yourself", duration: "08:45", body: "A simple introduction can include your name, what you are studying or doing, and one thing you enjoy. For example: 'Hi, I'm Maya. I'm studying biology, and I love exploring how the natural world works.' Keep your introduction short, speak at a comfortable pace, and invite the other person into the conversation with a question." },
    ],
  },
];

const demoCourses: Course[] = demoCatalog.map((course): Course => ({ ...course, language: "Both" }));

const defaultQuiz: QuizQuestion[] = [
  { question: "Which quantity includes both magnitude and direction?", choices: ["Distance", "Speed", "Displacement", "Time"], answer: 2, explanation: "Displacement is a vector, so it includes both magnitude and direction." },
  { question: "If you complete one lap and return to your starting point, what is your displacement?", choices: ["Equal to the lap length", "Zero", "One kilometre", "It depends on your speed"], answer: 1, explanation: "Your final position matches your starting position, so your displacement is zero." },
  { question: "Average speed is calculated as…", choices: ["Total time ÷ total distance", "Displacement ÷ time", "Total distance ÷ total time", "Distance × time"], answer: 2, explanation: "Average speed is the total distance travelled divided by the total time taken." },
];
type QuizQuestion = { question: string; choices: string[]; answer: number; explanation: string };

function getQuizQuestions(course: Course): QuizQuestion[] {
  if (course.subject === "Mathematics") return [
    { question: "What does the derivative of a position function describe?", choices: ["Total distance", "Velocity", "Elapsed time", "Starting position"], answer: 1, explanation: "The derivative of position with respect to time is velocity—the rate at which position changes." },
    { question: "On a graph, what does a derivative at a point represent?", choices: ["The area under the curve", "The y-intercept", "The slope of the tangent", "The distance to the origin"], answer: 2, explanation: "The derivative at a point gives the slope of the tangent line there." },
    { question: "A limit describes…", choices: ["A value a function approaches", "Only a function's maximum", "The area of a rectangle", "The average of all outputs"], answer: 0, explanation: "A limit describes the value a function approaches as its input approaches a given point." },
  ];
  if (course.subject === "History") return [
    { question: "Which combination best helps explain political change in the eighteenth-century subcontinent?", choices: ["Trade, alliances and regional histories", "Only one ruler's decisions", "A single event in isolation", "Changes in climate alone"], answer: 0, explanation: "Political change is best understood through the connections between trade, alliances and regional histories." },
    { question: "Historical reform debates in the nineteenth century…", choices: ["Had one single voice", "Included varied regions and experiences", "Were only about trade", "Had no connection to public life"], answer: 1, explanation: "These debates reflected different regions, communities and experiences." },
    { question: "A useful way to study a historical timeline is to…", choices: ["Memorize dates without context", "Connect events and ideas", "Ignore regional differences", "Focus on one cause only"], answer: 1, explanation: "Connecting events and ideas helps explain how change unfolded over time." },
  ];
  if (course.subject === "Languages") return [
    { question: "What is a helpful way to start a conversation?", choices: ["Ask an open question", "Memorize a long speech", "Avoid listening", "Wait for perfect grammar"], answer: 0, explanation: "An open question invites the other person to share and helps a conversation flow." },
    { question: "What can a short introduction include?", choices: ["Only your full address", "Your name, what you do, and an interest", "A list of every achievement", "No question for the other person"], answer: 1, explanation: "A concise introduction can share your name, what you do, and an interest." },
    { question: "What matters more than perfect grammar when getting started?", choices: ["Speaking as fast as possible", "Clear communication and practice", "Using the longest words", "Avoiding every conversation"], answer: 1, explanation: "Clear communication and regular practice help build confidence." },
  ];
  return defaultQuiz;
}
const initialChat: ChatMessage[] = [
  { role: "tutor", text: "Hi! I'm your StudyAI practice tutor. Ask me about today's lesson and we'll work through it together. This demo uses sample responses—connect an AI provider to enable live answers." },
];
const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "new-hot", label: "New & Hot", icon: Flame },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "library", label: "Your Library", icon: BookOpen },
  { id: "ai-tutor", label: "AI Tutor", icon: Sparkles },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: Users },
];
const STORAGE_KEY = "studyai-demo-v1";

const LazyHomeRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.HomeRoute })));
const LazyExploreRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.ExploreRoute })));
const LazyNewHotRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.NewHotRoute })));
const LazySearchRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.SearchRoute })));
const LazyLibraryRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.LibraryRoute })));
const LazySeriesRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.SeriesRoute })));
const LazyLessonRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.LessonRoute })));
const LazyPlayerRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.PlayerRoute })));
const LazyAiTutorRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.AiTutorRoute })));
const LazyProgressRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.ProgressRoute })));
const LazyParentRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.ParentRoute })));
const LazySettingsRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.SettingsRoute })));
const LazyProfileRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.ProfileRoute })));
const LazyAdminRoute = lazy(() => import("./pages/catalog-pages").then((module) => ({ default: module.AdminRoute })));

function viewFromPath(pathname: string): View {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/series/")) return "series";
  if (path.startsWith("/lesson/")) return "lesson";
  const routes: Record<string, View> = {
    "/": "home", "/explore": "explore", "/classic/home": "classic-home", "/classic/explore": "classic-explore", "/new-hot": "new-hot", "/search": "search",
    "/library": "library", "/series": "series", "/lesson": "lesson", "/player": "player",
    "/ai-tutor": "ai-tutor", "/tutor": "tutor", "/profile": "profile", "/profile/preferences": "profile-preferences", "/progress": "progress",
    "/parent": "parent", "/settings": "settings", "/admin": "admin", "/admin/preview": "admin-preview", "/games": "games",
    "/dashboard": "dashboard", "/live-rooms": "live-rooms", "/my-learning": "my-learning",
  };
  return routes[path] ?? "home";
}

function viewFromLocation(): View {
  return new URLSearchParams(window.location.search).has("room") ? "live-rooms" : viewFromPath(window.location.pathname);
}

function pathForView(view: View, courseId?: string) {
  const routes: Record<View, string> = {
    home: "/", explore: "/explore", "classic-home": "/classic/home", "classic-explore": "/classic/explore", "new-hot": "/new-hot", search: "/search", library: "/library",
    series: `/series/${encodeURIComponent(courseId ?? "")}`.replace(/\/$/, ""),
    lesson: `/lesson/${encodeURIComponent(courseId ?? "")}`.replace(/\/$/, ""),
    player: "/player", "ai-tutor": "/ai-tutor", "my-learning": "/my-learning", tutor: "/tutor",
    profile: "/profile", "profile-preferences": "/profile/preferences", progress: "/progress", parent: "/parent", settings: "/settings",
    games: "/games", dashboard: "/dashboard", admin: "/admin", "admin-preview": "/admin/preview", "live-rooms": "/live-rooms",
  };
  return routes[view];
}

function loadSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      name?: string; email?: string; courses?: Course[]; completed?: number; minutes?: number;
      quizScore?: number; saved?: string[]; studentClass?: number; board?: BoardName;
      studyLanguage?: StudyLanguage; voiceId?: string; theme?: ThemeName;
      setupComplete?: boolean; guardianConsentAccepted?: boolean; autoPlayNext?: boolean; voiceSpeed?: number; voicePitch?: number;
    };
    return parsed;
  } catch (error) {
    console.error("Saved StudyAI demo progress could not be read.", error);
    return {};
  }
}
function getInitialTheme(theme?: ThemeName): ThemeName {
  if (theme && ["dark", "light", "amoled", "sunrise", "forest", "ocean", "kids"].includes(theme)) return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function ThemeProvider({ theme, children }: { theme: ThemeName; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <>{children}</>;
}
function loadLocalRecord<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch (error) {
    console.error(`Saved StudyAI data (${key}) could not be read.`, error);
    return fallback;
  }
}
function saveLocalRecord(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`StudyAI data (${key}) could not be saved.`, error);
  }
}
function formatTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function persistAudioPosition(key: string, seconds: number) {
  try {
    const positions = JSON.parse(localStorage.getItem("studyai-audio-positions") ?? "{}") as Record<string, number>;
    positions[key] = seconds;
    localStorage.setItem("studyai-audio-positions", JSON.stringify(positions));
  } catch (error) {
    console.error("Audio position could not be saved.", error);
  }
}

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [courses, setCourses] = useState<Course[]>(() => [...initialCourses, ...demoCourses, ...studyLessonCourses].map((course) => ({
    ...course,
    progress: saved.courses?.find((savedCourse) => savedCourse.id === course.id)?.progress ?? course.progress,
    language: course.language ?? "English",
  })));
  const [bookmarks, setBookmarks] = useState<Record<string, number[]>>(() => loadLocalRecord("studyai-bookmarks", {}));
  const [notes, setNotes] = useState<Record<string, string>>(() => loadLocalRecord("studyai-notes", {}));
  const [view, setViewState] = useState<View>(viewFromLocation);
  function setView(nextView: View, courseId?: string) {
    setViewState(nextView);
    const nextPath = pathForView(nextView, courseId);
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
  }
  const [activeCourse, setActiveCourse] = useState<Course>(courses[0]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minutes, setMinutes] = useState(saved.minutes ?? 0);
  const [completed, setCompleted] = useState(saved.completed ?? 0);
  const [quizScore, setQuizScore] = useState<number | undefined>(saved.quizScore);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [voiceSpeed, setVoiceSpeed] = useState(saved.voiceSpeed ?? 1);
  const [voicePitch, setVoicePitch] = useState(saved.voicePitch ?? 1);
  const [autoPlayNext, setAutoPlayNext] = useState(saved.autoPlayNext ?? true);
  const [savedIds, setSavedIds] = useState<string[]>(saved.saved ?? []);
  const [recentCourseIds, setRecentCourseIds] = useState<string[]>(() => loadLocalRecord("studyai-recent-courses", []));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All subjects");
  const [libraryTab, setLibraryTab] = useState<"Courses" | "In progress" | "Saved" | "Downloaded">("Courses");
  const [name, setName] = useState(saved.name ?? "");
  const [email, setEmail] = useState(saved.email ?? "");
  const [setupComplete, setSetupComplete] = useState(saved.setupComplete ?? false);
  const [setupStage, setSetupStage] = useState<SetupStage>(saved.setupComplete ? null : saved.name && saved.guardianConsentAccepted ? "class" : "profile");
  const [studentClass, setStudentClass] = useState(saved.studentClass ?? 5);
  const [board, setBoard] = useState<BoardName>(saved.board ?? "NCERT");
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(saved.studyLanguage ?? "Hindi");
  const [guardianConsent, setGuardianConsent] = useState(saved.guardianConsentAccepted ?? false);
  const [voiceId, setVoiceId] = useState(saved.voiceId ?? "guru-ji");
  const [previewingVoiceId, setPreviewingVoiceId] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>(initialChat);
  const [chatInput, setChatInput] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(() => getInitialTheme(saved.theme));
  const dark = theme === "dark" || theme === "amoled";
  const language: "English" | "Hindi" = studyLanguage === "English" ? "English" : "Hindi";
  const [notice, setNotice] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<"connecting" | "listening" | "thinking" | "speaking" | "ended">("connecting");
  const [callSeconds, setCallSeconds] = useState(0);
  const [callSummary, setCallSummary] = useState<{ topic: string; keyPoints: string[]; score: number; nextLesson: string } | undefined>();
  const [callTranscript, setCallTranscript] = useState<Array<{ speaker: "ai" | "student"; text: string; kind?: "hint" }>>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [adminUpload, setAdminUpload] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<number | undefined>(undefined);
  const autoPlayNextRef = useRef(false);
  const autoPlayEnabledRef = useRef(autoPlayNext);
  const lastPersistRef = useRef(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const currentChapter = activeCourse.chapters[chapterIndex];
  const quizQuestions = useMemo(() => getQuizQuestions(activeCourse), [activeCourse]);

  useEffect(() => {
    function syncLocation() {
      setViewState(viewFromLocation());
      const match = window.location.pathname.match(/^\/(?:series|lesson)\/([^/]+)/);
      if (!match) return;
      const course = courses.find((item) => item.id === decodeURIComponent(match[1]));
      if (course) setActiveCourse(course);
    }
    syncLocation();
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, [courses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: setupStage === "profile" ? saved.name ?? "" : name,
      email: setupStage === "profile" ? saved.email ?? "" : email,
      courses, completed, minutes, quizScore, saved: savedIds,
      studentClass, board,       studyLanguage, voiceId, theme, setupComplete,
      guardianConsentAccepted: guardianConsent, autoPlayNext, voiceSpeed, voicePitch,
    }));
  }, [name, email, courses, completed, minutes, quizScore, savedIds, studentClass, board, studyLanguage, voiceId, theme, setupComplete, setupStage, guardianConsent, autoPlayNext, voiceSpeed, voicePitch]);

  useEffect(() => saveLocalRecord("studyai-bookmarks", bookmarks), [bookmarks]);
  useEffect(() => saveLocalRecord("studyai-notes", notes), [notes]);
  useEffect(() => saveLocalRecord("studyai-recent-courses", recentCourseIds), [recentCourseIds]);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setElapsed(0);
    setAudioDuration(0);
    setAudioLoading(Boolean(currentChapter.audioSrc));
    lastPersistRef.current = 0;
    if (!currentChapter.audioSrc) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    const progressKey = `${activeCourse.id}:${chapterIndex}`;
    const handleMetadata = () => {
      setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      try {
        const positions = JSON.parse(localStorage.getItem("studyai-audio-positions") ?? "{}") as Record<string, number>;
        audio.currentTime = Math.min(positions[progressKey] ?? 0, Math.max(0, audio.duration - 1));
        setElapsed(audio.currentTime);
      } catch (error) {
        console.error("Saved audio position could not be read.", error);
      }
    };
    const handleTimeUpdate = () => {
      setElapsed(audio.currentTime);
      if (audio.currentTime - lastPersistRef.current < 5) return;
      persistAudioPosition(progressKey, audio.currentTime);
      lastPersistRef.current = audio.currentTime;
    };
    const handleEnded = () => {
      setPlaying(false);
      setAudioLoading(false);
      persistAudioPosition(progressKey, 0);
      setCompleted((value) => value + 1);
      setMinutes((value) => value + Math.max(1, Math.round(audio.duration / 60)));
      setCourses((items) => items.map((item) => item.id === activeCourse.id
        ? { ...item, progress: Math.min(100, item.progress + 8) } : item));
      if (chapterIndex < activeCourse.chapters.length - 1) {
        autoPlayNextRef.current = autoPlayEnabledRef.current;
        setChapterIndex(chapterIndex + 1);
        setNotice(autoPlayEnabledRef.current ? "Chapter complete. Starting the next chapter." : "Chapter complete. Your next lesson is ready.");
      } else {
        setNotice("Course chapters complete — your learning progress is saved.");
      }
    };
    const handleError = () => {
      setPlaying(false);
      setAudioLoading(false);
      setNotice("This audio file couldn't be loaded. Try again later or contact support.");
    };
    const handleCanPlay = () => {
      setAudioLoading(false);
      if (!autoPlayNextRef.current) return;
      autoPlayNextRef.current = false;
      audio.play().then(() => setPlaying(true)).catch((error: unknown) => {
        console.error("Next chapter audio could not start.", error);
        setNotice("The next chapter is ready. Press play to continue.");
      });
    };
    const handleWaiting = () => setAudioLoading(true);
    audio.addEventListener("loadedmetadata", handleMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.src = currentChapter.audioSrc;
    audio.volume = volume;
    audio.load();
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
    };
  }, [activeCourse.id, chapterIndex, currentChapter.audioSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    autoPlayEnabledRef.current = autoPlayNext;
  }, [autoPlayNext]);

  useEffect(() => {
    if (!sleepMinutes) return;
    window.clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
      setPlaying(false);
      setNotice("Sleep timer paused your lesson.");
      setSleepMinutes(0);
    }, sleepMinutes * 60_000);
    return () => window.clearTimeout(sleepTimerRef.current);
  }, [sleepMinutes]);

  useEffect(() => {
    function handlePlayerKeys(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || (event.target instanceof HTMLElement && (event.target.isContentEditable || Boolean(event.target.closest("button, a, [role='button']"))))) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!currentChapter.audioSrc || !audioRef.current) return;
        if (audioRef.current.paused) startNarration();
        else {
          audioRef.current.pause();
          setPlaying(false);
        }
      } else if (event.key === "ArrowLeft" && audioRef.current) {
        seekTo(Math.max(0, audioRef.current.currentTime - 10));
      } else if (event.key === "ArrowRight" && audioRef.current && Number.isFinite(audioDuration) && audioDuration > 0) {
        seekTo(Math.min(audioDuration, audioRef.current.currentTime + 10));
      } else if (event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setView("search");
        document.getElementById("global-search")?.focus();
      }
    }
    window.addEventListener("keydown", handlePlayerKeys);
    return () => window.removeEventListener("keydown", handlePlayerKeys);
  });

  useEffect(() => {
    const persistPosition = () => {
      if (audioRef.current && currentChapter.audioSrc) {
        persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, audioRef.current.currentTime);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistPosition();
    };
    window.addEventListener("pagehide", persistPosition);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", persistPosition);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeCourse.id, chapterIndex, currentChapter.audioSrc]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!callOpen || callStatus === "ended") return;
    const timer = window.setInterval(() => setCallSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [callOpen, callStatus]);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const query = search.toLowerCase();
    return `${course.title} ${course.subject} ${course.instructor} ${course.level}`.toLowerCase().includes(query)
      && (category === "All subjects" || course.subject === category)
      && (!course.language || course.language === "Both" || course.language === language);
  }), [courses, search, category, language]);
  const firstName = name.trim().split(/\s+/)[0] || "Learner";
  const progressAverage = Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length);
  const lessonDuration = audioDuration;

  function openLesson(course: Course, index = 0) {
    stopNarration();
    setRecentCourseIds((items) => [course.id, ...items.filter((id) => id !== course.id)].slice(0, 30));
    setActiveCourse(course);
    setChapterIndex(index);
    setElapsed(0);
    setView("lesson", course.id);
    setMobileNav(false);
  }

  function openSeries(course: Course) {
    setRecentCourseIds((items) => [course.id, ...items.filter((id) => id !== course.id)].slice(0, 30));
    setActiveCourse(course);
    setChapterIndex(0);
    setView("series", course.id);
    setMobileNav(false);
  }

  function selectQueueLesson(course: Course, index: number) {
    stopNarration();
    setActiveCourse(course);
    setChapterIndex(index);
    setElapsed(0);
    setView("player", course.id);
  }

  async function startCall() {
    const selectedVoice = studyVoices.find((voice) => voice.id === voiceId) ?? studyVoices[0];
    setCallSummary(undefined);
    setCallTranscript([{ speaker: "ai", text: `Namaste ${name || "learner"}! Main ${selectedVoice.name} bol raha hoon. Aaj kya seekhna hai?` }]);
    setCallStatus("connecting");
    setCallSeconds(0);
    setCallOpen(true);
    try {
      const response = await fetch("/api/call/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: name || "guest-learner",
          name: name || "Learner",
          classLevel: studentClass,
          board,
          language: studyLanguage,
          voiceId,
          lessonId: activeCourse.id,
          parentConsent: guardianConsent,
        }),
      });
      const result = await response.json() as { error?: string; token?: string; serverUrl?: string; roomName?: string; usageSecondsLeft?: number; maxSeconds?: number; voiceId?: string };
      if (!response.ok || !result.token || !result.serverUrl) {
        throw new Error(result.error ?? "The call could not be prepared.");
      }
      const { Room, RoomEvent } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: true });
      room.on(RoomEvent.Connected, () => {
        setCallStatus("listening");
        setCallTranscript((items) => [...items, { speaker: "ai", text: "Main ready hoon. Aaj hum ek quick concept samajhte hain." }]);
      });
      room.on(RoomEvent.Disconnected, () => {
        setCallStatus("ended");
        setCallSummary({
          topic: currentChapter.title,
          keyPoints: ["Concept explain kiya gaya.", "Quick recap diya gaya.", "Next lesson ready hai."],
          score: 88,
          nextLesson: activeCourse.chapters[Math.min(chapterIndex + 1, activeCourse.chapters.length - 1)]?.title ?? activeCourse.title,
        });
      });
      room.on(RoomEvent.DataReceived, (_payload, participant) => {
        if (participant?.identity) {
          setCallStatus("thinking");
          setCallTranscript((items) => [...items.slice(-9), { speaker: "student", text: `Live session active with ${participant.identity}.` }]);
        }
      });
      await room.connect(result.serverUrl, result.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setCallStatus("listening");
      setCallSummary({
        topic: currentChapter.title,
        keyPoints: ["Topic ko simple Hindi/Hinglish mein samjhaaya jayega.", "Aapko hint ke saath answer milta rahega.", "Quiz ke baad next lesson suggest kiya jayega."],
        score: 92,
        nextLesson: activeCourse.title,
      });
      setNotice(`Call connected to ${selectedVoice.name}. Your agent is ready.`);
    } catch (error) {
      console.error("Call setup failed.", error);
      setCallStatus("ended");
      setCallTranscript((items) => [...items, { speaker: "ai", text: error instanceof Error ? error.message : "Call setup failed. Please try again." }]);
      setNotice("The live call could not start yet. Try again in a moment.");
    }
  }

  function stopNarration() {
    if (audioRef.current && currentChapter.audioSrc) {
      persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, audioRef.current.currentTime);
    }
    audioRef.current?.pause();
    setPlaying(false);
  }

  function startNarration(rate = playbackSpeed) {
    const audio = audioRef.current;
    if (!currentChapter.audioSrc || !audio) {
      setNotice("Audio hasn't been published for this chapter yet.");
      return;
    }
    audio.playbackRate = rate;
    audio.play().then(() => setPlaying(true)).catch((error: unknown) => {
      console.error("Audio playback could not start.", error);
      setPlaying(false);
      setNotice("Audio playback couldn't start. Check your browser's audio settings.");
    });
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!currentChapter.audioSrc || !audio) {
      setNotice("Audio hasn't been published for this chapter yet.");
      return;
    }
    if (!audio.paused) {
      persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, audio.currentTime);
      audio.pause();
      setPlaying(false);
    } else {
      startNarration();
    }
  }

  function seekTo(value: number) {
    if (!currentChapter.audioSrc || !audioRef.current) return;
    audioRef.current.currentTime = value;
    setElapsed(value);
    persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, value);
  }

  function changePlaybackSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  }

  function skipAudio(seconds: number) {
    if (!currentChapter.audioSrc || !audioRef.current || !audioDuration) return;
    seekTo(Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + seconds)));
  }

  function addTimestampBookmark() {
    if (!currentChapter.audioSrc) {
      setNotice("You can add a timestamp bookmark when this chapter has audio.");
      return;
    }
    const key = `${activeCourse.id}:${chapterIndex}`;
    const position = Math.floor(elapsed);
    setBookmarks((items) => ({
      ...items,
      [key]: [...new Set([...(items[key] ?? []), position])].sort((a, b) => a - b),
    }));
    setNotice(`Bookmark saved at ${formatTime(position)}.`);
  }

  function seekBookmark(position: number) {
    seekTo(position);
  }

  function saveChapterNote(value: string) {
    const key = `${activeCourse.id}:${chapterIndex}`;
    setNotes((items) => ({ ...items, [key]: value }));
  }

  function changeChapter(direction: number) {
    const next = Math.max(0, Math.min(activeCourse.chapters.length - 1, chapterIndex + direction));
    if (next === chapterIndex) return;
    if (audioRef.current && currentChapter.audioSrc) {
      persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, audioRef.current.currentTime);
    }
    stopNarration();
    setChapterIndex(next);
    setElapsed(0);
  }

  function sendMessage(text = chatInput) {
    const question = text.trim();
    if (!question) return;
    const context = activeCourse.title;
    setChat((messages) => [...messages, { role: "student", text: question }]);
    setChatInput("");
    window.setTimeout(() => setChat((messages) => [...messages, {
      role: "tutor",
      text: makeTutorReply(question, context),
    }]), 500);
  }

  function chooseAnswer(index: number) {
    if (quizAnswer !== null) return;
    setQuizAnswer(index);
    if (index === quizQuestions[quizStep].answer) setQuizCorrect((value) => value + 1);
  }

  function nextQuestion() {
    if (quizStep + 1 < quizQuestions.length) {
      setQuizStep((value) => value + 1);
      setQuizAnswer(null);
      return;
    }
    const score = Math.round((quizCorrect / quizQuestions.length) * 100);
    setQuizScore(score);
    setQuizDone(true);
    setCompleted((value) => value + 1);
  }

  function resetQuiz() {
    setQuizOpen(false);
    setQuizStep(0);
    setQuizAnswer(null);
    setQuizCorrect(0);
    setQuizDone(false);
  }

  function toggleSave(courseId: string) {
    setSavedIds((ids) => ids.includes(courseId) ? ids.filter((id) => id !== courseId) : [...ids, courseId]);
  }

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !guardianConsent) return;
    setGuardianConsent(true);
    setSetupStage("class");
  }

  function previewVoice(voiceIdToPreview: string) {
    const voice = studyVoices.find((item) => item.id === voiceIdToPreview);
    if (!voice) return;
    if (!("speechSynthesis" in window)) {
      setNotice("Voice previews are not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voice.preview);
    utterance.lang = voice.language;
    utterance.pitch = voicePitch * voice.pitch;
    utterance.rate = voiceSpeed * voice.rate;
    utterance.onstart = () => setPreviewingVoiceId(voice.id);
    utterance.onend = () => setPreviewingVoiceId("");
    utterance.onerror = () => {
      setPreviewingVoiceId("");
      setNotice("This browser couldn't play the voice preview.");
    };
    window.speechSynthesis.speak(utterance);
  }

  function finishSetup(selectedVoiceId = voiceId) {
    window.speechSynthesis?.cancel();
    setPreviewingVoiceId("");
    setVoiceId(selectedVoiceId);
    setSetupComplete(true);
    setSetupStage(null);
    setNotice(`Welcome, ${name.trim().split(/\s+/)[0] || "learner"}! Your learning profile is ready.`);
  }

  function closeSetup() {
    window.speechSynthesis?.cancel();
    setPreviewingVoiceId("");
    setSetupStage(null);
  }

  function toggleTheme() {
    setTheme((current) => current === "dark" || current === "amoled" ? "light" : "dark");
  }

  const screenTitle: Record<View, string> = {
    home: "Your learning space",
    explore: "Find your next aha moment",
    "classic-home": "Classic learning space",
    "classic-explore": "Classic course discovery",
    "new-hot": "New & Hot",
    search: "Search the library",
    library: "Your Library",
    series: activeCourse.title,
    lesson: currentChapter.title,
    player: "Now playing",
    "ai-tutor": "AI Tutor",
    "my-learning": "Pick up where you left off",
    tutor: "Your AI study buddy",
    profile: "Your profile",
    "profile-preferences": "Profile preferences",
    progress: "Your progress",
    parent: "Parent overview",
    settings: "Settings",
    games: "Quiz games",
    dashboard: "Learning dashboard",
    admin: "Demo content studio",
    "admin-preview": "Local content studio preview",
    "live-rooms": "Live study rooms",
  };
  const catalogProps = {
    courses,
    activeCourse,
    savedIds,
    recentCourseIds,
    search,
    name,
    studentClass,
    board,
    minutes,
    completed,
    progress: progressAverage,
    elapsed,
    playing,
    chapterIndex,
    libraryTab,
    onSearch: setSearch,
    onLibraryTab: setLibraryTab,
    onOpenSeries: openSeries,
    onPlayLesson: openLesson,
    onSelectQueueLesson: selectQueueLesson,
    onToggleSaved: toggleSave,
    onNavigate: setView,
    onPlayback: togglePlayback,
    onNotice: setNotice,
  };

  return (
    <ThemeProvider theme={theme}><div className={`app-shell${view === "player" ? " player-fullscreen" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("home"); }}>
          <span className="brand-mark"><AudioLines size={20} strokeWidth={2.4} /></span>
          <span>study<span className="brand-ai">ai</span></span>
        </a>
        <div className="workspace-label">DISCOVER</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${view === id ? "active" : ""}`} onClick={() => { setView(id); setMobileNav(false); }}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {id === "new-hot" && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">YOUR LIBRARY</div>
        <div className="sidebar-library-card">
          {[
            ["Courses", "library"],
            ["In progress", "library"],
            ["Saved", "library"],
            ["Downloaded", "library"],
          ].map(([label, destination]) => <button key={label} className={`sidebar-library-filter${libraryTab === label ? " selected" : ""}`} onClick={() => { setLibraryTab(label as typeof libraryTab); setView(destination as View); setMobileNav(false); }}>{label}{label === "Saved" && savedIds.length > 0 && <span>{savedIds.length}</span>}</button>)}
          <label className="sidebar-sort">Sort by <select aria-label="Library sort order"><option>Recents</option></select></label>
        </div>
        <div className="workspace-label">YOUR SPACE</div>
        <button className={`nav-link ${view === "tutor" ? "active" : ""}`} onClick={() => setView("tutor")}><Sparkles size={18} /><span>Tutor demo</span></button>
        <button className={`nav-link ${view === "games" ? "active" : ""}`} onClick={() => setView("games")}><Gamepad2 size={18} /><span>Quiz games</span></button>
        <button className={`nav-link ${view === "live-rooms" ? "active" : ""}`} onClick={() => setView("live-rooms")}><Video size={18} /><span>Live rooms</span></button>
        <button className="nav-link" onClick={() => setNotice("Your study planner is coming soon.")}><Target size={18} /><span>Study planner</span><span className="nav-soon">SOON</span></button>
        <button className={`nav-link ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}><Upload size={18} /><span>Content studio</span></button>
        <button className={`nav-link ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}><MoreHorizontal size={18} /><span>Settings</span></button>
        <div className="sidebar-spacer" />
        <div className="streak-card">
          <div className="streak-icon"><Flame size={17} /></div>
          <div><strong>Your learning time</strong><span>{minutes} minutes recorded</span></div>
          <span className="streak-count">{completed}</span>
        </div>
        <button className="profile-switch" onClick={() => setView("profile")}>
          <span className="avatar">{firstName.slice(0, 1).toUpperCase()}</span>
          <span className="profile-name"><strong>{name || "Guest learner"}</strong><small>Free plan · Demo mode</small></span>
          <MoreHorizontal size={18} />
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={19} /></button>
            <button className="icon-button route-arrow" aria-label="Go back" onClick={() => window.history.back()}><ArrowLeft size={17} /></button>
            <button className="icon-button route-arrow" aria-label="Go forward" onClick={() => window.history.forward()}><ArrowRight size={17} /></button>
            <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{screenTitle[view]}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input id="global-search" aria-label="Search courses" placeholder="Search anything..." value={search} onFocus={() => setView("search")} onChange={(event) => { setSearch(event.target.value); setView("search"); }} />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <span className="topbar-divider" />
            <button className="language-toggle" aria-label={`Switch learning language (current: ${studyLanguage})`} onClick={() => setStudyLanguage((current) => current === "Hindi" ? "Hinglish" : current === "Hinglish" ? "English" : "Hindi")}>{studyLanguage === "English" ? "EN" : studyLanguage === "Hindi" ? "हि" : "Hi"}</button>
            <button className="icon-button theme-button" aria-label="Toggle color theme" onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="top-avatar" aria-label="Open profile" onClick={() => setView("profile")}>{firstName.slice(0, 1).toUpperCase()}</button>
          </div>
        </header>
        <div className="page-scroll">
          {view === "home" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading home"><span /><span /><span /></div>}><LazyHomeRoute {...catalogProps} /></Suspense>}
          {view === "explore" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading Explore"><span /><span /><span /></div>}><LazyExploreRoute {...catalogProps} /></Suspense>}
          {view === "classic-home" && <HomePage firstName={firstName} progressAverage={progressAverage} minutes={minutes} completed={completed} courses={courses} savedIds={savedIds} onOpen={openSeries} onView={setView} onSave={toggleSave} onQuiz={() => setQuizOpen(true)} onCall={startCall} onBrowseChip={(chip) => {
            setSearch("");
            if (chip === "Quiz") { setView("games"); return; }
            setCategory(chip === "Stories" ? "History" : chip === "Kids" ? "Science" : chip === "Languages" ? "Languages" : "All subjects");
            if (chip === "Exams") setSearch("Exam prep");
            setView("explore");
          }} language={language} />}
          {view === "classic-explore" && <ExplorePage courses={filteredCourses} category={category} onCategory={setCategory} onOpen={openSeries} savedIds={savedIds} onSave={toggleSave} query={search} onQuery={setSearch} />}
          {view === "new-hot" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading New and Hot"><span /><span /><span /></div>}><LazyNewHotRoute {...catalogProps} /></Suspense>}
          {view === "search" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading search"><span /><span /><span /></div>}><LazySearchRoute {...catalogProps} /></Suspense>}
          {view === "library" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading library"><span /><span /><span /></div>}><LazyLibraryRoute {...catalogProps} /></Suspense>}
          {view === "series" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading series"><span /><span /><span /></div>}><LazySeriesRoute {...catalogProps} /></Suspense>}
          {view === "lesson" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading lesson"><span /><span /><span /></div>}><LazyLessonRoute {...catalogProps} /></Suspense>}
          {view === "player" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading player"><span /><span /><span /></div>}><LazyPlayerRoute {...catalogProps} /></Suspense>}
          {view === "ai-tutor" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading AI tutor"><span /><span /><span /></div>}><LazyAiTutorRoute {...catalogProps} /></Suspense>}
          {view === "progress" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading progress"><span /><span /><span /></div>}><LazyProgressRoute {...catalogProps} /></Suspense>}
          {view === "parent" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading parent overview"><span /><span /><span /></div>}><LazyParentRoute {...catalogProps} /></Suspense>}
          {view === "settings" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading settings"><span /><span /><span /></div>}><LazySettingsRoute {...catalogProps} /></Suspense>}
          {view === "my-learning" && <LearningPage course={activeCourse} chapterIndex={chapterIndex} elapsed={elapsed} onSeek={seekTo} onOpen={openLesson} onChapter={(index) => { if (audioRef.current && currentChapter.audioSrc) persistAudioPosition(`${activeCourse.id}:${chapterIndex}`, audioRef.current.currentTime); stopNarration(); setChapterIndex(index); setElapsed(0); }} onQuiz={() => setQuizOpen(true)} savedIds={savedIds} onSave={toggleSave} bookmarks={bookmarks[`${activeCourse.id}:${chapterIndex}`] ?? []} onBookmark={addTimestampBookmark} onJumpBookmark={seekBookmark} note={notes[`${activeCourse.id}:${chapterIndex}`] ?? ""} onNoteChange={saveChapterNote} />}
          {view === "tutor" && <TutorPage chat={chat} input={chatInput} onInput={setChatInput} onSend={sendMessage} course={activeCourse} voiceName={studyVoices.find((voice) => voice.id === voiceId)?.name ?? "Guru Ji"} studentClass={studentClass} onCall={startCall} />}
          {view === "profile" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading profile"><span /><span /><span /></div>}><LazyProfileRoute {...catalogProps} /></Suspense>}
          {view === "profile-preferences" && <ProfilePage name={name} email={email} minutes={minutes} completed={completed} progress={progressAverage} savedCount={savedIds.length} theme={theme} setTheme={setTheme} studentClass={studentClass} board={board} studyLanguage={studyLanguage} setStudyLanguage={setStudyLanguage} voiceId={voiceId} onEditLearning={() => setSetupStage("class")} onEditVoice={() => setSetupStage("voice")} autoPlayNext={autoPlayNext} setAutoPlayNext={setAutoPlayNext} voiceSpeed={voiceSpeed} setVoiceSpeed={setVoiceSpeed} voicePitch={voicePitch} setVoicePitch={setVoicePitch} onReset={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} />}
          {view === "games" && <GamesPage roomCode={roomCode} joinCode={joinCode} onJoinCode={setJoinCode} onCreate={() => { const code = String(Math.floor(100000 + Math.random() * 900000)); setRoomCode(code); if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => setNotice("Demo room created; room code copied."), (error: unknown) => { console.error("Demo room code could not be copied.", error); setNotice(`Demo room ${code} created. Copy the code to invite a friend.`); }); else setNotice(`Demo room ${code} created. Copy the code to invite a friend.`); }} onJoin={() => setNotice(joinCode.length === 6 ? `Room ${joinCode} is a local demo. Connect a realtime service for multiplayer.` : "Enter a valid 6-digit room code.")} onPlay={() => setQuizOpen(true)} />}
          {view === "dashboard" && <DashboardPage courses={courses} minutes={minutes} completed={completed} quizScore={quizScore} progress={progressAverage} onOpen={openLesson} />}
          {view === "admin" && <Suspense fallback={<div className="route-skeleton" aria-label="Loading admin"><span /><span /><span /></div>}><LazyAdminRoute {...catalogProps} /></Suspense>}
          {view === "admin-preview" && <AdminPage uploadName={adminUpload} onUpload={setAdminUpload} courses={courses} onNotice={setNotice} />}
          {view === "live-rooms" && <LiveRoomsPage learnerName={name || "Learner"} onNotice={setNotice} />}
          <CallModal open={callOpen} status={callStatus} transcript={callTranscript} seconds={callSeconds} summary={callSummary} onClose={() => { setCallOpen(false); setCallSummary(undefined); setCallStatus("ended"); }} voiceName={studyVoices.find((voice) => voice.id === voiceId)?.name ?? "Guru Ji"} />
          <footer className="page-footer"><span>Made for curious minds <span className="footer-heart">♥</span></span><span>Learning should feel like yours.</span><span className="footer-build">STUDYAI · DEMO BUILD</span></footer>
        </div>
      </main>

      <audio ref={audioRef} preload="metadata" />
      <div className={`mini-player ${view === "my-learning" ? "player-expanded-context" : ""}`}>
        <div className="player-track">
          <div className={`player-cover cover-${activeCourse.accent}`} aria-hidden="true">{(currentChapter.coverImage ?? activeCourse.coverImage) && <img src={currentChapter.coverImage ?? activeCourse.coverImage} alt="" loading="lazy" decoding="async" />}<span>{activeCourse.icon}</span></div>
          <button className="player-track-text player-track-open" aria-label={`Open full lesson player, voice profile ${studyVoices.find((voice) => voice.id === voiceId)?.name ?? "Guru Ji"}`} onClick={() => setView("player")}><strong>{currentChapter.title}</strong><span>{activeCourse.title} <i>·</i> {studyVoices.find((voice) => voice.id === voiceId)?.name ?? "Guru Ji"} voice profile</span></button>
          <button className="player-save" title="Call Guru Ji" onClick={startCall}><PhoneOff size={16} /></button>
          <button className={`player-save ${savedIds.includes(activeCourse.id) ? "is-saved" : ""}`} title="Save course" onClick={() => toggleSave(activeCourse.id)}><Heart size={16} fill={savedIds.includes(activeCourse.id) ? "currentColor" : "none"} /></button>
        </div>
        <div className="player-controls">
          <div className="player-control-row">
            <button className="small-control" aria-label="Previous chapter" disabled={chapterIndex === 0} onClick={() => changeChapter(-1)}><SkipBack size={17} /></button>
            <button className="skip-button" aria-label="Back 10 seconds" disabled={!currentChapter.audioSrc} onClick={() => skipAudio(-10)}>-10</button>
            <button className="play-button" aria-label={playing ? "Pause lesson" : currentChapter.audioSrc ? "Play lesson" : "Audio unavailable"} disabled={!currentChapter.audioSrc} onClick={togglePlayback}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button className="skip-button" aria-label="Forward 10 seconds" disabled={!currentChapter.audioSrc} onClick={() => skipAudio(10)}>+10</button>
            <button className="small-control" aria-label="Next chapter" disabled={chapterIndex === activeCourse.chapters.length - 1} onClick={() => changeChapter(1)}><SkipForward size={17} /></button>
            <button className="speed-button" title="Change playback speed" onClick={changePlaybackSpeed}>{playbackSpeed}×</button>
          </div>
          <div className="seek-row"><span>{formatTime(elapsed)}</span><input aria-label="Seek lesson" type="range" min={0} max={lessonDuration || 1} value={elapsed} disabled={!currentChapter.audioSrc || !lessonDuration} style={{ "--range-progress": `${lessonDuration ? (elapsed / lessonDuration) * 100 : 0}%` } as React.CSSProperties} onChange={(event) => seekTo(Number(event.target.value))} /><span>{lessonDuration ? formatTime(lessonDuration) : "--:--"}</span></div>
        </div>
        <div className="player-extra"><span className="speech-label"><Volume2 size={16} /><input aria-label="Audio volume" type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></span><label className="sleep-control" title="Sleep timer"><Timer size={14} /><select aria-label="Sleep timer" value={sleepMinutes} onChange={(event) => setSleepMinutes(Number(event.target.value))}><option value={0}>Timer off</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option></select></label><span className="queue-button">{audioLoading ? "Loading audio…" : currentChapter.audioSrc ? "Demo sample" : "Audio unavailable"}</span><button className="queue-button" aria-label="Open play queue" onClick={() => setView("player")}>Queue</button></div>
      </div>

      <nav className="mobile-tabbar" aria-label="Quick navigation">
        {[["home", "Home", Home], ["explore", "Explore", Compass], ["ai-tutor", "AI", Sparkles], ["library", "Library", BookOpen], ["profile", "Profile", Languages]].map(([id, label, Icon]) => {
          const TabIcon = Icon as typeof Home;
          return <button key={id as string} className={view === id ? "active" : ""} onClick={() => setView(id as View)}><TabIcon size={18} /><span>{label as string}</span></button>;
        })}
      </nav>

      {setupStage && <div className="modal-backdrop setup-backdrop"><section className={`welcome-modal setup-modal ${setupStage === "voice" ? "setup-voice-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="setup-title">
        {setupComplete && <button className="modal-close" aria-label="Close settings" onClick={closeSetup}><X size={18} /></button>}
        <div className="setup-progress"><span className={setupStage !== "profile" ? "done" : "current"}>Profile</span><i /><span className={["board", "language", "voice"].includes(setupStage) ? "done" : setupStage === "class" ? "current" : ""}>Class</span><i /><span className={["language", "voice"].includes(setupStage) ? "done" : setupStage === "board" ? "current" : ""}>Board</span><i /><span className={setupStage === "language" || setupStage === "voice" ? "current" : ""}>Language</span><i /><span className={setupStage === "voice" ? "current" : ""}>Voice</span></div>
        {setupStage === "profile" && <>
          <div className="welcome-art"><div className="welcome-sun"><Sparkles size={25} /></div><span className="art-dot dot-a" /><span className="art-dot dot-b" /><div className="art-book"><BookOpen size={34} /></div></div>
          <span className="eyebrow">A LITTLE SPACE TO LEARN</span><h2 id="setup-title">Your next big idea<br />starts <em>right here.</em></h2>
          <p>Set up your learner profile, choose your curriculum and find a voice you enjoy learning with.</p>
          <form onSubmit={signIn} className="welcome-form"><label>Your name<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Aditi Sharma" /></label><label>Email address <span className="optional">(optional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="guardian-consent"><input type="checkbox" required checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} /><span>A parent or guardian has given permission to create this local demo profile.</span></label><button className="primary-button wide" type="submit">Continue to setup <ArrowRight size={16} /></button></form>
          <div className="demo-notice"><ShieldCheck size={15} /> Local demo confirmation only; production needs verified guardian consent.</div>
        </>}
        {setupStage === "class" && <div className="setup-step-content"><span className="eyebrow">STEP 1 OF 3 · YOUR LEARNING LEVEL</span><h2 id="setup-title">Which class are you in?</h2><p>We’ll use this to show lessons that fit your school level.</p><div className="class-picker">{Array.from({ length: 12 }, (_, index) => index + 1).map((classNumber) => <button key={classNumber} className={studentClass === classNumber ? "selected" : ""} onClick={() => { setStudentClass(classNumber); setSetupStage("board"); }}>{classNumber}</button>)}</div>{setupComplete && <button className="setup-cancel" onClick={closeSetup}>Cancel</button>}</div>}
        {setupStage === "board" && <div className="setup-step-content"><span className="eyebrow">STEP 2 OF 3 · YOUR CURRICULUM</span><h2 id="setup-title">Choose your board</h2><p>We’ll tailor examples and study paths to your curriculum.</p><div className="choice-card-list">{(["UP Board", "NCERT", "CBSE"] as BoardName[]).map((boardOption) => <button key={boardOption} className={board === boardOption ? "selected" : ""} onClick={() => { setBoard(boardOption); setSetupStage("language"); }}><span className="choice-card-icon"><BookOpen size={19} /></span><span><strong>{boardOption}</strong><small>{boardOption === "UP Board" ? "Uttar Pradesh state curriculum" : boardOption === "NCERT" ? "National curriculum framework" : "Central Board of Secondary Education"}</small></span><ArrowRight size={17} /></button>)}</div><button className="setup-back" onClick={() => setSetupStage("class")}><ArrowLeft size={14} /> Change class</button></div>}
        {setupStage === "language" && <div className="setup-step-content"><span className="eyebrow">STEP 3 OF 3 · HOW YOU LEARN</span><h2 id="setup-title">Choose your language</h2><p>Switch this any time in your profile settings.</p><div className="language-picker">{(["Hindi", "Hinglish", "English"] as StudyLanguage[]).map((option) => <button key={option} className={studyLanguage === option ? "selected" : ""} onClick={() => { setStudyLanguage(option); setSetupStage("voice"); }}><span>{option === "Hindi" ? "हिं" : option === "Hinglish" ? "Hi+" : "EN"}</span><strong>{option}</strong><small>{option === "Hindi" ? "हिंदी में सीखें" : option === "Hinglish" ? "Hindi + English mix" : "Learn in English"}</small></button>)}</div><button className="setup-back" onClick={() => setSetupStage("board")}><ArrowLeft size={14} /> Change board</button></div>}
        {setupStage === "voice" && <div className="setup-step-content"><span className="eyebrow">YOUR STUDY COMPANION</span><h2 id="setup-title">Choose your AI voice</h2><p>Preview the sample voice. Your preference is saved for compatible narration and tutor experiences.</p><div className="voice-picker-grid">{studyVoices.map((voice) => <article key={voice.id} className={`voice-card ${voice.color} ${voiceId === voice.id ? "selected" : ""}`}><div className={`voice-avatar voice-avatar-${voice.color}`}>{voice.avatar}</div><div className="voice-card-copy"><strong>{voice.name}</strong><span>{voice.style}</span></div><p>{voice.description}</p><div className="voice-card-actions"><button className="voice-preview-button" onClick={() => previewVoice(voice.id)}>{previewingVoiceId === voice.id ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}{previewingVoiceId === voice.id ? "Playing" : "Preview"}</button><button className="voice-select-button" onClick={() => finishSetup(voice.id)}>{voiceId === voice.id ? "Selected" : "Select"}</button></div></article>)}</div><div className="setup-voice-footer"><span><ShieldCheck size={15} /> Voice previews run on this device and are not recorded.</span>{setupComplete && <button className="setup-cancel" onClick={closeSetup}>Cancel</button>}</div></div>}
      </section></div>}

      {quizOpen && <div className="modal-backdrop"><section className="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <button className="modal-close" aria-label="Close quiz" onClick={resetQuiz}><X size={18} /></button>
        <div className="quiz-top"><span className="quiz-icon"><Target size={19} /></span><span>QUICK PRACTICE · {activeCourse.subject.toUpperCase()}</span><span className="quiz-count">{quizDone ? "Done" : `${quizStep + 1} / ${quizQuestions.length}`}</span></div>
        {quizDone ? <div className="quiz-result"><div className="result-ring"><span>{Math.round((quizCorrect / quizQuestions.length) * 100)}<small>%</small></span></div><h2 id="quiz-title">Nice work, {firstName}!</h2><p>You got <strong>{quizCorrect} out of {quizQuestions.length}</strong> right. Your result is saved to your local progress.</p><button className="primary-button wide" onClick={resetQuiz}>Back to learning <ArrowRight size={16} /></button></div> : <>
          <div className="quiz-progress"><span style={{ width: `${(quizStep / quizQuestions.length) * 100}%` }} /></div>
          <h2 className="quiz-question" id="quiz-title">{quizQuestions[quizStep].question}</h2>
          <div className="quiz-choices">{quizQuestions[quizStep].choices.map((choice, index) => {
            const selected = quizAnswer === index;
            const correct = quizAnswer !== null && index === quizQuestions[quizStep].answer;
            return <button key={choice} disabled={quizAnswer !== null} className={`quiz-choice ${selected ? "selected" : ""} ${correct ? "correct" : ""} ${selected && !correct ? "incorrect" : ""}`} onClick={() => chooseAnswer(index)}><span className="choice-letter">{String.fromCharCode(65 + index)}</span>{choice}{correct && <Check size={17} />}</button>;
          })}</div>
          {quizAnswer !== null && <div className={`quiz-explanation ${quizAnswer === quizQuestions[quizStep].answer ? "right" : "wrong"}`}><strong>{quizAnswer === quizQuestions[quizStep].answer ? "Exactly right!" : "Not quite — here's why."}</strong><span>{quizQuestions[quizStep].explanation}</span></div>}
          <button className="primary-button wide quiz-next" disabled={quizAnswer === null} onClick={nextQuestion}>{quizStep + 1 === quizQuestions.length ? "See my result" : "Next question"} <ArrowRight size={16} /></button>
        </>}
      </section></div>}
      {notice && <div className="toast-message" role="status"><CheckCircle2 size={17} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></button></div>}
      {mobileNav && <button className="mobile-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    </div></ThemeProvider>
  );
}

function HomePage({ firstName, progressAverage, minutes, completed, courses, savedIds, onOpen, onView, onSave, onQuiz, onCall, onBrowseChip, language }: {
  firstName: string; progressAverage: number; minutes: number; completed: number; courses: Course[];
  savedIds: string[]; onOpen: (course: Course, index?: number) => void; onView: (view: View) => void;
  onSave: (id: string) => void; onQuiz: () => void; onCall: () => void; onBrowseChip: (chip: string) => void; language: "English" | "Hindi";
}) {
  const continuing = courses.find((course) => course.progress > 0) ?? courses[0];
  const browseChips = ["Audio Lessons", "Courses", "Quiz", "Exams", "Stories", "Kids", "Motivation", "Languages"];
  const rows = [
    { title: "Trending lessons", list: courses.slice(0, 4) },
    { title: "Class-wise courses", list: courses.filter((course) => course.level.includes("Class")).slice(0, 4) },
    { title: "Exam prep", list: courses.filter((course) => ["Science", "Mathematics", "GK"].includes(course.subject)).slice(0, 4) },
    { title: "Kids learning", list: courses.filter((course) => ["Science", "English", "Mathematics"].includes(course.subject)).slice(0, 4) },
    { title: "Self help & motivation", list: courses.filter((course) => ["English", "History", "GK"].includes(course.subject)).slice(0, 4) },
  ];
  return <div className="page-content">
    <div className="welcome-line"><div><div className="date-greeting">YOUR DAILY LEARNING SPACE <span>·</span> {language === "Hindi" ? "आज कुछ नया सीखें" : "A FRESH START"}</div><h1>{language === "Hindi" ? `नमस्ते, ${firstName}` : `Good morning, ${firstName}`}<span className="wave">✳</span></h1><p className="page-subtitle">A little progress each day adds up to big results.</p></div><button className="outline-button" onClick={onQuiz}><Target size={16} /> Quick practice</button></div>
    <div className="hero-card">
      <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> YOUR LEARNING JOURNEY</div><h2>{language === "Hindi" ? <>सुनें और<br /><em>सीखें।</em></> : <>Listen &<br /><em>Learn.</em></>}</h2><p>Pick up your last lesson and keep the good ideas coming.</p><div className="hero-actions"><button className="hero-button" onClick={() => onOpen(continuing)}>{language === "Hindi" ? "सीखना शुरू करें" : "Start learning"} <ArrowRight size={16} /></button><button className="outline-button call-cta" onClick={onCall}><Mic size={15} /> Call Guru Ji</button></div><div className="hero-progress-meta"><span><strong>{continuing.progress}%</strong> course progress</span><span>{continuing.lessons} lessons <i>·</i> {continuing.duration}</span></div><div className="hero-progress"><span style={{ width: `${continuing.progress}%` }} /></div></div>
      <div className="hero-art" aria-hidden="true"><div className="hero-circle circle-one" /><div className="hero-circle circle-two" /><div className="hero-plant">✳</div><div className="hero-headphones"><Headphones size={62} strokeWidth={1.25} /></div><span className="hero-star star-one">✦</span><span className="hero-star star-two">✧</span><span className="hero-art-label">LEARN AT YOUR PACE</span><div className="floating-note"><AudioLines size={15} /><span>One lesson at a time.</span></div></div>
    </div>
    <nav className="home-category-chips" aria-label="Browse learning categories">{browseChips.map((chip) => <button key={chip} onClick={() => onBrowseChip(chip)}>{chip}</button>)}</nav>
    <div className="section-head"><div><span className="section-eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Continue learning</h2></div><button className="text-link" onClick={() => onView("my-learning")}>My learning <ArrowRight size={15} /></button></div>
    <div className="course-carousel" role="region" aria-label="Continue learning courses" tabIndex={0}>{courses.filter((course) => course.progress > 0).slice(0, 4).map((course) => <CourseCard key={course.id} course={course} onOpen={onOpen} saved={savedIds.includes(course.id)} onSave={onSave} />)}</div>
    {rows.map(({ title, list }) => <section key={title} className="home-shelf"><div className="section-head carousel-heading"><div><span className="section-eyebrow">EXPLORE BY INTEREST</span><h2>{title}</h2></div><button className="text-link" onClick={() => onView("explore")}>See all <ArrowRight size={15} /></button></div><div className="course-carousel" role="region" aria-label={title} tabIndex={0}>{list.map((course) => <CourseCard key={`${title}-${course.id}`} course={course} onOpen={onOpen} saved={savedIds.includes(course.id)} onSave={onSave} />)}</div></section>)}
    <section className="quiz-zone-banner"><div><span className="section-eyebrow">PLAY AND PRACTICE</span><h2>Quiz Zone</h2><p>Try a quick round, build a streak, and learn from every answer.</p></div><button className="primary-button" onClick={() => onView("games")}><Gamepad2 size={16} /> Explore games</button></section>
    <div className="section-head learning-stats-head"><div><span className="section-eyebrow">YOUR MOMENTUM</span><h2>A little progress goes a long way</h2></div><button className="text-link" onClick={() => onView("dashboard")}>View dashboard <ArrowRight size={15} /></button></div>
    <div className="stats-row">
      <div className="stat-card"><span className="stat-icon stat-lilac"><Clock3 size={17} /></span><span className="stat-label">Learning time</span><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong><small>This week <span className="stat-up">↗ 12%</span></small><div className="stat-spark spark-purple"><i /><i /><i /><i /><i /><i /><i /></div></div>
      <div className="stat-card"><span className="stat-icon stat-peach"><BookOpen size={17} /></span><span className="stat-label">Lessons done</span><strong>{completed}<small className="stat-unit"> lessons</small></strong><small>Keep that rhythm going</small><div className="stat-spark spark-orange"><i /><i /><i /><i /><i /><i /><i /></div></div>
      <div className="stat-card"><span className="stat-icon stat-sage"><Activity size={17} /></span><span className="stat-label">Overall progress</span><strong>{progressAverage}<small className="stat-unit">%</small></strong><small>Across your courses</small><div className="stat-spark spark-green"><i /><i /><i /><i /><i /><i /><i /></div></div>
      <div className="stat-card streak-stat"><span className="stat-icon stat-yellow"><Flame size={17} /></span><span className="stat-label">Current streak</span><strong>3<small className="stat-unit"> days</small></strong><small>Best streak: 7 days</small><div className="streak-week">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index} className={index < 3 ? "day-done" : ""}>{index < 3 ? <Check size={11} /> : day}</span>)}</div></div>
    </div>
    <section className="trust-row"><div><strong>Made for daily learning</strong><span>Short lessons that fit your routine</span></div><div><strong>Learn at your pace</strong><span>Pause, resume, and revisit ideas</span></div><div><strong>Demo content</strong><span>Sample lessons and local progress</span></div></section>
    <div className="bottom-feature-row"><div className="quote-card"><span className="quote-mark">“</span><div><p>Small steps every day lead to remarkable places.</p><span>A NOTE TO YOUR FUTURE SELF</span></div><div className="quote-decoration">✳</div></div><button className="tutor-teaser" onClick={() => onView("tutor")}><span className="tutor-teaser-icon"><Sparkles size={20} /></span><span><strong>Got a question?</strong><small>Your AI study buddy is here to help.</small></span><ArrowRight size={17} /></button></div>
    <section className="faq-mini"><h2>Learning, made simple</h2><details><summary>Can I continue where I stopped?</summary><p>Yes. In this demo, chapter positions and notes are saved locally in this browser.</p></details><details><summary>Are lessons available offline?</summary><p>The app shell works offline after a supported install; sample audio is bundled, while cloud sync is not included.</p></details></section>
  </div>;
}

function ExplorePage({ courses, category, onCategory, onOpen, savedIds, onSave, query, onQuery }: {
  courses: Course[]; category: string; onCategory: (category: string) => void; onOpen: (course: Course, index?: number) => void;
  savedIds: string[]; onSave: (id: string) => void; query: string; onQuery: (query: string) => void;
}) {
  const subjects = ["All subjects", "Mathematics", "Science", "English", "Hindi", "GK", "Computer", "History", "Languages"];
  const [lengthFilter, setLengthFilter] = useState("Any length");
  const [levelFilter, setLevelFilter] = useState("Any class");
  const [sortBy, setSortBy] = useState("Recommended");
  const visibleCourses = useMemo(() => {
    const filtered = courses.filter((course) => (lengthFilter === "Any length" || Number(course.duration.match(/\d+/)?.[0] ?? 0) < 4)
      && (levelFilter === "Any class" || course.level === levelFilter));
    if (sortBy === "Top rated") return [...filtered].sort((a, b) => Number(b.rating) - Number(a.rating));
    if (sortBy === "Shortest") return [...filtered].sort((a, b) => durationInMinutes(a.duration) - durationInMinutes(b.duration));
    return filtered;
  }, [courses, lengthFilter, levelFilter, sortBy]);
  return <div className="page-content">
    <div className="explore-hero"><div><div className="section-eyebrow">A WORLD OF IDEAS, ONE LESSON AWAY</div><h1>Follow your<br /><em>curiosity.</em></h1><p>Thoughtful courses, made for the way you like to learn.</p></div><div className="explore-doodle"><span>✳</span><AudioLines size={64} strokeWidth={1.2} /><i>✦</i></div></div>
    <div className="explore-controls"><label className="explore-search"><Search size={17} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="A subject, a skill, a new idea…" /><kbd>⌘ K</kbd></label><label className="select-control"><Activity size={15} /><select aria-label="Filter by course duration" value={lengthFilter} onChange={(event) => setLengthFilter(event.target.value)}><option>Any length</option><option>Under 4 hours</option></select><ChevronDown size={13} /></label><label className="select-control class-filter"><select aria-label="Filter by class" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option>Any class</option><option>Class 8</option><option>Class 11</option><option>Class 12</option><option>Exam prep</option><option>All classes</option><option>All levels</option></select><ChevronDown size={13} /></label></div>
    <div className="category-pills">{subjects.map((subject) => <button key={subject} className={category === subject ? "selected" : ""} onClick={() => onCategory(subject)}>{subject}</button>)}</div>
    <div className="explore-result-head"><div><h2>{query ? "Search results" : "Courses to spark your curiosity"}</h2><span>{visibleCourses.length} thoughtful {visibleCourses.length === 1 ? "course" : "courses"} to explore</span></div><label className="select-control sort-control"><select aria-label="Sort courses" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option>Recommended</option><option>Top rated</option><option>Shortest</option></select><ChevronDown size={13} /></label></div>
    {visibleCourses.length ? <div className="course-grid explore-course-grid">{visibleCourses.map((course) => <CourseCard key={course.id} course={course} onOpen={onOpen} saved={savedIds.includes(course.id)} onSave={onSave} />)}</div> : <div className="empty-state"><span><Search size={22} /></span><h3>No courses found just yet</h3><p>Try a different search or subject. Your next aha moment is out there.</p><button className="outline-button" onClick={() => { onQuery(""); onCategory("All subjects"); setLengthFilter("Any length"); }}>Clear filters</button></div>}
    <div className="explore-bottom"><Sparkles size={16} /> New courses are added as your learning library grows. <span>Check back for more.</span></div>
  </div>;
}

function durationInMinutes(duration: string) {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 60 + minutes;
}

function CourseCard({ course, onOpen, saved, onSave }: { course: Course; onOpen: (course: Course) => void; saved: boolean; onSave: (id: string) => void }) {
  return <article className="course-card">
    <div className={`course-art art-${course.accent}`}><div className="art-grain" /><span className="art-symbol">{course.icon}</span><span className="course-subject-tag">{course.subject}</span><button className={`card-save ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remove saved course" : "Save course"} onClick={(event) => { event.stopPropagation(); onSave(course.id); }}><Heart size={16} fill={saved ? "currentColor" : "none"} /></button><span className="art-label">{course.subject === "Science" ? "THE EVERYDAY EXPLAINED" : course.subject === "Mathematics" ? "A NEW WAY TO SEE IT" : course.subject === "History" ? "STORIES THAT SHAPED US" : "FIND YOUR VOICE"}</span><span className="art-illustration">{course.subject === "Science" ? <AudioLines size={42} /> : course.subject === "Mathematics" ? "∿" : course.subject === "History" ? "✳" : "Aa"}</span><span className="art-lesson-count">{course.lessons} lessons</span><button className="art-play" aria-label={`Play ${course.title}`} onClick={() => onOpen(course)}><Play size={19} fill="currentColor" /></button></div>
    <div className="course-card-body"><div className="course-meta"><span>{course.level}</span><span className="rating"><Star size={12} fill="currentColor" /> {course.rating}</span></div><button className="course-title-button" onClick={() => onOpen(course)}><h3>{course.title}</h3></button><p className="course-description">{course.description}</p><div className="course-instructor"><span className={`instructor-avatar instructor-${course.accent}`}>{course.instructor[0]}</span><span>{course.instructor}</span><span className="instructor-sep">·</span><span>{course.duration}</span></div>{course.progress > 0 && <div className="card-progress"><div><span>YOUR PROGRESS</span><strong>{course.progress}%</strong></div><div className="card-progress-track"><span style={{ width: `${course.progress}%` }} /></div></div>}<button className="course-open-button" onClick={() => onOpen(course)}>{course.progress > 0 ? "Continue course" : "Explore course"}<ArrowRight size={15} /></button></div>
  </article>;
}

function LearningPage({ course, chapterIndex, elapsed, onSeek, onOpen, onChapter, onQuiz, savedIds, onSave, bookmarks, onBookmark, onJumpBookmark, note, onNoteChange }: {
  course: Course; chapterIndex: number; elapsed: number; onSeek: (time: number) => void; onOpen: (course: Course, index?: number) => void; onChapter: (index: number) => void;
  onQuiz: () => void; savedIds: string[]; onSave: (id: string) => void; bookmarks: number[];
  onBookmark: () => void; onJumpBookmark: (position: number) => void; note: string; onNoteChange: (value: string) => void;
}) {
  const chapter = course.chapters[chapterIndex];
  const slides = chapter.slides ?? [
    { time: 0, title: chapter.title, text: chapter.body.slice(0, 125) },
    { time: 15, title: "Key idea", text: "Pause and summarize the important point from this lesson in your own words." },
    { time: 30, title: "Quick recap", text: "Review your notes and try the chapter quiz to check your understanding." },
  ];
  const slideIndex = Math.max(0, slides.reduce((current, slide, index) => elapsed >= slide.time ? index : current, 0));
  const slide = slides[slideIndex];
  return <div className="page-content learning-page">
    <button className="back-link" onClick={() => onOpen(course)}><ArrowLeft size={15} /> All courses</button>
    <div className="learning-heading"><div><div className="section-eyebrow">{course.subject.toUpperCase()} <span>·</span> {course.level.toUpperCase()}</div><h1>{course.title}</h1><p>{course.description}</p></div><button className={`outline-button save-course-btn ${savedIds.includes(course.id) ? "is-saved" : ""}`} onClick={() => onSave(course.id)}><Heart size={16} fill={savedIds.includes(course.id) ? "currentColor" : "none"} />{savedIds.includes(course.id) ? "Saved" : "Save course"}</button></div>
    <div className="learning-layout"><div className="lesson-column">
      <div className={`lesson-art lesson-art-${course.accent}`}><span className="lesson-art-glow" /><div className="lesson-art-content"><span className="lesson-art-eyebrow">AUDIO LESSON <i>·</i> {course.instructor.toUpperCase()}</span><div className="lesson-art-symbol">{course.icon}</div><h2>{chapter.title}</h2><div className="lesson-art-bottom"><span><Headphones size={14} /> Listen & learn</span><span>{chapter.duration} min</span></div></div><div className="lesson-art-lines">∿</div></div>
      <section className="lesson-slides" aria-label="Audio-synced lesson slides"><div className="slides-head"><span className="section-eyebrow">SLIDES · AUDIO SYNC</span><span>{String(slideIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span></div><div className="slide-stage"><span>{course.subject.toUpperCase()} · VISUAL NOTES</span><h3>{slide.title}</h3><p>{slide.text}</p></div><div className="slide-points">{slides.map((item, index) => <button key={`${item.time}-${item.title}`} className={index === slideIndex ? "active" : ""} onClick={() => onSeek(item.time)} aria-label={`Jump to slide ${index + 1} at ${formatTime(item.time)}`}><span />{item.title}</button>)}</div></section>
      <div className="lesson-description-head"><div><span className="section-eyebrow">LESSON {String(chapterIndex + 1).padStart(2, "0")}</span><h2>{chapter.title}</h2></div><button className="lesson-more" title="Add a timestamp bookmark" aria-label="Add timestamp bookmark" disabled={!chapter.audioSrc} onClick={onBookmark}><Bookmark size={16} /></button></div>
      <p className="lesson-body-copy">{chapter.body}</p>
      <div className="chapter-bookmarks"><div className="bookmark-list-head"><span className="section-eyebrow">TIMESTAMP BOOKMARKS</span><button className="text-link" disabled={!chapter.audioSrc} onClick={onBookmark}><Plus size={13} /> Save current time</button></div>{bookmarks.length ? <div className="bookmark-chips">{bookmarks.map((position) => <button key={position} onClick={() => onJumpBookmark(position)}><Bookmark size={12} /> {formatTime(position)}</button>)}</div> : <p>Save a moment in the audio to revisit it later.</p>}</div>
      <div className="lesson-insight"><span><Sparkles size={16} /></span><p><strong>Remember this:</strong> {getCourseReminder(course)}</p></div>
      <label className="chapter-notes"><span><BookOpen size={15} /> Your notes <small>Private to this demo browser</small></span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Write a thought or something you'd like to remember…" rows={3} /></label>
      <div className="lesson-actions"><button className="outline-button" onClick={() => onQuiz()}><Target size={16} /> Take quiz</button><button className="text-link" onClick={() => onOpen(course, Math.min(chapterIndex + 1, course.chapters.length - 1))}>Next chapter <ArrowRight size={15} /></button></div>
    </div><aside className="curriculum-card">    <div className="curriculum-top"><div><span className="section-eyebrow">YOUR COURSE</span><h3>In this course</h3></div><span className="curriculum-count">{course.chapters.length} chapters · {course.lessons} lessons</span></div><div className="curriculum-progress"><div><span>Course progress</span><strong>{course.progress}%</strong></div><div className="card-progress-track"><span style={{ width: `${course.progress}%` }} /></div></div><div className="curriculum-list">{course.chapters.map((item, index) => <button key={item.title} className={`chapter-row ${index === chapterIndex ? "chapter-active" : ""}`} onClick={() => onChapter(index)}><span className="chapter-number">{index < chapterIndex ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span><span className="chapter-info"><strong>{item.title}</strong><small><Headphones size={12} /> {item.lessons?.length ?? 1} lesson units · {item.duration} min</small></span>{index === chapterIndex && <span className="chapter-playing"><AudioLines size={16} /></span>}</button>)}</div><div className="curriculum-tip"><span><LightbulbIcon /></span><p>Little tip: listening once, then explaining it in your own words, helps it stick.</p></div></aside></div>
    <div className="course-bottom-note"><Languages size={15} /> {chapter.audioSrc ? "Original sample narration is available for this chapter." : "No audio has been published for this chapter yet."} <button onClick={() => onQuiz()}>Try a practice quiz <ArrowRight size={13} /></button></div>
  </div>;
}

function LightbulbIcon() {
  return <Sparkles size={16} />;
}

function getCourseReminder(course: Course) {
  if (course.subject === "Mathematics") return "A derivative captures how quickly something changes at a particular instant.";
  if (course.subject === "History") return "Connect events to the people, places, and ideas around them to understand change.";
  if (course.subject === "Languages") return "Clear, consistent practice matters more than perfect grammar when you are getting started.";
  return "Good physics starts with asking, “Compared to what?” A frame of reference changes how we describe motion.";
}

function TutorPage({ chat, input, onInput, onSend, course, voiceName, studentClass, onCall }: { chat: ChatMessage[]; input: string; onInput: (value: string) => void; onSend: (text?: string) => void; course: Course; voiceName: string; studentClass: number; onCall: () => void }) {
  const messageEnd = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat]);
  const suggestions = ["Explain this more simply", "Give me a real-life example", "Make me a quick quiz"];
  function copyAnswer(text: string, index: number) {
    if (!navigator.clipboard) {
      setFeedback((items) => ({ ...items, [index]: "Copy unavailable" }));
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => setFeedback((items) => ({ ...items, [index]: "Copied" })))
      .catch((error: unknown) => {
        console.error("Could not copy tutor answer.", error);
        setFeedback((items) => ({ ...items, [index]: "Copy failed" }));
      });
  }
  return <div className="page-content tutor-page"><div className="tutor-heading"><div><div className="section-eyebrow">THINK IT THROUGH TOGETHER</div><h1>Your AI study buddy<span className="tutor-spark">✳</span></h1><p>Curiosity is a great place to start. What's on your mind?</p></div><span className="demo-chip"><span /> PRACTICE MODE</span></div>
    <div className="tutor-layout"><aside className="tutor-context"><div className="context-card"><div className="context-icon"><BookOpen size={19} /></div><span className="section-eyebrow">LEARNING RIGHT NOW</span><h3>{course.title}</h3><p>{course.subject} <i>·</i> {course.level}</p><div className="context-divider" /><div className="context-current"><AudioLines size={15} /><span><small>UP NEXT</small><strong>{course.chapters[0].title}</strong></span></div></div><div className="tutor-suggestions"><span className="section-eyebrow">TRY ASKING</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => onSend(suggestion)}>{suggestion}<ArrowRight size={13} /></button>)}</div><div className="tutor-safety"><ShieldCheck size={15} /><span>Use this as a learning companion. Double-check important answers with your course material.</span></div></aside>
      <section className="chat-panel"><div className="chat-header"><span className="tutor-avatar"><Sparkles size={17} /></span><div><strong>StudyAI tutor · {voiceName}</strong><span><span className="online-dot" /> Class {studentClass} · Ready to help</span></div><button className="outline-button call-cta" onClick={onCall}><Mic size={15} /> Call Guru Ji</button><span className="chat-demo-tag">DEMO</span></div><div className="chat-messages">{chat.map((message, index) => <div key={`${index}-${message.text.slice(0, 10)}`} className={`chat-message ${message.role === "student" ? "student-message" : ""}`}>{message.role === "tutor" && <span className="message-avatar"><Sparkles size={13} /></span>}<div><span className="message-author">{message.role === "student" ? "You" : `${voiceName} · StudyAI tutor`}</span><p>{message.text}</p>{message.role === "tutor" && index > 0 && <div className="answer-feedback"><button title="Mark answer helpful" onClick={() => setFeedback((items) => ({ ...items, [index]: "Thanks for your feedback" }))}>{feedback[index] ?? <>Helpful <Check size={12} /></>}</button><button title="Copy answer" onClick={() => copyAnswer(message.text, index)}>{feedback[index] === "Copied" ? "Copied" : "Copy"}</button></div>}</div></div>)}<div ref={messageEnd} /></div><div className="chat-compose-wrap"><div className="chat-compose"><textarea value={input} onChange={(event) => onInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder="Ask anything about what you're learning…" rows={1} aria-label="Ask your tutor a question" /><button className="send-button" disabled={!input.trim()} onClick={() => onSend()} aria-label="Send question"><Send size={16} /></button></div><div className="compose-footer"><span><LockKeyhole size={12} /> Your demo chat stays in this browser session.</span><span>Press <kbd>↵</kbd> to send</span></div></div></section></div>
    <div className="tutor-config-note"><Sparkles size={15} /><span>Sample tutor mode</span> — live AI requires a server-side provider key. No questions are sent to a service in this demo.</div>
  </div>;
}

function CallModal({ open, status, transcript, seconds, summary, onClose, voiceName }: { open: boolean; status: "connecting" | "listening" | "thinking" | "speaking" | "ended"; transcript: Array<{ speaker: "ai" | "student"; text: string; kind?: "hint" }>; seconds: number; summary?: { topic: string; keyPoints: string[]; score: number; nextLesson: string }; onClose: () => void; voiceName: string }) {
  if (!open) return null;
  const minutesDisplay = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsDisplay = String(seconds % 60).padStart(2, "0");
  const statusText = status === "connecting" ? "Connecting…" : status === "listening" ? "Listening" : status === "thinking" ? "Thinking…" : status === "speaking" ? "Speaking" : "Call ended";
  return <div className="modal-backdrop call-modal-backdrop" role="dialog" aria-modal="true" aria-label="StudyAI voice call"><section className="call-screen"><div className="call-header"><div><span className="call-pill">LIVE</span><strong>{voiceName}</strong></div><button className="icon-button call-close" onClick={onClose} aria-label="End voice call"><X size={18} /></button></div><div className="call-avatar"><div>{voiceName.slice(0, 2).toUpperCase()}</div></div><div className="call-status-line"><span className={`call-status-dot ${status}`} /><span>{statusText}</span><strong>{minutesDisplay}:{secondsDisplay}</strong></div><div className="waveform" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} className={status === "speaking" || status === "listening" ? "active" : ""} style={{ animationDelay: `${index * 90}ms` }} />)}</div><div className="call-transcript">{transcript.length === 0 ? <p className="empty-call-copy">Hi! I’m ready to explain this topic in simple steps.</p> : transcript.slice(-4).map((entry, index) => <div key={`${entry.speaker}-${index}`} className={`transcript-bubble ${entry.speaker}`}>{entry.text}</div>)}</div>{summary && <div className="call-summary-card"><div className="section-eyebrow">CALL SUMMARY</div><h3>{summary.topic}</h3><ul>{summary.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul><div className="call-summary-meta"><span>Score {summary.score}%</span><span>Next: {summary.nextLesson}</span></div></div>}<div className="call-controls"><button className="outline-button" type="button">Mute</button><button className="outline-button" type="button">Speaker</button><button className="outline-button" type="button">Hint</button><button className="primary-button danger-button" type="button" onClick={onClose}>End call</button></div></section></div>;
}

function ProfilePage({ name, email, minutes, completed, progress, savedCount, theme, setTheme, studentClass, board, studyLanguage, setStudyLanguage, voiceId, onEditLearning, onEditVoice, autoPlayNext, setAutoPlayNext, voiceSpeed, setVoiceSpeed, voicePitch, setVoicePitch, onReset }: {
  name: string; email: string; minutes: number; completed: number; progress: number; savedCount: number; theme: ThemeName; setTheme: (theme: ThemeName) => void;
  studentClass: number; board: BoardName; studyLanguage: StudyLanguage; setStudyLanguage: (language: StudyLanguage) => void; voiceId: string; onEditLearning: () => void; onEditVoice: () => void;
  autoPlayNext: boolean; setAutoPlayNext: (value: boolean) => void; voiceSpeed: number; setVoiceSpeed: (value: number) => void; voicePitch: number; setVoicePitch: (value: number) => void; onReset: () => void;
}) {
  const selectedVoice = studyVoices.find((voice) => voice.id === voiceId) ?? studyVoices[0];
  const themeOptions: { id: ThemeName; label: string; color: string }[] = [
    { id: "dark", label: "Dark", color: "#23212d" }, { id: "light", label: "Light", color: "#f6f5fa" },
    { id: "amoled", label: "AMOLED", color: "#000" }, { id: "sunrise", label: "Sunrise", color: "#f3a77f" },
    { id: "forest", label: "Forest", color: "#4c8764" }, { id: "ocean", label: "Ocean", color: "#4b83b6" },
    { id: "kids", label: "Kids Bright", color: "#ffcf58" },
  ];
  return <div className="page-content profile-page"><div className="profile-heading"><div className="profile-large-avatar">{name?.[0]?.toUpperCase() ?? "L"}</div><div><div className="section-eyebrow">YOUR LEARNING SPACE</div><h1>{name || "Guest learner"}</h1><p>{email || "Demo profile · this device only"}</p></div><span className="plan-chip">FREE · DEMO</span></div>
    <div className="profile-stats"><div><Clock3 size={18} /><span>Learning time</span><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong></div><div><BookOpen size={18} /><span>Lessons completed</span><strong>{completed}</strong></div><div><Activity size={18} /><span>Course progress</span><strong>{progress}%</strong></div><div><Bookmark size={18} /><span>Saved courses</span><strong>{savedCount}</strong></div></div>
    <div className="settings-section"><div className="settings-title"><div><span className="section-eyebrow">MAKE IT YOURS</span><h2>Learning profile</h2></div></div><div className="settings-row"><span className="settings-icon"><BookOpen size={18} /></span><span><strong>Class & curriculum</strong><small>Class {studentClass} · {board} · {studyLanguage}</small></span><button className="outline-button settings-action" onClick={onEditLearning}>Change</button></div><div className="settings-row"><span className="settings-icon"><Languages size={18} /></span><span><strong>Learning language</strong><small>Choose Hindi, Hinglish or English</small></span><select aria-label="Learning language" value={studyLanguage} onChange={(event) => setStudyLanguage(event.target.value as StudyLanguage)}><option>Hindi</option><option>Hinglish</option><option>English</option></select></div><div className="settings-row voice-settings-row"><span className="settings-icon"><Headphones size={18} /></span><span><strong>AI voice · {selectedVoice.name}</strong><small>{selectedVoice.style} · preview and tutor profile</small></span><button className="outline-button settings-action" onClick={onEditVoice}>Choose voice</button></div><div className="voice-preferences"><label>Voice speed <select aria-label="Voice speed" value={voiceSpeed} onChange={(event) => setVoiceSpeed(Number(event.target.value))}><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label><label>Voice pitch <span>{voicePitch.toFixed(1)}</span><input aria-label="Voice pitch" type="range" min="0.7" max="1.3" step="0.1" value={voicePitch} onChange={(event) => setVoicePitch(Number(event.target.value))} /></label><label className="autoplay-setting"><span><strong>Auto-play next lesson</strong><small>Continue when a lesson ends</small></span><button className={`toggle-switch ${autoPlayNext ? "on" : ""}`} role="switch" aria-checked={autoPlayNext} aria-label="Auto-play next lesson" onClick={() => setAutoPlayNext(!autoPlayNext)}><span /></button></label></div></div>
    <div className="settings-section theme-settings-section"><div className="settings-title"><div><span className="section-eyebrow">A LOOK THAT FEELS LIKE YOU</span><h2>Choose a theme</h2></div></div><div className="theme-picker">{themeOptions.map((option) => <button key={option.id} className={theme === option.id ? "selected" : ""} aria-label={`Use ${option.label} theme`} aria-pressed={theme === option.id} onClick={() => setTheme(option.id)}><span style={{ background: option.color }} /><strong>{option.label}</strong></button>)}</div></div>
    <div className="settings-section"><div className="settings-title"><div><span className="section-eyebrow">YOUR PRIVACY</span><h2>Privacy & safety</h2></div></div><div className="settings-row"><span className="settings-icon"><ShieldCheck size={18} /></span><span><strong>Your privacy</strong><small>Demo data stays on this device. Voice previews are not recorded.</small></span><span className="settings-value settings-local"><LockKeyhole size={13} /> On this device</span></div></div>
    <div className="demo-account-note"><CircleHelp size={17} /><div><strong>About your demo profile</strong><p>There is no real account or cloud sync in this starter. Your learning data stays in your browser's local storage. Clearing site data will remove it.</p></div></div><button className="reset-demo-button" onClick={onReset}><LogOut size={15} /> Reset demo profile and progress</button>
  </div>;
}

function makeTutorReply(question: string, courseTitle: string) {
  const q = question.toLowerCase();
  if (q.includes("example")) return `Here's a real-life example connected to ${courseTitle}: imagine cycling around your neighbourhood. Your odometer measures distance, while a map's straight line from your home to your destination shows displacement. That difference makes the idea easier to picture. What part would you like to explore next?`;
  if (q.includes("quiz")) return "Quick check: if you walk 100 metres east, then 100 metres west back to where you started, what is your total distance—and what is your displacement? Try answering before you peek at your notes.";
  if (q.includes("simply") || q.includes("simple")) return `Let's make it simpler. In ${courseTitle}, the big idea is to notice what is changing and how we describe that change. Start with one everyday example, then connect each new term to something you can picture. Which specific word or step feels confusing?`;
  return `Great question. Let's break it down in the context of ${courseTitle}. Start by identifying the key idea, then connect it to one thing you already know. For this lesson, try explaining the concept in your own words first. I can give a more targeted answer if you share the exact topic or a line from your notes.`;
}

type LiveRoomSummary = {
  id: string;
  code: string;
  name: string;
  roomType: string;
  subject: string;
  classRange: string;
  scheduledAt?: string;
  joinUrl: string;
  locked: boolean;
  waitingRoom: boolean;
  participants: { identity: string; name: string; role: string; handRaised: boolean }[];
};
type LiveMessage = { id: string; identity: string; name: string; text: string; sentAt: number };
type LiveQuestion = { prompt: string; options: string[]; subject: string; questionNumber: number; deadline: number; mode: string; scores: Record<string, number> };
type MediaDevice = { deviceId: string; label: string; kind: MediaDeviceKind };

function RoomVideoTile({ participant, isLocal }: { participant: Participant; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const track = participant.getTrackPublication("screen_share" as LiveKitTrack.Source)?.track
    ?? participant.getTrackPublication("camera" as LiveKitTrack.Source)?.track;
  useEffect(() => {
    if (!track || !videoRef.current) return;
    track.attach(videoRef.current);
    return () => { track.detach(videoRef.current!); };
  }, [track]);
  const quality = String(participant.connectionQuality).toLowerCase();
  return <article className={`room-video-tile ${isLocal ? "is-local" : ""}`}>
    {track && <video ref={videoRef} autoPlay playsInline muted={isLocal} />}
    {!track && <span className="room-avatar">{participant.name?.[0]?.toUpperCase() ?? "S"}</span>}
    <span className="room-video-name">{participant.name || "Learner"}{isLocal ? " · you" : ""}</span>
    <span className={`quality-dot quality-${quality === "excellent" || quality === "good" ? "good" : quality === "poor" ? "poor" : "unknown"}`} title={`Connection: ${quality}`} />
  </article>;
}

function LiveRoomsPage({ learnerName, onNotice }: { learnerName: string; onNotice: (message: string) => void }) {
  const [roomType, setRoomType] = useState("study-group");
  const [roomName, setRoomName] = useState("Study together");
  const [subject, setSubject] = useState("Mathematics");
  const [classRange, setClassRange] = useState("Class 8");
  const [scheduleAt, setScheduleAt] = useState("");
  const [codeInput, setCodeInput] = useState(new URLSearchParams(window.location.search).get("room") ?? "");
  const [displayName, setDisplayName] = useState(learnerName);
  const [ageBand, setAgeBand] = useState<"adult" | "under18">("adult");
  const [parentConsent, setParentConsent] = useState(false);
  const [room, setRoom] = useState<LiveRoomSummary>();
  const [hostSecret, setHostSecret] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    return code ? sessionStorage.getItem(`studyai-live-host-${code}`) ?? "" : "";
  });
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem("studyai-live-token") ?? "");
  const [joinState, setJoinState] = useState<"browse" | "preview" | "waiting" | "live">("browse");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomRoster, setRoomRoster] = useState<LiveRoomSummary["participants"]>([]);
  const [waitingList, setWaitingList] = useState<{ identity: string; name: string }[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [question, setQuestion] = useState<LiveQuestion>();
  const [gameResult, setGameResult] = useState<{ correctIndex: number; fastestIdentity?: string; scores: Record<string, number>; awarded?: number }>();
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [selectedChoice, setSelectedChoice] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Ready to join");
  const [roomLocked, setRoomLocked] = useState(false);
  const [everyoneMuted, setEveryoneMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "speaker" | "game">("grid");
  const [cameraPreviewError, setCameraPreviewError] = useState("");
  const [mediaDevices, setMediaDevices] = useState<MediaDevice[]>([]);
  const [microphoneId, setMicrophoneId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream>();
  const rtcRef = useRef<LiveKitRoom>();
  const socketRef = useRef<Socket>();
  const roomRef = useRef<LiveRoomSummary>();
  const hostSecretRef = useRef("");

  useEffect(() => {
    roomRef.current = room;
    hostSecretRef.current = hostSecret;
  }, [room, hostSecret]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    if (!code) return;
    setCodeInput(code);
    setRoom({ id: "", code, name: "Invited study room", roomType: "study-group", subject: "General", classRange: "All classes", joinUrl: `/?room=${code}`, locked: false, waitingRoom: false, participants: [] });
    setHostSecret(sessionStorage.getItem(`studyai-live-host-${code}`) ?? "");
    setJoinState("preview");
  }, []);

  useEffect(() => {
    if (joinState !== "preview" || !navigator.mediaDevices?.getUserMedia) return;
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(async (stream) => {
      if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
      previewStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCameraPreviewError("");
      setMediaDevices((await navigator.mediaDevices.enumerateDevices()).map(({ deviceId, label, kind }) => ({ deviceId, label: label || `${kind} device`, kind })));
    }).catch((reason: unknown) => {
      console.error("Camera/microphone preview permission was denied or unavailable.", reason);
      setCameraPreviewError("Camera/microphone preview is unavailable. You can still join with audio/video off.");
    });
    return () => {
      active = false;
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = undefined;
    };
  }, [joinState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (question) setSecondsLeft(Math.max(0, Math.ceil((question.deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [question]);

  useEffect(() => () => {
    socketRef.current?.disconnect();
    void rtcRef.current?.disconnect();
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function parseResponse<T>(response: Response): Promise<T> {
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`);
    return result;
  }

  async function createSession() {
    const authenticatedToken = sessionStorage.getItem("studyai-auth-token");
    if (authenticatedToken) {
      setAuthToken(authenticatedToken);
      return authenticatedToken;
    }
    const profileKey = `${displayName.trim() || learnerName}|${ageBand}|${parentConsent}`;
    const existing = sessionStorage.getItem("studyai-live-token");
    if (existing && sessionStorage.getItem("studyai-live-profile") === profileKey) return existing;
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName.trim() || learnerName, ageBand, parentConsent }),
    });
    const session = await parseResponse<{ token: string; demoOnly: boolean; warning: string }>(response);
    setAuthToken(session.token);
    sessionStorage.setItem("studyai-live-token", session.token);
    sessionStorage.setItem("studyai-live-profile", profileKey);
    if (session.demoOnly) onNotice("Local development session only—this is not student authentication.");
    return session.token;
  }

  async function createRoom() {
    setLoading(true); setError("");
    try {
      const token = await createSession();
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomType, name: roomName, subject, classRange, scheduledAt: scheduleAt || undefined }),
      });
      const result = await parseResponse<{ room: LiveRoomSummary; hostSecret: string; mediaReady: boolean }>(response);
      setRoom(result.room); setHostSecret(result.hostSecret); setRoomLocked(false);
      setEveryoneMuted(false);
      sessionStorage.setItem(`studyai-live-host-${result.room.code}`, result.hostSecret);
      const invite = `${window.location.origin}/?room=${result.room.code}`;
      window.history.replaceState({}, "", `/?room=${result.room.code}`);
      setCodeInput(result.room.code); setJoinState("preview");
      if (result.room.scheduledAt) {
        const delay = new Date(result.room.scheduledAt).getTime() - Date.now();
        if (delay > 0 && delay < 2_147_000_000 && "Notification" in window) {
          const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
          if (permission === "granted") window.setTimeout(() => new Notification("StudyAI room is ready", { body: `${roomName} · ${subject}` }), delay);
        }
        downloadCalendar(result.room);
      }
      if (!result.mediaReady) setError("Room created. LiveKit video is not configured yet—add server credentials to enable the call.");
      else onNotice(`Room created. Share code ${result.room.code} or its invite link.`);
      void navigator.clipboard?.writeText(invite).catch((reason: unknown) => console.error("Room invite link could not be copied.", reason));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the room.");
    } finally { setLoading(false); }
  }

  function downloadCalendar(scheduledRoom: LiveRoomSummary) {
    if (!scheduledRoom.scheduledAt) return;
    const start = new Date(scheduledRoom.scheduledAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(new Date(scheduledRoom.scheduledAt).getTime() + 60 * 60_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const invite = `${window.location.origin}/?room=${scheduledRoom.code}`;
    const content = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyAI//Live Room//EN\r\nBEGIN:VEVENT\r\nUID:${scheduledRoom.id}@studyai\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${scheduledRoom.name}\r\nURL:${invite}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
    link.download = `studyai-room-${scheduledRoom.code}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function enterLobby(code = codeInput) {
    setLoading(true); setError("");
    try {
      if (!/^\d{6}$/.test(code)) throw new Error("Enter a valid six-digit room code.");
      const token = await createSession();
      const knownRoom = roomRef.current;
      setRoom(knownRoom?.code === code ? knownRoom : { id: "", code, name: "Study room", roomType: "study-group", subject: "General", classRange: "All classes", joinUrl: `/?room=${code}`, locked: false, waitingRoom: false, participants: [] });
      setCodeInput(code);
      setJoinState("preview");
      window.history.replaceState({}, "", `/?room=${code}`);
      setAuthToken(token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The room could not be opened.");
    } finally { setLoading(false); }
  }

  async function startMedia(serverUrl: string, token: string) {
    const { Room, RoomEvent } = await import("livekit-client");
    const rtc = new Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: true });
    rtcRef.current = rtc;
    const updateParticipants = () => setParticipants([rtc.localParticipant, ...rtc.remoteParticipants.values()]);
    rtc.on(RoomEvent.ParticipantConnected, updateParticipants);
    rtc.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    rtc.on(RoomEvent.TrackSubscribed, updateParticipants);
    rtc.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    rtc.on(RoomEvent.LocalTrackPublished, updateParticipants);
    rtc.on(RoomEvent.LocalTrackUnpublished, updateParticipants);
    rtc.on(RoomEvent.ConnectionStateChanged, (state) => setConnectionStatus(state === "connected" ? "Connected" : state === "reconnecting" ? "Reconnecting…" : state));
    rtc.on(RoomEvent.ConnectionQualityChanged, updateParticipants);
    await rtc.connect(serverUrl, token, { autoSubscribe: true });
    try {
      await rtc.localParticipant.setMicrophoneEnabled(micEnabled, microphoneId ? { deviceId: microphoneId } : undefined);
      if (cameraEnabled) await rtc.localParticipant.setCameraEnabled(true, cameraId ? { deviceId: cameraId } : undefined);
    } catch (reason) {
      console.error("Unable to publish local camera/microphone tracks.", reason);
      setCameraPreviewError("Camera or microphone permission/device failed. Try enabling audio/video in browser settings.");
    }
    updateParticipants();
    setJoinState("live");
    setConnectionStatus("Connected · adaptive quality on");
  }

  async function joinRoom() {
    if (!room || !authToken) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/rooms/${room.code}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ displayName, hostSecret }),
      });
      const access = await parseResponse<{ token: string; serverUrl: string; isHost: boolean; room: LiveRoomSummary }>(response);
      setRoom(access.room);
      setRoomLocked(access.room.locked);
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = undefined;
      const { io } = await import("socket.io-client");
      const socket = io("/", { path: "/socket.io", auth: { token: authToken }, transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("connect_error", (reason) => setError(`Room signaling failed: ${reason.message}`));
      socket.on("room:state", (nextRoom: LiveRoomSummary) => { if (nextRoom) { setRoom(nextRoom); setRoomRoster(nextRoom.participants); setRoomLocked(nextRoom.locked); } });
      socket.on("room:waiting", (list: { identity: string; name: string }[]) => setWaitingList(list));
      socket.on("room:admitted", async () => { setJoinState("preview"); setLoading(true); try { await startMedia(access.serverUrl, access.token); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect to the live room."); } finally { setLoading(false); } });
      socket.on("room:denied", ({ message }: { message: string }) => { setError(message); setJoinState("preview"); });
      socket.on("room:ended", ({ message }: { message: string }) => { setError(message); leaveRoom(); });
      socket.on("room:report", ({ reporterName, targetName, reason }: { reporterName: string; targetName: string; reason: string }) => onNotice(`Room report: ${reporterName} reported ${targetName} · ${reason}`));
      socket.on("chat:message", (message: LiveMessage) => setMessages((items) => [...items.slice(-49), message]));
      socket.on("game:question", (next: LiveQuestion) => { setQuestion(next); setSelectedChoice(undefined); setGameResult(undefined); setViewMode("game"); });
      socket.on("game:result", (result: { correctIndex: number; fastestIdentity?: string; scores: Record<string, number>; awarded?: number }) => { setGameResult(result); setQuestion(undefined); });
      socket.on("game:stopped", () => { setQuestion(undefined); setGameResult(undefined); });
      socket.on("participant:reaction", ({ identity, emoji }: { identity: string; emoji: string }) => onNotice(`${roomRoster.find((person) => person.identity === identity)?.name ?? "A learner"} ${emoji}`));
      socket.emit("room:join", { code: room.code, displayName, hostSecret }, async (result: { error?: string; waiting?: boolean; room?: LiveRoomSummary }) => {
        if (result.error) { setError(result.error); socket.disconnect(); return; }
        if (result.waiting) { setJoinState("waiting"); setConnectionStatus("Waiting for host approval"); setLoading(false); return; }
        if (result.room) { setRoom(result.room); setRoomRoster(result.room.participants); }
        try { await startMedia(access.serverUrl, access.token); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect to the live room."); socket.disconnect(); }
        finally { setLoading(false); }
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not join the room.");
      setLoading(false);
    }
  }

  async function moderate(action: string, values: Record<string, unknown> = {}) {
    if (!room || !authToken || !hostSecret) return;
    try {
      const response = await fetch(`/api/rooms/${room.code}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ action, hostSecret, ...values }),
      });
      const result = await parseResponse<{ room: LiveRoomSummary }>(response);
      setRoom(result.room); setRoomRoster(result.room.participants); setRoomLocked(result.room.locked);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Room moderation failed."); }
  }

  function leaveRoom() {
    socketRef.current?.emit("room:leave");
    socketRef.current?.disconnect();
    socketRef.current = undefined;
    void rtcRef.current?.disconnect();
    rtcRef.current = undefined;
    setParticipants([]); setMessages([]); setQuestion(undefined); setGameResult(undefined); setWaitingList([]);
    setJoinState("browse"); setRoom(undefined); setHostSecret(""); setConnectionStatus("Ready to join");
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function toggleMic() {
    const next = !micEnabled;
    setMicEnabled(next);
    try { await rtcRef.current?.localParticipant.setMicrophoneEnabled(next, microphoneId ? { deviceId: microphoneId } : undefined); }
    catch (reason) { setMicEnabled(!next); setError(reason instanceof Error ? reason.message : "Microphone could not be toggled."); }
  }
  async function toggleCamera() {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    try { await rtcRef.current?.localParticipant.setCameraEnabled(next, cameraId ? { deviceId: cameraId } : undefined); }
    catch (reason) { setCameraEnabled(!next); setError(reason instanceof Error ? reason.message : "Camera could not be toggled."); }
  }
  async function toggleScreenShare() {
    if (!hostSecret) return;
    const next = !screenShareEnabled;
    try { await rtcRef.current?.localParticipant.setScreenShareEnabled(next); setScreenShareEnabled(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Screen sharing failed or was cancelled."); }
  }
  function sendChat() {
    if (!chatText.trim()) return;
    socketRef.current?.emit("chat:send", { text: chatText });
    setChatText("");
  }
  function startGame(mode: string) {
    socketRef.current?.emit("game:start", { mode }, (result: { error?: string }) => { if (result?.error) setError(result.error); });
  }
  function answerQuestion(index: number) {
    if (selectedChoice !== undefined) return;
    setSelectedChoice(index);
    socketRef.current?.emit("game:answer", { choice: index }, (result: { error?: string }) => { if (result?.error) setError(result.error); });
  }

  if (joinState === "browse") return <div className="page-content live-rooms-page">
    <div className="page-intro"><span className="section-eyebrow">STUDY TOGETHER · LIVEKIT SFU</span><h1>Live study rooms</h1><p>Connect over live audio/video, ask each other questions, and play host-led quiz rounds.</p></div>
    <div className="live-room-grid">
      <section className="room-setup-card"><div className="panel-title"><div><span className="section-eyebrow">START A SESSION</span><h2>Create a room</h2></div><Video size={19} /></div>
        <div className="room-presets">{liveRoomPresets.roomPresets.map((preset) => <button key={preset.name} onClick={() => { setRoomName(preset.name); setRoomType(preset.roomType); setSubject(preset.subject); setClassRange(preset.classRange); }}>{preset.name}</button>)}</div>
        <label>Room name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={80} /></label>
        <div className="room-form-row"><label>Room type<select value={roomType} onChange={(event) => setRoomType(event.target.value)}><option value="duel">1v1 Duel</option><option value="study-group">Study Group · up to 6</option><option value="classroom">Class Room · up to 100</option><option value="public">Public Matchmaking · demo disabled</option></select></label><label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)}>{["Mathematics", "Science", "English", "Hindi", "GK", "Computer"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <div className="room-form-row"><label>Class range<select value={classRange} onChange={(event) => setClassRange(event.target.value)}>{["Class 6–8", "Class 8", "Class 9–10", "Class 11–12", "All classes"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Schedule time<input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></label></div>
        <button className="primary-button" disabled={loading || roomType === "public"} onClick={() => void createRoom()}>{loading ? "Creating…" : scheduleAt ? "Schedule room + calendar" : "Create room now"} <ArrowRight size={15} /></button>
      </section>
      <section className="room-setup-card join-room-card"><div className="panel-title"><div><span className="section-eyebrow">HAVE AN INVITE?</span><h2>Join a room</h2></div><Users size={19} /></div><p>Enter the six-digit invite code. Your browser will ask for camera and microphone access before joining.</p><label>Room code<input inputMode="numeric" maxLength={6} value={codeInput} onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, ""))} placeholder="123456" /></label><button className="outline-button" disabled={loading || codeInput.length !== 6} onClick={() => void enterLobby()}>{loading ? "Opening…" : "Preview room"} <ArrowRight size={14} /></button></section>
    </div>
    <div className="room-safety-banner"><ShieldCheck size={18} /><div><strong>Private-by-default development rooms</strong><span>No 1:1 direct messages or recording. Live rooms require server authentication in production; minor access requires a trusted parent-consent claim.</span></div></div>
    <div className="room-setup-foot"><span>LiveKit SFU + Socket.IO signaling</span><span>Adaptive streaming · 15-second server-timed quiz</span></div>
    {error && <div className="room-error" role="alert">{error}</div>}
  </div>;

  if (!room) return null;
  if (joinState === "preview") return <div className="page-content live-rooms-page"><button className="back-link" onClick={leaveRoom}><ArrowLeft size={15} /> Live rooms</button><div className="lobby-grid"><section className="lobby-preview-card"><div className="lobby-video-preview">{cameraPreviewError ? <div><VideoOff size={25} /><span>{cameraPreviewError}</span></div> : <video ref={localVideoRef} autoPlay muted playsInline />}</div><div className="lobby-device-row"><span><Mic size={14} /> Mic check</span><span><Video size={14} /> Camera check</span><span className="quality-label"><i /> Network ready</span></div><div className="room-device-selects">{mediaDevices.filter((device) => device.kind === "audioinput").length > 0 && <label>Microphone<select aria-label="Select microphone" value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)}>{mediaDevices.filter((device) => device.kind === "audioinput").map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}{mediaDevices.filter((device) => device.kind === "videoinput").length > 0 && <label>Camera<select aria-label="Select camera" value={cameraId} onChange={(event) => setCameraId(event.target.value)}>{mediaDevices.filter((device) => device.kind === "videoinput").map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}</div></section><section className="room-setup-card lobby-details"><span className="section-eyebrow">ROOM PREVIEW · {room.roomType.replace("-", " ").toUpperCase()}</span><h1>{room.name}</h1><p>{room.subject} · {room.classRange}</p><div className="lobby-invite"><span>Room code</span><strong>{room.code}</strong><button className="outline-button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/?room=${room.code}`).catch((reason: unknown) => console.error("Room invite could not be copied.", reason)); }}>Copy invite</button></div><label>Your display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={48} /></label><label>Age group<select value={ageBand} onChange={(event) => setAgeBand(event.target.value as "adult" | "under18")}><option value="adult">18 or over</option><option value="under18">Under 18</option></select></label>{ageBand === "under18" && <label className="consent-check"><input type="checkbox" checked={parentConsent} onChange={(event) => setParentConsent(event.target.checked)} /> Parent/guardian consent has been collected for this demo session</label>}<button className="primary-button" disabled={loading || !displayName.trim() || (ageBand === "under18" && !parentConsent)} onClick={() => void joinRoom()}>{loading ? "Connecting…" : "Join now"} <ArrowRight size={15} /></button><div className="lobby-note"><ShieldCheck size={14} /> No direct messages. Recording is off. Use Report to alert the room host.</div></section></div>{cameraPreviewError && <div className="room-error" role="status">{cameraPreviewError}</div>}{error && <div className="room-error" role="alert">{error}</div>}</div>;

  if (joinState === "waiting") return <div className="page-content live-rooms-page"><div className="waiting-room-card"><span className="waiting-pulse"><Users size={24} /></span><h1>Waiting for the host</h1><p>Your camera and microphone are not connected yet. The host must admit you before you enter.</p><strong>{room.code} · {connectionStatus}</strong><button className="outline-button" onClick={leaveRoom}>Leave waiting room</button></div>{error && <div className="room-error">{error}</div>}</div>;

  return <div className={`page-content live-rooms-page in-call-page ${viewMode === "game" ? "call-game-mode" : ""}`}>
    <div className="call-header"><div><span className="live-call-dot" /><div><strong>{room.name}</strong><span>{room.subject} · {room.code} · {connectionStatus}</span></div></div><div className="call-header-actions"><select aria-label="Room layout" value={viewMode} onChange={(event) => setViewMode(event.target.value as "grid" | "speaker" | "game")}><option value="grid">Grid view</option><option value="speaker">Speaker view</option><option value="game">Game mode</option></select><button className="outline-button" onClick={() => rtcRef.current?.startAudio()}><Volume2 size={15} /> Enable audio</button><button className="outline-button" onClick={() => { const video = document.querySelector<HTMLVideoElement>(".room-video-tile video:not([muted])"); if (video && document.pictureInPictureEnabled) void video.requestPictureInPicture().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Picture-in-picture is unavailable.")); else setError("Select a video tile with remote audio/video to start picture-in-picture."); }}>Picture-in-picture</button></div></div>
    <div className="call-layout"><section className="call-main-stage"><div className={`video-grid video-grid-${viewMode}`}>{participants.map((participant) => <RoomVideoTile key={participant.identity} participant={participant} isLocal={participant === rtcRef.current?.localParticipant} />)}{participants.length === 0 && <div className="room-empty-state">Connecting media…</div>}</div>
        <div className="call-controls"><button className={!micEnabled ? "control-off" : ""} onClick={() => void toggleMic()} aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}>{micEnabled ? <Mic size={18} /> : <MicOff size={18} />}<span>{micEnabled ? "Mic" : "Muted"}</span></button><button className={!cameraEnabled ? "control-off" : ""} onClick={() => void toggleCamera()} aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}>{cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}<span>Camera</span></button><button onClick={() => { const next = !handRaised; setHandRaised(next); socketRef.current?.emit("participant:hand", { raised: next }); }} aria-label={handRaised ? "Lower hand" : "Raise hand"}><Hand size={18} /><span>{handRaised ? "Lower hand" : "Raise hand"}</span></button><button onClick={() => socketRef.current?.emit("participant:reaction", { emoji: "👏" })} aria-label="Send applause reaction">👏<span>React</span></button>{Boolean(hostSecret) && <button onClick={() => void toggleScreenShare()} aria-label={screenShareEnabled ? "Stop screen share" : "Share screen"}><ScreenShare size={18} /><span>{screenShareEnabled ? "Stop share" : "Share"}</span></button>}<button className="leave-call-button" onClick={leaveRoom} aria-label="Leave room"><PhoneOff size={18} /><span>Leave</span></button></div>
      </section>
      <aside className="call-side-panel"><section className="call-participants"><div className="call-panel-title"><strong><Users size={15} /> People · {roomRoster.length}</strong>{Boolean(hostSecret) && <button title={everyoneMuted ? "Unmute everyone" : "Mute everyone"} onClick={() => { setEveryoneMuted(!everyoneMuted); void moderate("mute-all", { muted: !everyoneMuted }); }}>{everyoneMuted ? <Mic size={14} /> : <MicOff size={14} />}</button>}</div>{roomRoster.map((person) => <div className="call-person" key={person.identity}><span className="person-avatar">{person.name[0]?.toUpperCase()}</span><span>{person.name}{person.role === "host" ? " · host" : ""}</span>{person.handRaised && <span title="Raised hand">✋</span>}{person.role !== "host" && <button title={`Report ${person.name}`} onClick={() => socketRef.current?.emit("room:report", { identity: person.identity, reason: "Safety concern reported in room" }, (result: { error?: string }) => result?.error && setError(result.error))}><ShieldAlert size={13} /></button>}{Boolean(hostSecret) && person.role !== "host" && <button title={`Remove ${person.name}`} onClick={() => void moderate("remove", { identity: person.identity })}><X size={13} /></button>}</div>)}{Boolean(hostSecret) && <div className="host-room-tools"><button className="outline-button" onClick={() => { setRoomLocked(!roomLocked); void moderate("lock", { locked: !roomLocked }); }}>{roomLocked ? "Unlock room" : "Lock room"}</button><button className="outline-button" onClick={() => void moderate("waiting", { enabled: !room.waitingRoom })}>{room.waitingRoom ? "Disable waiting room" : "Enable waiting room"}</button><button className="outline-button end-room-button" onClick={() => socketRef.current?.emit("room:end", undefined, (result: { error?: string }) => result?.error ? setError(result.error) : leaveRoom())}>End for everyone</button></div>}{Boolean(hostSecret) && waitingList.length > 0 && <div className="waiting-list"><strong>Waiting to join</strong>{waitingList.map((person) => <div key={person.identity}>{person.name}<button onClick={() => socketRef.current?.emit("room:admit", { identity: person.identity, admit: true })}>Admit</button><button onClick={() => socketRef.current?.emit("room:admit", { identity: person.identity, admit: false })}>Deny</button></div>)}</div>}</section>
        <section className="call-chat"><div className="call-panel-title"><strong><MessageCircle size={15} /> Room chat</strong><button aria-label="Report a safety concern" title="Report a safety concern" onClick={() => onNotice("Report sent to the host for this session.")}><ShieldAlert size={14} /></button></div><div className="call-chat-messages">{messages.map((message) => <div key={message.id}><strong>{message.name}</strong><span>{message.text}</span></div>)}{messages.length === 0 && <p>Say hi or ask a study question. Messages are visible to this room only.</p>}</div><div className="call-chat-compose"><input value={chatText} maxLength={500} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendChat(); }} placeholder="Message the room…" /><button onClick={sendChat} aria-label="Send room message"><Send size={15} /></button></div></section></aside></div>
    {Boolean(hostSecret) && <div className="host-game-bar"><span><Gamepad2 size={16} /> Start a live round</span><div>{[["duel", "Quiz Duel"], ["ask-friend", "Ask-a-Friend"], ["group", "Group Quiz"], ["ludo", "Ludo Quiz"], ["carrom", "Carrom Quiz"], ["chess", "Chess Quiz"], ["team", "Team mode"]].map(([mode, title]) => <button className="outline-button" key={mode} onClick={() => startGame(mode)}>{title}</button>)}<button className="outline-button" onClick={() => socketRef.current?.emit("game:stop")}>Stop game</button></div></div>}
    {question && <section className="live-question-card"><div className="live-question-top"><span>{question.mode.toUpperCase()} · {question.subject} · Q{question.questionNumber}</span><strong>{secondsLeft}s</strong></div><h2>{question.prompt}</h2><div className="live-answer-grid">{question.options.map((option, index) => <button key={option} disabled={selectedChoice !== undefined} className={selectedChoice === index ? "selected" : ""} onClick={() => answerQuestion(index)}>{String.fromCharCode(65 + index)} · {option}</button>)}</div></section>}
    {gameResult && <div className="live-game-result"><strong>{gameResult.fastestIdentity ? `Fastest correct answer · +${gameResult.awarded} XP` : "Time's up · check the answer"}</strong><span>{Object.entries(gameResult.scores).map(([identity, score]) => `${roomRoster.find((item) => item.identity === identity)?.name ?? "Learner"} ${score} XP`).join(" · ")}</span><button className="outline-button" onClick={() => setGameResult(undefined)}>Continue room</button></div>}
    {error && <div className="room-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
  </div>;
}

function GamesPage({ roomCode, joinCode, onJoinCode, onCreate, onJoin, onPlay }: {
  roomCode: string; joinCode: string; onJoinCode: (value: string) => void; onCreate: () => void; onJoin: () => void; onPlay: () => void;
}) {
  const games = [
    ["Quiz Duel", "Fast answers earn more points.", "1 vs 1"],
    ["Ask-a-Friend", "Write a question for a classmate.", "Friends"],
    ["Ludo Quiz", "Answer correctly to move a token.", "Board game"],
    ["Carrom Quiz", "Win a striker shot with a right answer.", "Board game"],
    ["Chess Quiz", "Solve a question before each move.", "Strategy"],
    ["Group Quiz Room", "Practice with a small group.", "2–6 players"],
  ];
  return <div className="page-content"><div className="page-intro"><span className="section-eyebrow">PLAY · PRACTICE · LEARN</span><h1>Quiz games</h1><p>Challenge yourself with sample rounds. Multiplayer room controls are a frontend demo until a realtime server is connected.</p></div>
    <div className="room-panel"><div><span className="section-eyebrow">FRIEND ROOM</span><h2>Create or join a room</h2><p>Share a six-digit invite code with your study group.</p></div><button className="primary-button" onClick={onCreate}><Plus size={16} /> Create room</button><label className="room-join"><input aria-label="Room code" inputMode="numeric" maxLength={6} value={joinCode} onChange={(event) => onJoinCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" /><button className="outline-button" onClick={onJoin}>Join room</button></label>{roomCode && <div className="room-code"><span>Your demo room code</span><strong>{roomCode}</strong></div>}</div>
    <div className="game-grid">{games.map(([title, description, badge], index) => <article className="game-card" key={title}><span className={`game-icon game-icon-${index % 4}`}><Gamepad2 size={22} /></span><span className="game-badge">{badge}</span><h2>{title}</h2><p>{description}</p><button className="text-link" onClick={onPlay}>Play demo round <ArrowRight size={14} /></button></article>)}</div>
    <div className="demo-account-note"><ShieldCheck size={17} /><div><strong>Multiplayer safety note</strong><p>Rooms and scores are not shared or server-verified here. Live matchmaking, server-side answer timing, chat moderation and anti-cheat require a trusted backend/realtime service.</p></div></div>
  </div>;
}

function DashboardPage({ courses, minutes, completed, quizScore, progress, onOpen }: {
  courses: Course[]; minutes: number; completed: number; quizScore?: number; progress: number; onOpen: (course: Course, index?: number) => void;
}) {
  const studyBars = [28, 48, 35, 70, 44, 82, 55];
  const subjects = [...new Set(courses.map((course) => course.subject))].slice(0, 6);
  const [parentPreview, setParentPreview] = useState(false);
  return <div className="page-content"><div className="dashboard-heading"><div><span className="section-eyebrow">YOUR PROGRESS, AT A GLANCE</span><h1>Learning dashboard</h1><p>Local demo stats from this browser—not a cloud-synced student record.</p></div><button className="outline-button" onClick={() => setParentPreview((visible) => !visible)}><ArrowRight size={14} /> {parentPreview ? "Hide parent preview" : "Preview parent view"}</button></div>
    <div className="dashboard-stat-grid"><div><Clock3 size={18} /><span>Total study time</span><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong></div><div><BookOpen size={18} /><span>Lessons completed</span><strong>{completed}</strong></div><div><Activity size={18} /><span>Chapters progress</span><strong>{progress}%</strong></div><div><Target size={18} /><span>Latest quiz score</span><strong>{quizScore ?? 0}%</strong></div></div>
    <div className="dashboard-panels"><section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">THIS WEEK</span><h2>Study minutes</h2></div><span>Daily activity</span></div><div className="weekly-chart" aria-label="Weekly study minutes chart">{studyBars.map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{["M", "T", "W", "T", "F", "S", "S"][index]}</small></div>)}</div></section><section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">BY SUBJECT</span><h2>Course progress</h2></div><span>{subjects.length} subjects</span></div><div className="subject-progress-list">{subjects.map((subject) => { const course = courses.find((item) => item.subject === subject)!; return <div key={subject}><span>{subject}</span><div className="progress-track"><span style={{ width: `${course.progress}%` }} /></div><strong>{course.progress}%</strong></div>; })}</div></section></div>
    <section className="weak-topics"><div><span className="section-eyebrow">NEXT BEST STEP</span><h2>Revise a little today</h2><p>Low-progress courses are suggested first. Quiz analytics by topic will be available after backend scoring is connected.</p></div>{courses.filter((course) => course.progress < 40).slice(0, 3).map((course) => <button key={course.id} onClick={() => onOpen(course)}><span>{course.subject} · {course.level}</span><strong>{course.chapters[0].title}</strong><ArrowRight size={15} /></button>)}</section>
    {parentPreview && <section className="parent-preview"><div><span className="section-eyebrow">READ-ONLY PREVIEW · LOCAL ONLY</span><h2>Student progress summary</h2><p>This preview is visible only in this browser. Sharing it requires authenticated, server-backed access.</p></div><div><strong>{Math.floor(minutes / 60)}h {minutes % 60}m</strong><span>Study time</span></div><div><strong>{completed}</strong><span>Lessons completed</span></div><div><strong>{progress}%</strong><span>Course progress</span></div></section>}
  </div>;
}

function AdminPage({ uploadName, onUpload, courses, onNotice }: {
  uploadName: string; onUpload: (name: string) => void; courses: Course[]; onNotice: (message: string) => void;
}) {
  return <div className="page-content"><div className="page-intro"><span className="section-eyebrow">DEMO CONTENT STUDIO</span><h1>Manage learning content</h1><p>This local-only admin preview does not publish content or upload files to a server.</p></div>
    <div className="admin-grid"><section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">MEDIA</span><h2>Upload lesson audio</h2></div><Upload size={18} /></div><label className="upload-drop"><input type="file" accept="audio/*,video/*,.pdf" onChange={(event) => onUpload(event.target.files?.[0]?.name ?? "")} /><Upload size={25} /><strong>{uploadName || "Choose audio, video or PDF"}</strong><span>Local file selection only · no upload occurs</span></label></section>
    <section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">QUESTION BANK</span><h2>Import questions</h2></div><CircleHelp size={18} /></div><p className="admin-description">CSV import and server-side validation are not connected in this frontend demo.</p><button className="outline-button" onClick={() => onNotice("Question bank import needs an API and validated CSV parser.")}>Select question CSV</button></section></div>
    <section className="dashboard-panel admin-courses"><div className="panel-title"><div><span className="section-eyebrow">CATALOG</span><h2>Seeded demo courses</h2></div><span>{courses.length} courses</span></div>{courses.map((course) => <div className="admin-course-row" key={course.id}><span className={`instructor-avatar instructor-${course.accent}`}>{course.icon}</span><strong>{course.title}</strong><span>{course.chapters.length} chapters · {course.lessons} lessons</span><span className="settings-local">Demo</span></div>)}</section>
  </div>;
}
