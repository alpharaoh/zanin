import { StateGraph, START, END } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { RecordingsQueryState, type RecordingsQueryStateType } from "./state";
import { toolNode } from "./nodes/toolNode";
import { llmCall } from "./nodes/llmNode";

const MAX_ITERATIONS = 10;

async function shouldContinue(state: RecordingsQueryStateType) {
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

export const graph = new StateGraph(RecordingsQueryState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();
