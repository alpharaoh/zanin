import { EventSchemas, Inngest } from "inngest";
import { ProcessAudioEvent } from "./functions/processAudio";
import { VectorizeEvent } from "./functions/vectorize";

type Events = ProcessAudioEvent & VectorizeEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
