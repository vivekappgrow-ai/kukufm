import manifest from "./lesson-manifest.json";

export type LessonStatus = "draft - needs teacher review" | "in review" | "approved";

export type LessonQuizQuestion = {
  question: string;
  choices: [string, string, string];
  answer: number;
  explanation: string;
};

export type StudyLesson = {
  id: string;
  class: number;
  board: string;
  subject: "Maths" | "Science";
  chapter: string;
  title: string;
  description: string;
  transcript: string;
  durationSec: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  coverImage: string;
  diagramImage: string;
  audioUrl: string | null;
  videoUrl: string | null;
  captionsUrl: string;
  keyPoints: [string, string, string];
  quiz: [LessonQuizQuestion, LessonQuizQuestion, LessonQuizQuestion];
  license: string;
  status: LessonStatus;
  voiceId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringTuple3(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "string");
}

function isQuizQuestion(value: unknown): value is LessonQuizQuestion {
  return isRecord(value)
    && typeof value.question === "string"
    && isStringTuple3(value.choices)
    && typeof value.answer === "number"
    && Number.isInteger(value.answer)
    && value.answer >= 0
    && value.answer < 3
    && typeof value.explanation === "string";
}

function isStudyLesson(value: unknown): value is StudyLesson {
  return isRecord(value)
    && typeof value.id === "string"
    && value.class === 5
    && value.board === "NCERT"
    && (value.subject === "Maths" || value.subject === "Science")
    && typeof value.chapter === "string"
    && typeof value.title === "string"
    && typeof value.description === "string"
    && typeof value.transcript === "string"
    && typeof value.durationSec === "number"
    && value.durationSec >= 180
    && value.durationSec <= 420
    && (value.difficulty === "beginner" || value.difficulty === "intermediate" || value.difficulty === "advanced")
    && typeof value.coverImage === "string"
    && typeof value.diagramImage === "string"
    && (typeof value.audioUrl === "string" || value.audioUrl === null)
    && (typeof value.videoUrl === "string" || value.videoUrl === null)
    && typeof value.captionsUrl === "string"
    && isStringTuple3(value.keyPoints)
    && Array.isArray(value.quiz)
    && value.quiz.length === 3
    && value.quiz.every(isQuizQuestion)
    && typeof value.license === "string"
    && (value.status === "draft - needs teacher review" || value.status === "in review" || value.status === "approved")
    && typeof value.voiceId === "string";
}

function validateManifest(value: unknown): StudyLesson[] {
  if (!Array.isArray(value) || !value.every(isStudyLesson)) {
    throw new Error("StudyAI lesson manifest is invalid. Run npm run content:generate to rebuild it.");
  }
  return value;
}

export const studyLessons = validateManifest(manifest);

export const studyLessonCourses = [...new Set(studyLessons.map((lesson) => `${lesson.subject}:${lesson.chapter}`))]
  .map((groupKey) => {
    const [subject, chapter] = groupKey.split(":") as ["Maths" | "Science", string];
    const chapterLessons = studyLessons.filter((lesson) => lesson.subject === subject && lesson.chapter === chapter);
    const first = chapterLessons[0];
    const totalMinutes = Math.round(chapterLessons.reduce((total, lesson) => total + lesson.durationSec, 0) / 60);
    const accent = subject === "Maths" ? chapter === "Fractions" ? "lavender" : chapter === "Decimals" ? "peach" : "blue" : chapter === "Water cycle" ? "blue" : chapter === "Plants" ? "sage" : "peach";
    return {
      id: `class5-${subject.toLowerCase()}-${chapter.toLowerCase().replace(/\s+/g, "-")}`,
      title: `Class 5 ${subject}: ${chapter}`,
      instructor: "StudyAI Learning Team",
      subject: subject === "Maths" ? "Mathematics" : subject,
      level: "Class 5",
      duration: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`,
      lessons: chapterLessons.length,
      rating: "—",
      accent,
      icon: subject === "Maths" ? chapter === "Fractions" ? "½" : chapter === "Decimals" ? "0.5" : "△" : chapter === "Water cycle" ? "↻" : chapter === "Plants" ? "❋" : "♡",
      description: first.description,
      coverImage: first.coverImage,
      status: first.status,
      progress: 0,
      language: "Both" as const,
      chapters: chapterLessons.map((lesson) => ({
        title: lesson.title,
        duration: `${Math.floor(lesson.durationSec / 60)}:${String(lesson.durationSec % 60).padStart(2, "0")}`,
        body: lesson.transcript,
        audioSrc: lesson.audioUrl ?? undefined,
        videoUrl: lesson.videoUrl ?? undefined,
        captionsUrl: lesson.captionsUrl,
        coverImage: lesson.coverImage,
        diagramImage: lesson.diagramImage,
        transcript: lesson.transcript,
        keyPoints: lesson.keyPoints,
        quiz: lesson.quiz,
        difficulty: lesson.difficulty,
        status: lesson.status,
        lessonId: lesson.id,
      })),
    };
  });
