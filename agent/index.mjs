import { config as loadEnv } from 'dotenv';

loadEnv();

const agentName = process.env.VOICE_AGENT_NAME ?? 'studyai-voice-tutor';

async function main() {
  const hasLiveKit = Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasLiveKit || !hasOpenAI) {
    console.log('[studyai-agent] LiveKit + OpenAI credentials are not configured yet. The server can still create call tokens, but no real agent dispatch will run until those env vars are set.');
    return;
  }

  try {
    await import('@livekit/agents');
    await import('@livekit/agents-plugin-openai');
    await import('@livekit/agents-plugin-silero');
    console.log(`[studyai-agent] Agent '${agentName}' is ready. Dispatch it from the server once the worker has been started on the same LiveKit project.`);
  } catch (error) {
    console.warn('[studyai-agent] LiveKit agent packages are not installed. Run npm install with the package versions declared in package.json before starting the worker.');
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

if (process.argv.includes('start') || process.argv.includes('dev')) {
  await main();
}
