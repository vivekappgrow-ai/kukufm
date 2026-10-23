export type StudyVoice = {
  id: string;
  name: string;
  style: string;
  description: string;
  language: "hi-IN" | "en-IN";
  pitch: number;
  rate: number;
  preview: string;
  avatar: string;
  color: string;
  openAiVoice: "onyx" | "shimmer" | "alloy" | "fable" | "echo" | "nova";
  speakingStyle: string;
};

export const studyVoices: StudyVoice[] = [
  {
    id: "guru-ji",
    name: "Guru Ji",
    style: "Calm male",
    description: "A steady, reassuring voice for learning at your own pace.",
    language: "hi-IN",
    pitch: 0.85,
    rate: 0.92,
    preview: "Namaste! Aaj hum ek naya vichaar, aaraam se samjhenge.",
    avatar: "गु",
    color: "lavender",
    openAiVoice: "onyx",
    speakingStyle: "Calm, reassuring, measured Hindi teacher",
  },
  {
    id: "didi",
    name: "Didi",
    style: "Friendly female",
    description: "Warm explanations that feel like learning with a friend.",
    language: "hi-IN",
    pitch: 1.12,
    rate: 1,
    preview: "Chalo, aaj ka lesson milkar seekhte hain!",
    avatar: "दी",
    color: "peach",
    openAiVoice: "shimmer",
    speakingStyle: "Warm, friendly, encouraging Hindi tutor",
  },
  {
    id: "dost",
    name: "Dost",
    style: "Young & casual",
    description: "A relaxed Hinglish style for quick, everyday explanations.",
    language: "en-IN",
    pitch: 1.2,
    rate: 1.08,
    preview: "Hey dost! Ready ho ek cool naya concept samajhne ke liye?",
    avatar: "दो",
    color: "blue",
    openAiVoice: "alloy",
    speakingStyle: "Casual, energetic Hinglish study buddy",
  },
  {
    id: "dada-ji",
    name: "Dada Ji",
    style: "Slow storyteller",
    description: "Gentle pacing with stories that make ideas memorable.",
    language: "hi-IN",
    pitch: 0.78,
    rate: 0.82,
    preview: "Aao bachcho, ek kahaani ke saath seekhna shuru karein.",
    avatar: "दा",
    color: "sage",
    openAiVoice: "fable",
    speakingStyle: "Gentle, slow, expressive Hindi storyteller",
  },
  {
    id: "master-ji",
    name: "Master Ji",
    style: "Exam focused",
    description: "Clear, structured guidance for practice and revision.",
    language: "hi-IN",
    pitch: 0.96,
    rate: 1,
    preview: "Namaste students. Aaj hum exam ke liye ek zaroori topic dohrayenge.",
    avatar: "मा",
    color: "ocean",
    openAiVoice: "echo",
    speakingStyle: "Clear, structured, focused exam coach",
  },
  {
    id: "story-mode",
    name: "Story Mode",
    style: "Expressive narrator",
    description: "Bring concepts to life with a little extra imagination.",
    language: "hi-IN",
    pitch: 1.08,
    rate: 0.94,
    preview: "Socho, ek din tum ek naye safar par nikalte ho...",
    avatar: "कह",
    color: "sunrise",
    openAiVoice: "nova",
    speakingStyle: "Expressive, imaginative Hindi narrator",
  },
];
