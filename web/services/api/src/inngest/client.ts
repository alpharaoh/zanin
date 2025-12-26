import { EventSchemas, Inngest } from "inngest";
import { ProcessAudioEvent } from "./functions/processAudio";
import { VectorizeEvent } from "./functions/vectorize";
import { GenerateChatTitleEvent } from "./functions/generateChatTitle";

type Events = ProcessAudioEvent & VectorizeEvent & GenerateChatTitleEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
