import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const output = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/demo-seed.json");
const subjects = [
  {
    subject: "Mathematics",
    title: "Maths, one idea at a time",
    icon: "∫",
    accent: "lavender",
    level: "Class 8",
    chapters: ["Number patterns", "Algebra in action", "Geometry around us", "Working with data", "Practice & recap"],
  },
  {
    subject: "Science",
    title: "Science all around us",
    icon: "◉",
    accent: "sage",
    level: "Class 8",
    chapters: ["Living systems", "Matter around us", "Energy in motion", "Our changing planet", "Practice & recap"],
  },
  {
    subject: "English",
    title: "English for curious minds",
    icon: "Aa",
    accent: "blue",
    level: "Class 8",
    chapters: ["Reading with purpose", "Build your vocabulary", "Clear sentences", "Confident speaking", "Practice & recap"],
  },
  {
    subject: "Hindi",
    title: "हिंदी: सुनें और सीखें",
    icon: "अ",
    accent: "peach",
    level: "Class 8",
    chapters: ["भाषा और व्याकरण", "शब्दों की दुनिया", "पठन कौशल", "रचनात्मक लेखन", "अभ्यास और पुनरावृत्ति"],
  },
  {
    subject: "GK",
    title: "Everyday general knowledge",
    icon: "✳",
    accent: "sage",
    level: "All classes",
    chapters: ["India at a glance", "People and places", "Science in daily life", "World and environment", "Practice & recap"],
  },
  {
    subject: "Computer",
    title: "Computer basics, simply",
    icon: "</>",
    accent: "blue",
    level: "Class 8",
    chapters: ["Inside a computer", "Thinking in algorithms", "Internet essentials", "Digital safety", "Practice & recap"],
  },
];

const catalog = subjects.map(({ subject, title, icon, accent, level, chapters }) => ({
  id: `seed-${subject.toLowerCase()}`,
  title,
  instructor: "StudyAI Learning Team",
  subject,
  level,
  duration: "2h 30m",
  lessons: chapters.length * 3,
  rating: "4.8",
  accent,
  icon,
  description: `A demo audio-first ${subject} course with five chapters and three lesson units per chapter.`,
  progress: 0,
  language: "Both",
  chapters: chapters.map((chapter, index) => ({
    title: chapter,
    duration: `${8 + index}:00`,
    body: `Demo ${subject} lesson: ${chapter}. This sample chapter includes three short audio lesson units, a written recap and a practice prompt. Replace the demo narration with reviewed, licensed teaching material before publishing.`,
    audioSrc: "/audio/physics-01.wav",
    lessons: [`${chapter}: key ideas`, `${chapter}: worked example`, `${chapter}: quick recap`],
    slides: [
      { time: 0, title: chapter, text: `Start here: ${chapter}. Listen to the audio while you explore this visual summary.` },
      { time: 15, title: "A useful example", text: `Connect ${subject.toLowerCase()} to something familiar. Pause and describe the key idea in your own words.` },
      { time: 30, title: "Quick recap", text: "Review the main point, then try the chapter quiz to check your understanding." },
    ],
  })),
}));

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${catalog.length} demo courses to ${output}`);
