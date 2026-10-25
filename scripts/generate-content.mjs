import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import ffmpegStatic from "ffmpeg-static";

const root = resolve(import.meta.dirname, "..");
const sourcePath = join(root, "src", "data", "lesson-source.json");
const manifestPath = join(root, "src", "data", "lesson-manifest.json");
const mediaRoot = join(root, "public", "media");
const apiKey = process.env.OPENAI_API_KEY;
const force = process.argv.includes("--force");
const ffmpeg = process.env.FFMPEG_BIN || ffmpegStatic;
const voices = {
  "guru-ji": { voice: "onyx", style: "Calm, reassuring, measured Hindi teacher. Speak clearly and slowly for a Class 5 learner." },
  didi: { voice: "shimmer", style: "Warm, friendly, encouraging Hindi tutor. Speak clearly and slowly for a Class 5 learner." },
  dost: { voice: "alloy", style: "Casual, energetic Hinglish study buddy. Speak clearly and slowly for a Class 5 learner." },
  "dada-ji": { voice: "fable", style: "Gentle, slow, expressive Hindi storyteller for a young learner." },
  "master-ji": { voice: "echo", style: "Clear, structured, focused Hindi teacher. Speak slowly for a Class 5 learner." },
  "story-mode": { voice: "nova", style: "Expressive, imaginative Hindi narrator. Speak clearly for a Class 5 learner." },
};

function assertLesson(lesson) {
  const issues = [];
  if (!/^[a-z0-9-]+$/.test(lesson.id)) issues.push("id must be lowercase kebab-case");
  if (lesson.class !== 5 || lesson.board !== "NCERT") issues.push("lessons must target Class 5 NCERT");
  if (!["Maths", "Science"].includes(lesson.subject)) issues.push("unsupported subject");
  if (!Number.isInteger(lesson.durationSec) || lesson.durationSec < 180 || lesson.durationSec > 420) issues.push("durationSec must be between 180 and 420");
  if (!Array.isArray(lesson.keyPoints) || lesson.keyPoints.length !== 3 || lesson.keyPoints.some((point) => typeof point !== "string" || !point.trim())) issues.push("exactly three key points are required");
  if (!Array.isArray(lesson.quiz) || lesson.quiz.length !== 3) issues.push("exactly three quiz questions are required");
  if (lesson.quiz?.some((question) => !question.question || question.choices?.length !== 3 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 2 || !question.explanation)) issues.push("quiz questions need three choices, one answer index, and an explanation");
  if (!lesson.transcript || lesson.transcript.length < 700 || lesson.transcript.length > 4000) issues.push("transcript must contain 700–4000 characters for a short narrated lesson");
  if (lesson.status !== "draft - needs teacher review") issues.push("seed lessons must remain drafts");
  if (!voices[lesson.voiceId]) issues.push(`unsupported voiceId: ${lesson.voiceId}`);
  if (issues.length) throw new Error(`Invalid lesson "${lesson.id}": ${issues.join("; ")}`);
}

function xml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);
}

function wrapSvgText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function makeFallbackSvg(lesson, width, height, kind) {
  const cover = kind === "cover";
  const titleLines = wrapSvgText(lesson.title, cover ? 25 : 42);
  const topic = xml(lesson.chapter);
  const colors = lesson.subject === "Maths"
    ? lesson.chapter === "Fractions" ? ["#7261c7", "#d0a9e8"] : lesson.chapter === "Decimals" ? ["#bb745b", "#f0c081"] : ["#376f94", "#8bd0c4"]
    : lesson.chapter === "Water cycle" ? ["#267ca4", "#8bd5e4"] : lesson.chapter === "Plants" ? ["#417d62", "#b8d988"] : ["#98536b", "#e9a8ae"];
  const circle = cover
    ? `<circle cx="${width * 0.72}" cy="${height * 0.34}" r="${width * 0.25}" fill="#ffffff" opacity=".16"/><circle cx="${width * 0.72}" cy="${height * 0.34}" r="${width * 0.17}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".45"/>`
    : `<circle cx="${width * 0.83}" cy="${height * 0.36}" r="${height * 0.2}" fill="#ffffff" opacity=".15"/><path d="M${width * 0.61} ${height * 0.77} Q${width * 0.78} ${height * 0.4} ${width * 0.93} ${height * 0.77}" fill="none" stroke="#ffffff" stroke-width="8" opacity=".65"/>`;
  const fontSize = cover ? Math.round(width * 0.06) : 38;
  const titleY = cover ? Math.round(height * 0.69) : Math.round(height * 0.67);
  const titleMarkup = titleLines.map((line, index) => `<text x="${cover ? 42 : 72}" y="${titleY + index * fontSize * 1.35}" font-size="${fontSize}" font-weight="700">${xml(line)}</text>`).join("");
  const points = kind === "diagram" ? lesson.keyPoints.map((point, index) => {
    const y = 160 + index * 155;
    return `<circle cx="92" cy="${y - 12}" r="22" fill="#ffffff" opacity=".95"/><text x="92" y="${y - 3}" text-anchor="middle" fill="${colors[0]}" font-size="21" font-weight="700">${index + 1}</text><text x="132" y="${y}" font-size="29">${xml(point)}</text>`;
  }).join("") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="100%" height="100%" rx="${cover ? 36 : 0}" fill="url(#bg)"/>${circle}<text x="${cover ? 42 : 72}" y="${cover ? 76 : 88}" fill="#ffffff" font-size="${cover ? 17 : 21}" font-weight="700" letter-spacing="3">${xml(lesson.subject.toUpperCase())} · CLASS 5</text>${titleMarkup}${points}<text x="${cover ? 42 : 72}" y="${cover ? height - 30 : height - 40}" fill="#ffffff" font-size="${cover ? 12 : 15}" opacity=".8" letter-spacing="2">STUDYAI · ORIGINAL LEARNING CONTENT</text><text x="${cover ? width * 0.72 : width * 0.83}" y="${cover ? height * 0.4 : height * 0.38}" text-anchor="middle" fill="#ffffff" font-size="${cover ? 68 : 74}" font-weight="700" opacity=".88">${lesson.subject === "Maths" ? lesson.chapter === "Fractions" ? "½" : lesson.chapter === "Decimals" ? "0.5" : "△" : lesson.chapter === "Water cycle" ? "↻" : lesson.chapter === "Plants" ? "❋" : "♡"}</text></svg>`;
}

async function createSvgFallback(path, lesson, width, height, kind) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, makeFallbackSvg(lesson, width, height, kind), "utf8");
}

async function openAiImage(lesson, kind) {
  const prompt = kind === "cover"
    ? `Create original illustrated square cover art for a Class 5 Indian learning lesson about ${lesson.chapter}: ${lesson.title}. Use a friendly, age-appropriate hand-painted editorial illustration, clear educational symbolism, no words, no lettering, no logos, no existing characters, no copyrighted textbook imagery.`
    : `Create an original 16:9 classroom visual aid for a Class 5 Indian lesson about ${lesson.chapter}: ${lesson.title}. Show a clear, simple educational diagram with three visual stages for these ideas: ${lesson.keyPoints.join("; ")}. Child-friendly original vector illustration, minimal labels, no brand, no textbook layout.`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1", prompt, size: "1024x1024", quality: "medium", output_format: "png", n: 1 }),
    signal: AbortSignal.timeout(180_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`OpenAI image request failed (${response.status}): ${result.error?.message ?? "Unknown provider error"}`);
  const image = result.data?.[0]?.b64_json;
  if (typeof image !== "string" || !image) throw new Error("OpenAI image response did not include image data.");
  return Buffer.from(image, "base64");
}

function runFfmpeg(args) {
  if (!ffmpeg || !existsSync(ffmpeg)) throw new Error("Bundled ffmpeg is missing. Reinstall dependencies or set FFMPEG_BIN to an ffmpeg executable.");
  return new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`ffmpeg exited (${code}): ${stderr.trim().slice(-1800)}`)));
  });
}

async function resizeImage(source, output, width, height) {
  const temporary = `${output}.tmp.png`;
  await runFfmpeg(["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`, "-frames:v", "1", temporary]);
  await rename(temporary, output);
}

function narrationFor(lesson) {
  const review = lesson.quiz.map((question, index) => {
    const correctAnswer = question.choices[question.answer];
    return `Practice ${index + 1}. ${question.question} Socho aur thoda pause lo. Options hain: ${question.choices.join(", ")}. Sahi jawab hai ${correctAnswer}. ${question.explanation}`;
  }).join("\n\n");
  const recap = lesson.keyPoints.map((point, index) => `Point ${index + 1}: ${point}`).join("\n\n");
  return `${lesson.title}.\n\n${lesson.transcript}\n\nAao, key ideas ko phir se sunte hain.\n${recap}\n\nAb teen chhote practice questions karte hain.\n${review}\n\nBahut achha! Agar koi jawab galat hua, to koi baat nahi. Lesson ko dobara suno aur apne teacher ya parivaar ke kisi bade se sawaal poochho.`;
}

async function generateSpeech(lesson, destination) {
  const voice = voices[lesson.voiceId];
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: voice.voice,
      input: narrationFor(lesson),
      instructions: voice.style,
      response_format: "mp3",
      speed: 0.8,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI TTS request failed for ${lesson.id} (${response.status}): ${detail.slice(0, 700)}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function vttTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const remainder = milliseconds % 60_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(Math.floor(remainder / 1000)).padStart(2, "0")}.${String(remainder % 1000).padStart(3, "0")}`;
}

function captionText(lesson) {
  return [lesson.title, ...lesson.transcript.split(/\n+/).filter(Boolean), ...lesson.keyPoints, ...lesson.quiz.map((question) => `${question.question} ${question.explanation}`)];
}

function makeVtt(lesson) {
  const segments = captionText(lesson);
  const weights = segments.map((segment) => Math.max(1, segment.trim().split(/\s+/).length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return `WEBVTT\n\n${segments.map((segment, index) => {
    const start = cursor;
    cursor += lesson.durationSec * weights[index] / total;
    return `${index + 1}\n${vttTime(start)} --> ${vttTime(cursor)}\n${segment.trim()}\n`;
  }).join("\n")}`;
}

function makeSlideSvg(lesson, point, index, total) {
  const lines = wrapSvgText(point, 44);
  const text = lines.map((line, lineIndex) => `<text x="105" y="${340 + lineIndex * 58}" font-size="40" font-weight="700" fill="#28233d">${xml(line)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1edff"/><stop offset="1" stop-color="#d8edf0"/></linearGradient></defs><rect width="1280" height="720" fill="url(#bg)"/><circle cx="1080" cy="125" r="250" fill="#9d8ce2" opacity=".16"/><circle cx="1030" cy="165" r="170" fill="#71afa6" opacity=".16"/><text x="105" y="105" font-size="22" letter-spacing="4" font-weight="700" fill="#7564bf">STUDYAI · CLASS 5 ${xml(lesson.subject.toUpperCase())}</text><text x="105" y="215" font-size="32" font-weight="700" fill="#28233d">${xml(lesson.chapter)}</text><circle cx="115" cy="328" r="30" fill="#7564bf"/><text x="115" y="338" text-anchor="middle" font-size="27" font-weight="700" fill="#fff">${index + 1}</text>${text}<text x="105" y="650" font-size="18" fill="#6d6880">${index + 1} / ${total} · ${xml(lesson.title)}</text></svg>`;
}

async function generateVideo(lesson, audioPath, videoPath, captionsPath) {
  const directory = join(tmpdir(), `studyai-${lesson.id}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  try {
    const slides = lesson.keyPoints.map((point, index) => {
      const slidePath = join(directory, `slide-${index + 1}.svg`);
      return writeFile(slidePath, makeSlideSvg(lesson, point, index, lesson.keyPoints.length), "utf8").then(() => slidePath);
    });
    const slidePaths = await Promise.all(slides);
    const slideSeconds = lesson.durationSec / slidePaths.length;
    const inputArgs = slidePaths.flatMap((slidePath) => ["-loop", "1", "-framerate", "1", "-t", String(slideSeconds), "-i", slidePath]);
    const filters = slidePaths.map((_slide, index) => `[${index}:v]scale=1280:720,setsar=1,fps=24[v${index}]`).join(";");
    const concat = `${slidePaths.map((_slide, index) => `[v${index}]`).join("")}concat=n=${slidePaths.length}:v=1:a=0,format=yuv420p[outv]`;
    await mkdir(dirname(videoPath), { recursive: true });
    await runFfmpeg([
      "-hide_banner", "-loglevel", "error", "-y",
      ...inputArgs,
      "-i", audioPath,
      "-filter_complex", `${filters};${concat}`,
      "-map", "[outv]", "-map", `${slidePaths.length}:a:0`,
      "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
      "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", videoPath,
    ]);
    await writeFile(captionsPath, makeVtt(lesson), "utf8");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function ensureImage(lesson, kind, width, height) {
  const baseName = `${lesson.id}-${kind}`;
  const pngPath = join(mediaRoot, "images", `${baseName}.png`);
  const svgPath = join(mediaRoot, "images", `${baseName}.svg`);
  if (!force && existsSync(pngPath)) return pngPath;
  if (!apiKey) {
    if (force || !existsSync(svgPath)) await createSvgFallback(svgPath, lesson, width, height, kind);
    return svgPath;
  }
  const temporaryPng = join(mediaRoot, "images", `${baseName}.source.png`);
  await mkdir(dirname(pngPath), { recursive: true });
  await writeFile(temporaryPng, await openAiImage(lesson, kind));
  try {
    await resizeImage(temporaryPng, pngPath, width, height);
  } finally {
    await rm(temporaryPng, { force: true });
  }
  if (existsSync(svgPath)) await rm(svgPath, { force: true });
  return pngPath;
}

function publicUrl(path) {
  return `/${path.slice(join(root, "public").length + 1).replaceAll("\\", "/")}`;
}

async function main() {
  const baseSource = JSON.parse(await readFile(sourcePath, "utf8"));
  const extraSourcePath = join(root, "src", "data", "lesson-source-extra.json");
  const extraSource = existsSync(extraSourcePath) ? JSON.parse(await readFile(extraSourcePath, "utf8")) : [];
  const source = [...baseSource, ...extraSource];
  if (!Array.isArray(source) || source.length !== 55) throw new Error(`Expected 55 source lessons across the listed Class 5 topics; received ${source?.length ?? "invalid data"}.`);
  for (const lesson of source) assertLesson(lesson);
  const imageLicense = apiKey ? "AI-generated with OpenAI Images; original prompt; no third-party assets." : "Original StudyAI SVG gradient illustration; no third-party assets.";
  const manifest = [];

  for (let index = 0; index < source.length; index += 1) {
    const lesson = source[index];
    console.log(`[${index + 1}/${source.length}] Preparing ${lesson.title}`);
    const coverImage = await ensureImage(lesson, "cover", 600, 600);
    const diagramImage = await ensureImage(lesson, "diagram", 1280, 720);
    const audioPath = join(mediaRoot, "audio", `${lesson.id}.mp3`);
    const videoPath = join(mediaRoot, "video", `${lesson.id}.mp4`);
    const captionsPath = join(mediaRoot, "video", `${lesson.id}.vtt`);

    if (apiKey && (force || !existsSync(audioPath))) await generateSpeech(lesson, audioPath);
    if (existsSync(audioPath) && (force || !existsSync(videoPath))) await generateVideo(lesson, audioPath, videoPath, captionsPath);
    else if (!existsSync(captionsPath) || force) {
      await mkdir(dirname(captionsPath), { recursive: true });
      await writeFile(captionsPath, makeVtt(lesson), "utf8");
    }

    manifest.push({
      ...lesson,
      coverImage: publicUrl(coverImage),
      diagramImage: publicUrl(diagramImage),
      audioUrl: existsSync(audioPath) ? `/media/audio/${lesson.id}.mp3` : null,
      videoUrl: existsSync(videoPath) ? `/media/video/${lesson.id}.mp4` : null,
      captionsUrl: existsSync(captionsPath) ? `/media/video/${lesson.id}.vtt` : null,
      license: `${lesson.license} ${imageLicense}${existsSync(audioPath) ? " OpenAI-generated narration." : ""}`,
      status: "draft - needs teacher review",
    });
  }

  await mkdir(dirname(manifestPath), { recursive: true });
  const temporaryManifest = `${manifestPath}.tmp`;
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryManifest, manifestPath);
  const audioCount = manifest.filter((lesson) => lesson.audioUrl).length;
  const videoCount = manifest.filter((lesson) => lesson.videoUrl).length;
  console.log(`Wrote ${manifest.length} draft lessons, ${manifest.length * 2} images, ${audioCount} audio files, and ${videoCount} narrated videos.`);
  if (!apiKey) console.warn("OPENAI_API_KEY is not set: original SVG covers, diagrams, and caption files were generated; audio and narrated videos are deferred.");
  else if (audioCount !== manifest.length || videoCount !== manifest.length) throw new Error("Media generation completed with missing audio/video outputs.");
}

await main();
