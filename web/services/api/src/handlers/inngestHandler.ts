import { serve } from "inngest/express";
import { inngest } from "../inngest/client";

import processAudio from "../inngest/functions/processAudio";

export const inngestHandler = serve({
  client: inngest,
  functions: [processAudio],
});
