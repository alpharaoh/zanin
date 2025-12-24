import { MessagesAnnotation, Annotation } from "@langchain/langgraph";

export const RecordingAgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  llmCalls: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
});

export type RecordingAgentStateType = typeof RecordingAgentState.State;
