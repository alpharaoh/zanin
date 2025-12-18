import { EventSchemas, Inngest } from "inngest";
import { ProcessAudioEvent } from "./functions/processAudio";

type Events = ProcessAudioEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
