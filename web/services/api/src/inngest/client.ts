import { EventSchemas, Inngest } from "inngest";
import { ProcessAudioEvent } from "./functions/processAudio";
import { VectorizeRecordingEvent } from "./functions/vectorizeRecording";

type Events = ProcessAudioEvent & VectorizeRecordingEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
