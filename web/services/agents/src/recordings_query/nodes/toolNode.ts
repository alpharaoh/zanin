import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { RecordingsQueryStateType } from "../state";
import {
  searchRecordingsTool,
  getRecordingDetailsTool,
} from "../tools";

export async function toolNode(state: RecordingsQueryStateType) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    // Inject organizationId into tool args if not present
    const args = {
      ...toolCall.args,
      organizationId: toolCall.args.organizationId || state.organizationId,
    };
    const modifiedToolCall = { ...toolCall, args };

    try {
      let observation: ToolMessage;

      if (toolCall.name === "search_recordings") {
        observation = await searchRecordingsTool.invoke(modifiedToolCall);
      } else if (toolCall.name === "get_recording_details") {
        observation = await getRecordingDetailsTool.invoke(modifiedToolCall);
      } else {
        result.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? "",
            content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
          }),
        );
        continue;
      }

      result.push(observation);
    } catch (error) {
      result.push(
        new ToolMessage({
          tool_call_id: toolCall.id ?? "",
          content: JSON.stringify({
            error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          }),
        }),
      );
    }
  }

  return { messages: result };
}
