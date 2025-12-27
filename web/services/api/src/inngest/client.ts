import { EventSchemas, Inngest } from "inngest";
import { ProcessAudioEvent } from "./functions/processAudio";
import { VectorizeEvent } from "./functions/vectorize";
import { GenerateChatTitleEvent } from "./functions/generateChatTitle";
import { EvaluateSignalsEvent } from "./functions/evaluateSignals";

type Events = ProcessAudioEvent &
  VectorizeEvent &
  GenerateChatTitleEvent &
  EvaluateSignalsEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
