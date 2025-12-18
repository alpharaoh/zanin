import { serve } from "inngest/express";
import { inngest } from "../inngest/client";
import test from "../inngest/functions/test";

export const inngestHandler = serve({ client: inngest, functions: [test] });
