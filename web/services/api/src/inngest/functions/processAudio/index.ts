import { inngest } from "../../client";

type ProcessAudio = {
  data: {
    audioUrl: string;
  };
};

export type ProcessAudioEvent = {
  "audio/process.audio": ProcessAudio;
};

export default inngest.createFunction(
  { id: "process-audio" },
  { event: "audio/process.audio" },
  async ({ event }) => {
    console.log("Function called", event);
  },
);
