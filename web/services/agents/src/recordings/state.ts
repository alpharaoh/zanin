import { MessagesAnnotation, Annotation } from "@langchain/langgraph";

export const RecordingsQueryState = Annotation.Root({
  ...MessagesAnnotation.spec,
  organizationId: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  recordingId: Annotation<string | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  llmCalls: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),
});

export type RecordingsQueryStateType = typeof RecordingsQueryState.State;
