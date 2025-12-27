import { serve } from "inngest/express";
import { inngest } from "../inngest/client";

import processAudio from "../inngest/functions/processAudio";
import vectorize from "../inngest/functions/vectorize";
import generateChatTitle from "../inngest/functions/generateChatTitle";
import evaluateSignals from "../inngest/functions/evaluateSignals";

export const inngestHandler = serve({
  client: inngest,
  functions: [processAudio, vectorize, generateChatTitle, evaluateSignals],
});
