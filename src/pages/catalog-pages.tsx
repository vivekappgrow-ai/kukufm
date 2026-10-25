import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, BookOpen,
  Bookmark, Check, ChevronDown, Clock3, Compass, Download, Filter, Headphones,
  Heart, Mic, Play, Search, Sparkles, Star, Video,
} from "lucide-react";

export type CatalogCourse = {
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
  publishedAt?: string;
  coverImage?: string;
  status?: string;
  chapters: {
    title: string;
    duration: string;
    body: string;
    audioSrc?: string;
    videoUrl?: string;
    captionsUrl?: string | null;
    coverImage?: string;
    diagramImage?: string;
    transcript?: string;
    keyPoints?: string[];
    quiz?: { question: string; choices: [string, string, string]; answer: number; explanation: string }[];
    difficulty?: string;
    status?: string;
    lessonId?: string;
  }[];
};

export type CatalogView =
  | "home" | "explore" | "new-hot" | "search" | "library" | "series"
  | "lesson" | "player" | "ai-tutor" | "profile" | "profile-preferences" | "progress" | "parent"
  | "settings" | "admin" | "admin-preview";

export type CatalogProps = {
  courses: CatalogCourse[];
  activeCourse: CatalogCourse;
  savedIds: string[];
  recentCourseIds: string[];
  search: string;
  name: string;
  studentClass: number;
  board: string;
  minutes: number;
  completed: number;
  progress: number;
  elapsed: number;
  playing: boolean;
  chapterIndex: number;
  libraryTab: "Courses" | "In progress" | "Saved" | "Downloaded";
  onSearch: (value: string) => void;
  onLibraryTab: (tab: CatalogProps["libraryTab"]) => void;
  onOpenSeries: (course: CatalogCourse) => void;
  onPlayLesson: (course: CatalogCourse, index?: number) => void;
  onSelectQueueLesson: (course: CatalogCourse, index: number) => void;
  onToggleSaved: (id: string) => void;
  onNavigate: (view: CatalogView) => void;
  onPlayback: () => void;
  onNotice: (message: string) => void;
};

export function Chip({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return <button className={`catalog-chip${active ? " is-active" : ""}`} aria-pressed={active} onClick={onClick}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "new" | "hot" | "free" | "neutral" }) {
  return <span className={`catalog-badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className="catalog-progress" role="progressbar" aria-label="Course progress" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${clamped}%` }} /></div>;
}

export function Avatar({ name }: { name: string }) {
  return <span className="catalog-avatar" aria-label={name}>{name.trim().charAt(0).toUpperCase() || "S"}</span>;
}

export function EmptyState({ icon = <BookOpen size={22} />, title, detail, action }: { icon?: React.ReactNode; title: string; detail: string; action?: React.ReactNode }) {
  return <div className="catalog-empty"><span>{icon}</span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

export function Skeleton() {
  return <div className="catalog-skeleton" aria-label="Loading content"><i /><i /><i /></div>;
}

export function Tabs<T extends string>({ items, selected, onSelect }: { items: T[]; selected: T; onSelect: (item: T) => void }) {
  return <div className="catalog-tabs" role="tablist">{items.map((item) => <button key={item} role="tab" aria-selected={selected === item} className={selected === item ? "selected" : ""} onClick={() => onSelect(item)}>{item}</button>)}</div>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="catalog-overlay" role="presentation" onClick={onClose}><section className="catalog-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><button className="catalog-modal-close" aria-label="Close" onClick={onClose}>×</button><h2>{title}</h2>{children}</section></div>;
}

export function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="catalog-overlay sheet-overlay" role="presentation" onClick={onClose}><section className="catalog-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><button className="catalog-modal-close" aria-label="Close" onClick={onClose}>×</button><h2>{title}</h2>{children}</section></div>;
}

export function Toast({ children }: { children: React.ReactNode }) {
  return <div className="catalog-inline-toast" role="status">{children}</div>;
}

function Cover({ course, large = false, image }: { course: CatalogCourse; large?: boolean; image?: string }) {
  const [loaded, setLoaded] = useState(false);
  const imageSrc = image ?? course.coverImage;
  useEffect(() => setLoaded(false), [imageSrc]);
  return <div className={`catalog-cover cover-${course.accent}${large ? " cover-large" : ""}`} aria-label={`${course.subject} cover art`}>
    {imageSrc && <img className={`catalog-cover-image${loaded ? " loaded" : ""}`} src={imageSrc} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />}
    <span className="cover-orbit orbit-one" /><span className="cover-orbit orbit-two" />
    <span className="cover-symbol" aria-hidden="true">{course.icon}</span>
    <span className="cover-label">{course.subject} · STUDYAI</span>
  </div>;
}

export function LessonCard({ course, onOpen, onPlay, saved, onSave }: {
  course: CatalogCourse; onOpen: () => void; onPlay: () => void; saved: boolean; onSave: () => void;
}) {
  return <article className="catalog-card">
    <div className="catalog-card-cover">
      <button className="catalog-cover-open" onClick={onOpen} aria-label={`Open ${course.title}`}><Cover course={course} /></button>
      <button className="catalog-play" onClick={onPlay} aria-label={`Play ${course.title}`}><Play size={17} fill="currentColor" /></button>
      <button className={`catalog-save${saved ? " saved" : ""}`} onClick={onSave} aria-label={saved ? `Remove ${course.title} from saved` : `Save ${course.title}`} aria-pressed={saved}><Heart size={16} fill={saved ? "currentColor" : "none"} /></button>
      {isRecentlyPublished(course) && <span className="catalog-new-tag">NEW</span>}
      {course.status && course.status !== "approved" && <span className="catalog-draft-tag">DRAFT</span>}
    </div>
    <button className="catalog-card-title" onClick={onOpen}>{course.title}</button>
    <p>{course.subject} <span>·</span> {course.level}</p>
    {course.progress > 0 && <ProgressBar value={course.progress} />}
  </article>;
}

export function SeriesCard(props: Parameters<typeof LessonCard>[0]) {
  return <LessonCard {...props} />;
}

export function RankCard({ course, rank, change, onOpen }: { course: CatalogCourse; rank: number; change: "up" | "down" | "steady"; onOpen: () => void }) {
  const ChangeIcon = change === "up" ? ArrowUpRight : change === "down" ? ArrowDownRight : ArrowRight;
  return <button className="rank-card" onClick={onOpen}><strong className="rank-number">{String(rank).padStart(2, "0")}</strong><Cover course={course} /><span className="rank-copy"><strong>{course.title}{isRecentlyPublished(course) && <Badge tone="new">NEW</Badge>}</strong><small>{course.subject} · {course.level}</small></span><span className={`rank-change rank-${change}`}><ChangeIcon size={15} />{change === "steady" ? "—" : change === "up" ? "+1" : "−1"}</span></button>;
}

export function Carousel({ courses, props }: { courses: CatalogCourse[]; props: CatalogProps }) {
  return <div className="catalog-carousel" role="region" aria-label="Course carousel" tabIndex={0}>{courses.map((course) => <LessonCard key={course.id} course={course} onOpen={() => props.onOpenSeries(course)} onPlay={() => props.onPlayLesson(course)} saved={props.savedIds.includes(course.id)} onSave={() => props.onToggleSaved(course.id)} />)}</div>;
}

export function Shelf({ title, courses, props, emptyText }: { title: string; courses: CatalogCourse[]; props: CatalogProps; emptyText?: string }) {
  return <section className="catalog-shelf"><header className="catalog-shelf-head"><h2>{title}</h2><button onClick={() => props.onNavigate("explore")}>Sab dekho <ArrowRight size={15} /></button></header>{courses.length ? <Carousel courses={courses} props={props} /> : <EmptyState title="Coming soon" detail={emptyText ?? "Reviewed lessons will appear here as the catalog grows."} />}</section>;
}

function Header({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <header className="catalog-page-head"><div>{eyebrow && <span className="catalog-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</header>;
}

function pick(courses: CatalogCourse[], key: string, count = 6) {
  const filtered = courses.filter((course) => `${course.subject} ${course.title}`.toLowerCase().includes(key.toLowerCase()));
  return filtered.slice(0, count);
}

function durationMinutes(value: string) {
  const hours = Number(value.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)m/)?.[1] ?? 0);
  if (hours || minutes) return hours * 60 + minutes;
  const parts = value.split(":").map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] + parts[1] / 60;
  return Number.POSITIVE_INFINITY;
}

function isRecentlyPublished(course: CatalogCourse) {
  if (!course.publishedAt) return false;
  const publishedAt = Date.parse(course.publishedAt);
  return Number.isFinite(publishedAt) && Date.now() - publishedAt >= 0 && Date.now() - publishedAt < 7 * 24 * 60 * 60 * 1000;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function HomePage(props: CatalogProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const continuing = props.courses.filter((course) => course.progress > 0);
  const classCourses = props.courses.filter((course) => course.level.includes(`Class ${props.studentClass}`));
  const quickLessons = props.courses.filter((course) => course.chapters.some((chapter) => durationMinutes(chapter.duration) <= 7));
  const revision = continuing.length ? continuing : props.courses.slice(0, 4);
  const heroes = props.courses.filter((course) => course.coverImage).slice(0, 4);
  const heroCourse = heroes.length ? heroes[heroIndex % heroes.length] : undefined;
  const shelves: [string, string][] = [
    ["Recommended for your class", `Class ${props.studentClass}`],
    ["Maths, one idea at a time", "Mathematics"],
    ["Science in everyday life", "Science"],
    ["Hindi", "Hindi"],
    ["English", "English"],
    ["Social Science", "History"],
    ["Quick 5-minute listens", "Quick"],
    ["Revision, made lighter", "Revision"],
    ["Story-style learning", "History"],
  ];
  return <div className="catalog-page">
    <section className="catalog-hero" aria-roledescription="carousel">
      <div><span className="catalog-eyebrow"><Sparkles size={13} /> A LITTLE LEARNING, EVERY DAY</span><h1>{heroCourse ? <>{heroCourse.title.split(/[,:]/)[0]}<br /><em>one listen away.</em></> : <>Big ideas,<br /><em>one listen away.</em></>}</h1><p>Curious lessons for {props.name || "your"} learning journey.</p><button className="catalog-primary" onClick={() => heroCourse ? props.onOpenSeries(heroCourse) : props.onNavigate("explore")}>Explore the library <ArrowRight size={17} /></button><div className="catalog-hero-controls"><button aria-label="Previous featured course" disabled={!heroes.length} onClick={() => setHeroIndex((index) => (index - 1 + heroes.length) % heroes.length)}><ArrowLeft size={16} /></button><span>{heroes.length ? heroIndex + 1 : 0} / {heroes.length || 1}</span><button aria-label="Next featured course" disabled={!heroes.length} onClick={() => setHeroIndex((index) => (index + 1) % heroes.length)}><ArrowRight size={16} /></button></div></div>
      <div className="catalog-hero-art" aria-hidden="true">{heroCourse?.coverImage && <img className="catalog-hero-image" src={heroCourse.coverImage} alt="" loading="eager" />}<span className="hero-disc disc-a" /><span className="hero-disc disc-b" /><span className="hero-center"><Headphones size={53} /></span><span className="hero-note">LEARN AT YOUR PACE</span></div>
    </section>
    {continuing.length > 0 && <Shelf title="Continue listening" courses={continuing} props={props} />}
    <Shelf title={shelves[0][0]} courses={classCourses} props={props} />
    {shelves.slice(1).map(([title, key]) => <Shelf key={title} title={title} courses={key === "Quick" ? quickLessons : key === "Revision" ? revision : pick(props.courses, key, 6)} props={props} />)}
    <Shelf title="Videos" courses={props.courses.filter((course) => course.chapters.some((chapter) => chapter.videoUrl))} props={props} emptyText="Narrated video lessons will appear here after media generation." />
  </div>;
}

function ExplorePage(props: CatalogProps) {
  const subjects = ["All", "Mathematics", "Science", "Hindi", "English", "History", "GK", "Computer"];
  const [subject, setSubject] = useState("All");
  const list = props.courses.filter((course) => subject === "All" || course.subject === subject);
  return <div className="catalog-page">
    <Header eyebrow="FIND YOUR NEXT AHA MOMENT" title="Explore" detail="Browse short courses and lessons by subject." />
    <div className="catalog-explore-hero"><div><Compass size={25} /><strong>Pick a path that feels right today.</strong><span>Curriculum: Class {props.studentClass} · {props.board}</span></div><button className="catalog-primary" onClick={() => props.onNavigate("new-hot")}>See what’s new <ArrowRight size={16} /></button></div>
    <div className="catalog-chip-row">{subjects.map((item) => <Chip key={item} active={subject === item} onClick={() => setSubject(item)}>{item}</Chip>)}</div>
    <div className="catalog-category-grid">{subjects.slice(1).map((item, index) => <button key={item} className={`catalog-category category-${index % 5}`} onClick={() => setSubject(item)}><span>{["∑", "✳", "अ", "Aa", "⌂", "✦", "⌘"][index]}</span><strong>{item}</strong><small>{props.courses.filter((course) => course.subject === item).length} courses</small></button>)}</div>
    <Shelf title={subject === "All" ? "Courses to explore" : subject} courses={list} props={props} />
    <section className="catalog-exam-banner"><div><span className="catalog-eyebrow">FOCUSED PRACTICE</span><h2>Preparing for an exam?</h2><p>Find a calm, step-by-step path through the topics you want to revisit.</p></div><button className="catalog-secondary" onClick={() => props.onSearch("exam")}>Browse exam prep <ArrowRight size={16} /></button></section>
  </div>;
}

function NewHotPage(props: CatalogProps) {
  const tabs = ["Sab", "Naye", "Trending", "Top 10", "Jald aa raha hai"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("Sab");
  const [reminded, setReminded] = useState(() => localStorage.getItem("studyai-release-reminder") === "true");
  const list = props.courses.slice(0, 10);
  function saveReminder() {
    try {
      localStorage.setItem("studyai-release-reminder", "true");
      setReminded(true);
      props.onNotice("Release reminder saved on this device.");
    } catch (error) {
      console.error("The release reminder could not be saved.", error);
      props.onNotice("The reminder could not be saved. Check browser storage and try again.");
    }
  }
  return <div className="catalog-page">
    <Header eyebrow="FRESH IDEAS FOR YOUR QUEUE" title="New & Hot" detail="A changing shelf of lessons to explore. Rankings are a curated preview until live catalog signals are connected." />
    <section className="new-hot-hero"><span className="catalog-eyebrow"><AudioLines size={13} /> THIS WEEK’S LISTENING MIX</span><h2>Fresh perspectives.<br /><em>Familiar subjects.</em></h2><button className="catalog-primary" onClick={() => props.onNavigate("explore")}>Explore picks <ArrowRight size={16} /></button></section>
    <Tabs items={[...tabs]} selected={tab} onSelect={setTab} />
    {tab === "Jald aa raha hai" ? <EmptyState title="More lessons are on the way" detail="We’ll show upcoming lessons here once their release dates are available." /> : <section className="rank-list"><div className="catalog-shelf-head"><h2>{tab === "Top 10" ? "Top 10 · curated preview" : tab === "Naye" ? "Recently added" : tab === "Trending" ? "Trending picks" : "For your next listen"}</h2><Badge tone="new">PREVIEW</Badge></div>{list.map((course, index) => <RankCard key={course.id} course={course} rank={index + 1} change={index % 3 === 0 ? "up" : index % 3 === 1 ? "steady" : "down"} onOpen={() => props.onOpenSeries(course)} />)}</section>}
    <section className="catalog-remind"><div><Clock3 size={20} /><span><strong>Coming soon</strong><small>Release reminders will be available when lesson dates are published.</small></span></div><button className="catalog-secondary" aria-pressed={reminded} onClick={saveReminder}>{reminded ? "Reminder saved" : "Remind me"}</button></section>
  </div>;
}

function SearchPage(props: CatalogProps) {
  const [subject, setSubject] = useState("All subjects");
  const [difficulty, setDifficulty] = useState("Any difficulty");
  const [duration, setDuration] = useState("Any duration");
  const [type, setType] = useState("All types");
  const [classLevel, setClassLevel] = useState("Any class");
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("studyai-search-history");
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
    } catch (error) {
      console.error("Recent searches could not be read.", error);
      return [];
    }
  });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike>();
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => {
    try {
      localStorage.setItem("studyai-search-history", JSON.stringify(recent));
    } catch (error) {
      console.error("Recent searches could not be saved.", error);
      props.onNotice("Recent searches could not be saved in this browser.");
    }
  }, [recent, props.onNotice]);
  function startVoiceSearch() {
    const speechWindow = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      props.onNotice("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        props.onSearch(transcript);
        setRecent((items) => [transcript, ...items.filter((item) => item !== transcript)].slice(0, 5));
      }
    };
    recognition.onerror = () => {
      setListening(false);
      props.onNotice("Voice search could not start. Check microphone permission and try again.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch (error) {
      console.error("Voice search could not start.", error);
      setListening(false);
      props.onNotice("Voice search could not start. Check microphone permission and try again.");
    }
  }
  const results = useMemo(() => props.courses.filter((course) => {
    const matchesText = `${course.title} ${course.subject} ${course.description} ${course.level}`.toLowerCase().includes(props.search.toLowerCase());
    const matchesSubject = subject === "All subjects" || course.subject === subject;
    const matchesDuration = duration === "Any duration" || (duration === "Under 10 min" && course.chapters.some((chapter) => durationMinutes(chapter.duration) < 10));
    const courseDifficulty = course.level.toLowerCase().includes("exam") ? "Intermediate" : "Beginner";
    const matchesClass = classLevel === "Any class" || course.level === classLevel;
    const hasAudio = course.chapters.some((chapter) => Boolean(chapter.audioSrc));
    const hasVideo = course.chapters.some((chapter) => Boolean(chapter.videoUrl));
    const matchesType = type === "All types" || (type === "Audio" && hasAudio) || (type === "Video" && hasVideo);
    return matchesText && matchesSubject && matchesDuration && matchesType && matchesClass && (difficulty === "Any difficulty" || difficulty === courseDifficulty);
  }), [props.courses, props.search, subject, duration, type, difficulty, classLevel]);
  return <div className="catalog-page">
    <Header eyebrow="YOUR NEXT LISTEN IS A SEARCH AWAY" title="Search" detail="Search the available demo catalog and refine by subject, length, and format." />
    <div className="catalog-search-line"><label className="catalog-search-input"><Search size={19} /><input autoFocus value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Try “fractions”, “plants” or a subject…" /><kbd>/</kbd></label><button className={`catalog-voice-search${listening ? " listening" : ""}`} aria-label={listening ? "Stop voice search" : "Start voice search"} onClick={() => listening ? recognitionRef.current?.stop() : startVoiceSearch()}><Mic size={18} />{listening ? "Listening" : "Speak"}</button></div>
    {!props.search && recent.length > 0 && <div className="catalog-recent"><span>Recent searches</span>{recent.map((term) => <Chip key={term} onClick={() => props.onSearch(term)}>{term}</Chip>)}</div>}
    <div className="catalog-filter-row"><label><Filter size={14} /><select aria-label="Filter by subject" value={subject} onChange={(event) => setSubject(event.target.value)}>{["All subjects", ...new Set(props.courses.map((course) => course.subject))].map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={13} /></label><label><Clock3 size={14} /><select aria-label="Filter by duration" value={duration} onChange={(event) => setDuration(event.target.value)}><option>Any duration</option><option>Under 10 min</option></select><ChevronDown size={13} /></label><label><select aria-label="Filter by class" value={classLevel} onChange={(event) => setClassLevel(event.target.value)}><option>Any class</option>{[...new Set(props.courses.map((course) => course.level))].map((level) => <option key={level}>{level}</option>)}</select><ChevronDown size={13} /></label><label><select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Any difficulty</option><option>Beginner</option><option>Intermediate</option></select><ChevronDown size={13} /></label><label><select aria-label="Filter by content type" value={type} onChange={(event) => setType(event.target.value)}><option>All types</option><option>Audio</option><option>Video</option></select><ChevronDown size={13} /></label></div>
    <div className="catalog-results-heading"><h2>{props.search ? `Results for “${props.search}”` : "Popular in your library"}</h2><span>{results.length} results</span></div>
    {results.length ? <div className="catalog-card-grid">{results.map((course) => <LessonCard key={course.id} course={course} onOpen={() => { if (props.search) setRecent((items) => [props.search, ...items.filter((item) => item !== props.search)].slice(0, 5)); props.onOpenSeries(course); }} onPlay={() => props.onPlayLesson(course)} saved={props.savedIds.includes(course.id)} onSave={() => props.onToggleSaved(course.id)} />)}</div> : <EmptyState icon={<Search size={22} />} title="No matching lessons yet" detail="Try another phrase or broaden your filters." action={<button className="catalog-secondary" onClick={() => { props.onSearch(""); setSubject("All subjects"); setDuration("Any duration"); setType("All types"); }}>Clear filters</button>} />}
  </div>;
}

function LibraryPage(props: CatalogProps) {
  const tabs = ["Courses", "In progress", "Saved", "Downloaded"] as const;
  const tab = props.libraryTab;
  const [sort, setSort] = useState("Recents");
  const library = props.courses.filter((course) => tab === "In progress" ? course.progress > 0 : tab === "Saved" ? props.savedIds.includes(course.id) : tab === "Downloaded" ? false : true);
  const orderedLibrary = useMemo(() => [...library].sort((first, second) => {
    if (sort === "Title") return first.title.localeCompare(second.title);
    if (sort === "Progress") return second.progress - first.progress;
    const firstRecent = props.recentCourseIds.indexOf(first.id);
    const secondRecent = props.recentCourseIds.indexOf(second.id);
    return (firstRecent < 0 ? Number.MAX_SAFE_INTEGER : firstRecent) - (secondRecent < 0 ? Number.MAX_SAFE_INTEGER : secondRecent);
  }), [library, props.recentCourseIds, sort]);
  return <div className="catalog-page">
    <Header eyebrow="YOUR PERSONAL SHELF" title="Your Library" detail="Saved courses and listening progress, all in one place." />
    <Tabs items={[...tabs]} selected={tab} onSelect={props.onLibraryTab} />
    <div className="catalog-library-tools"><span>{library.length} {library.length === 1 ? "course" : "courses"}</span><label>Sort by <select aria-label="Sort library" value={sort} onChange={(event) => setSort(event.target.value)}><option>Recents</option><option>Title</option><option>Progress</option></select><ChevronDown size={13} /></label></div>
    {tab === "Downloaded" ? <EmptyState icon={<Download size={22} />} title="No offline lessons yet" detail="Downloads will appear here when offline lesson caching is enabled." /> : library.length ? <div className="catalog-library-list">{orderedLibrary.map((course) => <article key={course.id} className="library-row"><button className="library-cover-button" onClick={() => props.onOpenSeries(course)}><Cover course={course} /></button><div className="library-row-copy"><button onClick={() => props.onOpenSeries(course)}><strong>{course.title}</strong></button><span>{course.subject} · {course.level} · {course.lessons} lessons</span><ProgressBar value={course.progress} /></div><span className="library-progress-label">{course.progress > 0 ? `${course.progress}%` : "Not started"}</span><button className="catalog-secondary" onClick={() => props.onPlayLesson(course)}>Listen</button></article>)}</div> : <EmptyState icon={<Bookmark size={22} />} title={`No ${tab.toLowerCase()} courses yet`} detail={tab === "Saved" ? "Save a course with the heart button and it will be waiting here." : "Start a course and it will appear in this shelf."} action={<button className="catalog-secondary" onClick={() => props.onNavigate("explore")}>Explore courses</button>} />}
  </div>;
}

function SeriesPage(props: CatalogProps) {
  const course = props.activeCourse;
  return <div className="catalog-page">
    <button className="catalog-back" onClick={() => props.onNavigate("explore")}><ArrowLeft size={15} /> Back to Explore</button>
    <section className="series-hero"><Cover course={course} large /><div><span className="catalog-eyebrow">{course.subject} · {course.level}{course.status && course.status !== "approved" ? " · DRAFT — TEACHER REVIEW" : ""}</span><h1>{course.title}</h1><p>{course.description}</p><div className="series-meta"><span><AudioLines size={15} /> {course.lessons} lessons</span><span><Clock3 size={15} /> {course.duration}</span><span><Star size={14} fill="currentColor" /> {course.rating}</span></div><ProgressBar value={course.progress} /><div className="series-actions"><button className="catalog-primary" onClick={() => props.onPlayLesson(course, 0)}><Play size={16} fill="currentColor" /> Play all</button><button className="catalog-secondary" onClick={() => props.onToggleSaved(course.id)}><Heart size={16} fill={props.savedIds.includes(course.id) ? "currentColor" : "none"} /> {props.savedIds.includes(course.id) ? "Saved" : "Save"}</button><button className="catalog-secondary" onClick={() => props.onNotice("Offline downloads will be available when reviewed media is ready.")}><Download size={16} /> Download</button></div></div></section>
    <section className="catalog-shelf"><header className="catalog-shelf-head"><h2>Episodes</h2><span>{course.chapters.length} lessons</span></header><div className="episode-list">{course.chapters.map((chapter, index) => <article key={`${course.id}-${chapter.title}`} className="episode-row"><span className="episode-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{chapter.title}</strong><p>{chapter.body.slice(0, 118)}{chapter.body.length > 118 ? "…" : ""}</p></div><span>{chapter.duration}</span><button aria-label={`Play ${chapter.title}`} onClick={() => props.onPlayLesson(course, index)}><Play size={16} fill="currentColor" /></button></article>)}</div></section>
  </div>;
}

function LessonPage(props: CatalogProps) {
  const course = props.activeCourse;
  const chapter = course.chapters[props.chapterIndex] ?? course.chapters[0];
  const [tab, setTab] = useState("Overview");
  const [format, setFormat] = useState<"Audio" | "Video">("Audio");
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVideoSave = useRef(0);
  const videoKey = chapter.lessonId ?? `${course.id}:${props.chapterIndex}`;
  useEffect(() => {
    setFormat("Audio");
    setQuizAnswers({});
    lastVideoSave.current = 0;
  }, [videoKey]);
  function restoreVideoPosition() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const positions = JSON.parse(localStorage.getItem("studyai-video-positions") ?? "{}") as Record<string, number>;
      const position = positions[videoKey];
      if (typeof position === "number" && Number.isFinite(position)) {
        video.currentTime = Math.min(position, Math.max(0, video.duration - 1));
      }
    } catch (error) {
      console.error("Saved video position could not be read.", error);
      props.onNotice("Saved video position could not be restored.");
    }
  }
  function saveVideoPosition(force = false) {
    const video = videoRef.current;
    if (!video || (!force && video.currentTime - lastVideoSave.current < 5)) return;
    try {
      const positions = JSON.parse(localStorage.getItem("studyai-video-positions") ?? "{}") as Record<string, number>;
      positions[videoKey] = video.currentTime;
      localStorage.setItem("studyai-video-positions", JSON.stringify(positions));
      lastVideoSave.current = video.currentTime;
    } catch (error) {
      console.error("Video position could not be saved.", error);
      props.onNotice("Video position could not be saved. Check browser storage.");
    }
  }
  function clearVideoPosition() {
    try {
      const positions = JSON.parse(localStorage.getItem("studyai-video-positions") ?? "{}") as Record<string, number>;
      delete positions[videoKey];
      localStorage.setItem("studyai-video-positions", JSON.stringify(positions));
      lastVideoSave.current = 0;
    } catch (error) {
      console.error("Completed video position could not be cleared.", error);
      props.onNotice("Completed video position could not be cleared.");
    }
  }
  function changeVideoSpeed(speed: number) {
    setVideoSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }
  return <div className="catalog-page">
    <button className="catalog-back" onClick={() => props.onNavigate("series")}><ArrowLeft size={15} /> Back to series</button>
    <Header eyebrow={`${course.subject} · ${course.level}`} title={chapter.title} detail={course.title} />
    {chapter.status && chapter.status !== "approved" && <p className="lesson-draft-note">Draft · This original lesson needs teacher review before it is considered approved.</p>}
    <div className="catalog-media-toggle" role="group" aria-label="Lesson format">{(["Audio", "Video"] as const).map((item) => <button key={item} className={format === item ? "selected" : ""} aria-pressed={format === item} disabled={item === "Video" && !chapter.videoUrl} onClick={() => setFormat(item)}>{item === "Audio" ? <Headphones size={15} /> : <Video size={15} />}{item}</button>)}</div>
    {format === "Audio" ? <div className="lesson-player-card"><Cover course={course} large image={chapter.coverImage} /><div><span className="catalog-eyebrow">LESSON AUDIO</span><h2>{chapter.title}</h2><p>{chapter.duration} · {chapter.audioSrc ? "Original generated narration" : "Audio not generated yet"}</p><button className="catalog-primary" disabled={!chapter.audioSrc} onClick={props.onPlayback}>{props.playing ? "Pause lesson" : "Play lesson"} <Play size={16} fill="currentColor" /></button></div></div> : chapter.videoUrl ? <div className="lesson-video-wrap"><video ref={videoRef} key={videoKey} controls playsInline preload="metadata" poster={chapter.diagramImage ?? chapter.coverImage} onLoadedMetadata={restoreVideoPosition} onTimeUpdate={() => saveVideoPosition()} onPause={(event) => { if (!event.currentTarget.ended) saveVideoPosition(true); }} onEnded={() => { if (videoRef.current) videoRef.current.currentTime = 0; clearVideoPosition(); }}><source src={chapter.videoUrl} type="video/mp4" />{chapter.captionsUrl && <track kind="captions" src={chapter.captionsUrl} srcLang="hi" label="Hindi / Hinglish" default />}</video><div className="lesson-video-tools"><label>Speed <select aria-label="Video playback speed" value={videoSpeed} onChange={(event) => changeVideoSpeed(Number(event.target.value))}><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>{chapter.captionsUrl && <a href={chapter.captionsUrl} download>Download captions</a>}</div></div> : null}
    <Tabs items={["Overview", "Transcript", "Key points", "Quiz"]} selected={tab} onSelect={setTab} />
    <section className="lesson-detail-panel">{tab === "Overview" && <><h2>About this lesson</h2><p>{chapter.body}</p></>}{tab === "Transcript" && <><h2>Transcript</h2><p>{chapter.transcript ?? chapter.body}</p></>}{tab === "Key points" && <><h2>Key points</h2><ul>{(chapter.keyPoints ?? ["Listen for the core idea and explain it in your own words.", "Connect the lesson to an example from everyday life."]).map((point) => <li key={point}>{point}</li>)}</ul></>}{tab === "Quiz" && <><h2>Quick check</h2>{chapter.quiz?.map((question, questionIndex) => <fieldset className="lesson-quiz-question" key={question.question}><legend>{questionIndex + 1}. {question.question}</legend>{question.choices.map((choice, choiceIndex) => <label key={choice}><input type="radio" name={`quiz-${videoKey}-${questionIndex}`} checked={quizAnswers[questionIndex] === choiceIndex} onChange={() => setQuizAnswers((answers) => ({ ...answers, [questionIndex]: choiceIndex }))} />{choice}</label>)}{quizAnswers[questionIndex] !== undefined && <p role="status">{quizAnswers[questionIndex] === question.answer ? "Sahi jawab! " : "Ek baar phir socho. "}{question.explanation}</p>}</fieldset>) ?? <p>Quiz questions will appear when available.</p>}</>}</section>
    <button className="catalog-ai-link" onClick={() => props.onNavigate("ai-tutor")}><Sparkles size={17} /> Ask AI about this lesson <ArrowRight size={16} /></button>
  </div>;
}

function PlayerPage(props: CatalogProps) {
  const course = props.activeCourse;
  const chapter = course.chapters[props.chapterIndex] ?? course.chapters[0];
  return <div className="catalog-page player-page"><button className="catalog-back" onClick={() => props.onNavigate("lesson")}><ArrowLeft size={15} /> Back to lesson</button><Header eyebrow="NOW PLAYING" title={chapter?.title ?? course.title} detail={course.title} /><div className="full-player-art"><Cover course={course} large /><span className="catalog-eyebrow">STUDYAI · AUDIO LESSON</span><h2>{chapter?.title ?? course.title}</h2><p>{course.subject} · {course.level}</p><div className="full-player-controls"><button className="catalog-primary" onClick={props.onPlayback}>{props.playing ? "Pause" : "Play"} <Play size={17} fill="currentColor" /></button><button className="catalog-secondary" onClick={() => props.onNotice("Use the player dock to change playback speed and volume.")}>Player settings</button></div><div className="full-player-time"><span>{Math.floor(props.elapsed / 60)}:{String(Math.floor(props.elapsed % 60)).padStart(2, "0")}</span><span>Audio position</span></div></div><section className="catalog-shelf player-queue"><header className="catalog-shelf-head"><h2>Up next</h2><span>{course.chapters.length} lessons</span></header>{course.chapters.map((item, index) => <button key={`${course.id}-queue-${item.title}`} className={`player-queue-row${index === props.chapterIndex ? " current" : ""}`} onClick={() => props.onSelectQueueLesson(course, index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.duration}</small>{index === props.chapterIndex && <Badge tone="free">PLAYING</Badge>}</button>)}</section></div>;
}

function ProgressPage(props: CatalogProps) {
  const active = props.courses.filter((course) => course.progress > 0);
  return <div className="catalog-page">
    <Header eyebrow="YOUR LEARNING, AS IT HAPPENS" title="Progress" detail="Only activity recorded in this browser is shown here." />
    <div className="progress-metric-grid"><article><Clock3 size={19} /><span>Listening time</span><strong>{props.minutes} min</strong></article><article><Check size={19} /><span>Completed lessons</span><strong>{props.completed}</strong></article><article><BookOpen size={19} /><span>Courses started</span><strong>{active.length}</strong></article><article><ProgressBar value={props.progress} /><span>Average course progress</span><strong>{props.progress}%</strong></article></div>
    {active.length ? <section className="catalog-shelf"><header className="catalog-shelf-head"><h2>Courses in progress</h2></header><div className="progress-course-list">{active.map((course) => <article key={course.id}><Cover course={course} /><div><strong>{course.title}</strong><span>{course.subject} · {course.level}</span><ProgressBar value={course.progress} /></div><strong>{course.progress}%</strong></article>)}</div></section> : <EmptyState icon={<Clock3 size={22} />} title="Your learning activity starts here" detail="Play a lesson to record listening time and course progress. No sample totals are added." action={<button className="catalog-primary" onClick={() => props.onNavigate("explore")}>Find a lesson <ArrowRight size={16} /></button>} />}
  </div>;
}

function ProfilePage(props: CatalogProps) {
  return <div className="catalog-page"><Header eyebrow="YOUR LEARNING PROFILE" title={props.name || "Learner"} detail={`Class ${props.studentClass} · ${props.board}`} /><section className="catalog-profile-card"><Avatar name={props.name} /><div><h2>{props.name || "Guest learner"}</h2><p>Your profile and activity are stored locally in this demo.</p></div><button className="catalog-secondary" onClick={() => props.onNavigate("profile-preferences")}>Preferences</button></section><section className="catalog-profile-links"><button onClick={() => props.onNavigate("progress")}><Clock3 size={18} /><span><strong>Learning progress</strong><small>{props.minutes} minutes · {props.completed} completed lessons</small></span><ArrowRight size={16} /></button><button onClick={() => props.onNavigate("library")}><Bookmark size={18} /><span><strong>Your library</strong><small>Saved courses and current listening</small></span><ArrowRight size={16} /></button></section></div>;
}

function AiTutorPage(props: CatalogProps) {
  return <div className="catalog-page"><Header eyebrow="A FRIENDLY PLACE TO ASK" title="AI Tutor" detail="Chat, voice, and camera learning modes are part of the next implementation phase." /><section className="ai-preview-card"><span><Sparkles size={24} /></span><div><h2>Learn one step at a time</h2><p>Ask a question about the lesson you’re listening to. This app’s current tutor is a local demo and does not send questions to an AI provider.</p><button className="catalog-secondary" onClick={() => props.onNotice("Live AI modes are planned for Phase 3.")}>See what’s available <ArrowRight size={15} /></button></div></section><div className="catalog-prompt-row">{["Explain simply", "Give an example", "Quiz me"].map((prompt) => <Chip key={prompt} onClick={() => props.onNotice("Live AI responses are not enabled in this demo.")}>{prompt}</Chip>)}</div></div>;
}

function ParentPage(props: CatalogProps) {
  return <div className="catalog-page"><Header eyebrow="FAMILY VIEW" title="Parent overview" detail="A private summary of learning activity on this device." /><section className="catalog-parent-card"><h2>Learning snapshot</h2><p>Only locally tracked activity is shown. This is not a verified guardian account.</p><div><span>Listening time<strong>{props.minutes} min</strong></span><span>Completed lessons<strong>{props.completed}</strong></span><span>Courses in progress<strong>{props.courses.filter((course) => course.progress > 0).length}</strong></span></div></section></div>;
}

function SettingsPage(props: CatalogProps) {
  return <div className="catalog-page"><Header eyebrow="MAKE IT YOURS" title="Settings" detail="Learning preferences and privacy controls." /><section className="catalog-settings-list"><article><span><strong>Learning preferences</strong><small>Class, board, language, voice and theme preferences.</small></span><button className="catalog-secondary" onClick={() => props.onNavigate("profile-preferences")}>Open preferences</button></article><article><span><strong>Playback</strong><small>Playback speed and volume are available in the persistent player.</small></span><button className="catalog-secondary" onClick={() => props.onNavigate("player")}>Open player</button></article><article><span><strong>Privacy</strong><small>Profile, course progress, notes, and bookmarks are stored in this browser.</small></span></article></section></div>;
}

function AdminPage(props: CatalogProps) {
  return <div className="catalog-page"><Header eyebrow="CONTENT WORKSPACE" title="Admin" detail="Manage lesson drafts and reviewed media. Server-backed publishing arrives in a later phase." /><section className="catalog-admin-placeholder"><Video size={22} /><h2>Content tools are not connected yet</h2><p>This demo catalog is read-only. No lesson is uploaded or published from this screen.</p><div><button className="catalog-secondary" onClick={() => props.onNavigate("explore")}>Preview student catalog <ArrowRight size={15} /></button><button className="catalog-secondary" onClick={() => props.onNavigate("admin-preview")}>Open local studio preview</button></div></section></div>;
}

export function HomeRoute(props: CatalogProps) { return <HomePage {...props} />; }
export function ExploreRoute(props: CatalogProps) { return <ExplorePage {...props} />; }
export function NewHotRoute(props: CatalogProps) { return <NewHotPage {...props} />; }
export function SearchRoute(props: CatalogProps) { return <SearchPage {...props} />; }
export function LibraryRoute(props: CatalogProps) { return <LibraryPage {...props} />; }
export function SeriesRoute(props: CatalogProps) { return <SeriesPage {...props} />; }
export function LessonRoute(props: CatalogProps) { return <LessonPage {...props} />; }
export function PlayerRoute(props: CatalogProps) { return <PlayerPage {...props} />; }
export function AiTutorRoute(props: CatalogProps) { return <AiTutorPage {...props} />; }
export function ProfileRoute(props: CatalogProps) { return <ProfilePage {...props} />; }
export function ProgressRoute(props: CatalogProps) { return <ProgressPage {...props} />; }
export function ParentRoute(props: CatalogProps) { return <ParentPage {...props} />; }
export function SettingsRoute(props: CatalogProps) { return <SettingsPage {...props} />; }
export function AdminRoute(props: CatalogProps) { return <AdminPage {...props} />; }
