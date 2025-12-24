import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { RecordingAgentStateType } from "../state";
import { toolsByName } from "../tools";

export async function toolNode(state: RecordingAgentStateType) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      continue;
    }

    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}
