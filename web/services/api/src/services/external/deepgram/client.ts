import { createClient } from "@deepgram/sdk";
import { env } from "@zanin/env/server";

export const deepgramClient = createClient({ key: env.DEEPGRAM_API_KEY });
