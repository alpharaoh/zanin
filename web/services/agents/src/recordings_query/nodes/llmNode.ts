import { SystemMessage } from "@langchain/core/messages";
import type { RecordingsQueryStateType } from "../state";
import { modelWithTools } from "../tools";

const getSystemPrompt = (
  organizationId: string,
) => `You are an intelligent assistant that helps users explore and understand their recorded conversations and meetings.

You have access to tools that allow you to:
1. Search recordings by semantic query to find relevant conversations
2. Get detailed information about specific recordings including transcripts, summaries, and AI analysis

When a user asks a question about their recordings:
1. First, search for relevant recordings using the search_recordings tool
2. Then, use get_recording_details to fetch more context about the most relevant recordings
3. Synthesize the information to provide a helpful, accurate answer

Always cite which recordings your information comes from. If you can't find relevant information, let the user know.

Be conversational and helpful. If the user asks about something like "my argument with James today", search for relevant keywords like "James", "argument", "disagreement", and query by the day, etc.

Today's date is ${new Date().toISOString()}.

<metadata>
{
  "organizationId": "${organizationId}"
}
</metadata>`;

export async function llmCall(state: RecordingsQueryStateType) {
  return {
    messages: [
      await modelWithTools.invoke([
        new SystemMessage(getSystemPrompt(state.organizationId)),
        ...state.messages,
      ]),
    ],
    llmCalls: 1,
  };
}
