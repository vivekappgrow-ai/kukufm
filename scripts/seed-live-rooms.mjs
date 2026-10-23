import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const presetsOutput = resolve(root, "../src/data/live-room-presets.json");
const bankOutput = resolve(root, "../server/data/room-question-bank.json");
const roomPresets = [
    { name: "Maths Quiz Duel", roomType: "duel", subject: "Mathematics", classRange: "Class 8" },
    { name: "Science Study Group", roomType: "study-group", subject: "Science", classRange: "Class 8" },
    { name: "Teacher-led Revision", roomType: "classroom", subject: "Mathematics", classRange: "Class 8" },
  ];
const questions = [
    { prompt: "Which quantity includes both magnitude and direction?", options: ["Distance", "Speed", "Displacement", "Time"], answer: 2, subject: "Science" },
    { prompt: "What does a derivative of position with respect to time describe?", options: ["Velocity", "Mass", "Distance", "Temperature"], answer: 0, subject: "Mathematics" },
    { prompt: "Which is the largest planet in our solar system?", options: ["Earth", "Jupiter", "Mars", "Venus"], answer: 1, subject: "GK" },
    { prompt: "Which part of a computer performs arithmetic and logic operations?", options: ["ALU", "Keyboard", "Monitor", "SSD"], answer: 0, subject: "Computer" },
  ];

await Promise.all([mkdir(dirname(presetsOutput), { recursive: true }), mkdir(dirname(bankOutput), { recursive: true })]);
await Promise.all([
  writeFile(presetsOutput, `${JSON.stringify({ roomPresets }, null, 2)}\n`, "utf8"),
  writeFile(bankOutput, `${JSON.stringify({ questions }, null, 2)}\n`, "utf8"),
]);
console.log(`Wrote ${roomPresets.length} room presets and ${questions.length} server-only demo questions.`);
