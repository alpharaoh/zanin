import { SystemMessage } from "@langchain/core/messages";
import type { RecordingAgentStateType } from "../state";
import { modelWithTools } from "../tools";

export async function llmCall(state: RecordingAgentStateType) {
  return {
    messages: [
      await modelWithTools.invoke([
        new SystemMessage(
          "You are a helpful assistant tasked with performing arithmetic on a set of inputs.",
        ),
        ...state.messages,
      ]),
    ],
    llmCalls: 1,
  };
}
