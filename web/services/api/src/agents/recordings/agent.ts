import { StateGraph, START, END } from "@langchain/langgraph";
import { RecordingsQueryState } from "./state";
import { toolNode } from "./nodes/toolNode";
import { llmCall } from "./nodes/llmNode";
import { shouldContinue } from "../utils/shouldContinue";

export const graph = new StateGraph(RecordingsQueryState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();
