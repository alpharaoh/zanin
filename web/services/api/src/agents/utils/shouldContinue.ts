import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import type { RecordingsQueryStateType } from "../recordings/state";

const MAX_ITERATIONS = 10;

export async function shouldContinue(state: RecordingsQueryStateType) {
  const lastMessage = state.messages.at(-1);

  // Check if it's an AIMessage before accessing tool_calls
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  // Prevent infinite loops
  if (state.llmCalls >= MAX_ITERATIONS) {
    return END;
  }

  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // Otherwise, we stop (reply to the user)
  return END;
}
