import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { RecordingsQueryStateType } from "../state";
import { searchRecordingsTool, getRecordingDetailsTool } from "../tools";

export async function toolNode(state: RecordingsQueryStateType) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const chosenToolCalls = lastMessage.tool_calls ?? [];

  const result: ToolMessage[] = [];
  for (const toolCall of chosenToolCalls) {
    const toolCallArgs = {
      ...toolCall,
      args: {
        ...toolCall.args,
        organizationId: state.organizationId,
      },
    };

    try {
      if (toolCall.name === "search_recordings") {
        const observation = await searchRecordingsTool.invoke(toolCallArgs);
        result.push(observation);
      } else if (toolCall.name === "get_recording_details") {
        const observation = await getRecordingDetailsTool.invoke(toolCallArgs);
        result.push(observation);
      } else {
        result.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? "",
            content: JSON.stringify({
              error: `Unknown tool: ${toolCall.name}`,
            }),
          }),
        );
      }
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
